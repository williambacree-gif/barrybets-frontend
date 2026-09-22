// ═══════════════════════════════════════════════════════════════
// BARRY BETS — VOLS
//
// All four men are Tennessee fans, so the app carries the news as well as
// the pools. A reason to open it on a Tuesday, not only on a Thursday.
//
// Headlines and links only, never article bodies. Tennessee orange is the
// accent here rather than the app's brass, so the section has its own
// identity without the rest of the app turning orange.
// ═══════════════════════════════════════════════════════════════

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
  orange:"#FF8200",                       // Tennessee orange, the real one
  orangeDim:"rgba(255,130,0,0.13)",
  brass:"#B08D3F",
};
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'Raleway', -apple-system, BlinkMacSystemFont, sans-serif";

// "14m", "3h", "yesterday", "Sep 18" — short enough to sit beside a source.
function ago(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (isNaN(then)) return "";
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  if (hrs < 48) return "yesterday";
  return then.toLocaleDateString("en-US", { month:"short", day:"numeric" });
}

export default function Vols() {
  const [token, setToken]   = useState(null);
  const [data, setData]     = useState(null);
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(true);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setToken(data?.session?.access_token || null));
  }, []);

  const load = useCallback(() => {
    if (!token) return;
    setErr("");
    fetch(API + "/api/vols/stories", { headers:{ Authorization:`Bearer ${token}` } })
      .then(async r => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || "Couldn't load the news");
        return b;
      })
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(load, [load]);

  const stories = (data && data.stories) || [];
  const sources = (data && data.sources) || [];
  const working = sources.filter(s => s.ok && s.count > 0);
  const broken  = sources.filter(s => !s.ok || s.count === 0);

  return (
    <div style={{background:C.bg, minHeight:"100vh", paddingBottom:70, fontFamily:SANS}}>

      {/* header — navy, with the orange rule doing the work */}
      <div style={{background:`linear-gradient(175deg,${C.navy} 0%,${C.navyDeep} 100%)`,
        padding:"34px 26px 0"}}>
        <div style={{fontSize:9, color:C.orange, letterSpacing:"0.3em", fontWeight:700}}>
          TENNESSEE
        </div>
        <h1 style={{fontSize:34, fontWeight:500, margin:"12px 0 0", color:C.cream,
          fontFamily:SERIF, lineHeight:1.05, letterSpacing:"-0.015em"}}>
          Vol Report
        </h1>
        <p style={{fontSize:11.5, color:C.creamDim, margin:"10px 0 0", lineHeight:1.6}}>
          Headlines from around the program. Tap one to read it at the source.
        </p>
        <div style={{height:3, background:C.orange, margin:"22px -26px 0"}}/>
      </div>

      <div style={{padding:"22px 22px 0"}}>

        {loading && (
          <div style={{color:C.inkFaint, fontSize:13, textAlign:"center", padding:"40px 0"}}>
            Pulling the latest…
          </div>
        )}

        {err && (
          <div style={{background:"rgba(158,59,51,0.09)", border:"1px solid rgba(158,59,51,0.2)",
            borderRadius:11, padding:"13px 15px", marginBottom:14, color:"#9E3B33",
            fontSize:12.5, lineHeight:1.55}}>{err}</div>
        )}

        {!loading && !err && stories.length === 0 && (
          <div style={{background:C.card, border:`1px solid ${C.hair}`, borderRadius:14,
            padding:20, fontSize:13, color:C.inkMuted, lineHeight:1.65}}>
            Nothing came back from any source just now. That is a problem with the
            feeds rather than a quiet news day — the Commissioner screen can say which.
          </div>
        )}

        {stories.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
            style={{display:"block", textDecoration:"none", background:C.card,
              border:`1px solid ${C.hair}`, borderLeft:`3px solid ${C.orange}`,
              borderRadius:12, padding:"15px 16px", marginBottom:10}}>
            <div style={{display:"flex", alignItems:"baseline", gap:8, marginBottom:6}}>
              <span style={{fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                color:C.orange, textTransform:"uppercase"}}>{s.source}</span>
              <span style={{fontSize:10.5, color:C.inkFaint}}>{ago(s.published_at)}</span>
            </div>
            <div style={{fontFamily:SERIF, fontSize:18, fontWeight:600, color:C.ink,
              lineHeight:1.28, letterSpacing:"-0.01em"}}>{s.title}</div>
            {s.summary && (
              <div style={{fontSize:12, color:C.inkMuted, lineHeight:1.6, marginTop:6}}>
                {s.summary}
              </div>
            )}
          </a>
        ))}

        {/* Volquest gets a link, not a scrape. Will pays for it; the other
            three do not, and republishing it here would be lifting the
            writers' work. */}
        {!loading && (
          <a href="https://volquest.com" target="_blank" rel="noopener noreferrer"
            style={{display:"block", textDecoration:"none", background:"transparent",
              border:`1px dashed ${C.hairInk}`, borderRadius:12, padding:"14px 16px",
              marginTop:4, marginBottom:10}}>
            <div style={{fontSize:9, fontWeight:700, letterSpacing:"0.14em",
              color:C.inkFaint, marginBottom:5}}>SUBSCRIBERS ONLY</div>
            <div style={{fontFamily:SERIF, fontSize:16, fontWeight:600, color:C.ink}}>
              Volquest
            </div>
            <div style={{fontSize:11.5, color:C.inkMuted, marginTop:4, lineHeight:1.55}}>
              Their reporting stays on their site. Tap through if you have a login.
            </div>
          </a>
        )}

        {/* What answered. A thin feed should be explainable from the screen. */}
        {!loading && sources.length > 0 && (
          <div style={{marginTop:6}}>
            <button onClick={() => setShowSources(v => !v)}
              style={{background:"none", border:"none", cursor:"pointer", padding:"8px 0",
                color:C.inkFaint, fontSize:10, fontWeight:700, letterSpacing:"0.16em",
                fontFamily:SANS}}>
              {showSources ? "HIDE SOURCES" : `${working.length} OF ${sources.length} SOURCES LIVE`}
            </button>
            {showSources && (
              <div style={{background:C.card, border:`1px solid ${C.hair}`, borderRadius:12,
                padding:"6px 15px", marginTop:4}}>
                {sources.map((s, i) => (
                  <div key={i} style={{display:"flex", justifyContent:"space-between",
                    alignItems:"baseline", padding:"9px 0", gap:12,
                    borderBottom: i === sources.length-1 ? "none" : `1px solid ${C.hair}`}}>
                    <span style={{fontSize:12, color:C.ink}}>{s.name}</span>
                    <span style={{fontSize:11, color: s.ok && s.count ? C.inkMuted : "#9E3B33"}}>
                      {s.ok && s.count ? `${s.count} stories` : (s.error || "nothing")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{textAlign:"center", padding:"16px 0 0"}}>
          <button onClick={() => { setLoading(true); load(); }}
            style={{background:"none", border:"none", cursor:"pointer", color:C.inkFaint,
              fontSize:10, fontWeight:700, letterSpacing:"0.2em", fontFamily:SANS}}>
            REFRESH
          </button>
          <div style={{fontSize:10, color:C.inkFaint, marginTop:10, lineHeight:1.6}}>
            Cached for fifteen minutes, so refreshing twice shows the same thing.
          </div>
        </div>
      </div>
    </div>
  );
}
