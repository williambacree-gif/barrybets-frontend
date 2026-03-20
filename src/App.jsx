import { useState, useEffect, useCallback } from "react";
import { supabase, signIn, signUp, signOut, getSession, createEntries, getMyEntries, getAllEntries, submitPick, getMyPicks, getUsedTeams as fetchUsedTeams, getGamesForDate, getAllTeams, subscribeToGames, subscribeToEntries } from "./supabase";

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap";

const C = {
  navy:"#1A1F2E", navyLight:"#232838", navyLighter:"#2C3245", navyDark:"#12161F",
  gold:"#C4933F", goldLight:"#D4A74F", goldMuted:"rgba(196,147,63,0.15)", goldSubtle:"rgba(196,147,63,0.08)",
  cream:"#E8DDD0", creamMuted:"rgba(232,221,208,0.6)", creamSubtle:"rgba(232,221,208,0.3)", creamFaint:"rgba(232,221,208,0.12)",
  olive:"#3D4238", green:"#6DBF73", greenBg:"rgba(109,191,115,0.12)", red:"#D45B56", redBg:"rgba(212,91,86,0.12)",
  border:"rgba(232,221,208,0.08)", borderGold:"rgba(196,147,63,0.25)",
  r:12, rSm:8, textDark:"#1A1F2E", textMid:"#5A5A5A", textLight:"#8A8A8A", pageBg:"#F5F2ED",
  shadow:"0 2px 12px rgba(0,0,0,0.3)", shadowGold:"0 2px 20px rgba(196,147,63,0.15)",
};

const ENTRY_FEE = 20;
const BUYBACK_FEE = 40;
const DEADLINE = new Date("2026-03-19T11:45:00-04:00"); // 30 min before first tip
const TOURNAMENT_ID = "00000000-0000-0000-0000-000000002026";

const ROUNDS = [{r:1,name:"Round of 64",pts:1},{r:2,name:"Round of 32",pts:2},{r:3,name:"Sweet 16",pts:3},{r:4,name:"Elite Eight",pts:4},{r:5,name:"Final Four",pts:5},{r:6,name:"Championship",pts:6}];

// ─── Shared Components ───────────────────────────────────────
const Icon = ({name,size=22,color=C.cream}) => {
  const d={play:"M5 3l14 9-14 9V3z",trophy:"M12 15l-2 5h4l-2-5zm-4-3a4 4 0 008 0V4H8v8zm-4-6h4M16 6h4M4 6a2 2 0 002 2h0M20 6a2 2 0 01-2 2h0",bracket:"M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4zM8 6h8M8 18h8M12 6v12",users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",check:"M20 6L9 17l-5-5",back:"M15 18l-6-6 6-6",plus:"M12 5v14m-7-7h14",lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-3-4V5a4 4 0 10-8 0v2",edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z",logout:"M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d[name]||d.play}/></svg>;
};

const Avatar = ({name,size=36,color=C.gold}) => {
  const initials = name ? name.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase() : "?";
  return <div style={{width:size,height:size,borderRadius:size/2,background:`${color}22`,border:`1.5px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:600,color:color,flexShrink:0,fontFamily:"'Raleway'"}}>{initials}</div>;
};

const GoldDiv = () => (<div style={{display:"flex",alignItems:"center",gap:12,margin:"4px 0"}}><div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.borderGold},transparent)`}}/><div style={{width:4,height:4,borderRadius:2,background:C.gold,opacity:0.5}}/><div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.borderGold},transparent)`}}/></div>);
const Label = ({children}) => (<div style={{fontSize:10,fontWeight:600,color:C.gold,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:14,fontFamily:"'Raleway'"}}>{children}</div>);
const Badge = ({children,color=C.gold,bg=C.goldMuted}) => (<span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:600,background:bg,color,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>{children}</span>);

const BackButton = ({onClick,label="Back"}) => (
  <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:C.gold,fontFamily:"'Raleway'",fontSize:12,fontWeight:600,letterSpacing:"0.05em",padding:"8px 0",marginBottom:8}}>
    <Icon name="back" size={16} color={C.gold}/> {label}
  </button>
);

const HexLogo = ({size=80}) => (<svg width={size} height={size} viewBox="0 0 100 100" fill="none"><polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" stroke={C.gold} strokeWidth="2" fill="none"/><polygon points="50,12 86,31 86,69 50,88 14,69 14,31" stroke={C.creamSubtle} strokeWidth="0.5" fill="none"/><text x="50" y="36" textAnchor="middle" fill={C.creamSubtle} fontSize="7" fontFamily="Raleway" letterSpacing="2.5" fontWeight="500">BARRY</text><text x="50" y="58" textAnchor="middle" fill={C.cream} fontSize="20" fontFamily="Cormorant Garamond" fontWeight="600">BETS</text><text x="50" y="78" textAnchor="middle" fill={C.creamSubtle} fontSize="7" fontFamily="Raleway" letterSpacing="2" fontWeight="400">EST. MMXXV</text><circle cx="50" cy="85" r="1.2" fill={C.gold}/></svg>);

const TabBar = ({active,onChange}) => (
  <nav style={{display:"flex",justifyContent:"space-around",alignItems:"center",position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(18,22,31,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,padding:"8px 0 28px",zIndex:100}}>
    {[{id:"picks",icon:"play",label:"PICKS"},{id:"bracket",icon:"bracket",label:"BRACKET"},{id:"standings",icon:"trophy",label:"STANDINGS"},{id:"league",icon:"users",label:"LEAGUE"}].map(t=>(
      <button key={t.id} onClick={()=>onChange(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 16px",border:"none",background:"none",cursor:"pointer",color:active===t.id?C.gold:C.creamSubtle,fontSize:9,fontWeight:600,letterSpacing:"0.12em",fontFamily:"'Raleway'",transition:"color 0.3s"}}>
        <Icon name={t.icon} size={22} color={active===t.id?C.gold:C.creamSubtle}/><span>{t.label}</span>
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

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      await signIn(email, password);
      onLogin();
    } catch(err) {
      setError(err.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",background:`radial-gradient(ellipse at 50% 30%,${C.navyLighter} 0%,${C.navy} 60%,${C.navyDark} 100%)`}}>
      <div style={{animation:"fadeUp 0.6s ease"}}><HexLogo size={110}/></div>
      <div style={{fontSize:11,fontWeight:600,color:C.creamSubtle,letterSpacing:"0.25em",marginTop:28,marginBottom:8,fontFamily:"'Raleway'"}}>MARCH MADNESS</div>
      <div style={{fontSize:13,fontWeight:600,color:C.gold,letterSpacing:"0.15em",marginBottom:28,fontFamily:"'Raleway'"}}>SURVIVOR LEAGUE</div>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{display:"flex",alignItems:"center",gap:12,background:C.olive,borderRadius:C.rSm,padding:"0 16px",marginBottom:12,border:`1px solid ${C.border}`}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.creamSubtle} strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{flex:1,padding:"16px 0",background:"transparent",border:"none",outline:"none",color:C.cream,fontSize:15,fontFamily:"'Raleway'"}} placeholder="Email address" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,background:C.olive,borderRadius:C.rSm,padding:"0 16px",marginBottom:12,border:`1px solid ${C.border}`}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.creamSubtle} strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" style={{flex:1,padding:"16px 0",background:"transparent",border:"none",outline:"none",color:C.cream,fontSize:15,fontFamily:"'Raleway'"}} placeholder="Password" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>
        {error && <div style={{color:C.red,fontSize:12,fontFamily:"'Raleway'",marginBottom:12,textAlign:"center"}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:"17px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:700,letterSpacing:"0.18em",cursor:"pointer",fontFamily:"'Raleway'",boxShadow:C.shadowGold,opacity:loading?0.6:1}}>
          {loading?"SIGNING IN...":"SIGN IN"}
        </button>
      </div>
      <p style={{color:C.creamSubtle,fontSize:12,textAlign:"center",marginTop:24,fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",lineHeight:1.8,opacity:0.7}}>Why do we lock our doors?<br/>{"\u2026"}to keep Blair out</p>
      <div style={{marginTop:40,color:C.creamSubtle,fontSize:10,letterSpacing:"0.15em",fontFamily:"'Raleway'",opacity:0.3}}>barrysbets.net</div>
    </div>
  );
};

// ─── Entry Setup Screen ──────────────────────────────────────
const EntrySetup = ({user,league,existingEntries,onDone}) => {
  const [count,setCount]=useState(existingEntries?.length||0);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const canChange = new Date() < DEADLINE;
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Player";

  const handleConfirm = async () => {
    if(!canChange) { onDone(); return; }
    setLoading(true); setError("");
    try {
      const existing = existingEntries?.length || 0;
      if(!league || !league.id) {
        setError("League not found. Please refresh and try again.");
        setLoading(false);
        return;
      }
      if(count > existing) {
        await createEntries(league.id, count - existing, displayName);
      }
      // If reducing entries, we'd delete - but for simplicity, only allow increasing
      onDone();
    } catch(err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if(!canChange && existingEntries?.length > 0) {
    // Past deadline, already has entries - skip setup
    onDone();
    return null;
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",padding:"60px 32px",background:`radial-gradient(ellipse at 50% 20%,${C.navyLighter} 0%,${C.navy} 60%,${C.navyDark} 100%)`}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <HexLogo size={70}/>
        <div style={{fontSize:11,fontWeight:600,color:C.creamSubtle,letterSpacing:"0.2em",marginTop:16,fontFamily:"'Raleway'"}}>MARCH MADNESS SURVIVOR</div>
        <h2 style={{fontSize:26,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif",margin:"12px 0 4px"}}>
          {existingEntries?.length > 0 ? "Change Entries?" : "How Many Entries?"}
        </h2>
        <p style={{color:C.creamSubtle,fontSize:12,fontFamily:"'Raleway'",lineHeight:1.5}}>
          Welcome, {displayName}! Each entry is ${ENTRY_FEE}.<br/>
          {canChange ? "You can change until 11:45 AM ET Thursday." : "Entry deadline has passed."}
        </p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {[1,2,3].map(n=>(
          <button key={n} onClick={()=>canChange&&setCount(n)} disabled={!canChange} style={{
            padding:"20px",borderRadius:C.r,
            background:count===n?C.goldSubtle:C.navyLight,
            border:count===n?`2px solid ${C.gold}`:`1.5px solid ${C.border}`,
            cursor:canChange?"pointer":"default",display:"flex",justifyContent:"space-between",alignItems:"center",
            opacity:!canChange&&count!==n?0.4:1,
          }}>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:18,fontWeight:700,color:count===n?C.gold:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>{n} {n===1?"Entry":"Entries"}</div>
              <div style={{fontSize:11,color:C.creamSubtle,fontFamily:"'Raleway'",marginTop:2}}>{n===1?"Just beat Perk":n===2?"Live a little":"Beat Kirkland"}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:700,color:count===n?C.gold:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>${n*ENTRY_FEE}</div>
              {count===n&&<div style={{fontSize:10,color:C.gold,fontFamily:"'Raleway'",marginTop:2}}>{"\u2713"} SELECTED</div>}
            </div>
          </button>
        ))}
      </div>
      {error && <div style={{color:C.red,fontSize:12,fontFamily:"'Raleway'",marginBottom:12,textAlign:"center"}}>{error}</div>}
      {count>0&&(
        <button onClick={handleConfirm} disabled={loading} style={{width:"100%",padding:"17px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:700,letterSpacing:"0.18em",cursor:"pointer",fontFamily:"'Raleway'",boxShadow:C.shadowGold,opacity:loading?0.6:1}}>
          {loading ? "SAVING..." : `CONFIRM ${count} ${count===1?"ENTRY":"ENTRIES"} \u2192 $${count*ENTRY_FEE}`}
        </button>
      )}
    </div>
  );
};

// ─── Game Card ───────────────────────────────────────────────
const GameCard = ({game,pick,onPick,usedTeams=[],locked=false}) => {
  if(!game.team_a || !game.team_b) return null;
  const tA = game.team_a;
  const tB = game.team_b;
  const isUsedA = usedTeams.includes(tA.name);
  const isUsedB = usedTeams.includes(tB.name);
  const isGameLocked = (()=>{
    if(!game.game_time||!game.game_date) return false;
    const tp=game.game_time.match(/(\d+):(\d+)\s*(AM|PM)/);
    if(!tp) return false;
    let h=parseInt(tp[1]);const m=parseInt(tp[2]);
    if(tp[3]==="PM"&&h!==12) h+=12; if(tp[3]==="AM"&&h===12) h=0;
    const tip=new Date(game.game_date+"T"+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":00-04:00");
    return new Date()>=new Date(tip.getTime()-30*60*1000);
  })();
  const gameLocked = locked || isGameLocked;

  return (
    <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${pick?C.borderGold:C.border}`,marginBottom:10,overflow:"hidden",boxShadow:pick?C.shadowGold:C.shadow}}>
      <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>{game.region}</span>
          <span style={{fontSize:9,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>{game.game_time||""}</span>
          <span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'"}}>{game.tv_network||""}</span>
        </div>
        {game.status==="final"?(
          <Badge color={C.cream} bg={C.navyDark}>FINAL</Badge>
        ):(
          <Badge>1 pt</Badge>
        )}
      </div>
      {game.status==="final"&&game.team_a_score!=null&&(
        <div style={{padding:"0 16px 8px",display:"flex",justifyContent:"center",gap:16,alignItems:"center"}}>
          <span style={{fontSize:14,fontWeight:700,color:game.team_a_score>game.team_b_score?C.green:C.red,fontFamily:"'Cormorant Garamond', serif"}}>{tA.name} {game.team_a_score}</span>
          <span style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'"}}>-</span>
          <span style={{fontSize:14,fontWeight:700,color:game.team_b_score>game.team_a_score?C.green:C.red,fontFamily:"'Cormorant Garamond', serif"}}>{game.team_b_score} {tB.name}</span>
        </div>
      )}
      <div style={{display:"flex",gap:8,padding:"0 16px 14px"}}>
        {[{team:tA,used:isUsedA},{team:tB,used:isUsedB}].map(({team,used})=>(
          <button key={team.id} onClick={()=>!gameLocked&&!used&&onPick(game.id,team.id,team.name)} disabled={gameLocked||used} style={{
            flex:1,padding:"12px 8px",borderRadius:C.rSm,textAlign:"center",
            border:pick===team.id?(game.status==="final"?(game.winner?.id===team.id||game.winner_id===team.id?`2px solid ${C.green}`:`2px solid ${C.red}`):`2px solid ${C.gold}`):used?`1.5px solid rgba(212,91,86,0.4)`:`1.5px solid ${C.border}`,
            background:pick===team.id?(game.status==="final"?(game.winner?.id===team.id||game.winner_id===team.id?C.greenBg:C.redBg):C.goldSubtle):used?"rgba(212,91,86,0.06)":C.navyDark,
            color:pick===team.id?(game.status==="final"?(game.winner?.id===team.id||game.winner_id===team.id?C.green:C.red):C.goldLight):used?C.red:C.cream,opacity:used?0.35:1,
            cursor:gameLocked||used?"default":"pointer",transition:"all 0.25s",fontFamily:"'Cormorant Garamond', serif",
            boxShadow:pick===team.id?C.shadowGold:"none",
          }}>
            <div style={{fontSize:10,color:pick===team.id?C.gold:C.creamSubtle,fontFamily:"'Raleway'",marginBottom:3,fontWeight:600}}>({team.seed})</div>
            <div style={{fontSize:14,fontWeight:600}}>{team.name}</div>
            {used&&pick!==team.id&&<div style={{fontSize:9,color:C.red,marginTop:3,fontFamily:"'Raleway'",fontWeight:700}}>{"\u{1F6AB}"} USED</div>}
            {pick===team.id&&<div style={{fontSize:9,color:game.status==="final"?(game.winner?.id===team.id||game.winner_id===team.id?C.green:C.red):C.gold,marginTop:3,fontFamily:"'Raleway'",fontWeight:700,letterSpacing:"0.08em"}}>{game.status==="final"?(game.winner?.id===team.id||game.winner_id===team.id?"✓ WIN":"✗ LOSS"):"YOUR PICK"}</div>}
            {isGameLocked&&!pick&&!used&&<div style={{fontSize:9,color:C.red,marginTop:3,fontFamily:"'Raleway'",fontWeight:600}}>LOCKED</div>}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Picks Screen (Real Data) ────────────────────────────────
const PicksScreen = ({user,entries,refreshEntries}) => {
  const [currentEntry,setCurrentEntry]=useState(0);
  const [games,setGames]=useState([]);
  const [picks,setPicks]=useState({});
  const [usedTeams,setUsedTeams]=useState({});
  const [dayFilter,setDayFilter]=useState("2026-03-19");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Player";

  const entry = entries[currentEntry];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const g = await getGamesForDate(dayFilter);
      // Sort by actual tip time
      g.sort((a,b) => {
        const parseTime = (t) => {
          if(!t) return 9999;
          const m = t.match(/(\d+):(\d+)\s*(AM|PM)/);
          if(!m) return 9999;
          let h = parseInt(m[1]); const mn = parseInt(m[2]);
          if(m[3]==="PM"&&h!==12) h+=12; if(m[3]==="AM"&&h===12) h=0;
          return h*60+mn;
        };
        return parseTime(a.game_time) - parseTime(b.game_time);
      });
      setGames(g);
      // Load picks and used teams for each entry
      const p = {}; const u = {};
      for(const e of entries) {
        const myPicks = await getMyPicks(e.id);
        const myUsed = await fetchUsedTeams(e.id);
        // Find today's pick
        const todayPick = myPicks.find(pk => pk.picks?.pick_date === dayFilter || pk.pick_date === dayFilter);
        p[e.id] = todayPick?.team_id || null;
        u[e.id] = myUsed || [];
      }
      setPicks(p);
      setUsedTeams(u);
    } catch(err) { console.error("Load error:", err); }
    setLoading(false);
  }, [dayFilter, entries]);

  useEffect(() => { if(entries.length > 0) loadData(); }, [loadData, entries]);

  const handlePick = async (gameId, teamId, teamName) => {
    if(!entry || entry.status !== "alive") return;
    setSaving(true);
    try {
      await submitPick(entry.id, gameId, teamId, 1, dayFilter);
      setPicks(prev => ({...prev, [entry.id]: teamId}));
      // Don't add to usedTeams here - usedTeams only tracks PREVIOUS rounds
      // Current round pick is tracked by the picks state, not usedTeams
    } catch(err) { alert(err.message); }
    setSaving(false);
  };

  if(loading) return <div style={{padding:"100px 24px",textAlign:"center",color:C.textMid}}>Loading games...</div>;

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
            <h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>March Madness Survivor</h1>
            <div style={{color:C.textLight,fontSize:11,marginTop:3,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>Round of 64 {"\u00B7"} {displayName}</div>
          </div>
          <HexLogo size={44}/>
        </div>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        {/* Entry Tabs */}
        <div style={{display:"flex",gap:8,marginTop:16,marginBottom:12}}>
          {entries.map((e,i)=>{
            const eliminated = e.status==="eliminated";
            return (
              <button key={e.id} onClick={()=>!eliminated&&setCurrentEntry(i)} disabled={eliminated} style={{
                flex:1,padding:"10px 6px",borderRadius:C.rSm,textAlign:"center",
                background:eliminated?"rgba(212,91,86,0.08)":currentEntry===i?C.goldSubtle:C.navyLight,
                border:eliminated?`1.5px solid rgba(212,91,86,0.3)`:currentEntry===i?`1.5px solid ${C.gold}`:`1.5px solid ${C.border}`,
                color:eliminated?C.red:currentEntry===i?C.gold:C.cream,
                cursor:eliminated?"not-allowed":"pointer",fontFamily:"'Raleway'",fontSize:11,fontWeight:600,
                opacity:eliminated?0.5:1,
              }}>
                {e.name || `${displayName} #${e.entry_number}`}
              </button>
            );
          })}
        </div>

        {/* Pick status */}
        {entry && picks[entry.id] ? (
          <div style={{background:C.greenBg,border:"1px solid rgba(109,191,115,0.25)",borderRadius:C.r,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <Icon name="check" size={16} color={C.green}/>
            <div style={{fontSize:12,color:C.green,fontFamily:"'Raleway'",fontWeight:600}}>Pick saved! Tap another team to change.</div>
          </div>
        ) : entry?.status === "alive" ? (
          <div style={{background:C.navyDark,border:`1px solid ${C.border}`,borderRadius:C.r,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <Icon name="play" size={16} color={C.gold}/>
            <div style={{fontWeight:600,fontSize:11,color:C.gold,fontFamily:"'Raleway'"}}>PICK A WINNER FOR {(entry.name||`${displayName} #${entry.entry_number}`).toUpperCase()}</div>
          </div>
        ) : null}

        {/* Day Filter */}
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["2026-03-19","Thu Mar 19"],["2026-03-20","Fri Mar 20"]].map(([d,label])=>(
            <button key={d} onClick={()=>setDayFilter(d)} style={{padding:"8px 20px",borderRadius:20,background:dayFilter===d?C.gold:C.navyLight,color:dayFilter===d?C.navyDark:C.cream,border:dayFilter===d?"none":`1px solid ${C.border}`,cursor:"pointer",fontFamily:"'Raleway'",fontSize:12,fontWeight:600}}>{label}</button>
          ))}
        </div>

        {saving && <div style={{textAlign:"center",padding:8,color:C.gold,fontSize:12}}>Saving pick...</div>}

        <Label>{dayFilter==="2026-03-19"?"Thursday":"Friday"} Games ({games.length})</Label>
        {games.map(g => (
          <GameCard key={g.id} game={g} pick={entry?picks[entry.id]:null} onPick={handlePick} usedTeams={entry?usedTeams[entry.id]||[]:[]} locked={entry?.status!=="alive"}/>
        ))}

        <div style={{marginTop:12,background:C.navyLighter,borderRadius:C.r,padding:"14px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:600,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",marginBottom:4}}>STRATEGY</div>
          <div style={{fontSize:11,color:C.creamMuted,fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",lineHeight:1.5}}>Save top seeds for later rounds. Your team just needs to win straight-up.</div>
        </div>
      </div>
    </div>
  );
};

// ─── Bracket Screen (Real Data) ──────────────────────────────
const BracketScreen = ({onBack}) => {
  const [region,setRegion]=useState("East");
  const [games,setGames]=useState([]);
  const [loading,setLoading]=useState(true);
  const rc={East:"#5B8BD4",South:"#D4835B",West:"#7BD45B",Midwest:"#D45B9F"};
  const venues={East:"Washington D.C.",South:"Houston",West:"San Jose",Midwest:"Chicago"};

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const thu = await getGamesForDate("2026-03-19");
      const fri = await getGamesForDate("2026-03-20");
      setGames([...thu,...fri]);
      setLoading(false);
    })();
  },[]);

  const regionGames = games.filter(g=>g.region===region).sort((a,b)=>{
    const parseTime=(t)=>{if(!t)return 9999;const m=t.match(/(\d+):(\d+)\s*(AM|PM)/);if(!m)return 9999;let h=parseInt(m[1]);const mn=parseInt(m[2]);if(m[3]==="PM"&&h!==12)h+=12;if(m[3]==="AM"&&h===12)h=0;return h*60+mn;};
    return parseTime(a.game_time)-parseTime(b.game_time);
  });

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
        <h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>Bracket</h1>
        <div style={{color:C.textLight,fontSize:11,marginTop:3,fontFamily:"'Raleway'"}}>2026 NCAA Tournament</div>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        <div style={{display:"flex",gap:6,marginTop:16,marginBottom:16,overflowX:"auto"}}>
          {["East","South","West","Midwest"].map(r=>(
            <button key={r} onClick={()=>setRegion(r)} style={{padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap",background:region===r?rc[r]:C.navyLight,color:region===r?"#fff":C.creamMuted,border:region===r?"none":`1px solid ${C.border}`,cursor:"pointer",fontFamily:"'Raleway'",fontSize:11,fontWeight:600}}>{r}</button>
          ))}
        </div>
        {loading ? <div style={{textAlign:"center",padding:40,color:C.textMid}}>Loading bracket...</div> :
          regionGames.map((g,i)=>(
            <div key={g.id} style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,marginBottom:8,padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>{g.game_time||"TBD"}</span>
                <div style={{display:"flex",gap:6}}>
                  <span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",padding:"2px 8px",background:C.creamFaint,borderRadius:10}}>{g.tv_network||""}</span>
                  <span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",padding:"2px 8px",background:C.creamFaint,borderRadius:10}}>{g.game_date==="2026-03-19"?"Mar 19":"Mar 20"}</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Raleway'",width:22,textAlign:"center"}}>{g.team_a?.seed||"?"}</span>
                <span style={{fontSize:15,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif",flex:1}}>{g.team_a?.name||"TBD"} {g.spread_value?`(-${g.spread_value})`:""}</span>
                <span style={{fontSize:11,color:C.creamSubtle,fontFamily:"'Cormorant Garamond'",fontStyle:"italic",padding:"0 6px"}}>vs</span>
                <span style={{fontSize:15,fontWeight:600,color:g.team_b?C.cream:C.creamSubtle,fontFamily:"'Cormorant Garamond', serif",flex:1,textAlign:"right"}}>{g.team_b?.name||"TBD"}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Raleway'",width:22,textAlign:"center"}}>{g.team_b?.seed||"?"}</span>
              </div>
              {g.status==="final"&&g.winner&&(
                <div style={{marginTop:8,fontSize:11,color:C.green,fontFamily:"'Raleway'",fontWeight:600}}>{"\u2713"} Winner: {g.winner.name}</div>
              )}
            </div>
          ))
        }
        <div style={{marginTop:12,textAlign:"center"}}>
          <div style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.1em"}}>REGIONAL FINAL IN</div>
          <div style={{fontSize:14,color:C.gold,fontFamily:"'Cormorant Garamond', serif",fontWeight:600,marginTop:4}}>{venues[region]}</div>
        </div>
      </div>
    </div>
  );
};

// ─── Standings Screen (Real Data) ────────────────────────────
const StandingsScreen = ({league}) => {
  const [allEntries,setAllEntries]=useState([]);
  const [entryPicks,setEntryPicks]=useState({});
  const [allUsedTeams,setAllUsedTeams]=useState({});
  const [teams,setTeams]=useState({});
  const [loading,setLoading]=useState(true);
  const [dayFilter,setDayFilter]=useState("2026-03-19");

  useEffect(()=>{
    (async()=>{
      try {
        const entries = await getAllEntries(league?.id);
        setAllEntries(entries||[]);
        
        // Load all teams for name lookup
        const allTeams = await getAllTeams();
        const teamMap = {};
        (allTeams||[]).forEach(t => { teamMap[t.id] = t; });
        setTeams(teamMap);
        
        // Load picks for each entry for the selected day
        const picksMap = {};
        const usedMap = {};
        for(const entry of (entries||[])) {
          const {data:picks} = await supabase.from("picks").select("*").eq("entry_id",entry.id).eq("pick_date",dayFilter);
          if(picks && picks.length > 0) {
            const teamId = picks[0].team_id;
            const team = teamMap[teamId];
            picksMap[entry.id] = {
              teamName: team?.name || "Unknown",
              teamSeed: team?.seed,
              result: picks[0].result,
            };
          }
          // Load ALL used teams for this entry (all rounds)
          const {data:used} = await supabase.from("used_teams").select("team_id").eq("entry_id",entry.id);
          if(used && used.length > 0) {
            usedMap[entry.id] = used.map(u => teamMap[u.team_id]?.name || "Unknown");
          }
        }
        setEntryPicks(picksMap);
        setAllUsedTeams(usedMap);
      } catch(err) { console.error(err); }
      setLoading(false);
    })();
  },[league,dayFilter]);

  const sorted = [...allEntries].sort((a,b)=>(b.total_points||0)-(a.total_points||0));
  const aliveCount = sorted.filter(e=>e.status==="alive").length;
  const totalPot = sorted.length * ENTRY_FEE;
  const colors = [C.gold,"#6DBF73","#7B9EC9","#C47A6B","#B07CC3","#6BC4B0"];

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
        <h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>Standings</h1>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        <div style={{display:"flex",gap:8,marginTop:16,marginBottom:16}}>
          {[{label:"ENTRIES",value:String(sorted.length),color:C.gold},{label:"ALIVE",value:String(aliveCount),color:C.green},{label:"POT",value:"$"+totalPot,color:C.gold}].map((s,i)=>(
            <div key={i} style={{flex:1,background:C.navyLight,borderRadius:C.rSm,border:`1px solid ${C.border}`,padding:"14px 8px",textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:24,color:s.color,fontFamily:"'Cormorant Garamond', serif"}}>{s.value}</div>
              <div style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.1em",marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.goldSubtle,border:`1px solid ${C.borderGold}`,borderRadius:C.r,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{String.fromCodePoint(0x1F3C6)}</span>
          <div>
            <div style={{fontWeight:600,fontSize:11,color:C.gold,fontFamily:"'Raleway'"}}>SINGLE ENTRY WINS</div>
            <div style={{fontSize:11,color:C.textMid,fontFamily:"'Raleway'",marginTop:2}}>The one entry with the most points takes the pot.</div>
          </div>
        </div>

        {/* Day filter for picks */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[["2026-03-19","Thu Mar 19"],["2026-03-20","Fri Mar 20"]].map(([d,label])=>(
            <button key={d} onClick={()=>setDayFilter(d)} style={{padding:"8px 20px",borderRadius:20,background:dayFilter===d?C.gold:C.navyLight,color:dayFilter===d?C.navyDark:C.cream,border:dayFilter===d?"none":`1px solid ${C.border}`,cursor:"pointer",fontFamily:"'Raleway'",fontSize:12,fontWeight:600}}>{label}</button>
          ))}
        </div>

        {loading ? <div style={{textAlign:"center",padding:40,color:C.textMid}}>Loading...</div> : (
          <>
            <Label>All Entries ({sorted.length})</Label>
            <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              {sorted.map((e,i)=>{
                const pick = entryPicks[e.id];
                return (
                  <div key={e.id} style={{padding:"12px 16px",borderBottom:i<sorted.length-1?`1px solid ${C.border}`:"none",opacity:e.status==="eliminated"?0.45:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{width:22,fontWeight:700,fontSize:14,color:i===0?C.gold:i<=2?C.creamMuted:C.creamSubtle,textAlign:"center",fontFamily:"'Cormorant Garamond', serif"}}>{i+1}</span>
                      <Avatar name={e.profiles?.display_name||e.name||"?"} size={30} color={colors[i%colors.length]}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:14,color:C.cream,fontFamily:"'Cormorant Garamond', serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name||"Entry "+e.entry_number}</div>
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
                    {/* All teams used by this entry */}
                    {allUsedTeams[e.id] && allUsedTeams[e.id].length > 0 && (
                      <div style={{marginTop:6,marginLeft:32,display:"flex",flexWrap:"wrap",gap:4}}>
                        {allUsedTeams[e.id].map((ut,idx)=>(
                          <span key={idx} style={{fontSize:9,padding:"2px 8px",borderRadius:10,background:C.creamFaint,color:C.creamSubtle,fontFamily:"'Raleway'"}}>{ut}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div style={{marginTop:24}}>
          <Label>Points by Round</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {ROUNDS.map(r=>(
              <div key={r.r} style={{background:C.navyLight,borderRadius:C.rSm,border:`1px solid ${C.border}`,padding:"12px",textAlign:"center"}}>
                <div style={{fontWeight:700,fontSize:22,color:r.r<=1?C.gold:C.creamSubtle,fontFamily:"'Cormorant Garamond', serif"}}>{r.pts}</div>
                <div style={{fontSize:8,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.08em",marginTop:4}}>{r.name.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── League Screen ───────────────────────────────────────────
const LeagueScreen = ({user,league,onLogout}) => {
  const [members,setMembers]=useState([]);
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Player";

  useEffect(()=>{
    if(!league) return;
    (async()=>{
      const {data} = await supabase.from("league_members").select("*, profiles(display_name,initials,avatar_color)").eq("league_id",league.id);
      setMembers(data||[]);
    })();
  },[league]);

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
        <h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>League</h1>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>
        <div style={{marginTop:16,background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {[
            {l:"League",v:league?.name||"Survivor Pool",i:"\u{1F3C6}"},
            {l:"Format",v:"Survivor (1-3 entries)",i:"\u{1F480}"},
            {l:"Wins",v:"Straight-up (no spread)",i:"\u2705"},
            {l:"Entry Fee",v:`$${ENTRY_FEE}/entry`,i:"\u{1F4B0}"},
            {l:"Buy-back",v:`$${BUYBACK_FEE} (if all out)`,i:"\u{1F504}"},
            {l:"Invite Code",v:league?.invite_code||"N/A",i:"\u{1F517}"},
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:i<5?`1px solid ${C.border}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:16}}>{item.i}</span><span style={{fontWeight:500,fontSize:13,color:C.cream,fontFamily:"'Raleway'"}}>{item.l}</span></div>
              <span style={{color:C.creamSubtle,fontSize:12,fontFamily:"'Raleway'"}}>{item.v}</span>
            </div>
          ))}
        </div>

        <div style={{marginTop:24}}>
          <Label>Survivor Rules</Label>
          <div style={{background:C.navyLighter,borderRadius:C.r,padding:"18px",border:`1px solid ${C.border}`}}>
            {["Pick one game winner per entry per day","If your team WINS (straight-up), you survive","If your team LOSES, that entry is eliminated","You CANNOT pick the same team twice per entry","Points: R64=1, R32=2, S16=3, E8=4, F4=5, Title=6","If all entries eliminated, buy back 1 for $40"].map((rule,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:i<5?10:0}}>
                <span style={{color:C.gold,fontSize:11,fontFamily:"'Raleway'",fontWeight:700,minWidth:18}}>{i+1}.</span>
                <span style={{fontSize:12,color:C.creamMuted,fontFamily:"'Raleway'",lineHeight:1.5}}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile / Logout */}
        <div style={{marginTop:24}}>
          <Label>Profile</Label>
          <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,padding:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <Avatar name={displayName} size={40}/>
              <div>
                <div style={{fontWeight:600,fontSize:15,color:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>{displayName}</div>
                <div style={{fontSize:11,color:C.creamSubtle,fontFamily:"'Raleway'"}}>{user?.email}</div>
              </div>
            </div>
            <button onClick={onLogout} style={{width:"100%",padding:"12px",borderRadius:C.rSm,border:`1.5px solid ${C.red}`,background:"transparent",color:C.red,fontSize:12,fontWeight:600,letterSpacing:"0.1em",cursor:"pointer",fontFamily:"'Raleway'",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <Icon name="logout" size={16} color={C.red}/> SIGN OUT
            </button>
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:32,marginBottom:20}}>
          <div style={{color:C.creamSubtle,fontSize:10,fontFamily:"'Raleway'",letterSpacing:"0.15em"}}>barrysbets.net {"\u00B7"} EST. MMXXV</div>
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
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("picks");
  const [entries,setEntries]=useState([]);
  const [league,setLeague]=useState(null);
  const [showSetup,setShowSetup]=useState(false);

  // Check for existing session on load
  useEffect(()=>{
    (async()=>{
      const {data:{session:s}} = await supabase.auth.getSession();
      if(s) { setSession(s); setUser(s.user); }
      setLoading(false);
    })();
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,s)=>{
      setSession(s); setUser(s?.user||null);
    });
    return ()=>subscription?.unsubscribe();
  },[]);

  // Load league and entries when user is set
  const loadUserData = useCallback(async()=>{
    if(!user) return;
    try {
      // Get league membership
      const {data:memberships,error:memErr} = await supabase.from("league_members").select("league_id,role").eq("user_id",user.id);
      console.log("Memberships:", memberships, memErr);
      
      let leagueId = null;
      if(memberships && memberships.length > 0) {
        leagueId = memberships[0].league_id;
      } else {
        // Not in a league yet - find one and auto-join
        const {data:leagues} = await supabase.from("leagues").select("*").limit(1);
        if(leagues && leagues.length > 0) {
          await supabase.from("league_members").insert({league_id:leagues[0].id,user_id:user.id,role:"member"});
          leagueId = leagues[0].id;
        }
      }
      
      if(leagueId) {
        // Get league details separately
        const {data:leagueData} = await supabase.from("leagues").select("*").eq("id",leagueId).single();
        console.log("League:", leagueData);
        setLeague(leagueData);
        
        // Get my entries
        const myEntries = await getMyEntries(leagueId);
        console.log("My entries:", myEntries);
        setEntries(myEntries);
        if(myEntries.length === 0) setShowSetup(true);
      }
    } catch(err) { console.error("Load user data error:", err); }
  },[user]);

  useEffect(()=>{ loadUserData(); },[loadUserData]);

  const refreshEntries = async()=>{
    if(!league) return;
    const myEntries = await getMyEntries(league.id);
    setEntries(myEntries);
  };

  const handleLogin = async()=>{
    const {data:{session:s}} = await supabase.auth.getSession();
    if(s) { setSession(s); setUser(s.user); }
  };

  const handleLogout = async()=>{
    await signOut();
    setUser(null); setSession(null); setEntries([]); setLeague(null);
  };

  // Inject fonts and styles
  useEffect(()=>{
    if(!document.querySelector('#bb-f')){const l=document.createElement("link");l.id="bb-f";l.rel="stylesheet";l.href=FONTS_URL;document.head.appendChild(l);}
    if(!document.querySelector('#bb-s')){const s=document.createElement("style");s.id="bb-s";s.textContent=`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes glow{0%,100%{opacity:.4}50%{opacity:.8}}*{box-sizing:border-box}::-webkit-scrollbar{display:none}input::placeholder{color:rgba(232,221,208,0.35)}`;document.head.appendChild(s);}
  },[]);

  const app={fontFamily:"'Raleway', sans-serif",background:C.pageBg,color:C.cream,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative"};

  if(loading) return <div style={app}><div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:C.textMid}}>Loading...</div></div>;

  // Not logged in
  if(!user) return <div style={app}><LoginScreen onLogin={handleLogin}/></div>;

  // Needs to set up entries
  if(showSetup || entries.length === 0) return (
    <div style={app}>
      <EntrySetup user={user} league={league} existingEntries={entries} onDone={()=>{setShowSetup(false);refreshEntries();}}/>
    </div>
  );

  // Main app
  return (
    <div style={app}>
      {tab==="picks"&&<PicksScreen user={user} entries={entries} refreshEntries={refreshEntries}/>}
      {tab==="bracket"&&<BracketScreen/>}
      {tab==="standings"&&<StandingsScreen league={league}/>}
      {tab==="league"&&<LeagueScreen user={user} league={league} onLogout={handleLogout}/>}
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}
