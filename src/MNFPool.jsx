import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const API = import.meta.env.VITE_API_URL;

// Parchment ground, deep navy type, brass for one thing at a time.
const C = {
  bg:        "#F5F2ED",
  ink:       "#1A1F2E",
  inkMuted:  "rgba(26,31,46,0.56)",
  inkFaint:  "rgba(26,31,46,0.34)",
  hair:      "rgba(26,31,46,0.09)",
  hairSolid: "rgba(26,31,46,0.14)",
  gold:      "#A87B2E",
  goldWash:  "rgba(168,123,46,0.07)",
  green:     "#2F7D4F",
  red:       "#A83A34",
};
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'Raleway', -apple-system, BlinkMacSystemFont, sans-serif";
const MINUS = "−";   // real minus sign, not a hyphen
const NDASH = "–";

// ─── formatting ───────────────────────────────────────────────
const et = (iso, opts) => new Date(iso).toLocaleString("en-US", { timeZone:"America/New_York", ...opts });
const dayOf   = iso => et(iso, { weekday:"long", month:"long", day:"numeric" });
const shortDay= iso => et(iso, { month:"short", day:"numeric" });
const timeOf  = iso => et(iso, { hour:"numeric", minute:"2-digit" });

const teamOf   = (g, side) => side === "home" ? g.home_team : g.away_team;
const lastWord = s => String(s || "").split(" ").slice(-1)[0];

// The line as it reads for one side.
function lineFor(game, side) {
  if (game?.spread_value == null) return "";
  if (Number(game.spread_value) === 0) return "PK";
  return (game.favorite === side ? MINUS : "+") + game.spread_value;
}

// ─── primitives ───────────────────────────────────────────────
const Eyebrow = ({ children, style }) => (
  <div style={{ fontFamily:SANS, fontSize:10, fontWeight:700, letterSpacing:"0.2em",
    color:C.inkFaint, textTransform:"uppercase", ...style }}>{children}</div>
);

const Rule = ({ space = 32 }) => (
  <div style={{ height:1, background:C.hair, margin:`${space}px 0` }} />
);

// ═══════════════════════════════════════════════════════════════

export default function MNFPool({ userId }) {
  const [token, setToken]       = useState(null);
  const [season, setSeason]     = useState(null);
  const [week, setWeek]         = useState(null);
  const [maxWeek, setMaxWeek]   = useState(17);
  const [data, setData]         = useState(null);
  const [standings, setStandings] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [view, setView]         = useState("week");
  const [countdown, setCountdown] = useState("");
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(null);   // side awaiting confirmation
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(true);

  const call = useCallback(async (path, opts = {}) => {
    const res = await fetch(API + "/api/mnf" + path, {
      ...opts,
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}`, ...(opts.headers||{}) },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Something went wrong");
    return body;
  }, [token]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data?.session?.access_token || null));
  }, []);

  useEffect(() => {
    if (!token) return;
    call("/season")
      .then(d => { setSeason(d.season); setWeek(d.current_week || 1); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, call]);

  const loadWeek = useCallback(() => {
    if (!token || !week) return;
    call(`/week/${week}`).then(d => { setData(d); setConfirm(null); }).catch(e => setErr(e.message));
  }, [token, week, call]);
  useEffect(loadWeek, [loadWeek]);

  useEffect(() => {
    if (!token) return;
    if (view === "standings") call("/standings").then(setStandings).catch(()=>{});
    if (view === "schedule")  call("/schedule").then(d => {
      setSchedule(d); if (d.length) setMaxWeek(Math.max(...d.map(w => w.week_no)));
    }).catch(()=>{});
  }, [view, token, call]);

  useEffect(() => {
    const k = data?.game?.kickoff_at;
    if (!k) return;
    const tick = () => {
      const ms = new Date(k) - Date.now();
      if (ms <= 0) return setCountdown("");
      const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000), m = Math.floor((ms%3600000)/60000);
      setCountdown(d > 0 ? `${d} day${d>1?"s":""}` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [data]);

  const submit = async (matchupId, side) => {
    setSaving(true); setErr("");
    try {
      await call("/pick", { method:"POST", body: JSON.stringify({ matchup_id: matchupId, side }) });
      loadWeek();
    } catch (e) { setErr(e.message); setConfirm(null); }
    setSaving(false);
  };

  // ─── shell ──────────────────────────────────────────────────
  const page = {
    minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:SANS,
    maxWidth:430, margin:"0 auto", padding:"0 28px 64px",
  };

  if (loading) return (
    <div style={{...page, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <span style={{color:C.inkFaint, fontSize:13}}>Loading</span>
    </div>
  );

  if (!season) return (
    <div style={{...page, paddingTop:80}}>
      <div style={{fontFamily:SERIF, fontSize:26, marginBottom:10}}>Season not set up yet</div>
      <div style={{fontSize:13, color:C.inkMuted, lineHeight:1.65}}>
        The 2026 Monday Night Football season hasn{"’"}t been created.
      </div>
    </div>
  );

  const game     = data?.game;
  const matchups = data?.matchups || [];
  const mine     = matchups.find(m => m.picker?.user_id === userId || m.opponent?.user_id === userId);
  const other    = matchups.find(m => m !== mine);
  const iPick    = mine && mine.picker?.user_id === userId;
  const locked   = data?.locked;
  const hasLine  = !!game?.spread_frozen_at;
  const final    = game?.status === "final";

  return (
    <div style={page}>

      {/* segmented control */}
      <div style={{display:"flex", gap:2, padding:2, marginTop:22, marginBottom:38,
        background:"rgba(26,31,46,0.05)", borderRadius:9}}>
        {[["week","Week"],["standings","Standings"],["schedule","Schedule"]].map(([id,label]) => (
          <button key={id} onClick={()=>setView(id)} style={{
            flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer",
            fontFamily:SANS, fontSize:12, fontWeight:600, letterSpacing:"0.01em",
            background: view===id ? "#FFFFFF" : "transparent",
            color: view===id ? C.ink : C.inkMuted,
            boxShadow: view===id ? "0 1px 3px rgba(26,31,46,0.10)" : "none",
            transition:"all 0.18s",
          }}>{label}</button>
        ))}
      </div>

      {err && (
        <div style={{fontSize:12.5, color:C.red, marginBottom:24, lineHeight:1.6}}>{err}</div>
      )}

      {/* ══ WEEK ══ */}
      {view === "week" && (!game ? (
        <div style={{fontSize:13, color:C.inkMuted}}>No game scheduled for week {week} yet.</div>
      ) : (
        <>
          {/* the game */}
          <Eyebrow>Week {game.week_no}</Eyebrow>
          <h1 style={{fontFamily:SERIF, fontSize:40, fontWeight:600, lineHeight:1.04,
            letterSpacing:"-0.02em", margin:"12px 0 0"}}>
            {game.away_team}
            <span style={{display:"block", fontSize:24, fontStyle:"italic",
              color:C.inkFaint, margin:"4px 0"}}>at</span>
            {game.home_team}
          </h1>

          <div style={{marginTop:20, fontSize:13, color:C.inkMuted}}>
            {dayOf(game.kickoff_at)} {"·"} {timeOf(game.kickoff_at)} ET
          </div>

          {/* the number */}
          <div style={{marginTop:30}}>
            {hasLine ? (
              <>
                <div style={{fontFamily:SERIF, fontSize:44, fontWeight:600, color:C.gold,
                  lineHeight:1, letterSpacing:"-0.02em"}}>
                  {lastWord(teamOf(game, game.favorite))}{" "}
                  {Number(game.spread_value) === 0 ? "PK" : MINUS + game.spread_value}
                </div>
                <div style={{fontSize:12, color:C.inkFaint, marginTop:9, lineHeight:1.6}}>
                  Frozen Wednesday. This number grades the week.
                  {!locked && countdown && ` Locks in ${countdown}.`}
                  {locked && !final && " Locked."}
                </div>
              </>
            ) : (
              <div style={{fontFamily:SERIF, fontSize:22, fontStyle:"italic", color:C.inkMuted}}>
                The spread freezes Wednesday morning.
              </div>
            )}
          </div>

          {/* final score */}
          {final && (
            <div style={{marginTop:26, display:"flex", gap:28}}>
              {[["away", game.away_team, game.away_score], ["home", game.home_team, game.home_score]].map(([side,name,score]) => (
                <div key={side}>
                  <div style={{fontSize:11, color:C.inkFaint, letterSpacing:"0.06em"}}>{lastWord(name)}</div>
                  <div style={{fontFamily:SERIF, fontSize:36, fontWeight:600, lineHeight:1.1}}>{score}</div>
                </div>
              ))}
            </div>
          )}

          <Rule />

          {/* your matchup */}
          {!mine ? (
            <div style={{fontSize:13, color:C.inkMuted}}>You{"’"}re not scheduled this week.</div>
          ) : (
            <>
              <Eyebrow>{iPick ? "Your pick" : `${mine.picker?.display_name} picks`}</Eyebrow>

              {/* choosing */}
              {iPick && !mine.picked_side && hasLine && !locked && (
                <>
                  <div style={{fontSize:13.5, color:C.inkMuted, margin:"14px 0 20px", lineHeight:1.6}}>
                    Take a side. {mine.opponent?.display_name} gets the other one.
                  </div>
                  {["away","home"].map(side => {
                    const armed = confirm === side;
                    return (
                      <button key={side} disabled={saving}
                        onClick={()=> armed ? submit(mine.id, side) : setConfirm(side)}
                        style={{
                          width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
                          padding:"20px 20px", marginBottom:10, borderRadius:12, cursor:saving?"wait":"pointer",
                          fontFamily:SANS, textAlign:"left", transition:"all 0.18s",
                          background: armed ? C.ink : "#FFFFFF",
                          color: armed ? C.bg : C.ink,
                          border: `1px solid ${armed ? C.ink : C.hairSolid}`,
                        }}>
                        <span style={{fontSize:15.5, fontWeight:600}}>
                          {armed ? `Confirm ${lastWord(teamOf(game, side))}` : teamOf(game, side)}
                        </span>
                        <span style={{fontFamily:SERIF, fontSize:23, fontWeight:600,
                          color: armed ? C.bg : C.gold}}>{lineFor(game, side)}</span>
                      </button>
                    );
                  })}
                  {confirm && (
                    <button onClick={()=>setConfirm(null)} style={{background:"none", border:"none",
                      cursor:"pointer", color:C.inkFaint, fontSize:12, fontFamily:SANS, padding:"6px 0"}}>
                      Cancel
                    </button>
                  )}
                </>
              )}

              {iPick && !hasLine && (
                <div style={{fontSize:13.5, color:C.inkMuted, marginTop:14, lineHeight:1.6}}>
                  You{"’"}re on the clock once the spread freezes.
                </div>
              )}

              {/* decided */}
              {mine.picked_side && (
                <div style={{marginTop:16}}>
                  {[
                    { who: mine.picker?.display_name,   side: mine.picked_side, isPicker:true },
                    { who: mine.opponent?.display_name, side: mine.picked_side === "home" ? "away" : "home", isPicker:false },
                  ].map((row, i) => {
                    const decided = mine.result !== "pending";
                    const won = decided && ((row.isPicker && mine.result === "picker") || (!row.isPicker && mine.result === "opponent"));
                    return (
                      <div key={i} style={{display:"flex", alignItems:"baseline", gap:12,
                        padding:"16px 0", borderBottom: i === 0 ? `1px solid ${C.hair}` : "none"}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15, fontWeight:600,
                            color: decided && !won ? C.inkFaint : C.ink}}>
                            {row.isPicker && row.who === mine.picker?.display_name && iPick ? "You" : row.who}
                          </div>
                          <div style={{fontSize:12.5, color:C.inkMuted, marginTop:4}}>
                            {teamOf(game, row.side)} {lineFor(game, row.side)}
                          </div>
                        </div>
                        {decided && (
                          <span style={{fontSize:11, fontWeight:700, letterSpacing:"0.14em",
                            color: won ? C.green : C.inkFaint}}>{won ? "WON" : "LOST"}</span>
                        )}
                      </div>
                    );
                  })}

                  {(mine.auto_assigned || mine.is_push) && (
                    <div style={{fontSize:12, color:C.inkFaint, marginTop:14, lineHeight:1.65}}>
                      {mine.auto_assigned && "No pick came in before kickoff, so the favorite was assigned. "}
                      {mine.is_push && "The game landed on the number. A push goes to the non-picker."}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* the other matchup */}
          {other && (
            <>
              <Rule />
              <Eyebrow>Also this week</Eyebrow>
              <div style={{display:"flex", alignItems:"baseline", gap:12, marginTop:14}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:15, fontWeight:600}}>
                    {other.picker?.display_name} <span style={{color:C.inkFaint, fontWeight:400}}>vs</span> {other.opponent?.display_name}
                  </div>
                  <div style={{fontSize:12.5, color:C.inkMuted, marginTop:4}}>
                    {other.picked_side
                      ? `${other.picker?.display_name} took ${teamOf(game, other.picked_side)} ${lineFor(game, other.picked_side)}`
                      : "No pick yet"}
                  </div>
                </div>
                {other.result !== "pending" && (
                  <span style={{fontSize:11, fontWeight:700, letterSpacing:"0.14em", color:C.inkMuted}}>
                    {(other.result === "picker" ? other.picker : other.opponent)?.display_name?.toUpperCase()}
                  </span>
                )}
              </div>
            </>
          )}

          {/* week nav */}
          <div style={{display:"flex", justifyContent:"space-between", marginTop:44}}>
            <button onClick={()=>setWeek(w => Math.max(1, w-1))} disabled={week<=1} style={navBtn(week<=1)}>
              {"‹"} Week {week-1}
            </button>
            <button onClick={()=>setWeek(w => Math.min(maxWeek, w+1))} disabled={week>=maxWeek} style={navBtn(week>=maxWeek)}>
              Week {week+1} {"›"}
            </button>
          </div>
        </>
      ))}

      {/* ══ STANDINGS ══ */}
      {view === "standings" && (
        <>
          <Eyebrow>Season standings</Eyebrow>
          <div style={{marginTop:18}}>
            {standings.map((s, i) => (
              <div key={s.player_id} style={{display:"flex", alignItems:"center", gap:18,
                padding:"20px 0", borderBottom: i === standings.length-1 ? "none" : `1px solid ${C.hair}`}}>
                <span style={{fontFamily:SERIF, fontSize:19, width:16,
                  color: i===0 ? C.gold : C.inkFaint}}>{i+1}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:16, fontWeight:600}}>
                    {s.user_id === userId ? "You" : s.display_name}
                  </div>
                  <div style={{fontSize:12, color:C.inkMuted, marginTop:4}}>
                    {s.wins}{NDASH}{s.losses} {"·"} picked {s.times_picking}{"×"}
                  </div>
                </div>
                <span style={{fontFamily:SERIF, fontSize:30, fontWeight:600,
                  color: i===0 ? C.gold : C.ink, lineHeight:1}}>{s.points}</span>
              </div>
            ))}
          </div>
          {season.entry_fee > 0 && standings.length > 0 && (
            <div style={{fontSize:12, color:C.inkFaint, marginTop:26, lineHeight:1.6}}>
              Season pot {"·"} ${(season.entry_fee * standings.length).toFixed(0)}
            </div>
          )}
        </>
      )}

      {/* ══ SCHEDULE ══ */}
      {view === "schedule" && (
        <>
          <Eyebrow>Full season</Eyebrow>
          <div style={{marginTop:18}}>
            {schedule.map((w, i) => (
              <div key={w.week_no} style={{padding:"18px 0",
                borderBottom: i === schedule.length-1 ? "none" : `1px solid ${C.hair}`}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                  <span style={{fontSize:13, fontWeight:600}}>Week {w.week_no}</span>
                  <span style={{fontSize:12, color:C.inkMuted}}>
                    {w.game ? `${lastWord(w.game.away_team)} at ${lastWord(w.game.home_team)}` : "TBD"}
                    {w.game && ` · ${shortDay(w.game.kickoff_at)}`}
                  </span>
                </div>
                {w.matchups.map(m => {
                  const involved = m.picker?.user_id === userId || m.opponent?.user_id === userId;
                  const winner = m.result === "picker" ? m.picker : m.result === "opponent" ? m.opponent : null;
                  return (
                    <div key={m.id} style={{fontSize:12.5, marginTop:7,
                      color: involved ? C.ink : C.inkMuted}}>
                      <span style={{fontWeight:600}}>{m.picker?.display_name}</span>
                      <span style={{color:C.inkFaint}}> picks vs </span>
                      {m.opponent?.display_name}
                      {winner && <span style={{color:C.inkFaint}}> {"·"} {winner.display_name} won</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function navBtn(disabled) {
  return {
    background:"none", border:"none", padding:"6px 0", fontFamily:SANS, fontSize:12.5,
    fontWeight:600, cursor: disabled ? "default" : "pointer",
    color: disabled ? "transparent" : C.inkMuted,
    pointerEvents: disabled ? "none" : "auto",
  };
}
