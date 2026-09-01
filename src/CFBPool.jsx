import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const API = import.meta.env.VITE_API_URL;

const C = {
  bg:"#F2EEE6", card:"#FBF9F5", navy:"#17203A", navyDeep:"#101830",
  cream:"#EFE7DA", creamDim:"rgba(239,231,218,0.62)",
  ink:"#17203A", inkMuted:"rgba(23,32,58,0.56)", inkFaint:"rgba(23,32,58,0.34)",
  hair:"rgba(23,32,58,0.10)", hairInk:"rgba(23,32,58,0.16)",
  brass:"#B08D3F", brassLt:"#C9A961",
  green:"#2F6E4A", greenBg:"rgba(47,110,74,0.10)",
  red:"#9E3B33", redBg:"rgba(158,59,51,0.09)",
};
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'Raleway', -apple-system, BlinkMacSystemFont, sans-serif";
const MINUS = "−";

const et = (iso, o) => new Date(iso).toLocaleString("en-US", { timeZone:"America/New_York", ...o });
const dayLabel  = iso => et(iso, { weekday:"long", month:"long", day:"numeric" });
const timeLabel = iso => et(iso, { hour:"numeric", minute:"2-digit" });
const lastWord  = s => String(s || "").split(" ").slice(-1)[0];

const Eyebrow = ({ children, tone = C.inkFaint, style }) => (
  <div style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:"0.22em",
    color:tone, textTransform:"uppercase", ...style }}>{children}</div>
);

const BrassRule = () => (
  <div style={{display:"flex",alignItems:"center",gap:14,margin:"22px 0 0"}}>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.brass}44,${C.brass}77)`}}/>
    <div style={{width:5,height:5,transform:"rotate(45deg)",background:C.brass,opacity:0.7}}/>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.brass}77,${C.brass}44,transparent)`}}/>
  </div>
);

// ═══════════════════════════════════════════════════════════════

export default function CFBPool({ userId }) {
  const [token, setToken]   = useState(null);
  const [season, setSeason] = useState(null);
  const [meta, setMeta]     = useState(null);
  const [week, setWeek]     = useState(null);
  const [data, setData]     = useState(null);
  const [board, setBoard]   = useState([]);
  const [view, setView]     = useState("board");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");

  const call = useCallback(async (path, opts = {}) => {
    const res = await fetch(API + "/api/cfb" + path, {
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

  const loadSeason = useCallback(() => {
    if (!token) return;
    call("/season")
      .then(d => { setSeason(d.season); setMeta(d); setWeek(w => w ?? d.current_week); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, call]);
  useEffect(loadSeason, [loadSeason]);

  const loadWeek = useCallback(() => {
    if (!token || !week) return;
    call(`/week/${week}`).then(setData).catch(e => setErr(e.message));
  }, [token, week, call]);
  useEffect(loadWeek, [loadWeek]);

  useEffect(() => {
    if (!token || view !== "board") call("/leaderboard").then(setBoard).catch(()=>{});
  }, [view, token, call]);

  useEffect(() => {
    const l = data?.lock_at;
    if (!l || data?.locked) return setCountdown("");
    const tick = () => {
      const ms = new Date(l) - Date.now();
      if (ms <= 0) return setCountdown("");
      const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000), m = Math.floor((ms%3600000)/60000);
      setCountdown(d > 0 ? `${d} day${d>1?"s":""}` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [data]);

  const pick = async (gameId, side) => {
    setSaving(true); setErr("");
    try { await call("/pick", { method:"POST", body: JSON.stringify({ game_id: gameId, side }) }); loadWeek(); }
    catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const buyBack = async () => {
    setSaving(true); setErr("");
    try { await call("/buyback", { method:"POST", body: "{}" }); loadSeason(); loadWeek(); }
    catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const page = { minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:SANS,
                 maxWidth:430, margin:"0 auto", paddingBottom:64 };
  const pad  = { padding:"0 28px" };

  if (loading) return (
    <div style={{...page, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <span style={{color:C.inkFaint, fontSize:13}}>Loading</span>
    </div>
  );

  if (!season) return (
    <div style={{...page, ...pad, paddingTop:80}}>
      <div style={{fontFamily:SERIF, fontSize:26, marginBottom:10}}>Season not set up yet</div>
      <div style={{fontSize:13, color:C.inkMuted, lineHeight:1.65}}>
        The college football survivor pool hasn{"’"}t been created.
      </div>
    </div>
  );

  const me      = meta?.me;
  const alive   = me?.status === "alive";
  const games   = data?.games || [];
  const locked  = data?.locked;
  const myPick  = data?.my_pick;
  const used    = new Set(data?.used_team_ids || []);

  // Group the board by day so a 22-game Saturday reads as a schedule.
  const byDay = games.reduce((acc, g) => {
    const k = dayLabel(g.kickoff_at);
    (acc[k] = acc[k] || []).push(g);
    return acc;
  }, {});

  const TeamRow = ({ game, side, last }) => {
    const name   = side === "home" ? game.home_team : game.away_team;
    const rank   = side === "home" ? game.home_rank : game.away_rank;
    const teamId = side === "home" ? game.home_team_id : game.away_team_id;
    const isUsed = used.has(teamId);
    const chosen = myPick?.game_id === game.id && myPick?.picked_side === side;
    const won    = game.status === "final" && game.winner_side === side;
    const lost   = game.status === "final" && game.winner_side && game.winner_side !== side;
    const line   = game.favorite === side && game.spread_value != null
      ? (Number(game.spread_value) === 0 ? "PK" : MINUS + game.spread_value) : "";
    const disabled = isUsed || locked || !alive || saving;

    return (
      <button disabled={disabled} onClick={()=>pick(game.id, side)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:10,
        padding:"13px 16px", border:"none", borderRadius:0,
        borderBottom: last ? "none" : `1px solid ${C.hair}`,
        background: chosen ? C.navy : "transparent",
        color: chosen ? C.cream : lost ? C.inkFaint : C.ink,
        cursor: disabled ? "default" : "pointer", textAlign:"left", fontFamily:SANS,
        opacity: isUsed ? 0.4 : 1, transition:"all 0.15s",
      }}>
        {rank && <span style={{fontFamily:SERIF, fontSize:15, fontWeight:600,
          color: chosen ? C.brassLt : C.brass, minWidth:22}}>{rank}</span>}
        {!rank && <span style={{minWidth:22}}/>}
        <span style={{flex:1, fontSize:14.5, fontWeight: chosen ? 600 : 500,
          textDecoration: lost ? "line-through" : "none"}}>{name}</span>
        {isUsed && <span style={{fontSize:9.5, letterSpacing:"0.1em", color:C.inkFaint}}>USED</span>}
        {won && <span style={{fontSize:9.5, fontWeight:700, letterSpacing:"0.12em", color:C.green}}>WON</span>}
        {line && <span style={{fontFamily:SERIF, fontSize:17, fontWeight:600,
          color: chosen ? C.brassLt : C.brass}}>{line}</span>}
      </button>
    );
  };

  return (
    <div style={page}>

      <div style={{...pad, paddingTop:22}}>
        <div style={{display:"flex", gap:2, padding:3, background:"rgba(23,32,58,0.06)", borderRadius:10}}>
          {[["board","This week"],["leaderboard","Leaderboard"]].map(([id,label]) => (
            <button key={id} onClick={()=>setView(id)} style={{
              flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer",
              fontFamily:SANS, fontSize:12, fontWeight:600,
              background: view===id ? C.card : "transparent",
              color: view===id ? C.ink : C.inkMuted,
              boxShadow: view===id ? "0 1px 3px rgba(23,32,58,0.12)" : "none",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {err && <div style={{...pad, fontSize:12.5, color:C.red, marginTop:18, lineHeight:1.6}}>{err}</div>}

      {/* ══ BOARD ══ */}
      {view === "board" && (
        <>
          <div style={{background:`linear-gradient(175deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
            padding:"28px 28px 24px", marginTop:22}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
              <Eyebrow tone={C.brassLt}>Week {week}</Eyebrow>
              <span style={{fontSize:11, color:C.creamDim}}>
                {games.length} ranked {games.length === 1 ? "game" : "games"}
              </span>
            </div>

            <div style={{fontFamily:SERIF, fontSize:32, fontWeight:500, color:C.cream,
              margin:"12px 0 0", lineHeight:1.1, letterSpacing:"-0.015em"}}>
              {!alive ? "You’re out"
                : myPick ? myPick.picked_team
                : locked ? "No pick in" : "Pick a winner"}
            </div>

            <div style={{fontSize:11.5, color:C.creamDim, marginTop:9, lineHeight:1.65}}>
              {!alive
                ? `Knocked out in week ${me?.eliminated_week}. ${meta?.can_buy_back ? `Buy back in for $${season.buyback_fee}.` : "Buy-backs are closed."}`
                : locked
                  ? "Board locked."
                  : countdown
                    ? `Everything locks in ${countdown}, at the first ranked kickoff.`
                    : "Locks at the first ranked kickoff."}
            </div>

            {!alive && meta?.can_buy_back && (
              <button disabled={saving} onClick={buyBack} style={{
                marginTop:16, width:"100%", padding:"14px", borderRadius:9,
                background:C.brass, border:"none", color:"#fff",
                fontFamily:SANS, fontSize:13, fontWeight:700, letterSpacing:"0.08em",
                cursor: saving ? "wait" : "pointer",
              }}>BUY BACK IN {MINUS} ${season.buyback_fee}</button>
            )}

            <BrassRule/>
            <div style={{fontSize:10, color:"rgba(239,231,218,0.42)", letterSpacing:"0.18em",
              textAlign:"center", marginTop:13}}>
              POT ${Number(meta?.pot || 0).toLocaleString()}
            </div>
          </div>

          <div style={{...pad, paddingTop:26}}>
            {games.length === 0 && (
              <div style={{fontSize:13, color:C.inkMuted, lineHeight:1.65}}>
                The board for week {week} hasn{"’"}t been posted yet. It goes up Tuesday, once the new
                AP Top 25 is out.
              </div>
            )}

            {Object.entries(byDay).map(([day, list]) => (
              <div key={day} style={{marginBottom:30}}>
                <Eyebrow style={{marginBottom:12}}>{day}</Eyebrow>
                {list.map(g => (
                  <div key={g.id} style={{marginBottom:14, border:`1px solid ${C.hairInk}`,
                    borderRadius:10, overflow:"hidden", background:C.card}}>
                    <TeamRow game={g} side="away"/>
                    <TeamRow game={g} side="home" last/>
                    <div style={{display:"flex", justifyContent:"space-between",
                      padding:"9px 16px", background:"rgba(23,32,58,0.03)",
                      fontSize:11, color:C.inkFaint}}>
                      <span>{timeLabel(g.kickoff_at)} ET</span>
                      <span>
                        {g.spread_value == null
                          ? "No line"
                          : `${(g.favorite === "home" ? g.home_abbr : g.away_abbr)} ${Number(g.spread_value)===0 ? "PK" : MINUS + g.spread_value}`}
                        {g.status === "final" && ` · ${g.away_score}${MINUS}${g.home_score} final`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div style={{display:"flex", justifyContent:"space-between", marginTop:10}}>
              <button onClick={()=>setWeek(w => Math.max(1, w-1))} disabled={week<=1}
                style={navBtn(week<=1)}>{"‹"} Week {week-1}</button>
              <button onClick={()=>setWeek(w => w+1)} style={navBtn(false)}>Week {week+1} {"›"}</button>
            </div>
          </div>
        </>
      )}

      {/* ══ LEADERBOARD ══ */}
      {view === "leaderboard" && (
        <div style={{...pad, paddingTop:30}}>
          <Eyebrow>Who{"’"}s left</Eyebrow>
          <div style={{marginTop:18}}>
            {board.map((p, i) => (
              <div key={p.player_id} style={{padding:"20px 0",
                borderBottom: i === board.length-1 ? "none" : `1px solid ${C.hair}`}}>
                <div style={{display:"flex", alignItems:"baseline", gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:SERIF, fontSize:23, fontWeight:600,
                      color: p.status === "alive" ? C.ink : C.inkFaint}}>
                      {p.user_id === userId ? "You" : p.display_name}
                    </div>
                    <div style={{fontSize:11.5, color:C.inkMuted, marginTop:4}}>
                      {p.status === "alive"
                        ? `Alive · ${p.wins} correct`
                        : `Out in week ${p.eliminated_week}`}
                      {p.buybacks > 0 && ` · ${p.buybacks} buy-back${p.buybacks>1?"s":""}`}
                    </div>
                  </div>
                  <span style={{fontSize:9.5, fontWeight:700, letterSpacing:"0.14em",
                    color: p.status === "alive" ? C.green : C.red}}>
                    {p.status === "alive" ? "ALIVE" : "OUT"}
                  </span>
                </div>

                <div style={{display:"flex", flexWrap:"wrap", gap:6, marginTop:12}}>
                  {(p.teams_used || []).length === 0 && (
                    <span style={{fontSize:11.5, color:C.inkFaint}}>No teams used yet</span>
                  )}
                  {(p.teams_used || []).map((t, k) => (
                    <span key={k} style={{fontSize:11, padding:"4px 10px", borderRadius:20,
                      background:"rgba(23,32,58,0.05)", border:`1px solid ${C.hair}`,
                      color:C.inkMuted}}>{lastWord(t)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{fontSize:11.5, color:C.inkFaint, marginTop:26, lineHeight:1.7}}>
            Teams are one and done. Buying back in doesn{"’"}t return the ones you already burned.
          </div>
        </div>
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
