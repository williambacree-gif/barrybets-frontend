// ═══════════════════════════════════════════════════════════════
// BARRY BETS — COMMISSIONER
//
// Built after a week of the college survivor pool was lost without anyone
// noticing. The board was not stale; the week simply never got created,
// and nothing anywhere said so. Three players were auto-assigned the same
// team, it lost, and they were out of a pool they never got to play.
//
// So the top of this screen is not the buttons. It is the list of things
// that look wrong right now. The buttons are underneath, for when one of
// them needs dealing with.
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
  brass:"#B08D3F", brassLt:"#C9A961",
  green:"#2F6E4A", greenBg:"rgba(47,110,74,0.10)",
  amber:"#8A6516", amberBg:"rgba(176,141,63,0.13)",
  red:"#9E3B33", redBg:"rgba(158,59,51,0.09)",
};
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'Raleway', -apple-system, BlinkMacSystemFont, sans-serif";

// ─── small pieces ────────────────────────────────────────────

const Rule = () => (
  <div style={{display:"flex",alignItems:"center",gap:12,margin:"22px 0"}}>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.brass}44,${C.brass}77)`}}/>
    <div style={{width:4,height:4,transform:"rotate(45deg)",background:C.brass,opacity:0.7}}/>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.brass}77,${C.brass}44,transparent)`}}/>
  </div>
);

const Label = ({children}) => (
  <div style={{fontSize:9,fontFamily:SANS,fontWeight:700,letterSpacing:"0.22em",
    color:C.brass,marginBottom:12}}>{children}</div>
);

const Card = ({children, pad=20}) => (
  <div style={{background:C.card,border:`1px solid ${C.hair}`,borderRadius:14,
    padding:pad,marginBottom:14}}>{children}</div>
);

const Btn = ({children, onClick, tone="brass", disabled, small}) => {
  const tones = {
    brass: {bg:C.brass, fg:"#17203A", bd:"none"},
    quiet: {bg:"transparent", fg:C.ink, bd:`1px solid ${C.hairInk}`},
    danger:{bg:"transparent", fg:C.red, bd:`1px solid ${C.red}55`},
  };
  const t = tones[tone] || tones.brass;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:t.bg, color:t.fg, border:t.bd, borderRadius:9,
      padding: small ? "9px 13px" : "13px 16px",
      fontSize: small ? 10 : 11, fontWeight:700, letterSpacing:"0.14em",
      fontFamily:SANS, cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1, width:"100%",
    }}>{children}</button>
  );
};

// A field of play: label on the left, value on the right.
const Stat = ({k, v, tone}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",
    padding:"9px 0",borderBottom:`1px solid ${C.hair}`,gap:14}}>
    <span style={{fontSize:11,fontFamily:SANS,color:C.inkMuted,letterSpacing:"0.04em",
      flexShrink:0}}>{k}</span>
    <span style={{fontSize:13,fontFamily:SANS,fontWeight:600,textAlign:"right",
      color: tone === "warn" ? C.amber : tone === "bad" ? C.red : tone === "good" ? C.green : C.ink}}>{v}</span>
  </div>
);

// ─── the screen ──────────────────────────────────────────────

export default function Commish() {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState(null);
  const [players, setPlayers] = useState([]);
  const [err, setErr]   = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  // Results of an action, shown inline rather than in an alert box.
  const [link, setLink]   = useState(null);
  const [nudge, setNudge] = useState(null);
  const [done, setDone]   = useState("");

  // Voiding a week is the one thing here with no undo, so it asks for the
  // week number to be typed back before it will go.
  const [voidWeek, setVoidWeek] = useState("");
  const [voidConfirm, setVoidConfirm] = useState("");
  const [showVoid, setShowVoid] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setToken(data?.session?.access_token || null));
  }, []);

  const call = useCallback(async (path, opts = {}) => {
    const res = await fetch(API + "/api/commish" + path, {
      ...opts,
      headers: {"Content-Type":"application/json", Authorization:`Bearer ${token}`, ...(opts.headers||{})},
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong");
    return body;
  }, [token]);

  const load = useCallback(() => {
    if (!token) return;
    setErr("");
    Promise.all([call("/status"), call("/roster")])
      .then(([s, r]) => {
        setStatus(s);
        setPlayers((r && r.players) || []);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, call]);
  useEffect(load, [load]);

  const run = async (name, fn) => {
    setBusy(name); setErr(""); setDone("");
    try { await fn(); }
    catch (e) { setErr(e.message); }
    setBusy("");
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setDone("Copied."); }
    catch { setDone("Couldn't copy — select it by hand."); }
  };

  if (loading) return (
    <div style={{minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:C.bg,color:C.inkFaint,fontFamily:SANS,fontSize:13}}>Checking both pools…</div>
  );

  const warnings = (status && status.warnings) || [];
  const cfb = status && status.cfb;
  const nfl = status && status.nfl;

  return (
    <div style={{background:C.bg,minHeight:"100vh",paddingBottom:70,fontFamily:SANS}}>

      {/* header */}
      <div style={{background:`linear-gradient(175deg,${C.navy} 0%,${C.navyDeep} 100%)`,
        padding:"34px 26px 26px"}}>
        <div style={{fontSize:9,color:C.brassLt,letterSpacing:"0.3em",fontWeight:600}}>BARRY BETS</div>
        <h1 style={{fontSize:34,fontWeight:500,margin:"12px 0 0",color:C.cream,
          fontFamily:SERIF,lineHeight:1.05,letterSpacing:"-0.015em"}}>Commissioner</h1>
        <p style={{fontSize:11.5,color:C.creamDim,margin:"10px 0 0",lineHeight:1.6}}>
          Everything that used to need a token in a URL or a hand-written query.
        </p>
      </div>

      <div style={{padding:"22px 22px 0"}}>

        {err && (
          <div style={{background:C.redBg,border:`1px solid ${C.red}33`,borderRadius:11,
            padding:"13px 15px",marginBottom:14,color:C.red,fontSize:12.5,lineHeight:1.55}}>{err}</div>
        )}
        {done && (
          <div style={{background:C.greenBg,border:`1px solid ${C.green}33`,borderRadius:11,
            padding:"13px 15px",marginBottom:14,color:C.green,fontSize:12.5}}>{done}</div>
        )}

        {/* ── what looks wrong right now ── */}
        <Label>NEEDS A LOOK</Label>
        {warnings.length === 0 ? (
          <Card>
            <div style={{display:"flex",gap:11,alignItems:"flex-start"}}>
              <span style={{color:C.green,fontSize:15,lineHeight:1.2}}>✓</span>
              <div style={{fontSize:13,color:C.ink,lineHeight:1.6}}>
                Nothing outstanding. Both pools have an open week, every line that
                needs freezing is frozen, and everyone has picked.
              </div>
            </div>
          </Card>
        ) : warnings.map((w, i) => (
          <div key={i} style={{background:C.amberBg,border:`1px solid ${C.brass}33`,
            borderRadius:11,padding:"13px 15px",marginBottom:9,display:"flex",gap:11}}>
            <span style={{color:C.amber,fontSize:13,flexShrink:0,lineHeight:1.5}}>!</span>
            <div style={{fontSize:12.5,color:C.ink,lineHeight:1.6}}>{w}</div>
          </div>
        ))}

        <Rule/>

        {/* ── survivor ── */}
        <Label>COLLEGE SURVIVOR</Label>
        <Card>
          {!cfb ? <div style={{fontSize:13,color:C.inkMuted}}>No active season.</div> : (
            <>
              <Stat k="Open week" v={cfb.week ? `Week ${cfb.week}` : "none"}
                tone={cfb.week ? null : "bad"}/>
              <Stat k="Games on the board" v={cfb.games} tone={cfb.games ? null : "bad"}/>
              <Stat k={cfb.locked ? "Locked" : "Locks"} v={cfb.lock_label || "—"}
                tone={cfb.locked ? "warn" : null}/>
              <Stat k="Still alive" v={cfb.alive.length ? cfb.alive.join(", ") : "nobody"}/>
              {cfb.out.length > 0 && <Stat k="Out" v={cfb.out.join(", ")} tone="bad"/>}
              <Stat k="Owe a pick"
                v={cfb.owe_picks.length ? cfb.owe_picks.join(", ") : "nobody"}
                tone={cfb.owe_picks.length ? "warn" : "good"}/>
            </>
          )}
        </Card>

        {/* ── nfl ── */}
        <Label>NFL PRIMETIME</Label>
        <Card>
          {!nfl ? <div style={{fontSize:13,color:C.inkMuted}}>No active season.</div> : (
            <>
              <Stat k="Open week" v={nfl.week ? `Week ${nfl.week}` : "none"}
                tone={nfl.week ? null : "bad"}/>
              {(nfl.rounds || []).map((r, i) => (
                <div key={i} style={{padding:"13px 0",borderBottom: i === nfl.rounds.length - 1
                  ? "none" : `1px solid ${C.hair}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.16em",color:C.brass}}>
                      {r.slot}
                    </span>
                    <span style={{fontSize:10.5,color:C.inkFaint}}>
                      {r.locked ? "kicked off" : r.kickoff_label}
                    </span>
                  </div>
                  <div style={{fontSize:14,fontFamily:SERIF,fontWeight:600,color:C.ink,marginTop:5}}>
                    {r.game}
                  </div>
                  <div style={{fontSize:11,color: r.line_frozen ? C.inkMuted : C.red,marginTop:4}}>
                    {r.line_frozen ? r.line : "no frozen line — cannot be graded"}
                  </div>
                  {!r.locked && r.owe_picks.length > 0 && (
                    <div style={{fontSize:11,color:C.amber,marginTop:4}}>
                      waiting on {r.owe_picks.join(" and ")}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </Card>

        <Rule/>

        {/* ── messages ── */}
        <Label>MESSAGE THE GUYS</Label>
        <Card>
          <p style={{fontSize:12.5,color:C.inkMuted,lineHeight:1.65,margin:"0 0 14px"}}>
            Two messages. <b style={{color:C.ink,fontWeight:600}}>The week ahead</b> lays
            out all three rounds and who picks against whom — send it early and
            nobody has to open the app to find out whose week it is.{" "}
            <b style={{color:C.ink,fontWeight:600}}>Who{"'"}s late</b> names only the men
            still owing a pick. Neither one mentions you.
          </p>
          <Btn onClick={() => run("week", async () => {
            const r = await call("/week-ahead");
            setNudge(r);
            if (!r.text) setDone("No open week in either pool — nothing to send.");
          })} disabled={busy === "week"}>
            {busy === "week" ? "BUILDING…" : "THE WEEK AHEAD"}
          </Btn>
          <div style={{height:9}}/>
          <Btn tone="quiet" onClick={() => run("nudge", async () => {
            const r = await call("/nudge");
            setNudge(r);
            if (!r.text) setDone("Nobody owes a pick — nothing to send.");
          })} disabled={busy === "nudge"}>
            {busy === "nudge" ? "CHECKING…" : "WHO'S LATE"}
          </Btn>
          {nudge && nudge.text && (
            <div style={{marginTop:14}}>
              <div style={{background:C.bg,border:`1px solid ${C.hairInk}`,borderRadius:10,
                padding:"13px 15px",fontSize:13,color:C.ink,lineHeight:1.65,
                whiteSpace:"pre-wrap"}}>{nudge.text}</div>
              <div style={{display:"flex",gap:9,marginTop:10}}>
                <Btn tone="quiet" small onClick={() => copy(nudge.text)}>COPY</Btn>
                <Btn tone="quiet" small
                  onClick={() => { window.location.href = `sms:?&body=${encodeURIComponent(nudge.text)}`; }}>
                  OPEN IN MESSAGES
                </Btn>
              </div>
            </div>
          )}
        </Card>

        {/* ── reset a password ── */}
        <Label>GET SOMEONE BACK IN</Label>
        <Card>
          <p style={{fontSize:12.5,color:C.inkMuted,lineHeight:1.65,margin:"0 0 14px"}}>
            Makes a link you text him. Good for four hours and one use only.
            No email involved, so nothing can filter it into spam.
          </p>
          {players.length === 0 ? (
            <div style={{fontSize:12,color:C.inkFaint}}>Couldn{"'"}t load the roster.</div>
          ) : players.map(p => (
            <div key={p.player_id} style={{display:"flex",alignItems:"center",gap:11,
              padding:"10px 0",borderBottom:`1px solid ${C.hair}`}}>
              <span style={{flex:1,fontSize:14,fontFamily:SERIF,fontWeight:600,color:C.ink}}>
                {p.name}
              </span>
              <div style={{width:118,flexShrink:0}}>
                {p.can_reset ? (
                  <Btn tone="quiet" small disabled={busy === `r${p.player_id}`}
                    onClick={() => run(`r${p.player_id}`, async () => {
                      const r = await call("/reset-link", {
                        method:"POST",
                        body: JSON.stringify({player_id: p.player_id, pool: p.pool}),
                      });
                      setLink(r);
                    })}>
                    {busy === `r${p.player_id}` ? "…" : "RESET LINK"}
                  </Btn>
                ) : (
                  <div style={{fontSize:10,color:C.inkFaint,textAlign:"center",
                    letterSpacing:"0.1em",fontWeight:600}}>NO LOGIN</div>
                )}
              </div>
            </div>
          ))}
          {link && (
            <div style={{marginTop:15,background:C.bg,border:`1px solid ${C.brass}44`,
              borderRadius:10,padding:"14px 15px"}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",color:C.brass,
                marginBottom:8}}>FOR {String(link.player || "").toUpperCase()}</div>
              <div style={{fontSize:11.5,color:C.ink,wordBreak:"break-all",lineHeight:1.6,
                fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{link.url}</div>
              <div style={{fontSize:11,color:C.inkMuted,marginTop:9,lineHeight:1.55}}>
                Expires {link.expires_label} ET. Works once.
              </div>
              <div style={{display:"flex",gap:9,marginTop:11}}>
                <Btn tone="quiet" small onClick={() => copy(link.url)}>COPY LINK</Btn>
                <Btn tone="quiet" small onClick={() => {
                  const body = `Barry Bets password reset — good for 4 hours, works once: ${link.url}`;
                  window.location.href = `sms:?&body=${encodeURIComponent(body)}`;
                }}>TEXT IT</Btn>
              </div>
            </div>
          )}
        </Card>

        {/* ── resync ── */}
        <Label>REFRESH FROM ESPN</Label>
        <Card>
          <p style={{fontSize:12.5,color:C.inkMuted,lineHeight:1.65,margin:"0 0 14px"}}>
            Pulls this week{"'"}s games and scores again. Safe to press twice —
            it never touches a pick or a frozen line.
          </p>
          <div style={{display:"flex",gap:9}}>
            <Btn tone="quiet" small disabled={busy === "sc"}
              onClick={() => run("sc", async () => {
                const r = await call("/resync", {method:"POST", body: JSON.stringify({pool:"cfb"})});
                setDone(r.message); load();
              })}>{busy === "sc" ? "…" : "SURVIVOR"}</Btn>
            <Btn tone="quiet" small disabled={busy === "sn"}
              onClick={() => run("sn", async () => {
                const r = await call("/resync", {method:"POST", body: JSON.stringify({pool:"nfl"})});
                setDone(r.message); load();
              })}>{busy === "sn" ? "…" : "NFL"}</Btn>
          </div>
        </Card>

        {/* ── void a week ── */}
        <Label>VOID A SURVIVOR WEEK</Label>
        <Card>
          <p style={{fontSize:12.5,color:C.inkMuted,lineHeight:1.65,margin:"0 0 14px"}}>
            Takes a week off the board and puts anyone knocked out that week back
            in. The picks are copied somewhere safe first, so it can be undone.
          </p>
          {!showVoid ? (
            <Btn tone="danger" small onClick={() => setShowVoid(true)}>VOID A WEEK…</Btn>
          ) : (
            <>
              <input value={voidWeek} onChange={e => setVoidWeek(e.target.value)}
                placeholder="Which week?" inputMode="numeric"
                style={{width:"100%",padding:"12px 14px",borderRadius:9,
                  border:`1px solid ${C.hairInk}`,background:C.bg,color:C.ink,
                  fontSize:14,fontFamily:SANS,marginBottom:9,boxSizing:"border-box",outline:"none"}}/>
              <input value={voidConfirm} onChange={e => setVoidConfirm(e.target.value)}
                placeholder={voidWeek ? `Type ${voidWeek} again to confirm` : "Then type it again"}
                inputMode="numeric"
                style={{width:"100%",padding:"12px 14px",borderRadius:9,
                  border:`1px solid ${C.hairInk}`,background:C.bg,color:C.ink,
                  fontSize:14,fontFamily:SANS,marginBottom:11,boxSizing:"border-box",outline:"none"}}/>
              <div style={{display:"flex",gap:9}}>
                <Btn tone="quiet" small onClick={() => {
                  setShowVoid(false); setVoidWeek(""); setVoidConfirm("");
                }}>CANCEL</Btn>
                <Btn tone="danger" small
                  disabled={busy === "void" || !voidWeek || voidConfirm !== voidWeek}
                  onClick={() => run("void", async () => {
                    const r = await call("/void-week", {
                      method:"POST",
                      body: JSON.stringify({pool_week: Number(voidWeek), confirm: Number(voidConfirm)}),
                    });
                    setDone(r.message);
                    setShowVoid(false); setVoidWeek(""); setVoidConfirm("");
                    load();
                  })}>{busy === "void" ? "…" : "VOID IT"}</Btn>
              </div>
            </>
          )}
        </Card>

        <div style={{textAlign:"center",padding:"18px 0 0"}}>
          <button onClick={load} style={{background:"none",border:"none",cursor:"pointer",
            color:C.inkFaint,fontSize:10,fontWeight:700,letterSpacing:"0.2em",fontFamily:SANS}}>
            REFRESH
          </button>
        </div>
      </div>
    </div>
  );
}
