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
// Weeks 19 and up are the playoffs. "Week 21" means nothing to anyone;
// "Conference" does.
const WEEK_LABEL = {
  19: "Wild Card",
  20: "Divisional",
  21: "Conference",
  22: "Super Bowl",
};
const weekName = n => WEEK_LABEL[n] || `Week ${n}`;

const MINUS = "−";
const NDASH = "–";

// ─── formatting ───────────────────────────────────────────────
const et = (iso, o) => new Date(iso).toLocaleString("en-US", { timeZone:"America/New_York", ...o });
const dayOf    = iso => et(iso, { weekday:"long", month:"long", day:"numeric" });
const shortDay = iso => et(iso, { month:"short", day:"numeric" });
const timeOf   = iso => et(iso, { hour:"numeric", minute:"2-digit" });

// The line freezes on the Wednesday of that football week. Walking back a
// fixed five days only worked while every game was a Monday one; a Thursday
// kickoff is one day past its Wednesday, a Sunday night game four.
const freezeDay = iso => {
  const back = ((["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    .indexOf(et(iso, { weekday:"short" })) - 3) + 7) % 7;
  return et(new Date(new Date(iso).getTime() - back * 86400000).toISOString(),
            { weekday:"long", month:"long", day:"numeric" });
};

// What each round is called on screen.
const SLOT = { TNF:"Thursday night", SNF:"Sunday night", MNF:"Monday night" };

const teamOf   = (g, side) => side === "home" ? g.home_team : g.away_team;
const lastWord = s => String(s || "").split(" ").slice(-1)[0];

function lineFor(game, side) {
  if (game?.spread_value == null) return "";
  if (Number(game.spread_value) === 0) return "PK";
  return (game.favorite === side ? MINUS : "+") + game.spread_value;
}

// Prefilled Venmo link. Fixed note shape so payments arrive labelled and
// are easy to match against the ledger.
const venmoLink = (handle, amount, note) =>
  `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;
const chargeNote = () => "Barry Bets MNF entry";

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

// A name rendered as running text but tappable. The brass underline is the
// only hint it does anything, which is all it needs.
const NameBtn = ({ onClick, bold, children }) => (
  <button onClick={onClick} style={{ background:"none", border:"none", padding:0,
    font:"inherit", color:"inherit", fontWeight: bold ? 600 : 400, cursor:"pointer",
    textDecoration:"underline", textDecorationColor:C.brass,
    textDecorationThickness:1, textUnderlineOffset:3 }}>{children}</button>
);

// One player's season, pulled out of the schedule the app already holds.
// The opponent in a matchup never chooses anything, so his side is simply
// whatever the picker left him.
function seasonFor(schedule, playerId) {
  const out = [];
  for (const w of schedule) {
    const m = (w.matchups || []).find(x => x.picker_id === playerId || x.opponent_id === playerId);
    if (!m) continue;
    const isPicker = m.picker_id === playerId;
    const side = !m.picked_side ? null
      : isPicker ? m.picked_side
      : m.picked_side === "home" ? "away" : "home";
    const won = m.result === "pending" || !m.result ? null
      : isPicker ? m.result === "picker" : m.result === "opponent";
    out.push({
      week_no: w.week_no,
      // Each matchup is played on its own night, so it carries its own
      // game; w.game is only the week's headline.
      game: m.game || w.game,
      isPicker, side, won,
      isPush: !!m.is_push,
      auto: !!m.auto_assigned && isPicker,
      foe: (isPicker ? m.opponent : m.picker)?.display_name,
    });
  }
  return out;
}

function PlayerSeason({ rows }) {
  if (!rows.length) return (
    <div style={{fontSize:11.5, color:C.inkFaint, marginTop:12}}>Nothing on the board yet.</div>
  );
  return (
    <div style={{marginTop:12, background:"rgba(23,32,58,0.03)",
      border:`1px solid ${C.hair}`, borderRadius:10, padding:"2px 14px"}}>
      {rows.map((r, i) => {
        const g = r.game;
        const tone = r.won === null ? C.inkMuted : r.won ? C.green : C.red;
        const scored = g && g.home_score != null;
        const forS = !g ? null : r.side === "home" ? g.home_score : r.side === "away" ? g.away_score : g.away_score;
        const agS  = !g ? null : r.side === "home" ? g.away_score : r.side === "away" ? g.home_score : g.home_score;
        return (
          <div key={r.week_no} style={{display:"flex", alignItems:"baseline", gap:11,
            padding:"11px 0", borderBottom: i === rows.length-1 ? "none" : `1px solid ${C.hair}`}}>
            <span style={{fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:"0.1em",
              color:C.inkFaint, width:28, flexShrink:0}}>WK{r.week_no}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13.5, fontWeight:600, color:C.ink}}>
                {!g ? "Game TBD"
                  : !r.side ? `${lastWord(g.away_team)} at ${lastWord(g.home_team)}`
                  : <>{teamOf(g, r.side)}
                      <span style={{color:C.inkFaint, fontWeight:400}}> {lineFor(g, r.side)}</span>
                    </>}
              </div>
              <div style={{fontSize:11, color:C.inkMuted, marginTop:2}}>
                {r.isPicker ? "Picked" : "Took the other side"}
                {r.foe ? ` ${"·"} vs ${r.foe}` : ""}
                {r.auto ? ` ${"·"} auto-assigned` : ""}
              </div>
            </div>
            <div style={{textAlign:"right", flexShrink:0}}>
              <div style={{fontFamily:SERIF, fontSize:17, fontWeight:600, color:tone}}>
                {scored ? `${forS}${NDASH}${agS}` : "—"}
              </div>
              <div style={{fontFamily:SANS, fontSize:8.5, fontWeight:700,
                letterSpacing:"0.12em", color:tone, marginTop:1}}>
                {r.isPush ? "PUSH"
                  : r.won === null ? (r.side ? "PENDING" : "NO PICK")
                  : r.won ? "WON" : "LOST"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MNFPool({ userId }) {
  const [token, setToken]         = useState(null);
  const [season, setSeason]       = useState(null);
  const [week, setWeek]           = useState(null);
  const [maxWeek, setMaxWeek]     = useState(17);
  const [data, setData]           = useState(null);
  const [standings, setStandings] = useState([]);
  const [schedule, setSchedule]   = useState([]);
  const [view, setView]           = useState("week");
  const [saving, setSaving]       = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [err, setErr]             = useState("");
  const [loading, setLoading]     = useState(true);
  const [meta, setMeta]           = useState(null);
  const [ledger, setLedger]       = useState(null);
  // Which name is open, on Standings and on Schedule. The schedule key
  // carries the week too, so the panel opens beside the name you tapped.
  const [openId, setOpenId]       = useState(null);
  const [schedOpen, setSchedOpen] = useState(null);

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
      .then(d => { setSeason(d.season); setMeta(d); setWeek(d.current_week || 1); })
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
    // The schedule is what a tapped name reads from, so Standings wants it too.
    if (view === "standings" || view === "schedule") call("/schedule").then(d => {
      setSchedule(d); if (d.length) setMaxWeek(Math.max(...d.map(w => w.week_no)));
    }).catch(()=>{});
  }, [view, token, call]);

  // Each round now carries its own deadline, shown on its own card, so
  // there is no single week-wide countdown left to run.

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

  const rounds   = data?.rounds || [];

  // Everyone is in one matchup a night, so "your matchup" is per round.
  const mineIn   = r => (r.matchups || []).find(m =>
    m.picker?.user_id === userId || m.opponent?.user_id === userId);

  // A line still unfrozen inside 48 hours of kickoff is a fault, not a
  // schedule. Nobody can pick without one and the round cannot be graded,
  // so this stops reading as "not yet" and starts reading as "fix me".
  const overdue  = g => !!g && !g.spread_frozen_at && g.status !== "final" &&
    new Date(g.kickoff_at) - Date.now() < 48 * 3600 * 1000;

  // One row per side. Used live for picking and greyed as a preview
  // beforehand. It takes its game, because three of them are on screen.
  const SideRow = ({ g, side, disabled, armed, onClick }) => (
    <button disabled={disabled || saving} onClick={onClick} style={{
      width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"17px 18px", marginBottom:9, borderRadius:10,
      cursor: disabled ? "default" : saving ? "wait" : "pointer",
      fontFamily:SANS, textAlign:"left", transition:"all 0.18s",
      background: armed ? C.navy : disabled ? "transparent" : C.card,
      color: armed ? C.cream : disabled ? C.inkFaint : C.ink,
      border: `1px solid ${armed ? C.navy : disabled ? C.hair : C.hairInk}`,
      opacity: disabled ? 0.72 : 1,
    }}>
      <span style={{fontSize:14.5, fontWeight:600}}>
        {armed ? `Confirm ${lastWord(teamOf(g, side))}` : teamOf(g, side)}
      </span>
      <span style={{fontFamily:SERIF, fontSize:22, fontWeight:600,
        color: armed ? C.cream : disabled ? C.inkFaint : C.brass}}>
        {!g.spread_frozen_at ? NDASH : lineFor(g, side)}
      </span>
    </button>
  );

  return (
    <div style={page}>

      {/* segmented control */}
      <div style={{...pad, paddingTop:22}}>
        <div style={{display:"flex", gap:2, padding:3,
          background:"rgba(23,32,58,0.06)", borderRadius:10}}>
          {(meta?.is_admin
            ? [["week","Week"],["standings","Standings"],["schedule","Schedule"],["rules","Rules"],["money","Money"]]
            : [["week","Week"],["standings","Standings"],["schedule","Schedule"],["rules","Rules"]]
          ).map(([id,label]) => (
            <button key={id} onClick={()=>{
              setView(id);
              if (id === "money" && !ledger) call("/ledger").then(setLedger).catch(e=>setErr(e.message));
            }} style={{
              flex:1, padding:"9px 2px", borderRadius:8, border:"none", cursor:"pointer",
              fontFamily:SANS, fontSize:11, fontWeight:600,
              background: view===id ? C.card : "transparent",
              color: view===id ? C.ink : C.inkMuted,
              boxShadow: view===id ? "0 1px 3px rgba(23,32,58,0.12)" : "none",
              transition:"all 0.18s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {err && <div style={{...pad, fontSize:12.5, color:C.red, marginTop:20, lineHeight:1.6}}>{err}</div>}

      {/* What you still owe, shown to you so most of it settles itself. */}
      {meta?.my_balance > 0 && (
        <div style={{...pad, marginTop:18}}>
          <div style={{background:C.card, border:`1px solid ${C.hairInk}`, borderRadius:10, padding:"16px 18px"}}>
            <div style={{display:"flex", alignItems:"baseline", gap:9, flexWrap:"wrap"}}>
              <span style={{fontFamily:SANS, fontSize:10.5, letterSpacing:1.6,
                textTransform:"uppercase", color:C.inkMuted}}>You owe</span>
              <span style={{fontFamily:SERIF, fontSize:24, fontWeight:600, color:C.ink}}>
                ${meta.my_balance.toLocaleString()}
              </span>
            </div>
            <div style={{marginTop:10, display:"flex", flexDirection:"column", gap:8}}>
              {(meta.my_charges || []).filter(c => !c.paid).map(c => (
                <div key={c.id} style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
                  <span style={{flex:1, minWidth:120, fontSize:13, color:C.inkMuted}}>
                    Entry {MINUS} ${c.amount}
                  </span>
                  <a href={venmoLink(meta.venmo, c.amount, chargeNote(c))}
                    target="_blank" rel="noopener noreferrer"
                    style={{fontFamily:SANS, fontSize:10.5, letterSpacing:1.4, textTransform:"uppercase",
                      padding:"8px 14px", borderRadius:8, background:C.ink, color:C.card, textDecoration:"none"}}>
                    Pay ${c.amount} on Venmo
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ WEEK ══ */}
      {view === "week" && (!data ? (
        // Week data is still in flight. Without this the screen briefly claims
        // there is nothing on, which reads as a broken app rather than a slow one.
        <div style={{...pad, marginTop:30, fontSize:13, color:C.inkFaint}}>Loading</div>
      ) : !rounds.length ? (
        <div style={{...pad, marginTop:30, fontSize:13, color:C.inkMuted}}>
          Nothing scheduled for week {week} yet.
        </div>
      ) : (
        <>
          {/* navy noticeboard — the week at a glance */}
          <div style={{background:`linear-gradient(175deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
            padding:"28px 28px 24px", marginTop:22}}>
            <Eyebrow tone={C.brassLt}>Week {week}</Eyebrow>
            <h1 style={{fontFamily:SERIF, fontSize:31, fontWeight:500, lineHeight:1.1,
              letterSpacing:"-0.018em", margin:"12px 0 0", color:C.cream}}>
              {rounds.length === 3 ? "Three rounds" : `${rounds.length} round${rounds.length > 1 ? "s" : ""}`}
            </h1>
            <div style={{fontSize:12.5, color:C.creamDim, marginTop:8, lineHeight:1.68}}>
              You play every night, once against each man. Each round locks at
              its own kickoff.
            </div>

            <BrassRule/>

            <div style={{marginTop:18, display:"flex", flexDirection:"column", gap:11}}>
              {rounds.map(r => {
                const m = mineIn(r);
                const need = !!m && m.picker?.user_id === userId && !m.picked_side && !r.locked;
                return (
                  <div key={r.slot_name} style={{display:"flex", alignItems:"baseline", gap:10}}>
                    <span style={{fontFamily:SANS, fontSize:9.5, fontWeight:700,
                      letterSpacing:"0.16em", textTransform:"uppercase", minWidth:96,
                      color: need ? C.brassLt : C.creamDim}}>
                      {SLOT[r.slot_name] || r.slot_name}
                    </span>
                    <span style={{flex:1, fontSize:12.5, color:C.cream}}>
                      {lastWord(r.game.away_team)} at {lastWord(r.game.home_team)}
                    </span>
                    <span style={{fontFamily:SANS, fontSize:9, fontWeight:700,
                      letterSpacing:"0.12em", textAlign:"right", minWidth:58,
                      color: need ? C.brassLt : "rgba(239,231,218,0.32)"}}>
                      {r.locked ? (r.game.status === "final" ? "FINAL" : "LOCKED")
                        : need ? "YOU PICK" : "OPEN"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* one card per round */}
          <div style={{...pad}}>
            {rounds.map((r, ri) => {
              const g        = r.game;
              const m        = mineIn(r);
              const iPick    = !!m && m.picker?.user_id === userId;
              const other    = (r.matchups || []).find(x => x !== m);
              const hasLine  = !!g.spread_frozen_at;
              const final    = g.status === "final";
              const armed    = confirm && confirm.slot === r.slot_name ? confirm.side : null;
              const meName   = iPick ? m?.picker?.display_name : m?.opponent?.display_name;

              return (
                <div key={r.slot_name} style={{paddingTop:26, marginTop: ri === 0 ? 0 : 4,
                  borderTop: ri === 0 ? "none" : `1px solid ${C.hair}`}}>

                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                    <Eyebrow tone={r.locked ? C.inkFaint : C.brass}>
                      {SLOT[r.slot_name] || r.slot_name}
                    </Eyebrow>
                    <span style={{fontSize:11, color:C.inkMuted}}>
                      {shortDay(g.kickoff_at)} {"·"} {timeOf(g.kickoff_at)} ET
                    </span>
                  </div>

                  <div style={{fontFamily:SERIF, fontSize:23, fontWeight:600, marginTop:8,
                    letterSpacing:"-0.01em", lineHeight:1.22}}>
                    {g.away_team}
                    <span style={{fontStyle:"italic", fontSize:15, color:C.inkFaint,
                      fontWeight:400}}>{" at "}</span>
                    {g.home_team}
                  </div>

                  {hasLine ? (
                    <div style={{fontSize:12.5, color:C.inkMuted, marginTop:6}}>
                      {lastWord(teamOf(g, g.favorite))}{" "}
                      {Number(g.spread_value) === 0 ? "PK" : MINUS + g.spread_value}
                      {" "}{"·"}{" frozen "}{shortDay(g.spread_frozen_at)}
                    </div>
                  ) : (
                    <div style={{fontSize:12.5, marginTop:6,
                      color: overdue(g) ? C.red : C.inkMuted}}>
                      {overdue(g)
                        ? `Kickoff is inside 48 hours and the line still hasn${"’"}t frozen. Nobody can pick until it does.`
                        : `Line freezes ${freezeDay(g.kickoff_at)} at 9:00 AM`}
                    </div>
                  )}

                  {final && (
                    <div style={{fontFamily:SERIF, fontSize:21, fontWeight:600, marginTop:9}}>
                      {lastWord(g.away_team)} {g.away_score}
                      <span style={{color:C.inkFaint, fontWeight:400}}>{" "}{NDASH}{" "}</span>
                      {g.home_score} {lastWord(g.home_team)}
                    </div>
                  )}

                  {!m ? (
                    <div style={{fontSize:12.5, color:C.inkFaint, marginTop:13}}>
                      You{"’"}re not in this round.
                    </div>
                  ) : (
                    <>
                      <div style={{fontSize:14.5, fontWeight:600, marginTop:15}}>
                        {iPick ? `You vs ${m.opponent?.display_name}`
                               : `${m.picker?.display_name} vs you`}
                        {iPick && !m.picked_side && !r.locked && (
                          <span style={{fontFamily:SANS, fontSize:8.5, fontWeight:700,
                            letterSpacing:"0.14em", color:C.brass, marginLeft:9}}>
                            YOUR PICK
                          </span>
                        )}
                      </div>

                      {iPick && !m.picked_side && hasLine && !r.locked && (
                        <div style={{marginTop:12}}>
                          <div style={{fontSize:12.5, color:C.inkMuted, marginBottom:12,
                            lineHeight:1.6}}>
                            Take a side. {m.opponent?.display_name} gets the other one.
                          </div>
                          {["away","home"].map(side => (
                            <SideRow key={side} g={g} side={side} armed={armed === side}
                              onClick={()=> armed === side
                                ? submit(m.id, side)
                                : setConfirm({ slot:r.slot_name, side })}/>
                          ))}
                          {armed && (
                            <button onClick={()=>setConfirm(null)} style={{background:"none",
                              border:"none", cursor:"pointer", fontFamily:SANS, fontSize:11,
                              color:C.inkMuted, padding:"2px 0"}}>Cancel</button>
                          )}
                        </div>
                      )}

                      {iPick && !m.picked_side && !hasLine && !r.locked && (
                        <div style={{fontSize:12.5, color:C.inkMuted, marginTop:10, lineHeight:1.6}}>
                          Yours to pick as soon as the line freezes.
                        </div>
                      )}

                      {iPick && !m.picked_side && r.locked && (
                        <div style={{fontSize:12.5, color:C.red, marginTop:10, lineHeight:1.6}}>
                          This one kicked off with no pick in. You were handed the favorite.
                        </div>
                      )}

                      {!iPick && !m.picked_side && (
                        <div style={{fontSize:12.5, color:C.inkMuted, marginTop:10, lineHeight:1.6}}>
                          {hasLine
                            ? `${m.picker?.display_name} is on the clock. You get whichever side he doesn${"’"}t take.`
                            : `${m.picker?.display_name} picks once the line freezes. You get the other side.`}
                        </div>
                      )}

                      {m.picked_side && (
                        <div style={{marginTop:12}}>
                          {[{ who:m.picker?.display_name, side:m.picked_side, isPicker:true },
                            { who:m.opponent?.display_name,
                              side:m.picked_side === "home" ? "away" : "home", isPicker:false }
                          ].map(row => {
                            const decided = m.result !== "pending";
                            const won = decided && ((row.isPicker && m.result === "picker")
                                                 || (!row.isPicker && m.result === "opponent"));
                            return (
                              <div key={row.isPicker ? "p" : "o"} style={{display:"flex",
                                alignItems:"center", gap:10, padding:"11px 0",
                                borderBottom: row.isPicker ? `1px solid ${C.hair}` : "none"}}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:14, fontWeight:600,
                                    color: decided && !won ? C.inkFaint : C.ink}}>
                                    {row.who === meName ? "You" : row.who}
                                  </div>
                                  <div style={{fontSize:12, color:C.inkMuted, marginTop:2}}>
                                    {teamOf(g, row.side)} {lineFor(g, row.side)}
                                  </div>
                                </div>
                                {decided && (
                                  <span style={{fontFamily:SANS, fontSize:9.5, fontWeight:700,
                                    letterSpacing:"0.14em", color: won ? C.green : C.inkFaint}}>
                                    {won ? "WON" : "LOST"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {(m.auto_assigned || m.is_push) && (
                            <div style={{fontSize:11.5, color:C.inkFaint, marginTop:7, lineHeight:1.6}}>
                              {m.auto_assigned && `No pick was in by kickoff, so ${m.picker?.display_name} was handed the favorite. `}
                              {m.is_push && "The game landed on the number. A push goes to the non-picker."}
                            </div>
                          )}
                        </div>
                      )}

                      {other && (
                        <div style={{fontSize:11.5, color:C.inkFaint, marginTop:11, lineHeight:1.6}}>
                          Also on: {other.picker?.display_name} vs {other.opponent?.display_name}
                          {other.picked_side
                            ? ` ${MINUS} ${other.picker?.display_name} took ${lastWord(teamOf(g, other.picked_side))} ${lineFor(g, other.picked_side)}`
                            : ` ${MINUS} ${other.picker?.display_name} picks`}
                          {other.result && other.result !== "pending" &&
                            ` · ${(other.result === "picker" ? other.picker : other.opponent)?.display_name} won`}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <div style={{display:"flex", gap:9, marginTop:34}}>
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
              <div key={s.player_id} style={{padding:"20px 0",
                borderBottom: i === standings.length-1 ? "none" : `1px solid ${C.hair}`}}>
                <div style={{display:"flex", alignItems:"center", gap:18}}>
                  <span style={{fontFamily:SERIF, fontSize:20, width:16,
                    color: i===0 ? C.brass : C.inkFaint}}>{i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16, fontWeight:600}}>
                      <NameBtn bold onClick={() =>
                        setOpenId(c => c === s.player_id ? null : s.player_id)}>
                        {s.user_id === userId ? "You" : s.display_name}
                      </NameBtn>
                    </div>
                    <div style={{fontSize:12, color:C.inkMuted, marginTop:4}}>
                      {s.wins}{NDASH}{s.losses} {"·"} picks {s.times_picking}{"×"}
                    </div>
                  </div>
                  <span style={{fontFamily:SERIF, fontSize:31, fontWeight:600,
                    color: i===0 ? C.brass : C.ink, lineHeight:1}}>{s.points}</span>
                </div>
                {openId === s.player_id && <PlayerSeason rows={seasonFor(schedule, s.player_id)} />}
              </div>
            ))}
          </div>
          <div style={{fontSize:11.5, color:C.inkFaint, marginTop:22, lineHeight:1.7}}>
            Tap a name for his week-by-week {"—"} the side he had, the line and the score.
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
                  <span style={{fontSize:13, fontWeight:700, letterSpacing:"0.04em"}}>{weekName(w.week_no)}</span>
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
                      <NameBtn bold onClick={() => setSchedOpen(k =>
                        k === `${w.week_no}:${m.picker_id}` ? null : `${w.week_no}:${m.picker_id}`)}>
                        {m.picker?.display_name}
                      </NameBtn>
                      <span style={{color:C.inkFaint}}> picks vs </span>
                      <NameBtn onClick={() => setSchedOpen(k =>
                        k === `${w.week_no}:${m.opponent_id}` ? null : `${w.week_no}:${m.opponent_id}`)}>
                        {m.opponent?.display_name}
                      </NameBtn>
                      {winner && <span style={{color:C.inkFaint}}> {"·"} {winner.display_name} won</span>}
                    </div>
                  );
                })}
                {schedOpen && schedOpen.split(":")[0] === String(w.week_no) && (
                  <PlayerSeason rows={seasonFor(schedule, schedOpen.split(":")[1])} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ RULES ══ */}
      {view === "rules" && (
        <div style={{...pad, paddingTop:30}}>
          <Eyebrow>House rules</Eyebrow>
          <ul style={{margin:"18px 0 0", padding:0, listStyle:"none",
            fontFamily:SERIF, fontSize:16, color:C.ink, lineHeight:1.95}}>
            <li>{"·"} ${season.entry_fee} to enter</li>
            <li>{"·"} Three rounds a week: Thursday night, Sunday night, Monday night.</li>
            <li>{"·"} The playoffs count too, every game of them — six on wild card
              weekend, four divisional, two conference, and the Super Bowl.</li>
            <li>{"·"} Every man plays every night, and over the week you face each of the
              other three once.</li>
            <li>{"·"} One player in each matchup holds the pick. He takes a side against the
              spread and his opponent gets the other side.</li>
            <li>{"·"} Lines freeze Wednesday morning. That number grades the round no matter
              when the pick came in, and it never moves again.</li>
            <li>{"·"} A push counts as a loss for the picker. He had the choice.</li>
            <li>{"·"} Each round locks at its own kickoff. No pick in by then and the picker
              is handed the favorite.</li>
          </ul>
          <div style={{fontSize:11.5, color:C.inkFaint, marginTop:24, lineHeight:1.7}}>
            {(meta?.players || []).length} in {MINUS} $
            {(season.entry_fee * (meta?.players || []).length).toLocaleString()} in the pot
          </div>
        </div>
      )}

      {/* ══ MONEY (admin) ══ */}
      {view === "money" && (
        <div style={{...pad, paddingTop:30}}>
          <Eyebrow>The books</Eyebrow>
          {!ledger ? (
            <div style={{marginTop:18, fontSize:13.5, color:C.inkMuted}}>Loading{"…"}</div>
          ) : (
            <>
              <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:18, marginBottom:22}}>
                {[["Collected", ledger.collected, C.green],
                  ["Outstanding", ledger.outstanding, ledger.outstanding > 0 ? C.red : C.inkMuted],
                  ["Pot", ledger.pot, C.ink]].map(([label, value, tone]) => (
                  <div key={label} style={{flex:"1 1 110px", background:C.card,
                    border:`1px solid ${C.hair}`, borderRadius:10, padding:"14px 16px"}}>
                    <div style={{fontFamily:SANS, fontSize:10, letterSpacing:1.5,
                      textTransform:"uppercase", color:C.inkMuted}}>{label}</div>
                    <div style={{fontFamily:SERIF, fontSize:24, fontWeight:600, color:tone, marginTop:3}}>
                      ${Number(value).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {ledger.items.length === 0 ? (
                <div style={{fontSize:13.5, color:C.inkMuted, lineHeight:1.7}}>Nothing owed yet.</div>
              ) : ledger.items.map((row, i) => (
                <div key={row.id} style={{display:"flex", alignItems:"center", gap:10, padding:"13px 0",
                  borderBottom: i === ledger.items.length - 1 ? "none" : `1px solid ${C.hair}`}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:15, fontWeight:600, color: row.paid ? C.inkFaint : C.ink}}>
                      {row.display_name}
                    </div>
                    <div style={{fontSize:11.5, color:C.inkMuted, marginTop:2}}>Entry</div>
                  </div>
                  <span style={{fontFamily:SERIF, fontSize:17, fontWeight:600,
                    color: row.paid ? C.inkFaint : C.ink}}>${row.amount}</span>
                  <button onClick={async () => {
                    setLedger(l => ({...l, items: l.items.map(x => x.id === row.id ? {...x, paid: !x.paid} : x)}));
                    try {
                      await call("/mark-paid", { method:"POST",
                        body: JSON.stringify({ payment_id: row.id, paid: !row.paid }) });
                    } catch (e) { setErr(e.message); }
                    call("/ledger").then(setLedger).catch(()=>{});
                  }} style={{
                    fontFamily:SANS, fontSize:10, letterSpacing:1.4, textTransform:"uppercase",
                    padding:"7px 12px", borderRadius:8, cursor:"pointer", minWidth:78,
                    background: row.paid ? C.ink : "transparent",
                    color: row.paid ? C.card : C.red,
                    border: row.paid ? "none" : `1px solid ${C.red}`,
                  }}>{row.paid ? "Paid" : "Unpaid"}</button>
                </div>
              ))}

              <div style={{fontSize:11.5, color:C.inkFaint, marginTop:24, lineHeight:1.7}}>
                Tap a row to flip it. Everyone sees their own balance with a Venmo
                button, so this should mostly clear itself.
              </div>
            </>
          )}
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
