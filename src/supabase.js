import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth Helpers ────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── League Helpers ──────────────────────────────────────────

export async function createLeague(name, maxEntries = 3, entryFee = 20) {
  const { data, error } = await supabase.from('leagues').insert({
    tournament_id: '00000000-0000-0000-0000-000000002026',
    name,
    created_by: (await getSession())?.user?.id,
    max_entries_per_member: maxEntries,
    invite_code: 'BARRY-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    scoring: { round_1: 1, round_2: 2, round_3: 3, round_4: 4, round_5: 5, round_6: 6, entry_fee: entryFee },
  }).select().single()
  if (error) throw error
  return data
}

export async function joinLeague(code) {
  const { data: league } = await supabase
    .from('leagues').select('id').eq('invite_code', code.toUpperCase()).single()
  if (!league) throw new Error('Invalid code')
  const userId = (await getSession())?.user?.id
  const { error } = await supabase.from('league_members').insert({
    league_id: league.id, user_id: userId, role: 'member',
  })
  if (error) throw error
  return league
}

export async function getMyLeagues() {
  const userId = (await getSession())?.user?.id
  const { data } = await supabase
    .from('league_members').select('league_id, role, leagues(*)').eq('user_id', userId)
  return data?.map(d => ({ ...d.leagues, role: d.role })) || []
}

// ─── Entry Helpers ───────────────────────────────────────────

export async function createEntries(leagueId, count, playerName) {
  const userId = (await getSession())?.user?.id
  const entries = Array.from({ length: count }, (_, i) => ({
    league_id: leagueId,
    user_id: userId,
    entry_number: i + 1,
    name: `${playerName} #${i + 1}`,
    status: 'alive',
    total_points: 0,
    current_streak: 0,
  }))
  const { data, error } = await supabase.from('entries').insert(entries).select()
  if (error) throw error
  return data
}

export async function getMyEntries(leagueId) {
  const userId = (await getSession())?.user?.id
  const { data } = await supabase
    .from('entries').select('*').eq('league_id', leagueId).eq('user_id', userId).order('entry_number')
  return data || []
}

export async function getAllEntries(leagueId) {
  const { data } = await supabase
    .from('entries').select('*, profiles(display_name, initials, avatar_color)')
    .eq('league_id', leagueId).order('total_points', { ascending: false })
  return data || []
}

// ─── Pick Helpers ────────────────────────────────────────────

export async function submitPick(entryId, gameId, teamId, round, pickDate) {
  // Remove existing pick for this entry+date (allows changing before lock)
  await supabase.from('picks').delete().eq('entry_id', entryId).eq('pick_date', pickDate)

  const { data, error } = await supabase.from('picks').insert({
    entry_id: entryId,
    game_id: gameId,
    team_id: teamId,
    round,
    pick_date: pickDate,
    result: 'pending',
  }).select().single()
  if (error) throw error

  // Also record used team
  await supabase.from('used_teams').upsert({
    entry_id: entryId, team_id: teamId, used_in_round: round, used_on: pickDate,
  }, { onConflict: 'entry_id,team_id' })

  return data
}

export async function getMyPicks(entryId) {
  const { data } = await supabase
    .from('picks').select('*, teams(name, seed, region), games(*)').eq('entry_id', entryId).order('round')
  return data || []
}

export async function getUsedTeams(entryId) {
  const { data } = await supabase
    .from('used_teams').select('team_id, teams(name, seed)').eq('entry_id', entryId)
  return data?.map(d => d.teams?.name) || []
}

// ─── Game Helpers ────────────────────────────────────────────

export async function getGamesForDate(date) {
  const { data } = await supabase
    .from('games')
    .select(`*, 
      team_a:teams!games_team_a_id_fkey(id, name, seed, region),
      team_b:teams!games_team_b_id_fkey(id, name, seed, region),
      spread_team:teams!games_spread_team_id_fkey(name)`)
    .eq('tournament_id', '00000000-0000-0000-0000-000000002026')
    .eq('game_date', date)
    .order('game_time')
  return data || []
}

export async function getGamesByRound(round) {
  const { data } = await supabase
    .from('games')
    .select(`*,
      team_a:teams!games_team_a_id_fkey(id, name, seed, region),
      team_b:teams!games_team_b_id_fkey(id, name, seed, region),
      winner:teams!games_winner_id_fkey(name, seed)`)
    .eq('tournament_id', '00000000-0000-0000-0000-000000002026')
    .eq('round', round)
    .order('game_date').order('game_time')
  return data || []
}

export async function getAllTeams() {
  const { data } = await supabase
    .from('teams').select('*')
    .eq('tournament_id', '00000000-0000-0000-0000-000000002026')
    .order('region').order('seed')
  return data || []
}

// ─── Realtime Subscriptions ──────────────────────────────────

export function subscribeToGames(callback) {
  return supabase
    .channel('games-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'games',
      filter: `tournament_id=eq.00000000-0000-0000-0000-000000002026`,
    }, callback)
    .subscribe()
}

export function subscribeToEntries(leagueId, callback) {
  return supabase
    .channel('entries-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'entries',
      filter: `league_id=eq.${leagueId}`,
    }, callback)
    .subscribe()
}

export function subscribeToPicks(callback) {
  return supabase
    .channel('picks-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'picks',
    }, callback)
    .subscribe()
}
