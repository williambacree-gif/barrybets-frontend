import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase Client ─────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Constants ───────────────────────────────────────────────
const TID = "00000000-0000-0000-0000-000000002026";
const LEAGUE_ID = "a0000000-0000-0000-0000-000000000001";
// Round config - points increase each round
const ROUND_CONFIG = {
  3: { name: "Sweet 16", pts: 3, dates: ["2026-03-26","2026-03-27"] },
  4: { name: "Elite Eight", pts: 4, dates: ["2026-03-28","2026-03-29"] },
  5: { name: "Final Four", pts: 5, dates: ["2026-04-04"] },
  6: { name: "Championship", pts: 6, dates: ["2026-04-06"] },
};
const LOCK_MINUTES = 30; // lock picks 30 min before tip

const C = {
  navy:"#1A1F2E",navyLight:"#232838",navyDark:"#12161F",
  gold:"#C4933F",goldLight:"#D4A74F",goldMuted:"rgba(196,147,63,0.15)",goldSubtle:"rgba(196,147,63,0.08)",
  cream:"#E8DDD0",creamMuted:"rgba(232,221,208,0.78)",creamSubtle:"rgba(232,221,208,0.55)",creamFaint:"rgba(232,221,208,0.18)",
  green:"#6DBF73",greenBg:"rgba(109,191,115,0.12)",red:"#D45B56",redBg:"rgba(212,91,86,0.12)",
  border:"rgba(232,221,208,0.08)",borderGold:"rgba(196,147,63,0.25)",
  pageBg:"#F5F2ED",textDark:"#1A1F2E",textMid:"#4A4A4A",textLight:"#6A6A6A",
  r:12,rSm:8,
};

// ─── Time Helpers ────────────────────────────────────────────
function parseGameTime(timeStr, dateStr) {
  if (!timeStr || !dateStr) return null;
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]); const mn = parseInt(m[2]); const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return new Date(`${dateStr}T${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}:00-04:00`);
}
function isGameLocked(timeStr, dateStr) {
  const tip = parseGameTime(timeStr, dateStr);
  if (!tip) return false;
  return new Date() >= new Date(tip.getTime() - LOCK_MINUTES * 60000);
}
function sortByTipTime(a, b) {
  const tA = parseGameTime(a.game_time, a.game_date);
  const tB = parseGameTime(b.game_time, b.game_date);
  return (tA || 0) - (tB || 0);
}

// ─── Shared UI Components ────────────────────────────────────
const HexLogo = ({size=80,dark=false}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" stroke={dark?C.gold:C.navy} strokeWidth="2" fill="none"/>
    <polygon points="50,12 86,31 86,69 50,88 14,69 14,31" stroke={dark?C.creamSubtle:C.gold} strokeWidth="0.5" fill="none"/>
    <text x="50" y="36" textAnchor="middle" fill={dark?C.creamSubtle:C.gold} fontSize="7" fontFamily="Raleway" letterSpacing="2.5" fontWeight="500">BARRY</text>
    <text x="50" y="58" textAnchor="middle" fill={dark?C.cream:C.navy} fontSize="20" fontFamily="Cormorant Garamond" fontWeight="600">BETS</text>
    <text x="50" y="78" textAnchor="middle" fill={dark?C.creamSubtle:C.gold} fontSize="7" fontFamily="Raleway" letterSpacing="2" fontWeight="400">EST. 2026</text>
  </svg>
);

const Badge = ({children,color=C.gold,bg=C.goldMuted}) => (
  <span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:600,background:bg,color,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>{children}</span>
);

const GoldDiv = () => (
  <div style={{display:"flex",alignItems:"center",gap:12,margin:"4px 0"}}>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.borderGold},transparent)`}}/>
    <div style={{width:4,height:4,borderRadius:2,background:C.gold,opacity:0.5}}/>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.borderGold},transparent)`}}/>
  </div>
);

const Label = ({children}) => (
  <div style={{fontSize:11,fontWeight:600,color:C.gold,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:14,fontFamily:"'Raleway'"}}>{children}</div>
);

const TabBar = ({active,onChange}) => (
  <nav style={{display:"flex",justifyContent:"space-around",alignItems:"center",position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(18,22,31,0.95)",backdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,padding:"8px 0 28px",zIndex:100}}>
    {[{id:"picks",label:"PICKS"},{id:"standings",label:"STANDINGS"},{id:"bracket",label:"BRACKET"},{id:"profile",label:"PROFILE"}].map(t=>(
      <button key={t.id} onClick={()=>onChange(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 16px",border:"none",background:"none",cursor:"pointer",color:active===t.id?C.gold:C.creamSubtle,fontSize:10,fontWeight:600,letterSpacing:"0.12em",fontFamily:"'Raleway'",transition:"color 0.3s"}}>
        <span>{t.label}</span>
      </button>
    ))}
  </nav>
);

// ─── Login Screen ────────────────────────────────────────────
const LoginScreen = ({onLogin}) => {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [showReset,setShowReset]=useState(false);
  const [resetEmail,setResetEmail]=useState("");
  const [resetMsg,setResetMsg]=useState("");

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      const {error:err} = await supabase.auth.signInWithPassword({email,password});
      if (err) throw err;
      onLogin();
    } catch(err) { setError(err.message || "Login failed"); }
    setLoading(false);
  };

  const handleReset = async () => {
    try {
      await supabase.auth.resetPasswordForEmail(resetEmail, {redirectTo: window.location.origin});
      setResetMsg("Check your email for a reset link.");
    } catch(err) { setResetMsg(err.message); }
  };

  if (showReset) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",background:`radial-gradient(ellipse at 50% 30%,#232838 0%,${C.navy} 60%,${C.navyDark} 100%)`}}>
      <HexLogo size={80} dark={true}/>
      <h2 style={{fontSize:22,color:C.cream,fontFamily:"'Cormorant Garamond', serif",margin:"20px 0 8px"}}>Reset Password</h2>
      <p style={{color:C.creamSubtle,fontSize:12,fontFamily:"'Raleway'",marginBottom:20,textAlign:"center"}}>Enter your email and we'll send a reset link.</p>
      <div style={{width:"100%",maxWidth:360}}>
        <input value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="Email address" style={{width:"100%",padding:"16px",borderRadius:C.rSm,border:`1px solid ${C.border}`,background:"#3D4238",color:C.cream,fontSize:15,fontFamily:"'Raleway'",marginBottom:12,outline:"none",boxSizing:"border-box"}}/>
        {resetMsg && <div style={{color:resetMsg.includes("Check")?C.green:C.red,fontSize:12,fontFamily:"'Raleway'",marginBottom:12,textAlign:"center"}}>{resetMsg}</div>}
        <button onClick={handleReset} style={{width:"100%",padding:"17px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:700,letterSpacing:"0.18em",cursor:"pointer",fontFamily:"'Raleway'",marginBottom:12}}>SEND RESET LINK</button>
        <button onClick={()=>setShowReset(false)} style={{width:"100%",padding:"12px",borderRadius:C.rSm,border:`1.5px solid ${C.border}`,background:"transparent",color:C.creamMuted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Raleway'"}}>Back to Login</button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",background:`radial-gradient(ellipse at 50% 30%,#232838 0%,${C.navy} 60%,${C.navyDark} 100%)`}}>
      <HexLogo size={110} dark={true}/>
      <div style={{fontSize:11,fontWeight:600,color:C.creamSubtle,letterSpacing:"0.25em",marginTop:28,marginBottom:8,fontFamily:"'Raleway'"}}>MARCH MADNESS</div>
      <div style={{fontSize:13,fontWeight:600,color:C.gold,letterSpacing:"0.15em",marginBottom:28,fontFamily:"'Raleway'"}}>MARCH MADNESS SURVIVOR</div>
      <div style={{width:"100%",maxWidth:360}}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" style={{width:"100%",padding:"16px",borderRadius:C.rSm,border:`1px solid ${C.border}`,background:"#3D4238",color:C.cream,fontSize:15,fontFamily:"'Raleway'",marginBottom:12,outline:"none",boxSizing:"border-box"}}/>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" style={{width:"100%",padding:"16px",borderRadius:C.rSm,border:`1px solid ${C.border}`,background:"#3D4238",color:C.cream,fontSize:15,fontFamily:"'Raleway'",marginBottom:12,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        {error && <div style={{color:C.red,fontSize:12,fontFamily:"'Raleway'",marginBottom:12,textAlign:"center"}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:"17px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:700,letterSpacing:"0.18em",cursor:"pointer",fontFamily:"'Raleway'",opacity:loading?0.6:1,marginBottom:12}}>
          {loading?"SIGNING IN...":"SIGN IN"}
        </button>
        <div style={{textAlign:"center"}}>
          <button onClick={()=>setShowReset(true)} style={{background:"none",border:"none",color:C.gold,fontSize:11,cursor:"pointer",fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>Forgot password?</button>
        </div>
      </div>
      <p style={{color:C.creamSubtle,fontSize:12,textAlign:"center",marginTop:24,fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",lineHeight:1.8,opacity:0.7}}>Why do we lock our doors?<br/>{"…"}to keep Blair out</p>
    </div>
  );
};

// ─── Game Card ───────────────────────────────────────────────
const GameCard = ({game,myPick,onPick,usedTeams=[],entryStatus}) => {
  const tA = game.team_a;
  const tB = game.team_b;
  if (!tA || !tB) return null;

  const locked = isGameLocked(game.game_time, game.game_date) || entryStatus !== "alive";
  const isFinal = game.status === "final";
  const winnerId = game.winner_id;

  const isUsedA = usedTeams.includes(tA.id);
  const isUsedB = usedTeams.includes(tB.id);

  const renderTeamBtn = (team, isUsed) => {
    const isPicked = myPick === team.id;
    const isWinner = isFinal && winnerId === team.id;
    const isLoser = isFinal && winnerId && winnerId !== team.id;

    let bg = C.navyDark;
    let border = `1.5px solid ${C.border}`;
    let textColor = C.cream;
    let label = null;

    if (isPicked && isFinal && isWinner) {
      bg = C.greenBg; border = `2px solid ${C.green}`; textColor = C.green; label = "✓ WIN";
    } else if (isPicked && isFinal && isLoser) {
      bg = C.redBg; border = `2px solid ${C.red}`; textColor = C.red; label = "✗ LOSS";
    } else if (isPicked) {
      bg = C.goldSubtle; border = `2px solid ${C.gold}`; textColor = C.goldLight; label = "YOUR PICK";
    } else if (isUsed) {
      bg = "rgba(212,91,86,0.06)"; border = "1.5px solid rgba(212,91,86,0.4)"; textColor = C.red;
    }

    return (
      <button key={team.id} onClick={()=>!locked&&!isUsed&&!isFinal&&onPick(game.id,team.id)} disabled={locked||isUsed||isFinal} style={{
        flex:1,padding:"12px 8px",borderRadius:C.rSm,textAlign:"center",border,background:bg,color:textColor,
        opacity:isUsed&&!isPicked?0.35:1,cursor:locked||isUsed||isFinal?"default":"pointer",
        transition:"all 0.25s",fontFamily:"'Cormorant Garamond', serif",
      }}>
        <div style={{fontSize:10,color:isPicked?C.gold:C.creamSubtle,fontFamily:"'Raleway'",marginBottom:3,fontWeight:600}}>({team.seed})</div>
        <div style={{fontSize:16,fontWeight:700}}>{team.name}</div>
        {isFinal && <div style={{fontSize:16,fontWeight:700,marginTop:4,color:isWinner?C.green:C.red}}>
          {team.id===game.team_a?.id ? game.team_a_score : game.team_b_score}
        </div>}
        {isUsed&&!isPicked&&<div style={{fontSize:9,color:C.red,marginTop:3,fontFamily:"'Raleway'",fontWeight:700}}>USED</div>}
        {label&&<div style={{fontSize:9,color:isPicked&&isFinal?(isWinner?C.green:C.red):C.gold,marginTop:3,fontFamily:"'Raleway'",fontWeight:700,letterSpacing:"0.08em"}}>{label}</div>}
        {locked&&!isPicked&&!isUsed&&!isFinal&&<div style={{fontSize:9,color:C.red,marginTop:3,fontFamily:"'Raleway'",fontWeight:600}}>LOCKED</div>}
      </button>
    );
  };

  return (
    <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${myPick?C.borderGold:C.border}`,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>{game.region}</span>
          <span style={{fontSize:9,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>{game.game_time||""}</span>
          <span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'"}}>{game.tv_network||""}</span>
        </div>
        {isFinal ? <Badge color={C.cream} bg={C.navyDark}>FINAL</Badge> : <Badge>{(ROUND_CONFIG[game.round]||{pts:3}).pts} pts</Badge>}
        {game.spread && !isFinal && <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",fontWeight:600,marginTop:4}}>Line: {game.spread}</div>}
      </div>
      <div style={{display:"flex",gap:8,padding:"0 16px 14px"}}>
        {renderTeamBtn(tA, isUsedA)}
        {renderTeamBtn(tB, isUsedB)}
      </div>
    </div>
  );
};

// ─── Picks Screen ────────────────────────────────────────────
const PicksScreen = ({user,entry,displayName}) => {
  const [games,setGames]=useState([]);
  const [picks,setPicks]=useState({}); // {gameId: teamId}
  const [usedTeamIds,setUsedTeamIds]=useState([]);
  const [dayFilter,setDayFilter]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [currentRound,setCurrentRound]=useState(3);
  const [roundDates,setRoundDates]=useState([]);
  const [initialized,setInitialized]=useState(false);

  // Step 1: On mount, detect current round and dates (runs once)
  useEffect(() => {
    (async () => {
      const {data:allGames} = await supabase.from("games")
        .select("round, game_date, status")
        .eq("tournament_id", TID).order("round", {ascending: false});
      if (allGames && allGames.length > 0) {
        const maxRound = allGames[0].round;
        setCurrentRound(maxRound);
        const rDates = [...new Set(allGames.filter(g => g.round === maxRound).map(g => g.game_date))].sort();
        setRoundDates(rDates);
        setDayFilter(rDates[0] || "");
      }
      setInitialized(true);
    })();
  }, []);

  // Step 2: When dayFilter changes (and is initialized), load games
  const loadGames = useCallback(async () => {
    if (!initialized || !dayFilter) return;
    setLoading(true);
    try {
      const {data:gamesData} = await supabase.from("games")
        .select("*, team_a:teams!games_team_a_id_fkey(id,name,seed,region), team_b:teams!games_team_b_id_fkey(id,name,seed,region)")
        .eq("tournament_id", TID).eq("game_date", dayFilter);
      const sorted = (gamesData||[]).sort(sortByTipTime);
      setGames(sorted);

      // Load my picks for this entry
      if (entry) {
        const {data:picksData} = await supabase.from("picks").select("game_id,team_id").eq("entry_id", entry.id);
        const pMap = {};
        (picksData||[]).forEach(p => { pMap[p.game_id] = p.team_id; });
        setPicks(pMap);

        // Load used teams (from previous rounds only — not current round picks)
        const {data:usedData} = await supabase.from("used_teams").select("team_id").eq("entry_id", entry.id);
        setUsedTeamIds((usedData||[]).map(u => u.team_id));
      }
    } catch(err) { console.error("Load error:", err); }
    setLoading(false);
  }, [dayFilter, entry, initialized]);

  useEffect(() => { loadGames(); }, [loadGames]);

  const handlePick = async (gameId, teamId) => {
    if (!entry || entry.status !== "alive") return;
    setSaving(true);
    try {
      // Remove existing pick for this game
      await supabase.from("picks").delete().eq("entry_id", entry.id).eq("game_id", gameId);
      // Insert new pick
      await supabase.from("picks").insert({
        entry_id: entry.id, game_id: gameId, team_id: teamId,
        round: currentRound, pick_date: dayFilter, result: "pending"
      });
      setPicks(prev => ({...prev, [gameId]: teamId}));
    } catch(err) { alert(err.message); }
    setSaving(false);
  };

  if (loading) return <div style={{padding:"100px 24px",textAlign:"center",color:C.textMid}}>Loading games...</div>;

  const hasPick = Object.values(picks).some(v => games.some(g => g.id === Object.keys(picks).find(k => picks[k] === v)));
  const todayPick = games.find(g => picks[g.id]);

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
            <h1 style={{fontSize:28,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>{(ROUND_CONFIG[currentRound]||{name:'Survivor'}).name} Survivor</h1>
            <div style={{color:C.textLight,fontSize:11,marginTop:3,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>{displayName} {"·"} {entry?.status==="alive"?"ALIVE":"ELIMINATED"}</div>
          </div>
          <HexLogo size={44}/>
        </div>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        {/* Day filter */}
        <div style={{display:"flex",gap:8,marginTop:16,marginBottom:12}}>
          {roundDates.map(d => {
            const dt = new Date(d + "T12:00:00");
            const label = dt.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
            return [d, label];
          }).map(([d,label])=>(
            <button key={d} onClick={()=>setDayFilter(d)} style={{padding:"8px 20px",borderRadius:20,background:dayFilter===d?C.gold:C.navyLight,color:dayFilter===d?C.navyDark:C.cream,border:dayFilter===d?"none":`1px solid ${C.border}`,cursor:"pointer",fontFamily:"'Raleway'",fontSize:13,fontWeight:600}}>{label}</button>
          ))}
        </div>

        {/* Pick status */}
        {entry?.status==="eliminated" ? (
          <div style={{background:C.redBg,border:"1px solid rgba(212,91,86,0.25)",borderRadius:C.r,padding:"12px 16px",marginBottom:14}}>
            <div style={{fontSize:12,color:C.red,fontFamily:"'Raleway'",fontWeight:600}}>You've been eliminated. Better luck next time!</div>
          </div>
        ) : todayPick ? (
          <div style={{background:C.greenBg,border:"1px solid rgba(109,191,115,0.25)",borderRadius:C.r,padding:"12px 16px",marginBottom:14}}>
            <div style={{fontSize:12,color:C.green,fontFamily:"'Raleway'",fontWeight:600}}>Pick saved! Tap another team to change (before lockout).</div>
          </div>
        ) : (
          <div style={{background:C.navyDark,border:`1px solid ${C.border}`,borderRadius:C.r,padding:"12px 16px",marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:11,color:C.gold,fontFamily:"'Raleway'"}}>PICK A WINNER — {(ROUND_CONFIG[currentRound]||{pts:3}).pts} points if correct</div>
          </div>
        )}

        {saving && <div style={{textAlign:"center",padding:8,color:C.gold,fontSize:12}}>Saving pick...</div>}

        <Label>{dayFilter==="2026-03-26"?"Thursday":"Friday"} Games ({games.length})</Label>
        {games.map(g => (
          <GameCard key={g.id} game={g} myPick={picks[g.id]} onPick={handlePick} usedTeams={usedTeamIds} entryStatus={entry?.status}/>
        ))}

        <div style={{marginTop:12,background:"#232838",borderRadius:C.r,padding:"14px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:600,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",marginBottom:4}}>SURVIVOR RULES</div>
          <div style={{fontSize:13,color:C.creamMuted,fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",lineHeight:1.6}}>Pick 1 winner per day. Straight-up wins only. Points per correct pick: Sweet 16 (3), Elite 8 (4), Final Four (5), Championship (6). If your team loses, you're eliminated.</div>
        </div>
      </div>
    </div>
  );
};

// ─── Standings Screen ────────────────────────────────────────
const StandingsScreen = () => {
  const [allEntries,setAllEntries]=useState([]);
  const [entryPicks,setEntryPicks]=useState({});
  const [allUsedTeams,setAllUsedTeams]=useState({});
  const [teams,setTeams]=useState({});
  const [dayFilter,setDayFilter]=useState("2026-03-26");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        // Load entries
        const {data:entries} = await supabase.from("entries").select("*, profiles(display_name)").eq("league_id", LEAGUE_ID).order("total_points",{ascending:false});
        setAllEntries(entries||[]);

        // Load all teams
        const {data:allTeams} = await supabase.from("teams").select("id,name,seed").eq("tournament_id", TID);
        const tMap = {};
        (allTeams||[]).forEach(t => { tMap[t.id] = t; });
        setTeams(tMap);

        // Load picks and used teams per entry
        const pMap = {}; const uMap = {};
        for (const entry of (entries||[])) {
          // Today's pick
          const {data:picks} = await supabase.from("picks").select("team_id,result").eq("entry_id", entry.id).eq("pick_date", dayFilter);
          if (picks && picks.length > 0) {
            const t = tMap[picks[0].team_id];
            pMap[entry.id] = { teamName: t?.name||"?", teamSeed: t?.seed, result: picks[0].result };
          }
          // All used teams
          const {data:used} = await supabase.from("used_teams").select("team_id").eq("entry_id", entry.id);
          if (used && used.length > 0) {
            uMap[entry.id] = used.map(u => tMap[u.team_id]?.name||"?");
          }
        }
        setEntryPicks(pMap);
        setAllUsedTeams(uMap);
      } catch(err) { console.error(err); }
      setLoading(false);
    })();
  },[dayFilter]);

  const sorted = [...allEntries].sort((a,b)=>(b.total_points||0)-(a.total_points||0));
  const aliveCount = sorted.filter(e=>e.status==="alive").length;
  const totalPot = sorted.length * 20;
  const colors = [C.gold,"#6DBF73","#7B9EC9","#C47A6B"];

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
        <h1 style={{fontSize:28,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>Standings</h1>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        <div style={{display:"flex",gap:8,marginTop:16,marginBottom:16}}>
          {[{l:"ENTRIES",v:String(sorted.length),c:C.gold},{l:"ALIVE",v:String(aliveCount),c:C.green},{l:"POT",v:"$"+totalPot,c:C.gold}].map((s,i)=>(
            <div key={i} style={{flex:1,background:C.navyLight,borderRadius:C.rSm,border:`1px solid ${C.border}`,padding:"14px 8px",textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:24,color:s.c,fontFamily:"'Cormorant Garamond', serif"}}>{s.v}</div>
              <div style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.1em",marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Day filter */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[["2026-03-26","Thu Mar 26"],["2026-03-27","Fri Mar 27"],["2026-03-28","Sat Mar 28"],["2026-03-29","Sun Mar 29"],["2026-04-04","Sat Apr 4"],["2026-04-06","Mon Apr 6"]].filter(([d])=>{
            return true; // Show all dates that have games - can refine later
          }).map(([d,label])=>(
            <button key={d} onClick={()=>setDayFilter(d)} style={{padding:"8px 20px",borderRadius:20,background:dayFilter===d?C.gold:C.navyLight,color:dayFilter===d?C.navyDark:C.cream,border:dayFilter===d?"none":`1px solid ${C.border}`,cursor:"pointer",fontFamily:"'Raleway'",fontSize:13,fontWeight:600}}>{label}</button>
          ))}
        </div>

        {loading && <div style={{textAlign:"center",padding:40,color:C.textMid}}>Loading...</div>}
        {!loading && (
          <div>
            <Label>All Entries ({sorted.length})</Label>
            <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              {sorted.map((e,i)=>{
                const pick = entryPicks[e.id];
                const used = allUsedTeams[e.id] || [];
                return (
                  <div key={e.id} style={{padding:"12px 16px",borderBottom:i<sorted.length-1?`1px solid ${C.border}`:"none",opacity:e.status==="eliminated"?0.45:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{width:22,fontWeight:700,fontSize:14,color:i===0?C.gold:C.creamMuted,textAlign:"center",fontFamily:"'Cormorant Garamond', serif"}}>{i+1}</span>
                      <div style={{width:30,height:30,borderRadius:15,background:`${colors[i%4]}22`,border:`1.5px solid ${colors[i%4]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:colors[i%4],fontFamily:"'Raleway'",flexShrink:0}}>
                        {(e.name||"?")[0]}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:16,color:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>{e.name}</div>
                        <div style={{display:"flex",gap:6,marginTop:2}}>
                          {e.status==="alive"?<Badge color={C.green} bg={C.greenBg}>ALIVE</Badge>:<Badge color={C.red} bg={C.redBg}>OUT</Badge>}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:700,fontSize:20,color:(e.total_points||0)>0?C.gold:C.creamSubtle,fontFamily:"'Cormorant Garamond', serif"}}>{e.total_points||0}</div>
                        <div style={{color:C.creamSubtle,fontSize:9,fontFamily:"'Raleway'",letterSpacing:"0.1em"}}>PTS</div>
                      </div>
                    </div>
                    {/* Today's pick */}
                    {pick ? (
                      <div style={{marginTop:8,marginLeft:32,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'"}}>Pick:</span>
                        <span style={{fontSize:12,fontWeight:600,color:pick.result==="win"?C.green:pick.result==="loss"?C.red:C.gold,fontFamily:"'Cormorant Garamond', serif"}}>
                          ({pick.teamSeed}) {pick.teamName}
                        </span>
                        {pick.result==="win"&&<Badge color={C.green} bg={C.greenBg}>WIN</Badge>}
                        {pick.result==="loss"&&<Badge color={C.red} bg={C.redBg}>LOSS</Badge>}
                        {pick.result==="pending"&&<Badge color={C.gold} bg={C.goldMuted}>PENDING</Badge>}
                      </div>
                    ) : e.status==="alive" ? (
                      <div style={{marginTop:8,marginLeft:32}}>
                        <span style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",fontStyle:"italic"}}>No pick yet</span>
                      </div>
                    ) : null}
                    {/* Used teams */}
                    {used.length > 0 && (
                      <div style={{marginTop:6,marginLeft:32,display:"flex",flexWrap:"wrap",gap:4}}>
                        {used.map((t,idx)=>(
                          <span key={idx} style={{fontSize:9,padding:"2px 8px",borderRadius:10,background:C.creamFaint,color:C.creamSubtle,fontFamily:"'Raleway'"}}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Bracket Screen ──────────────────────────────────────────
const BracketScreen = () => {
  const [games,setGames]=useState([]);
  const [loading,setLoading]=useState(true);
  const rc={East:"#5B8BD4",South:"#D4835B",West:"#7BD45B",Midwest:"#D45B9F"};

  useEffect(()=>{
    (async()=>{
      const {data} = await supabase.from("games")
        .select("*, team_a:teams!games_team_a_id_fkey(id,name,seed,region), team_b:teams!games_team_b_id_fkey(id,name,seed,region)")
        .eq("tournament_id", TID).gte("round", 3);
      setGames((data||[]).sort(sortByTipTime));
      setLoading(false);
    })();
  },[]);

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
        <h1 style={{fontSize:28,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>Tournament Bracket</h1>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        {loading ? <div style={{textAlign:"center",padding:40,color:C.textMid}}>Loading...</div> :
          games.map(g=>(
            <div key={g.id} style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,marginBottom:8,padding:"12px 16px",marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:10,color:rc[g.region]||C.gold,fontFamily:"'Raleway'",fontWeight:600}}>{g.region}</span>
                  <span style={{fontSize:9,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>{g.game_time}</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",padding:"2px 8px",background:C.creamFaint,borderRadius:10}}>{g.tv_network}</span>
                  <span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",padding:"2px 8px",background:C.creamFaint,borderRadius:10}}>{g.game_date==="2026-03-26"?"Thu 3/26":"Fri 3/27"}</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Raleway'",width:22,textAlign:"center"}}>{g.team_a?.seed}</span>
                <span style={{fontSize:17,fontWeight:600,color:g.status==="final"&&g.winner_id===g.team_a?.id?C.green:C.cream,fontFamily:"'Cormorant Garamond', serif",flex:1}}>{g.team_a?.name} {g.status==="final"?g.team_a_score:""}</span>
                <span style={{fontSize:11,color:C.creamSubtle,fontFamily:"'Cormorant Garamond'",fontStyle:"italic",padding:"0 6px"}}>vs</span>
                <span style={{fontSize:17,fontWeight:600,color:g.status==="final"&&g.winner_id===g.team_b?.id?C.green:C.cream,fontFamily:"'Cormorant Garamond', serif",flex:1,textAlign:"right"}}>{g.status==="final"?g.team_b_score:""} {g.team_b?.name}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Raleway'",width:22,textAlign:"center"}}>{g.team_b?.seed}</span>
              </div>
              {g.status==="final"&&<div style={{marginTop:6,textAlign:"center",fontSize:10,color:C.green,fontFamily:"'Raleway'",fontWeight:600}}>FINAL</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ─── League / Profile Screen ─────────────────────────────────
const LeagueScreen = ({user,displayName,onLogout}) => {
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [pwMsg,setPwMsg]=useState("");
  const [newName,setNewName]=useState(displayName);
  const [nameMsg,setNameMsg]=useState("");
  const [activeSection,setActiveSection]=useState("profile");

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setPwMsg("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setPwMsg("Passwords don't match"); return; }
    try {
      const {error} = await supabase.auth.updateUser({password: newPassword});
      if (error) throw error;
      setPwMsg("Password updated!");
      setNewPassword(""); setConfirmPassword("");
    } catch(err) { setPwMsg(err.message); }
  };

  const handleChangeName = async () => {
    try {
      await supabase.auth.updateUser({data: {display_name: newName}});
      await supabase.from("profiles").update({display_name: newName}).eq("id", user.id);
      await supabase.from("entries").update({name: newName}).eq("user_id", user.id);
      setNameMsg("Name updated!");
    } catch(err) { setNameMsg(err.message); }
  };

  const renderProfile = () => (
    <div>
      <div style={{background:C.navyLight,borderRadius:C.r,border:"1px solid "+C.border,overflow:"hidden",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid "+C.border}}>
          <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>Email</span>
          <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>{user.email||""}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid "+C.border}}>
          <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>Display Name</span>
          <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>{displayName}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px"}}>
          <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>Member Since</span>
          <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>{new Date(user.created_at||"").toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span>
        </div>
      </div>
      <Label>Update Display Name</Label>
      <div style={{background:C.navyLight,borderRadius:C.r,border:"1px solid "+C.border,padding:"16px",marginBottom:20}}>
        <input value={newName} onChange={e=>setNewName(e.target.value)} style={{width:"100%",padding:"12px",borderRadius:C.rSm,border:"1px solid "+C.border,background:C.navyDark,color:C.cream,fontSize:14,fontFamily:"'Raleway'",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
        {nameMsg && <div style={{color:nameMsg.includes("updated")?C.green:C.red,fontSize:12,fontFamily:"'Raleway'",marginBottom:8}}>{nameMsg}</div>}
        <button onClick={handleChangeName} style={{width:"100%",padding:"12px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Raleway'"}}>UPDATE NAME</button>
      </div>
      <Label>Change Password</Label>
      <div style={{background:C.navyLight,borderRadius:C.r,border:"1px solid "+C.border,padding:"16px",marginBottom:20}}>
        <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} type="password" placeholder="New password" style={{width:"100%",padding:"12px",borderRadius:C.rSm,border:"1px solid "+C.border,background:C.navyDark,color:C.cream,fontSize:14,fontFamily:"'Raleway'",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
        <input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type="password" placeholder="Confirm new password" style={{width:"100%",padding:"12px",borderRadius:C.rSm,border:"1px solid "+C.border,background:C.navyDark,color:C.cream,fontSize:14,fontFamily:"'Raleway'",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
        {pwMsg && <div style={{color:pwMsg.includes("updated")?C.green:C.red,fontSize:12,fontFamily:"'Raleway'",marginBottom:8}}>{pwMsg}</div>}
        <button onClick={handleChangePassword} style={{width:"100%",padding:"12px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Raleway'"}}>CHANGE PASSWORD</button>
      </div>
    </div>
  );

  const renderLeagueInfo = () => (
    <div style={{background:C.navyLight,borderRadius:C.r,border:"1px solid "+C.border,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid "+C.border}}>
        <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>League</span>
        <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>Barry&#39;s Survivor Pool</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid "+C.border}}>
        <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>Competition</span>
        <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>March Madness Survivor</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid "+C.border}}>
        <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>Format</span>
        <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>1 entry, straight-up wins</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid "+C.border}}>
        <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>Points</span>
        <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>3 (S16) / 4 (E8) / 5 (F4) / 6 (C)</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px"}}>
        <span style={{fontWeight:500,fontSize:14,color:C.cream,fontFamily:"'Raleway'"}}>Entry Fee</span>
        <span style={{color:C.creamSubtle,fontSize:13,fontFamily:"'Raleway'"}}>$20</span>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div>
      <div style={{background:C.navyLight,borderRadius:C.r,border:"1px solid "+C.border,padding:"20px",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif",marginBottom:8}}>Pick Reminders</div>
        <div style={{fontSize:13,color:C.creamMuted,fontFamily:"'Raleway'",lineHeight:1.5,marginBottom:16}}>Get notified when your picks are due so you never miss a deadline.</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderTop:"1px solid "+C.border}}>
          <span style={{fontSize:13,color:C.cream,fontFamily:"'Raleway'"}}>Email reminders</span>
          <span style={{fontSize:12,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>Coming Soon</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderTop:"1px solid "+C.border}}>
          <span style={{fontSize:13,color:C.cream,fontFamily:"'Raleway'"}}>Push notifications</span>
          <span style={{fontSize:12,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>Coming Soon</span>
        </div>
      </div>
      <div style={{background:C.navyLight,borderRadius:C.r,border:"1px solid "+C.border,padding:"20px"}}>
        <div style={{fontSize:15,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif",marginBottom:8}}>Results and Scores</div>
        <div style={{fontSize:13,color:C.creamMuted,fontFamily:"'Raleway'",lineHeight:1.5,marginBottom:16}}>Get notified when games finish and scores are updated.</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderTop:"1px solid "+C.border}}>
          <span style={{fontSize:13,color:C.cream,fontFamily:"'Raleway'"}}>Score alerts</span>
          <span style={{fontSize:12,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>Coming Soon</span>
        </div>
      </div>
    </div>
  );

  const sectionContent = activeSection==="profile" ? renderProfile() : activeSection==="league" ? renderLeagueInfo() : renderNotifications();

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
        <h1 style={{fontSize:28,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>Profile and Settings</h1>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        <div style={{display:"flex",gap:8,marginTop:16,marginBottom:20}}>
          <button onClick={()=>setActiveSection("profile")} style={{padding:"8px 16px",borderRadius:20,background:activeSection==="profile"?C.gold:C.navyLight,color:activeSection==="profile"?C.navyDark:C.cream,border:activeSection==="profile"?"none":"1px solid "+C.border,cursor:"pointer",fontFamily:"'Raleway'",fontSize:12,fontWeight:600}}>My Profile</button>
          <button onClick={()=>setActiveSection("league")} style={{padding:"8px 16px",borderRadius:20,background:activeSection==="league"?C.gold:C.navyLight,color:activeSection==="league"?C.navyDark:C.cream,border:activeSection==="league"?"none":"1px solid "+C.border,cursor:"pointer",fontFamily:"'Raleway'",fontSize:12,fontWeight:600}}>League Info</button>
          <button onClick={()=>setActiveSection("notifications")} style={{padding:"8px 16px",borderRadius:20,background:activeSection==="notifications"?C.gold:C.navyLight,color:activeSection==="notifications"?C.navyDark:C.cream,border:activeSection==="notifications"?"none":"1px solid "+C.border,cursor:"pointer",fontFamily:"'Raleway'",fontSize:12,fontWeight:600}}>Notifications</button>
        </div>
        {sectionContent}
        <div style={{marginTop:24}}>
          <button onClick={onLogout} style={{width:"100%",padding:"14px",borderRadius:C.rSm,border:"1.5px solid "+C.red,background:"transparent",color:C.red,fontSize:13,fontWeight:600,letterSpacing:"0.1em",cursor:"pointer",fontFamily:"'Raleway'"}}>SIGN OUT</button>
        </div>
        <div style={{textAlign:"center",marginTop:32,marginBottom:20}}>
          <div style={{color:C.creamSubtle,fontSize:10,fontFamily:"'Raleway'",letterSpacing:"0.15em"}}>barrysbets.net</div>
        </div>
      </div>
    </div>
  );
};


// ─── Competition Selector (Landing Page) ─────────────────────
const CompetitionSelector = ({user,displayName,onSelect,onLogout}) => {
  const [competitions,setCompetitions] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Get leagues user has entries in
        const {data:entries} = await supabase.from("entries").select("league_id").eq("user_id", user.id);
        if (!entries || entries.length === 0) { setLoading(false); return; }
        const leagueIds = [...new Set(entries.map(e => e.league_id))];
        const enrolledLeagueIds = new Set(leagueIds);

        // Get league details
        const {data:leagues} = await supabase.from("leagues").select("*").in("id", leagueIds);

        // Build competition cards from leagues
        const comps = (leagues||[]).map(l => ({
          id: l.id,
          name: l.name || "Unnamed Competition",
          league: "Barry\'s Crew",
          status: enrolledLeagueIds.has(l.id) ? "active" : "active",
          icon: "🏀",
          desc: "Pick 1 winner per day. Survive or go home.",
          date: "Mar 26-27",
        }));

        setCompetitions(comps);
      } catch(err) { console.error("Load competitions error:", err); }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.pageBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.textMid,fontSize:14,fontFamily:"'Raleway'"}}>Loading competitions...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.pageBg,paddingBottom:40}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
            <h1 style={{fontSize:30,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>Welcome, {displayName}</h1>
            <div style={{color:C.textLight,fontSize:11,marginTop:3,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>Choose a competition</div>
          </div>
          <HexLogo size={50}/>
        </div>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        <div style={{marginTop:20}}>
          {competitions.length === 0 && (
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>🏆</div>
              <div style={{fontSize:16,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif",marginBottom:8}}>No competitions yet</div>
              <div style={{fontSize:12,color:C.creamSubtle,fontFamily:"'Raleway'"}}>Check back soon or ask Will for an invite code.</div>
            </div>
          )}
          {competitions.length > 0 && <Label>Your Competitions ({competitions.length})</Label>}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {competitions.map(c => (
              <button key={c.id} onClick={()=>c.status==="active"&&onSelect(c.id)} disabled={c.status==="coming_soon"} style={{
                padding:"20px",borderRadius:C.r,textAlign:"left",cursor:c.status!=="coming_soon"?"pointer":"default",
                background:c.status==="active"?C.navyLight:"rgba(35,40,56,0.5)",
                border:c.status!=="coming_soon"?("1.5px solid "+C.borderGold):("1.5px solid "+C.border),
                opacity:c.status!=="coming_soon"?1:0.5,transition:"all 0.25s",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                    <span style={{fontSize:28}}>{c.icon}</span>
                    <div>
                      <div style={{fontSize:20,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>{c.name}</div>

                      <div style={{fontSize:13,color:C.creamMuted,fontFamily:"'Raleway'",marginTop:6,lineHeight:1.5}}>{c.desc}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {c.status==="active" ? (
                      <Badge color={C.green} bg={C.greenBg}>LIVE</Badge>
                    ) : c.status==="pending" ? (
                      <Badge color={C.gold} bg={C.goldMuted}>JOIN</Badge>
                    ) : (
                      <Badge color={C.creamSubtle} bg={C.creamFaint}>COMING SOON</Badge>
                    )}
                    <div style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",marginTop:6}}>{c.date}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Profile quick actions */}
        <div style={{marginTop:32,display:"flex",gap:10}}>
          <button onClick={onLogout} style={{flex:1,padding:"12px",borderRadius:C.rSm,border:"1.5px solid "+C.border,background:"transparent",color:C.creamMuted,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>SIGN OUT</button>
        </div>

        <div style={{textAlign:"center",marginTop:32}}>
          <p style={{color:C.creamSubtle,fontSize:12,fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",lineHeight:1.8,opacity:0.7}}>Why do we lock our doors?<br/>{"…"}to keep Blair out</p>
          <div style={{color:C.creamSubtle,fontSize:10,fontFamily:"'Raleway'",letterSpacing:"0.15em",marginTop:12}}>barrysbets.net</div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function BarryBets() {
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("picks");
  const [entry,setEntry]=useState(null);
  const [displayName,setDisplayName]=useState("");
  const [selectedCompetition,setSelectedCompetition]=useState(null);

  // Auth check
  useEffect(()=>{
    (async()=>{
      const {data:{session}} = await supabase.auth.getSession();
      if (session) setUser(session.user);
      setLoading(false);
    })();
    const {data:{subscription}} = supabase.auth.onAuthStateChange((ev,session)=>{
      setUser(session?.user||null);
    });
    return ()=>subscription?.unsubscribe();
  },[]);

  // Load entry when user is set
  useEffect(()=>{
    if (!user) return;
    (async()=>{
      const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Player";
      setDisplayName(name);
      const {data:entries} = await supabase.from("entries").select("*").eq("league_id", LEAGUE_ID).eq("user_id", user.id).limit(1);
      if (entries && entries.length > 0) setEntry(entries[0]);
    })();
  },[user]);

  const handleLogin = async () => {
    const {data:{session}} = await supabase.auth.getSession();
    if (session) setUser(session.user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setEntry(null);
  };

  // Inject fonts
  useEffect(()=>{
    if(!document.querySelector('#bb-f')){
      const l=document.createElement("link");l.id="bb-f";l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  },[]);

  const app={fontFamily:"'Raleway', sans-serif",background:C.pageBg,color:C.cream,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative"};

  if (loading) return <div style={app}><div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:C.textMid}}>Loading...</div></div>;
  if (!user) return <div style={app}><LoginScreen onLogin={handleLogin}/></div>;
  if (!selectedCompetition) return (
    <div style={app}>
      <CompetitionSelector user={user} displayName={displayName} onSelect={(id)=>{setSelectedCompetition(id);}} onLogout={handleLogout}/>
    </div>
  );

  if (!entry) return <div style={app}><div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:C.textMid}}>No entry found for this competition. Contact Will to get set up.</div></div>;

  return (
    <div style={app}>
      {/* Back to competitions header */}
      <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.navyDark,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:99,borderBottom:"1px solid "+C.border}}>
        <button onClick={()=>{setSelectedCompetition(null);setTab("picks");}} style={{background:C.goldSubtle,border:"1px solid "+C.borderGold,borderRadius:16,padding:"4px 12px",color:C.gold,fontSize:11,fontWeight:600,fontFamily:"'Raleway'",cursor:"pointer",letterSpacing:"0.05em"}}>{"←"} COMPETITIONS</button>
        <span style={{fontSize:13,color:C.cream,fontFamily:"'Raleway'",fontWeight:600}}>Survivor Pool</span>
      </div>
      {tab==="picks"&&<PicksScreen user={user} entry={entry} displayName={displayName}/>}
      {tab==="standings"&&<StandingsScreen/>}
      {tab==="bracket"&&<BracketScreen/>}
      {tab==="profile"&&<LeagueScreen user={user} displayName={displayName} onLogout={handleLogout}/>}
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}
