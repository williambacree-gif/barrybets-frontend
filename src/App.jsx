import { useState, useEffect } from "react";

const FONTS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap";

const C = {
  navy:"#1A1F2E", navyLight:"#232838", navyLighter:"#2C3245", navyDark:"#12161F",
  gold:"#C4933F", goldLight:"#D4A74F", goldMuted:"rgba(196,147,63,0.15)", goldSubtle:"rgba(196,147,63,0.08)",
  cream:"#E8DDD0", creamMuted:"rgba(232,221,208,0.6)", creamSubtle:"rgba(232,221,208,0.3)", creamFaint:"rgba(232,221,208,0.12)",
  olive:"#3D4238", green:"#6DBF73", greenBg:"rgba(109,191,115,0.12)", red:"#D45B56", redBg:"rgba(212,91,86,0.12)",
  border:"rgba(232,221,208,0.08)", borderGold:"rgba(196,147,63,0.25)",
  r:12, rSm:8, textDark:'#1A1F2E', textMid:'#5A5A5A', textLight:'#8A8A8A', pageBg:'#F5F2ED', shadow:"0 2px 12px rgba(0,0,0,0.3)", shadowGold:"0 2px 20px rgba(196,147,63,0.15)",
};

const BRACKET = {
  East: [
    {sA:1,tA:"Duke",sB:16,tB:"Siena",spread:-27.5,fav:"Duke",time:"2:50 PM",tv:"CBS",day:"Thu"},
    {sA:8,tA:"Ohio State",sB:9,tB:"TCU",spread:-2.5,fav:"Ohio State",time:"12:15 PM",tv:"CBS",day:"Thu"},
    {sA:5,tA:"St. John's",sB:12,tB:"Northern Iowa",spread:-9.5,fav:"St. John's",time:"12:40 PM",tv:"truTV",day:"Thu"},
    {sA:4,tA:"Kansas",sB:13,tB:"Cal Baptist",spread:-13.5,fav:"Kansas",time:"3:15 PM",tv:"truTV",day:"Thu"},
    {sA:6,tA:"Louisville",sB:11,tB:"South Florida",spread:-6.5,fav:"Louisville",time:"1:30 PM",tv:"TNT",day:"Thu"},
    {sA:3,tA:"Michigan State",sB:14,tB:"North Dakota St",spread:-16.5,fav:"Michigan State",time:"4:05 PM",tv:"TNT",day:"Thu"},
    {sA:7,tA:"UCLA",sB:10,tB:"UCF",spread:-5.5,fav:"UCLA",time:"7:25 PM",tv:"TBS",day:"Fri"},
    {sA:2,tA:"UConn",sB:15,tB:"Furman",spread:-20.5,fav:"UConn",time:"10:00 PM",tv:"TBS",day:"Fri"},
  ],
  South: [
    {sA:1,tA:"Florida",sB:16,tB:"TBD",spread:-28,fav:"Florida",time:"9:25 PM",tv:"TNT",day:"Fri"},
    {sA:8,tA:"Clemson",sB:9,tB:"Iowa",spread:2.5,fav:"Iowa",time:"6:50 PM",tv:"TNT",day:"Fri"},
    {sA:5,tA:"Vanderbilt",sB:12,tB:"McNeese",spread:-11.5,fav:"Vanderbilt",time:"3:15 PM",tv:"truTV",day:"Thu"},
    {sA:4,tA:"Nebraska",sB:13,tB:"Troy",spread:-13.5,fav:"Nebraska",time:"12:15 PM",tv:"truTV",day:"Thu"},
    {sA:6,tA:"North Carolina",sB:11,tB:"VCU",spread:-2.5,fav:"North Carolina",time:"6:50 PM",tv:"TNT",day:"Thu"},
    {sA:3,tA:"Illinois",sB:14,tB:"Penn",spread:-21.5,fav:"Illinois",time:"9:25 PM",tv:"TNT",day:"Thu"},
    {sA:7,tA:"Saint Mary's",sB:10,tB:"Texas A&M",spread:-2.5,fav:"Saint Mary's",time:"7:35 PM",tv:"truTV",day:"Thu"},
    {sA:2,tA:"Houston",sB:15,tB:"Idaho",spread:-22.5,fav:"Houston",time:"10:10 PM",tv:"truTV",day:"Thu"},
  ],
  West: [
    {sA:1,tA:"Arizona",sB:16,tB:"LIU",spread:-29.5,fav:"Arizona",time:"1:35 PM",tv:"TBS",day:"Fri"},
    {sA:8,tA:"Villanova",sB:9,tB:"Utah State",spread:1.5,fav:"Utah State",time:"4:00 PM",tv:"CBS",day:"Fri"},
    {sA:5,tA:"Wisconsin",sB:12,tB:"High Point",spread:-11.5,fav:"Wisconsin",time:"1:50 PM",tv:"TBS",day:"Thu"},
    {sA:4,tA:"Arkansas",sB:13,tB:"Hawaii",spread:-15.5,fav:"Arkansas",time:"4:25 PM",tv:"TBS",day:"Thu"},
    {sA:6,tA:"BYU",sB:11,tB:"TBD",spread:-6,fav:"BYU",time:"7:25 PM",tv:"TBS",day:"Thu"},
    {sA:3,tA:"Gonzaga",sB:14,tB:"Kennesaw St",spread:-19.5,fav:"Gonzaga",time:"10:00 PM",tv:"TBS",day:"Thu"},
    {sA:7,tA:"Miami (FL)",sB:10,tB:"Missouri",spread:-4.5,fav:"Miami (FL)",time:"10:10 PM",tv:"truTV",day:"Fri"},
    {sA:2,tA:"Purdue",sB:15,tB:"Queens",spread:-21.5,fav:"Purdue",time:"7:35 PM",tv:"truTV",day:"Fri"},
  ],
  Midwest: [
    {sA:1,tA:"Michigan",sB:16,tB:"TBD",spread:-28,fav:"Michigan",time:"7:10 PM",tv:"CBS",day:"Thu"},
    {sA:8,tA:"Georgia",sB:9,tB:"Saint Louis",spread:-2.5,fav:"Georgia",time:"9:45 PM",tv:"CBS",day:"Thu"},
    {sA:5,tA:"Texas Tech",sB:12,tB:"Akron",spread:-7.5,fav:"Texas Tech",time:"12:40 PM",tv:"truTV",day:"Fri"},
    {sA:4,tA:"Alabama",sB:13,tB:"Hofstra",spread:-11.5,fav:"Alabama",time:"3:15 PM",tv:"truTV",day:"Fri"},
    {sA:6,tA:"Tennessee",sB:11,tB:"TBD",spread:-8,fav:"Tennessee",time:"4:25 PM",tv:"TBS",day:"Fri"},
    {sA:3,tA:"Virginia",sB:14,tB:"Wright State",spread:-17.5,fav:"Virginia",time:"1:50 PM",tv:"TBS",day:"Fri"},
    {sA:7,tA:"Kentucky",sB:10,tB:"Santa Clara",spread:-2.5,fav:"Kentucky",time:"12:15 PM",tv:"CBS",day:"Fri"},
    {sA:2,tA:"Iowa State",sB:15,tB:"Tennessee St",spread:-23.5,fav:"Iowa State",time:"2:50 PM",tv:"CBS",day:"Fri"},
  ],
};

const PLAYERS = [
  {id:"u1",name:"Will",initials:"W",color:C.gold},
  {id:"u2",name:"Barry",initials:"B",color:"#6DBF73"},
  {id:"u3",name:"Kirkland",initials:"K",color:"#7B9EC9"},
  {id:"u4",name:"Lil' Perk",initials:"LP",color:"#C47A6B"},
];

const ROUNDS = [{r:1,name:"Round of 64",pts:1},{r:2,name:"Round of 32",pts:2},{r:3,name:"Sweet 16",pts:3},{r:4,name:"Elite Eight",pts:4},{r:5,name:"Final Four",pts:5},{r:6,name:"Championship",pts:6}];

const Icon = ({name,size=22,color=C.cream}) => {
  const d={play:"M5 3l14 9-14 9V3z",trophy:"M12 15l-2 5h4l-2-5zm-4-3a4 4 0 008 0V4H8v8zm-4-6h4M16 6h4M4 6a2 2 0 002 2h0M20 6a2 2 0 01-2 2h0",bracket:"M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4zM8 6h8M8 18h8M12 6v12",users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",check:"M20 6L9 17l-5-5",plus:"M12 5v14m-7-7h14"};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d[name]||d.play}/></svg>;
};

const Avatar = ({user,size=36}) => (<div style={{width:size,height:size,borderRadius:size/2,background:`${user.color}22`,border:`1.5px solid ${user.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:600,color:user.color,flexShrink:0,fontFamily:"'Raleway'"}}>{user.initials}</div>);
const GoldDiv = () => (<div style={{display:"flex",alignItems:"center",gap:12,margin:"4px 0"}}><div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.borderGold},transparent)`}}/><div style={{width:4,height:4,borderRadius:2,background:C.gold,opacity:0.5}}/><div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.borderGold},transparent)`}}/></div>);
const Label = ({children}) => (<div style={{fontSize:10,fontWeight:600,color:C.gold,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:14,fontFamily:"'Raleway'"}}>{children}</div>);
const Badge = ({children,color=C.gold,bg=C.goldMuted}) => (<span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:600,background:bg,color,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>{children}</span>);
const HexLogo = ({size=80}) => (<svg width={size} height={size} viewBox="0 0 100 100" fill="none"><polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" stroke={C.gold} strokeWidth="2" fill="none"/><polygon points="50,12 86,31 86,69 50,88 14,69 14,31" stroke={C.creamSubtle} strokeWidth="0.5" fill="none"/><text x="50" y="36" textAnchor="middle" fill={C.creamSubtle} fontSize="7" fontFamily="Raleway" letterSpacing="2.5" fontWeight="500">BARRY</text><text x="50" y="58" textAnchor="middle" fill={C.cream} fontSize="20" fontFamily="Cormorant Garamond" fontWeight="600">BETS</text><text x="50" y="78" textAnchor="middle" fill={C.creamSubtle} fontSize="7" fontFamily="Raleway" letterSpacing="2" fontWeight="400">EST. MMXXV</text><circle cx="50" cy="85" r="1.2" fill={C.gold}/></svg>);
const TabBar = ({active,onChange}) => (<nav style={{display:"flex",justifyContent:"space-around",alignItems:"center",position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(18,22,31,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,padding:"8px 0 28px",zIndex:100}}>{[{id:"picks",icon:"play",label:"PICKS"},{id:"bracket",icon:"bracket",label:"BRACKET"},{id:"standings",icon:"trophy",label:"STANDINGS"},{id:"league",icon:"users",label:"LEAGUE"}].map(t=>(<button key={t.id} onClick={()=>onChange(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 16px",border:"none",background:"none",cursor:"pointer",color:active===t.id?C.gold:C.creamSubtle,fontSize:9,fontWeight:600,letterSpacing:"0.12em",fontFamily:"'Raleway'",transition:"color 0.3s"}}><Icon name={t.icon} size={22} color={active===t.id?C.gold:C.creamSubtle}/><span>{t.label}</span></button>))}</nav>);

// Game key helper
const gk = (g) => `${g.sA}v${g.sB}-${g.tA}`;

const GameCard = ({game,region,pick,onPick,usedTeams=[],locked=false}) => {
  const isUsedA=usedTeams.includes(game.tA); const isUsedB=usedTeams.includes(game.tB); const isTBD=game.tB==="TBD";
  return (
    <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${pick?C.borderGold:C.border}`,marginBottom:10,overflow:"hidden",boxShadow:pick?C.shadowGold:C.shadow}}>
      <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>{region}</span><span style={{fontSize:9,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>{game.time} ET</span><span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'"}}>{game.tv}</span></div>
        <Badge>1 pt</Badge>
      </div>
      <div style={{display:"flex",gap:8,padding:"0 16px 14px"}}>
        {[{t:game.tA,s:game.sA,used:isUsedA,isFav:game.tA===game.fav},{t:game.tB,s:game.sB,used:isUsedB||isTBD,isFav:game.tB===game.fav}].map(({t,s,used,isFav})=>(
          <button key={t} onClick={()=>!locked&&!used&&t!=="TBD"&&onPick(t)} disabled={locked||used||t==="TBD"} style={{
            flex:1,padding:"12px 8px",borderRadius:C.rSm,textAlign:"center",
            border:pick===t?`2px solid ${C.gold}`:used?`1.5px solid rgba(212,91,86,0.4)`:`1.5px solid ${C.border}`,
            background:pick===t?C.goldSubtle:used?"rgba(212,91,86,0.06)":C.navyDark,
            color:pick===t?C.goldLight:used?C.red:C.cream,opacity:used&&pick!==t?0.35:1,
            cursor:locked||used?"default":"pointer",transition:"all 0.25s",fontFamily:"'Cormorant Garamond', serif",
            boxShadow:pick===t?C.shadowGold:"none",
          }}>
            <div style={{fontSize:10,color:pick===t?C.gold:C.creamSubtle,fontFamily:"'Raleway'",marginBottom:3,fontWeight:600}}>({s}) {isFav?`(-${Math.abs(game.spread)})`:t!=="TBD"?`(+${Math.abs(game.spread)})`:""}</div>
            <div style={{fontSize:14,fontWeight:600}}>{t}</div>
            {used&&pick!==t&&<div style={{fontSize:9,color:C.red,marginTop:3,fontFamily:"'Raleway'",fontWeight:600}}>USED</div>}
            {pick===t&&<div style={{fontSize:9,color:C.gold,marginTop:3,fontFamily:"'Raleway'",fontWeight:500,letterSpacing:"0.08em"}}>YOUR PICK</div>}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── PICKS SCREEN ────────────────────────────────────────────
const PicksScreen = ({entries,currentEntry,setCurrentEntry,picks,setPicks,usedTeams,setUsedTeams,entryNames,setEntryNames,lockedEntries,setLockedEntries}) => {
  const [dayFilter,setDayFilter]=useState("Thu");
  const [editingName,setEditingName]=useState(null);
  const [nameInput,setNameInput]=useState("");
  const [showConfirm,setShowConfirm]=useState(false);
  const [now]=useState(new Date());
  const entry=entries[currentEntry];
  if(!entry) return null;
  const entryPicks=(entry&&picks[entry.id])||{};
  const entryUsed=(entry&&usedTeams[entry.id])||[];
  const isLocked=(entry&&lockedEntries[entry.id])||false;
  const gamesForDay=Object.entries(BRACKET).flatMap(([region,games])=>games.filter(g=>g.day===dayFilter).map(g=>({...g,region})));

  // Check if a game is within 30 min of tipoff
  const isGameDeadlinePassed=(game)=>{
    const dateStr=game.day==="Thu"?"2026-03-19":"2026-03-20";
    const timeParts=game.time.match(/(\d+):(\d+)\s*(AM|PM)/);
    if(!timeParts) return false;
    let hours=parseInt(timeParts[1]);const mins=parseInt(timeParts[2]);const ampm=timeParts[3];
    if(ampm==="PM"&&hours!==12) hours+=12;
    if(ampm==="AM"&&hours===12) hours=0;
    const tipoff=new Date(`${dateStr}T${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}:00-04:00`);
    const deadline=new Date(tipoff.getTime()-30*60*1000);
    return now>=deadline;
  };

  const handlePick=(gameKey,team,game)=>{
    if(isLocked) return;
    if(isGameDeadlinePassed(game)) return;
    const newEntryPicks={...entryPicks};
    gamesForDay.forEach(g=>{const k=`${g.region}-${g.sA}v${g.sB}`;if(k!==gameKey)delete newEntryPicks[k];});
    newEntryPicks[gameKey]=newEntryPicks[gameKey]===team?null:team;
    setPicks(prev=>({...prev,[entry.id]:newEntryPicks}));
  };

  const pickedTeam=gamesForDay.reduce((found,g)=>{const k=`${g.region}-${g.sA}v${g.sB}`;return entryPicks[k]||found;},null);
  const allLocked=entries.filter(e=>e.status==="alive").every(e=>!!lockedEntries[e.id]);

  const handleLockEntry=()=>{
    if(!pickedTeam) return;
    setLockedEntries(prev=>({...prev,[entry.id]:true}));
    setUsedTeams(prev=>({...prev,[entry.id]:[...(prev[entry.id]||[]),pickedTeam]}));
    const nextUnlocked=entries.findIndex((e,i)=>i>currentEntry&&e.status==="alive"&&!lockedEntries[e.id]);
    if(nextUnlocked>=0) setCurrentEntry(nextUnlocked);
    else {
      const willAllBeLocked=entries.filter(e=>e.status==="alive").every(e=>e.id===entry.id||lockedEntries[e.id]);
      if(willAllBeLocked) setShowConfirm(true);
    }
  };

  if(showConfirm||allLocked) return (
    <div style={{paddingBottom:100}}>
      <div style={{minHeight:"80vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:20}}>{String.fromCodePoint(0x2705)}</div>
        <h2 style={{fontSize:26,fontWeight:600,color:C.textDark,fontFamily:"'Cormorant Garamond', serif",margin:"0 0 8px"}}>All Picks Locked In!</h2>
        <p style={{color:C.textMid,fontSize:13,fontFamily:"'Raleway'",lineHeight:1.6,marginBottom:24}}>Your {entries.filter(e=>e.status==="alive").length} entries are set for {dayFilter==="Thu"?"Thursday Mar 19":"Friday Mar 20"}.</p>
        <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,width:"100%",overflow:"hidden"}}>
          {entries.filter(e=>e.status==="alive").map((e,i)=>{const ep=picks[e.id]||{};const picked=gamesForDay.reduce((f,g)=>{const k=`${g.region}-${g.sA}v${g.sB}`;return ep[k]||f;},null);return(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:i<entries.filter(x=>x.status==="alive").length-1?`1px solid ${C.border}`:"none"}}>
              <span style={{fontSize:13,fontWeight:600,color:C.cream,fontFamily:"'Raleway'"}}>{entryNames[e.id]||e.name}</span>
              <span style={{fontSize:14,fontWeight:700,color:C.gold,fontFamily:"'Cormorant Garamond', serif"}}>{picked||"--"}</span>
            </div>
          );})}
        </div>
        <div style={{background:C.goldSubtle,border:`1px solid ${C.borderGold}`,borderRadius:C.r,padding:"14px 20px",width:"100%",marginTop:16}}>
          <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",fontWeight:600,letterSpacing:"0.1em"}}>STRAIGHT-UP WINS ONLY</div>
          <div style={{fontSize:11,color:C.textMid,fontFamily:"'Raleway'",marginTop:4}}>Your team just needs to win. Spread shown for reference only.</div>
        </div>
        <button onClick={()=>{setShowConfirm(false);setLockedEntries({});setUsedTeams(prev=>{const cleared={};Object.keys(prev).forEach(k=>{cleared[k]=[];});return cleared;});}} style={{width:"100%",padding:"16px",marginTop:16,borderRadius:C.rSm,border:`1.5px solid ${C.borderGold}`,background:"transparent",color:C.gold,fontSize:12,fontWeight:600,letterSpacing:"0.12em",cursor:"pointer",fontFamily:"'Raleway'"}}>UNLOCK & EDIT PICKS</button>
      </div>
    </div>
  );

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
            <h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>March Madness Survivor</h1>
            <div style={{color:C.textLight,fontSize:11,marginTop:3,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>Round of 64 {String.fromCodePoint(0xB7)} barrysbets.net</div>
          </div>
          <HexLogo size={44}/>
        </div>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>

        {/* Entry Tabs */}
        <div style={{display:"flex",gap:8,marginTop:16,marginBottom:12}}>
          {entries.map((e,i)=>{
            const eliminated=e.status==="eliminated";
            const locked=lockedEntries[e.id]||false;
            const active=currentEntry===i;
            const ep=picks[e.id]||{};
            const hasPick=gamesForDay.some(g=>ep[`${g.region}-${g.sA}v${g.sB}`]);
            return (
              <button key={e.id} onClick={()=>!eliminated&&setCurrentEntry(i)} disabled={eliminated} style={{
                flex:1,padding:"10px 6px",borderRadius:C.rSm,textAlign:"center",
                background:eliminated?"rgba(212,91,86,0.08)":active?C.goldSubtle:C.navyLight,
                border:eliminated?`1.5px solid rgba(212,91,86,0.3)`:active?`1.5px solid ${C.gold}`:`1.5px solid ${C.border}`,
                color:eliminated?C.red:active?C.gold:C.cream,
                cursor:eliminated?"not-allowed":"pointer",fontFamily:"'Raleway'",fontSize:11,fontWeight:600,
                transition:"all 0.25s",opacity:eliminated?0.5:1,
              }}>
                {editingName===e.id?(
                  <input autoFocus value={nameInput} onChange={ev=>setNameInput(ev.target.value)} onBlur={()=>{setEntryNames(p=>({...p,[e.id]:nameInput||e.name}));setEditingName(null);}} onKeyDown={ev=>{if(ev.key==="Enter"){setEntryNames(p=>({...p,[e.id]:nameInput||e.name}));setEditingName(null);}}} style={{background:"transparent",border:"none",outline:"none",color:C.gold,fontSize:11,fontWeight:600,fontFamily:"'Raleway'",textAlign:"center",width:"100%"}}/>
                ):(
                  <div onDoubleClick={ev=>{if(!eliminated){ev.stopPropagation();setEditingName(e.id);setNameInput(entryNames[e.id]||e.name);}}}>
                    {entryNames[e.id]||e.name}
                    {locked&&hasPick&&<span style={{marginLeft:4,fontSize:9}}>{String.fromCodePoint(0x1F512)}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* LOCK IN BUTTON — right under entries */}
        {pickedTeam&&!isLocked&&(
          <button onClick={handleLockEntry} style={{width:"100%",padding:"15px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:700,letterSpacing:"0.15em",cursor:"pointer",fontFamily:"'Raleway'",boxShadow:C.shadowGold,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {String.fromCodePoint(0x1F512)} LOCK IN {(entryNames[entry?.id||'']||entry?.name||'Entry').toUpperCase()}: {pickedTeam.toUpperCase()}
          </button>
        )}
        {isLocked&&pickedTeam&&(
          <div style={{background:C.navyLight,border:`1px solid ${C.borderGold}`,borderRadius:C.r,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>{String.fromCodePoint(0x1F512)}</span>
            <div><div style={{fontWeight:600,fontSize:12,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>LOCKED: {pickedTeam}</div><div style={{fontSize:10,color:C.creamMuted,fontFamily:"'Raleway'",marginTop:2}}>Pick set. Switch entries or unlock all to change.</div></div>
          </div>
        )}

        {/* Day Filter */}
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {["Thu","Fri"].map(d=>(<button key={d} onClick={()=>setDayFilter(d)} style={{padding:"8px 20px",borderRadius:20,background:dayFilter===d?C.gold:C.navyLight,color:dayFilter===d?C.navyDark:C.cream,border:dayFilter===d?"none":`1px solid ${C.border}`,cursor:"pointer",fontFamily:"'Raleway'",fontSize:12,fontWeight:600}}>{d==="Thu"?"Thu Mar 19":"Fri Mar 20"}</button>))}
        </div>

        {/* Pick Status (only if no pick yet) */}
        {!pickedTeam&&!isLocked&&(
          <div style={{background:C.navyDark,border:`1px solid ${C.border}`,borderRadius:C.r,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <Icon name="play" size={16} color={C.gold}/>
            <div style={{fontWeight:600,fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.05em"}}>PICK A WINNER FOR {(entryNames[entry?.id||'']||entry?.name||'Entry').toUpperCase()}</div>
          </div>
        )}

        <Label>{dayFilter==="Thu"?"Thursday":"Friday"} Games ({gamesForDay.length})</Label>

        {gamesForDay.map(g=>{
          const key=`${g.region}-${g.sA}v${g.sB}`;
          const deadlinePassed=isGameDeadlinePassed(g);
          return (
            <div key={key}>
              <GameCard game={g} region={g.region} pick={entryPicks[key]} onPick={t=>handlePick(key,t,g)} usedTeams={entryUsed} locked={isLocked||deadlinePassed}/>
              {deadlinePassed&&!entryPicks[key]&&(
                <div style={{marginTop:-6,marginBottom:10,paddingLeft:16}}>
                  <span style={{fontSize:9,color:C.red,fontFamily:"'Raleway'",fontWeight:600,letterSpacing:"0.05em"}}>{String.fromCodePoint(0x1F512)} PICKS CLOSED (30 min before tipoff)</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Strategy */}
        <div style={{marginTop:12,background:C.navyLighter,borderRadius:C.r,padding:"14px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:600,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",marginBottom:4}}>STRATEGY</div>
          <div style={{fontSize:11,color:C.creamMuted,fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",lineHeight:1.5}}>Save top seeds for later rounds. Picks lock 30 min before tipoff. Spreads for reference{String.fromCodePoint(0x2014)}your team just needs to win. Double-tap entry name to rename.</div>
        </div>
      </div>
    </div>
  );
};

const BracketScreen = () => {
  const [region,setRegion]=useState("East");
  const games=BRACKET[region]||[];
  const rc={East:"#5B8BD4",South:"#D4835B",West:"#7BD45B",Midwest:"#D45B9F"};
  const venues={East:"Washington D.C.",South:"Houston",West:"San Jose",Midwest:"Chicago"};
  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}><div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div><h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>Bracket</h1><div style={{color:C.creamSubtle,fontSize:11,marginTop:3,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>2026 NCAA Tournament {"\u00B7"} Round of 64</div></div>
      <div style={{padding:"0 24px"}}><GoldDiv/>
        <div style={{display:"flex",gap:6,marginTop:16,marginBottom:16,overflowX:"auto"}}>{["East","South","West","Midwest"].map(r=>(<button key={r} onClick={()=>setRegion(r)} style={{padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap",background:region===r?rc[r]:C.navyLight,color:region===r?"#fff":C.creamMuted,border:region===r?"none":`1px solid ${C.border}`,cursor:"pointer",fontFamily:"'Raleway'",fontSize:11,fontWeight:600}}>{r}</button>))}</div>
        {games.map((g,i)=>(
          <div key={i} style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,marginBottom:8,padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:10,color:C.gold,fontFamily:"'Raleway'",fontWeight:600}}>{g.time} ET</span>
              <div style={{display:"flex",gap:6}}><span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",padding:"2px 8px",background:C.creamFaint,borderRadius:10}}>{g.tv}</span><span style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",padding:"2px 8px",background:C.creamFaint,borderRadius:10}}>{g.day==="Thu"?"Mar 19":"Mar 20"}</span></div>
            </div>
            <div style={{display:"flex",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Raleway'",width:22,textAlign:"center"}}>{g.sA}</span>
              <span style={{fontSize:15,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif",flex:1,marginLeft:8}}>
                {g.tA} {g.tA===g.fav&&<span style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'"}}>(-{Math.abs(g.spread)})</span>}
              </span>
              <span style={{fontSize:11,color:C.creamSubtle,fontFamily:"'Cormorant Garamond'",fontStyle:"italic",padding:"0 8px"}}>vs</span>
              <span style={{fontSize:15,fontWeight:600,color:g.tB==="TBD"?C.creamSubtle:C.cream,fontFamily:"'Cormorant Garamond', serif",flex:1,textAlign:"right"}}>
                {g.tB==="TBD"?"TBD":<>{g.tB} {g.tB===g.fav&&<span style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'"}}>(-{Math.abs(g.spread)})</span>}</>}
              </span>
              <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Raleway'",width:22,textAlign:"center",marginLeft:8}}>{g.sB}</span>
            </div>
          </div>
        ))}
        <div style={{marginTop:12,textAlign:"center"}}><div style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.1em"}}>REGIONAL FINAL IN</div><div style={{fontSize:14,color:C.gold,fontFamily:"'Cormorant Garamond', serif",fontWeight:600,marginTop:4}}>{venues[region]}</div></div>
      </div>
    </div>
  );
};

// ─── STANDINGS SCREEN ────────────────────────────────────────
const StandingsScreen = () => {
  const allEntries = [
    {id:"w1",player:PLAYERS[0],entryName:"Will #1",status:"alive",points:0,streak:0},
    {id:"w2",player:PLAYERS[0],entryName:"Will #2",status:"alive",points:0,streak:0},
    {id:"w3",player:PLAYERS[0],entryName:"Will #3",status:"alive",points:0,streak:0},
    {id:"b1",player:PLAYERS[1],entryName:"Barry #1",status:"alive",points:0,streak:0},
    {id:"b2",player:PLAYERS[1],entryName:"Barry #2",status:"alive",points:0,streak:0},
    {id:"k1",player:PLAYERS[2],entryName:"Kirkland #1",status:"alive",points:0,streak:0},
    {id:"k2",player:PLAYERS[2],entryName:"Kirkland #2",status:"alive",points:0,streak:0},
    {id:"k3",player:PLAYERS[2],entryName:"Kirkland #3",status:"alive",points:0,streak:0},
    {id:"p1",player:PLAYERS[3],entryName:"Lil' Perk #1",status:"alive",points:0,streak:0},
  ].sort((a,b)=>b.points-a.points||b.streak-a.streak||(a.status==="alive"?0:1)-(b.status==="alive"?0:1));

  const aliveCount=allEntries.filter(e=>e.status==="alive").length;
  const eliminatedCount=allEntries.filter(e=>e.status==="eliminated").length;
  const totalPot=allEntries.length*20;

  return (
    <div style={{paddingBottom:100}}>
      <div style={{padding:"52px 24px 12px"}}>
        <div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div>
        <h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>Standings</h1>
        <div style={{color:C.textLight,fontSize:11,marginTop:3,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>March Madness Survivor League</div>
      </div>
      <div style={{padding:"0 24px"}}>
        <GoldDiv/>

        <div style={{display:"flex",gap:8,marginTop:16,marginBottom:16}}>
          {[
            {label:"ENTRIES",value:String(allEntries.length),color:C.gold},
            {label:"ALIVE",value:String(aliveCount),color:C.green},
            {label:"POT",value:"$"+totalPot,color:C.gold},
          ].map((s,i)=>(
            <div key={i} style={{flex:1,background:C.navyLight,borderRadius:C.rSm,border:`1px solid ${C.border}`,padding:"14px 8px",textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:24,color:s.color,fontFamily:"'Cormorant Garamond', serif"}}>{s.value}</div>
              <div style={{fontSize:9,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.1em",marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{background:C.goldSubtle,border:`1px solid ${C.borderGold}`,borderRadius:C.r,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{String.fromCodePoint(0x1F3C6)}</span>
          <div>
            <div style={{fontWeight:600,fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>SINGLE ENTRY WINS</div>
            <div style={{fontSize:11,color:C.textMid,fontFamily:"'Raleway'",marginTop:2}}>The one entry with the most points takes the pot. $20/entry.</div>
          </div>
        </div>

        {/* Buy-in breakdown */}
        <Label>Buy-In Breakdown</Label>
        <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:20}}>
          {PLAYERS.map((p,i)=>{
            const count=[3,2,3,1][i];
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:i<PLAYERS.length-1?`1px solid ${C.border}`:"none",gap:10}}>
                <Avatar user={p} size={28}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>{p.name}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.creamSubtle,fontFamily:"'Raleway'"}}>{count} {count===1?"entry":"entries"}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Cormorant Garamond', serif"}}>${count*20}</span>
                </div>
              </div>
            );
          })}
        </div>

        <Label>All Entries ({allEntries.length})</Label>
        <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {allEntries.map((e,i)=>(
            <div key={e.id} style={{display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:i<allEntries.length-1?`1px solid ${C.border}`:"none",gap:10,opacity:e.status==="eliminated"?0.45:1}}>
              <span style={{width:22,fontWeight:700,fontSize:14,color:i===0?C.gold:i<=2?C.creamMuted:C.creamSubtle,textAlign:"center",fontFamily:"'Cormorant Garamond', serif"}}>{i+1}</span>
              <Avatar user={e.player} size={30}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,color:C.cream,fontFamily:"'Cormorant Garamond', serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.entryName}</div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
                  {e.status==="alive"?<Badge color={C.green} bg={C.greenBg}>ALIVE</Badge>:<Badge color={C.red} bg={C.redBg}>OUT</Badge>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontWeight:700,fontSize:20,color:e.points>0?C.gold:C.creamSubtle,fontFamily:"'Cormorant Garamond', serif"}}>{e.points}</div>
                <div style={{color:C.creamSubtle,fontSize:9,fontFamily:"'Raleway'",letterSpacing:"0.1em"}}>PTS</div>
              </div>
            </div>
          ))}
        </div>

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

const LeagueScreen = () => (
  <div style={{paddingBottom:100}}>
    <div style={{padding:"52px 24px 12px"}}><div style={{fontSize:11,color:C.gold,fontFamily:"'Raleway'",letterSpacing:"0.15em",fontWeight:600,marginBottom:4}}>BARRY BETS</div><h1 style={{fontSize:24,fontWeight:600,margin:0,color:C.textDark,fontFamily:"'Cormorant Garamond', serif"}}>League</h1><div style={{color:C.textLight,fontSize:11,marginTop:3,fontFamily:"'Raleway'",letterSpacing:"0.08em"}}>March Madness Survivor League</div></div>
    <div style={{padding:"0 24px"}}><GoldDiv/>
      <div style={{marginTop:16,background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        {[{l:"League",v:"March Madness Survivor"},{l:"App",v:"barrysbets.net"},{l:"Format",v:"Survivor (3 entries each)"},{l:"Wins",v:"Straight-up (no spread)"},{l:"Members",v:"4 friends"},{l:"Invite Code",v:"BARRY-X7K2"}].map((item,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:i<5?`1px solid ${C.border}`:"none"}}><span style={{fontWeight:500,fontSize:13,color:C.cream,fontFamily:"'Raleway'"}}>{item.l}</span><span style={{color:C.creamSubtle,fontSize:12,fontFamily:"'Raleway'"}}>{item.v}</span></div>))}
      </div>
      <div style={{marginTop:24}}><Label>Members (4)</Label>
        <div style={{background:C.navyLight,borderRadius:C.r,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {PLAYERS.map((p,i)=>(<div key={p.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<PLAYERS.length-1?`1px solid ${C.border}`:"none"}}><Avatar user={p} size={38}/><div style={{flex:1}}><div style={{fontWeight:600,fontSize:15,color:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>{p.name}</div><div style={{color:C.creamSubtle,fontSize:11,fontFamily:"'Raleway'"}}>{p.id==="u1"?"Commissioner":"Member"}</div></div><Badge color={C.green} bg={C.greenBg}>3 ALIVE</Badge></div>))}
        </div>
      </div>
      <div style={{marginTop:24}}><Label>Survivor Rules</Label>
        <div style={{background:C.navyLighter,borderRadius:C.r,padding:"18px",border:`1px solid ${C.border}`}}>
          {["Each member gets 3 entries (double-tap to rename!)","Pick one winner per entry per game day","Your team just needs to WIN (no spread)","If your team loses, that entry is eliminated","Cannot reuse a team within the same entry","Points: R64=1, R32=2, S16=3, E8=4, F4=5, Champ=6","Save your best teams for later rounds!"].map((rule,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:i<6?10:0,alignItems:"flex-start"}}><span style={{color:C.gold,fontSize:11,fontFamily:"'Raleway'",fontWeight:700,minWidth:18}}>{i+1}.</span><span style={{fontSize:12,color:C.creamMuted,fontFamily:"'Raleway'",lineHeight:1.5}}>{rule}</span></div>))}
        </div>
      </div>
      <button style={{width:"100%",padding:"16px",marginTop:20,borderRadius:C.rSm,border:`1.5px dashed ${C.borderGold}`,background:"transparent",color:C.gold,fontSize:12,fontWeight:600,letterSpacing:"0.12em",cursor:"pointer",fontFamily:"'Raleway'",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Icon name="plus" size={16} color={C.gold}/> SHARE INVITE LINK</button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
export default function BarryBets() {
  const [tab,setTab]=useState("picks");
  const [showLogin,setShowLogin]=useState(true);
  const [showEntrySetup,setShowEntrySetup]=useState(false);
  const [entryCount,setEntryCount]=useState(0);
  const [currentEntry,setCurrentEntry]=useState(0);
  const [picks,setPicks]=useState({});
  const [usedTeams,setUsedTeams]=useState({});
  const [lockedEntries,setLockedEntries]=useState({});
  const [entryNames,setEntryNames]=useState({});

  // Entries are dynamically created based on user's choice
  const entries=Array.from({length:entryCount},(_,i)=>({
    id:`e${i+1}`,
    name:entryNames[`e${i+1}`]||`Will #${i+1}`,
    status:"alive",
    points:0,
  }));

  // Initialize picks/locks/usedTeams when entry count is set
  useEffect(()=>{
    if(entryCount>0){
      const p={};const u={};const l={};const n={};
      for(let i=1;i<=entryCount;i++){
        const id=`e${i}`;
        if(!p[id]) p[id]={};if(!u[id]) u[id]=[];l[id]=false;
        if(!entryNames[id]) n[id]=`Will #${i}`;
      }
      setPicks(prev=>({...prev,...p}));
      setUsedTeams(prev=>({...prev,...u}));
      setLockedEntries(prev=>({...prev,...l}));
      setEntryNames(prev=>({...prev,...n}));
    }
  },[entryCount]);

  useEffect(()=>{
    if(!document.querySelector('#bb-f')){const l=document.createElement("link");l.id="bb-f";l.rel="stylesheet";l.href=FONTS;document.head.appendChild(l);}
    if(!document.querySelector('#bb-s')){const s=document.createElement("style");s.id="bb-s";s.textContent=`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes glow{0%,100%{opacity:.4}50%{opacity:.8}}*{box-sizing:border-box}::-webkit-scrollbar{display:none}input::placeholder{color:rgba(232,221,208,0.35)}`;document.head.appendChild(s);}
  },[]);

  const app={fontFamily:"'Raleway', sans-serif",background:'#F5F2ED',color:C.cream,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative"};

  // Login Screen
  if(showLogin) return (
    <div style={app}><div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",background:`radial-gradient(ellipse at 50% 30%,${C.navyLighter} 0%,${C.navy} 60%,${C.navyDark} 100%)`,borderRadius:0}}>
      <div style={{animation:"fadeUp 0.6s ease"}}><HexLogo size={110}/></div>
      <div style={{fontSize:11,fontWeight:600,color:C.creamSubtle,letterSpacing:"0.25em",marginTop:28,marginBottom:8,fontFamily:"'Raleway'",animation:"fadeUp 0.6s ease 0.1s both"}}>MARCH MADNESS</div>
      <div style={{fontSize:13,fontWeight:600,color:C.gold,letterSpacing:"0.15em",marginBottom:28,fontFamily:"'Raleway'",animation:"fadeUp 0.6s ease 0.15s both"}}>SURVIVOR LEAGUE</div>
      <div style={{width:"100%",animation:"fadeUp 0.6s ease 0.2s both"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,background:C.olive,borderRadius:C.rSm,padding:"0 16px",marginBottom:12,border:`1px solid ${C.border}`}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.creamSubtle} strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg><input style={{flex:1,padding:"16px 0",background:"transparent",border:"none",outline:"none",color:C.cream,fontSize:15,fontFamily:"'Raleway'"}} placeholder="Email address"/></div>
        <div style={{display:"flex",alignItems:"center",gap:12,background:C.olive,borderRadius:C.rSm,padding:"0 16px",marginBottom:20,border:`1px solid ${C.border}`}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.creamSubtle} strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><input style={{flex:1,padding:"16px 0",background:"transparent",border:"none",outline:"none",color:C.cream,fontSize:15,fontFamily:"'Raleway'"}} placeholder="Password" type="password"/></div>
        <button onClick={()=>{setShowLogin(false);setShowEntrySetup(true);}} style={{width:"100%",padding:"17px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:700,letterSpacing:"0.18em",cursor:"pointer",fontFamily:"'Raleway'",boxShadow:C.shadowGold}}>SIGN IN</button>
      </div>
      <p style={{color:C.creamSubtle,fontSize:12,textAlign:"center",marginTop:24,fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",lineHeight:1.8,opacity:0.7,animation:"fadeUp 0.6s ease 0.3s both"}}>Why do we lock our doors?<br/>{String.fromCodePoint(0x2026)}to keep Blair out</p>
      <div style={{marginTop:40,color:C.creamSubtle,fontSize:10,letterSpacing:"0.15em",fontFamily:"'Raleway'",opacity:0.3}}>barrysbets.net</div>
      <div style={{marginTop:8,color:C.creamSubtle,fontSize:11,letterSpacing:"0.2em",fontFamily:"'Raleway'",opacity:0.25,animation:"glow 3s ease infinite"}}>EST. MMXXV</div>
    </div></div>
  );

  // Entry Setup Screen
  if(showEntrySetup) return (
    <div style={app}>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",padding:"60px 32px",background:`radial-gradient(ellipse at 50% 20%,${C.navyLighter} 0%,${C.navy} 60%,${C.navyDark} 100%)`}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <HexLogo size={70}/>
          <div style={{fontSize:11,fontWeight:600,color:C.creamSubtle,letterSpacing:"0.2em",marginTop:16,fontFamily:"'Raleway'"}}>MARCH MADNESS SURVIVOR</div>
          <h2 style={{fontSize:26,fontWeight:600,color:C.cream,fontFamily:"'Cormorant Garamond', serif",margin:"12px 0 4px"}}>How Many Entries?</h2>
          <p style={{color:C.creamSubtle,fontSize:12,fontFamily:"'Raleway'",lineHeight:1.5}}>Each entry is $20 and competes independently.<br/>More entries = more chances to survive.</p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
          {[1,2,3].map(n=>(
            <button key={n} onClick={()=>setEntryCount(n)} style={{
              padding:"20px",borderRadius:C.r,
              background:entryCount===n?C.goldSubtle:C.navyLight,
              border:entryCount===n?`2px solid ${C.gold}`:`1.5px solid ${C.border}`,
              cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
              transition:"all 0.25s",
            }}>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:18,fontWeight:700,color:entryCount===n?C.gold:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>{n} {n===1?"Entry":"Entries"}</div>
                <div style={{fontSize:11,color:C.creamSubtle,fontFamily:"'Raleway'",marginTop:2}}>{n===1?"Just beat Perk":n===2?"Live a little":"Beat Kirkland"}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:22,fontWeight:700,color:entryCount===n?C.gold:C.cream,fontFamily:"'Cormorant Garamond', serif"}}>${n*20}</div>
                {entryCount===n&&<div style={{fontSize:10,color:C.gold,fontFamily:"'Raleway'",marginTop:2}}>{String.fromCodePoint(0x2713)} SELECTED</div>}
              </div>
            </button>
          ))}
        </div>

        {entryCount>0&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{background:C.navyLighter,borderRadius:C.r,padding:"16px",border:`1px solid ${C.border}`,marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:12,color:C.creamSubtle,fontFamily:"'Raleway'"}}>Entries</span>
                <span style={{fontSize:12,color:C.cream,fontFamily:"'Raleway'",fontWeight:600}}>{entryCount} x $20</span>
              </div>
              <div style={{height:1,background:C.border,margin:"8px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:600,color:C.gold,fontFamily:"'Raleway'"}}>Total</span>
                <span style={{fontSize:20,fontWeight:700,color:C.gold,fontFamily:"'Cormorant Garamond', serif"}}>${entryCount*20}</span>
              </div>
            </div>
            <button onClick={()=>setShowEntrySetup(false)} style={{width:"100%",padding:"17px",borderRadius:C.rSm,border:"none",background:C.gold,color:C.navyDark,fontSize:13,fontWeight:700,letterSpacing:"0.18em",cursor:"pointer",fontFamily:"'Raleway'",boxShadow:C.shadowGold}}>
              LOCK IN {entryCount} {entryCount===1?"ENTRY":"ENTRIES"} {String.fromCodePoint(0x2192)} ${entryCount*20}
            </button>
          </div>
        )}

        <div style={{textAlign:"center",marginTop:"auto",paddingTop:24}}>
          <div style={{fontSize:10,color:C.creamSubtle,fontFamily:"'Raleway'",letterSpacing:"0.1em",opacity:0.5}}>barrysbets.net {String.fromCodePoint(0xB7)} EST. MMXXV</div>
        </div>
      </div>
    </div>
  );

  // Main App (only if entries are set up)
  if(entries.length===0) return null;

  return (
    <div style={app}>
      {tab==="picks"&&<PicksScreen entries={entries} currentEntry={currentEntry} setCurrentEntry={setCurrentEntry} picks={picks} setPicks={setPicks} usedTeams={usedTeams} setUsedTeams={setUsedTeams} entryNames={entryNames} setEntryNames={setEntryNames} lockedEntries={lockedEntries} setLockedEntries={setLockedEntries}/>}
      {tab==="bracket"&&<BracketScreen/>}
      {tab==="standings"&&<StandingsScreen/>}
      {tab==="league"&&<LeagueScreen/>}
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}
