import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const API = import.meta.env.VITE_API_URL;

// Parchment and navy, brass for the one thing that matters on screen.
const C = {
  bg:       "#F2EEE6",
  card:     "#FBF9F5",
  navy:     "#17203A",
  navyDeep: "#101830",
  cream:    "#EFE7DA",
  creamDim: "rgba(239,231,218,0.62)",
  ink:      "#17203A",
  inkMuted: "rgba(23,32,58,0.56)",
  inkFaint: "rgba(23,32,58,0.34)",
  hair:     "rgba(23,32,58,0.10)",
  hairInk:  "rgba(23,32,58,0.16)",
  brass:    "#B08D3F",
  brassLt:  "#C9A961",
  green:    "#2F6E4A",
  red:      "#9E3B33",
};
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'Raleway', -apple-system, BlinkMacSystemFont, sans-serif";
const MINUS = "−";
const NDASH = "–";

// ─── formatting ───────────────────────────────────────────────
const et = (iso, o) => new Date(iso).toLocaleString("en-US", { timeZone:"America/New_York", ...o });
const dayOf    = iso => et(iso, { weekday:"long", month:"long", day:"numeric" });
const shortDay = iso => et(iso, { month:"short", day:"numeric" });
const timeOf   = iso => et(iso, { hour:"numeric", minute:"2-digit" });

// The line freezes the Wednesday before a Monday kickoff.
const freezeDay = iso =>
  et(new Date(new Date(iso).getTime() - 5 * 86400000).toISOString(),
     { weekday:"long", month:"long", day:"numeric" });

const teamOf   = (g, side) => side === "home" ? g.home_team : g.away_team;
const lastWord = s => String(s || "").split(" ").slice(-1)[0];

function lineFor(game, side) {
  if (game?.spread_value == null) return "";
  if (Number(game.spread_value) === 0) return "PK";
  return (game.favorite === side ? MINUS : "+") + game.spread_value;
}

// ─── primitives ───────────────────────────────────────────────
const Eyebrow = ({ children, tone = C.inkFaint, style }) => (
  <div style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:"0.22em",
    color:tone, textTransform:"uppercase", ...style }}>{children}</div>
);

const Rule = ({ space = 34 }) => (
  <div style={{ height:1, background:C.hair, margin:`${space}px 0` }} />
);

const BrassRule = () => (
  <div style={{display:"flex",alignItems:"center",gap:14,margin:"26px 0 0"}}>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.brass}44,${C.brass}77)`}}/>
    <div style={{width:5,height:5,transform:"rotate(45deg)",background:C.brass,opacity:0.7}}/>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.brass}77,${C.brass}44,transparent)`}}/>
  </div>
);

// ═══════════════════════════════════════════════════════════════

export default function MNFPool({ userId }) {
  const [token, setToken]         = useState(null);
  const [season, setSeason]       = useState(null);
  const [week, setWeek]           = useState(null);
  const [maxWeek, setMaxWeek]     = useState(17);
  const [data, setData]           = useState(null);
  const [standings, setStandings] = useState([]);
  const [schedule, setSchedule]   = useState([]);
  const [view, setView]           = useState("week");
  const [countdown, setCountdown] = useState("");
  const [saving, setSaving]       = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [err, setErr]             = useState("");
  const [loading, setLoading]     = useState(true);

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

  const page = {
    minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:SANS,
    maxWidth:430, margin:"0 auto", paddingBottom:64,
  };
  const pad = { padding:"0 28px" };

  if (loading) return (
    <div style={{...page, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <span style={{color:C.inkFaint, fontSize:13}}>Loading</span>
    </div>
  );

  if (!season) return (
    <div style={{...page, ...pad, paddingTop:80}}>
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

  // One row per side. Used live for picking and greyed as a preview beforehand.
  const SideRow = ({ side, disabled, armed, onClick }) => (
    <button disabled={disabled || saving} onClick={onClick} style={{
      width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"19px 20px", marginBottom:10, borderRadius:10,
      cursor: disabled ? "default" : saving ? "wait" : "pointer",
      fontFamily:SANS, textAlign:"left", transition:"all 0.18s",
      background: armed ? C.navy : disabled ? "transparent" : C.card,
      color: armed ? C.cream : disabled ? C.inkFaint : C.ink,
      border: `1px solid ${armed ? C.navy : disabled ? C.hair : C.hairInk}`,
      opacity: disabled ? 0.72 : 1,
    }}>
      <span style={{fontSize:15.5, fontWeight:600}}>
        {armed ? `Confirm ${lastWord(teamOf(game, side))}` : teamOf(game, side)}
      </span>
      <span style={{fontFamily:SERIF, fontSize:24, fontWeight:600,
        color: armed ? C.cream : disabled ? C.inkFaint : C.brass}}>
        {disabled && !hasLine ? NDASH : lineFor(game, side)}
      </span>
    </button>
  );

  return (
    <div style={page}>

      {/* segmented control */}
      <div style={{...pad, paddingTop:22}}>
        <div style={{display:"flex", gap:2, padding:3,
          background:"rgba(23,32,58,0.06)", borderRadius:10}}>
          {[["week","Week"],["standings","Standings"],["schedule","Schedule"]].map(([id,label]) => (
            <button key={id} onClick={()=>setView(id)} style={{
              flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer",
              fontFamily:SANS, fontSize:12, fontWeight:600,
              background: view===id ? C.card : "transparent",
              color: view===id ? C.ink : C.inkMuted,
              boxShadow: view===id ? "0 1px 3px rgba(23,32,58,0.12)" : "none",
              transition:"all 0.18s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {err && <div style={{...pad, fontSize:12.5, color:C.red, marginTop:20, lineHeight:1.6}}>{err}</div>}

      {/* ══ WEEK ══ */}
      {view === "week" && (!data ? (
        // Week data is still in flight. Without this the screen briefly claims
        // there is no game, which reads as a broken app rather than a slow one.
        <div style={{...pad, marginTop:30, fontSize:13, color:C.inkFaint}}>Loading</div>
      ) : !game ? (
        <div style={{...pad, marginTop:30, fontSize:13, color:C.inkMuted}}>
          No game scheduled for week {week} yet.
        </div>
      ) : (
        <>
          {/* navy noticeboard */}
          <div style={{background:`linear-gradient(175deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
            padding:"30px 28px 26px", marginTop:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <Eyebrow tone={C.brassLt}>Week {game.week_no}</Eyebrow>
              <span style={{fontSize:11,color:C.creamDim,fontFamily:SANS}}>
                {shortDay(game.kickoff_at)} {"·"} {timeOf(game.kickoff_at)} ET
              </span>
            </div>

            <h1 style={{fontFamily:SERIF, fontSize:36, fontWeight:500, lineHeight:1.06,
              letterSpacing:"-0.018em", margin:"16px 0 0", color:C.cream}}>
              {game.away_team}
              <span style={{display:"block", fontSize:20, fontStyle:"italic",
                color:"rgba(239,231,218,0.44)", margin:"3px 0"}}>at</span>
              {game.home_team}
            </h1>

            <BrassRule/>

            <div style={{marginTop:20, textAlign:"center"}}>
              {hasLine ? (
                <>
                  <div style={{fontFamily:SERIF, fontSize:42, fontWeight:600, color:C.brassLt,
                    lineHeight:1, letterSpacing:"-0.02em"}}>
                    {lastWord(teamOf(game, game.favorite))}{" "}
                    {Number(game.spread_value) === 0 ? "PK" : MINUS + game.spread_value}
                  </div>
                  <div style={{fontSize:11, color:C.creamDim, marginTop:11, lineHeight:1.65}}>
                    Frozen {shortDay(game.spread_frozen_at)}. This number grades the week.
                    {!locked && countdown && ` Locks in ${countdown}.`}
                    {locked && !final && " Locked."}
                  </div>
                </>
              ) : (
                <>
                  <div style={{fontFamily:SERIF, fontSize:26, fontStyle:"italic",
                    color:"rgba(239,231,218,0.55)"}}>Line not set</div>
                  <div style={{fontSize:11, color:C.creamDim, marginTop:10, lineHeight:1.65}}>
                    Freezes {freezeDay(game.kickoff_at)} at 9:00 AM
                  </div>
                </>
              )}
            </div>

            {final && (
              <div style={{marginTop:24, display:"flex", justifyContent:"center", gap:40}}>
                {[[game.away_team, game.away_score], [game.home_team, game.home_score]].map(([name,score],i) => (
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontSize:10, color:C.creamDim, letterSpacing:"0.1em"}}>
                      {lastWord(name).toUpperCase()}
                    </div>
                    <div style={{fontFamily:SERIF, fontSize:38, fontWeight:600,
                      color:C.cream, lineHeight:1.15}}>{score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{...pad, paddingTop:30}}>
            {!mine ? (
              <div style={{fontSize:13, color:C.inkMuted}}>You{"’"}re not scheduled this week.</div>
            ) : (
              <>
                <Eyebrow>Your matchup</Eyebrow>
                <div style={{fontFamily:SERIF, fontSize:26, fontWeight:600, marginTop:10,
                  letterSpacing:"-0.01em"}}>
                  {iPick ? `You vs ${mine.opponent?.display_name}` : `${mine.picker?.display_name} vs you`}
                </div>

                {/* your pick, line is live */}
                {iPick && !mine.picked_side && hasLine && !locked && (
                  <>
                    <div style={{fontSize:13.5, color:C.inkMuted, margin:"12px 0 20px", lineHeight:1.65}}>
                      Take a side. {mine.opponent?.display_name} gets the other one.
                    </div>
                    {["away","home"].map(side => (
                      <SideRow key={side} side={side} armed={confirm === side}
                        onClick={()=> confirm === side ? submit(mine.id, side) : setConfirm(side)}/>
                    ))}
                    {confirm && (
                      <button onClick={()=>setConfirm(null)} style={{background:"none", border:"none",
                        cursor:"pointer", color:C.inkFaint, fontSize:12, fontFamily:SANS, padding:"6px 0"}}>
                        Cancel
                      </button>
                    )}
                  </>
                )}

                {/* your pick, but the line hasn't frozen yet — show what's coming */}
                {iPick && !mine.picked_side && !hasLine && (
                  <>
                    <div style={{fontSize:13.5, color:C.inkMuted, margin:"12px 0 20px", lineHeight:1.65}}>
                      This one is yours. You{"’"}ll take a side here and {mine.opponent?.display_name} gets
                      the other. Opens {freezeDay(game.kickoff_at)}, once the line freezes.
                    </div>
                    {["away","home"].map(side => <SideRow key={side} side={side} disabled/>)}
                  </>
                )}

                {/* waiting on the other guy */}
                {!iPick && !mine.picked_side && (
                  <div style={{fontSize:13.5, color:C.inkMuted, marginTop:12, lineHeight:1.65}}>
                    {hasLine
                      ? `${mine.picker?.display_name} is on the clock. You get whichever side he doesn${"’"}t take.`
                      : `${mine.picker?.display_name} picks on ${freezeDay(game.kickoff_at)}, once the line freezes. You get the other side.`}
                  </div>
                )}

                {iPick && !mine.picked_side && hasLine && locked && (
                  <div style={{fontSize:13.5, color:C.red, marginTop:12, lineHeight:1.65}}>
                    The deadline passed — the favorite was assigned to you.
                  </div>
                )}

                {/* decided */}
                {mine.picked_side && (
                  <div style={{marginTop:18}}>
                    {[
                      { who: mine.picker?.display_name,   side: mine.picked_side, isPicker:true },
                      { who: mine.opponent?.display_name, side: mine.picked_side === "home" ? "away" : "home", isPicker:false },
                    ].map((row, i) => {
                      const decided = mine.result !== "pending";
                      const won = decided && ((row.isPicker && mine.result === "picker") || (!row.isPicker && mine.result === "opponent"));
                      const isMe = (row.isPicker && iPick) || (!row.isPicker && !iPick);
                      return (
                        <div key={i} style={{display:"flex", alignItems:"baseline", gap:12,
                          padding:"16px 0", borderBottom: i === 0 ? `1px solid ${C.hair}` : "none"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:15, fontWeight:600,
                              color: decided && !won ? C.inkFaint : C.ink}}>
                              {isMe ? "You" : row.who}
                            </div>
                            <div style={{fontSize:12.5, color:C.inkMuted, marginTop:4}}>
                              {teamOf(game, row.side)} {lineFor(game, row.side)}
                            </div>
                          </div>
                          {decided && (
                            <span style={{fontSize:10, fontWeight:700, letterSpacing:"0.16em",
                              color: won ? C.green : C.inkFaint}}>{won ? "WON" : "LOST"}</span>
                          )}
                        </div>
                      );
                    })}
                    {(mine.auto_assigned || mine.is_push) && (
                      <div style={{fontSize:12, color:C.inkFaint, marginTop:14, lineHeight:1.7}}>
                        {mine.auto_assigned && "No pick came in before kickoff, so the favorite was assigned. "}
                        {mine.is_push && "The game landed on the number. A push goes to the non-picker."}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {other && (
              <>
                <Rule/>
                <Eyebrow>Also this week</Eyebrow>
                <div style={{display:"flex", alignItems:"baseline", gap:12, marginTop:14}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15, fontWeight:600}}>
                      {other.picker?.display_name} <span style={{color:C.inkFaint, fontWeight:400}}>vs</span> {other.opponent?.display_name}
                    </div>
                    <div style={{fontSize:12.5, color:C.inkMuted, marginTop:4}}>
                      {other.picked_side
                        ? `${other.picker?.display_name} took ${teamOf(game, other.picked_side)} ${lineFor(game, other.picked_side)}`
                        : `${other.picker?.display_name} picks`}
                    </div>
                  </div>
                  {other.result !== "pending" && (
                    <span style={{fontSize:10, fontWeight:700, letterSpacing:"0.16em", color:C.inkMuted}}>
                      {(other.result === "picker" ? other.picker : other.opponent)?.display_name?.toUpperCase()}
                    </span>
                  )}
                </div>
              </>
            )}

            <div style={{display:"flex", justifyContent:"space-between", marginTop:44}}>
              <button onClick={()=>setWeek(w => Math.max(1, w-1))} disabled={week<=1} style={navBtn(week<=1)}>
                {"‹"} Week {week-1}
              </button>
              <button onClick={()=>setWeek(w => Math.min(maxWeek, w+1))} disabled={week>=maxWeek} style={navBtn(week>=maxWeek)}>
                Week {week+1} {"›"}
              </button>
            </div>
          </div>
        </>
      ))}

      {/* ══ STANDINGS ══ */}
      {view === "standings" && (
        <div style={{...pad, paddingTop:30}}>
          <Eyebrow>Season standings</Eyebrow>
          <div style={{marginTop:18}}>
            {standings.map((s, i) => (
              <div key={s.player_id} style={{display:"flex", alignItems:"center", gap:18,
                padding:"20px 0", borderBottom: i === standings.length-1 ? "none" : `1px solid ${C.hair}`}}>
                <span style={{fontFamily:SERIF, fontSize:20, width:16,
                  color: i===0 ? C.brass : C.inkFaint}}>{i+1}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:16, fontWeight:600}}>
                    {s.user_id === userId ? "You" : s.display_name}
                  </div>
                  <div style={{fontSize:12, color:C.inkMuted, marginTop:4}}>
                    {s.wins}{NDASH}{s.losses} {"·"} picks {s.times_picking}{"×"}
                  </div>
                </div>
                <span style={{fontFamily:SERIF, fontSize:31, fontWeight:600,
                  color: i===0 ? C.brass : C.ink, lineHeight:1}}>{s.points}</span>
              </div>
            ))}
          </div>
          {season.entry_fee > 0 && standings.length > 0 && (
            <div style={{fontSize:12, color:C.inkFaint, marginTop:26}}>
              Season pot {"·"} ${(season.entry_fee * standings.length).toFixed(0)}
            </div>
          )}
        </div>
      )}

      {/* ══ SCHEDULE ══ */}
      {view === "schedule" && (
        <div style={{...pad, paddingTop:30}}>
          <Eyebrow>Full season</Eyebrow>
          <div style={{marginTop:18}}>
            {schedule.map((w, i) => (
              <div key={w.week_no} style={{padding:"18px 0",
                borderBottom: i === schedule.length-1 ? "none" : `1px solid ${C.hair}`}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                  <span style={{fontSize:13, fontWeight:700, letterSpacing:"0.04em"}}>Week {w.week_no}</span>
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
