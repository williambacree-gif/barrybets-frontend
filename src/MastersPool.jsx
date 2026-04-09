import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const API = import.meta.env.VITE_API_URL;
const TIER_LABELS = {1:'The Favorites',2:'Contenders',3:'Dark Horses',4:'Value Picks',5:'Sleepers',6:'Long Shots'};
const TIER_COLORS = {1:'#c9b037',2:'#b4b4b4',3:'#ad8a56',4:'#1a3c6d',5:'#2d5a27',6:'#555'};

export default function MastersPool({ userId, leagueId, userName }) {
  const [tiers, setTiers] = useState({});
  const [picks, setPicks] = useState({});
  const [locked, setLocked] = useState(false);
  const [locksAt, setLocksAt] = useState(null);
  const [competitionId, setCompetitionId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [countdown, setCountdown] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState('picks');
  const [loading, setLoading] = useState(true);

  // Fetch competition for this league
  useEffect(() => {
    if (!leagueId) return;
    fetch(API + '/api/masters/competitions/' + leagueId)
      .then(r => r.json()).then(d => { if (d.competition) setCompetitionId(d.competition.id); })
      .catch(console.error);
  }, [leagueId]);

  // Fetch golfers
  useEffect(() => {
    fetch(API + '/api/masters/golfers')
      .then(r => r.json()).then(d => {
        setTiers(d.tiers || {});
        setLocked(d.locked);
        setLocksAt(d.locksAt);
        setLoading(false);
      }).catch(console.error);
  }, []);

  // Fetch existing picks
  useEffect(() => {
    if (!competitionId || !userId) return;
    fetch(API + '/api/masters/picks/' + competitionId + '/' + userId)
      .then(r => r.json()).then(d => {
        if (d.picks) {
          const p = {};
          for (let t = 1; t <= 6; t++) { if (d.picks['tier'+t+'_golfer_id']) p[t] = d.picks['tier'+t+'_golfer_id']; }
          setPicks(p);
          setSubmitted(d.picks.submitted);
        }
      }).catch(console.error);
  }, [competitionId, userId]);

  // Countdown timer
  useEffect(() => {
    if (!locksAt || locked) return;
    const iv = setInterval(() => {
      const ms = new Date(locksAt) - Date.now();
      if (ms <= 0) { setLocked(true); setCountdown('LOCKED'); clearInterval(iv); return; }
      const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000), m = Math.floor((ms%3600000)/60000);
      setCountdown(d > 0 ? d+'d '+h+'h' : h > 0 ? h+'h '+m+'m' : m+'m');
    }, 1000);
    return () => clearInterval(iv);
  }, [locksAt, locked]);

  // Fetch leaderboard
  useEffect(() => {
    if (!competitionId) return;
    fetch(API + '/api/masters/leaderboard/' + competitionId)
      .then(r => r.json()).then(d => setLeaderboard(d.leaderboard || []))
      .catch(console.error);
  }, [competitionId]);

  const selectGolfer = useCallback((tier, golferId) => {
    if (locked) return;
    const newPicks = { ...picks, [tier]: golferId };
    setPicks(newPicks);
    // Auto-save
    setSaving(true);
    const body = { competition_id: competitionId, user_id: userId };
    for (let t = 1; t <= 6; t++) body['tier'+t+'_golfer_id'] = newPicks[t] || null;
    fetch(API + '/api/masters/picks', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      .then(r => r.json()).then(d => {
        setSaving(false);
        if (d.picks) setSubmitted(d.picks.submitted);
      }).catch(() => setSaving(false));
  }, [picks, locked, competitionId, userId]);

  if (loading) return <div style={{textAlign:'center',padding:'60px 20px',color:'#c9b037',fontSize:18}}>Loading Masters Pool...</div>;

  const allPicked = Object.keys(picks).length === 6;
  const pickedCount = Object.keys(picks).length;

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 16px 80px'}}>
      {/* Header */}
      <div style={{textAlign:'center',padding:'24px 0 16px'}}>
        <h1 style={{fontSize:28,fontWeight:700,color:'#0a5c36',margin:0}}>Masters 2026</h1>
        <p style={{color:'#c9b037',fontSize:14,margin:'4px 0'}}>Tiered Pick 6 • Use Best 4</p>
        {!locked && countdown && <p style={{color:'#d4380d',fontSize:13,margin:'4px 0'}}>Picks lock in {countdown}</p>}
        {locked && <p style={{color:'#d4380d',fontSize:13,fontWeight:600,margin:'4px 0'}}>PICKS LOCKED</p>}
      </div>

      {/* Tab toggle */}
      <div style={{display:'flex',gap:0,marginBottom:20,borderRadius:8,overflow:'hidden',border:'1px solid #1a3c6d'}}>
        {['picks','leaderboard'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex:1,padding:'10px 0',border:'none',cursor:'pointer',fontWeight:600,fontSize:14,
            background: view===v ? '#1a3c6d' : '#fff', color: view===v ? '#c9b037' : '#1a3c6d'
          }}>{v === 'picks' ? (locked ? 'My Picks' : 'Make Picks') : 'Leaderboard'}</button>
        ))}
      </div>

      {/* Scoring Rules */}
            <div style={{background:'#f8f6f0',border:'1px solid #e0ddd4',borderRadius:10,padding:14,marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:14,color:'#1a3c6d',marginBottom:8}}>How It Works</div>
                      <div style={{fontSize:12,color:'#555',lineHeight:'1.6'}}>
                                  <div>{'\u2022'} Pick <b>1 golfer from each of 6 tiers</b> (6 picks total)</div>
                                <div>{'\u2022'} Your <b>best 4 of 6</b> scores count (drop 2 worst)</div>
                                <div>{'\u2022'} Scoring: cumulative strokes (lowest total wins)</div>
                                <div>{'\u2022'} Missed cut = 80 strokes for Rounds 3 and 4</div>
                                <div>{'\u2022'} Entry fee: <b>$20</b></div>
                      </div>
            </div>
    </div>
      {/* Picks View */}
      {view === 'picks' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:13,color:'#666'}}>{pickedCount}/6 tiers picked</span>
            {saving && <span style={{fontSize:12,color:'#c9b037'}}>Saving...</span>}
            {!saving && submitted && <span style={{fontSize:12,color:'#0a5c36',fontWeight:600}}>Submitted ✓</span>}
          </div>
          {[1,2,3,4,5,6].map(tier => {
            const tierData = tiers[tier];
            if (!tierData) return null;
            return (
              <div key={tier} style={{marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{background:TIER_COLORS[tier],color:'#fff',padding:'2px 10px',borderRadius:12,fontSize:12,fontWeight:600}}>Tier {tier}</span>
                  <span style={{fontSize:13,color:'#666'}}>{tierData.label}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {tierData.golfers.map(g => {
                    const selected = picks[tier] === g.id;
                    return (
                      <button key={g.id} onClick={() => selectGolfer(tier, g.id)}
                        disabled={locked && !selected}
                        style={{
                          display:'flex',justifyContent:'space-between',alignItems:'center',
                          padding:'10px 14px',borderRadius:8,border: selected ? '2px solid #0a5c36' : '1px solid #e0e0e0',
                          background: selected ? '#f0f9f0' : '#fff',cursor: locked ? 'default' : 'pointer',
                          opacity: locked && !selected ? 0.4 : 1
                        }}>
                        <span style={{fontWeight: selected ? 600 : 400,fontSize:14,color:'#222'}}>{g.name}</span>
                        <span style={{fontSize:12,color:'#999'}}>#{g.world_ranking}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard View */}
      {view === 'leaderboard' && (
        <div>
          {leaderboard.length === 0 && <p style={{textAlign:'center',color:'#999',padding:40}}>No picks submitted yet</p>}
          {leaderboard.map((entry, idx) => (
            <div key={entry.user_id} style={{
              background: entry.user_id === userId ? '#f0f9f0' : '#fff',
              border: entry.user_id === userId ? '2px solid #0a5c36' : '1px solid #e8e8e8',
              borderRadius:10,padding:14,marginBottom:10
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontWeight:700,fontSize:18,color: idx===0?'#c9b037':idx===1?'#999':idx===2?'#ad8a56':'#666'}}>
                    {idx + 1}
                  </span>
                  <span style={{fontWeight:600,fontSize:15}}>{entry.display_name}</span>
                </div>
                <span style={{fontWeight:700,fontSize:18,color:'#1a3c6d'}}>
                  {entry.total_score > 0 ? entry.total_score : '-'}
                </span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {entry.golfer_scores.map((gs, i) => (
                  <span key={i} style={{
                    fontSize:11,padding:'2px 8px',borderRadius:10,
                    background: i < 4 ? '#e8f5e9' : '#f5f5f5',
                    color: i < 4 ? '#2e7d32' : '#999',
                    textDecoration: i >= 4 ? 'line-through' : 'none'
                  }}>
                    {gs.golfer || '?'}{gs.total > 0 && gs.total < 999 ? ' ('+gs.total+')' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
