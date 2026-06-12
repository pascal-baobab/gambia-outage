// features.jsx — Trust layer + "My area" & return-to-power alerts.
// Exports: useLocal, ConfidenceChip, TrustLine, MyAreaCard, AreaActions, areaStatus

function useLocal(key, def) {
  const [v, setV] = React.useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; } });
  const set = (nv) => { setV(nv); try { localStorage.setItem(key, JSON.stringify(nv)); } catch {} };
  return [v, set];
}

const CONFIRM_THRESHOLD = 8;

// ── One-report-true flag (mirrors web/src/lib/flags.ts SINGLE_REPORT_TRUTH — ON in prod) ─────────
// 1 OUT ⇒ DARK, 1 BACK ⇒ LIGHT. The 8-confirm threshold is demoted from a "Confirmed/Unconfirmed"
// gate to a "· N reports" strength counter; ConfidenceChip/TrustLine stay for the flag-off state.
const SINGLE_REPORT_TRUTH = true;

// Evidence gate (mirrors web/src/lib/status.ts displayStatus): a zone with ZERO reports makes NO
// power claim → 'nodata' (AWAITING, grey dashed bulb, duration shown as '—'). Otherwise sevToStatus.
function displayStatus(z) {
  if (!z.reports) return 'nodata';
  return sevToStatus(z.sev);
}

// "· N reports" strength counter — the demoted confidence signal under SINGLE_REPORT_TRUTH.
function ReportStrength({ reports = 0 }) {
  return (
    <span style={{ fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 700, color: GPT_T.ink45, whiteSpace: 'nowrap' }}>
      · {reports} report{reports === 1 ? '' : 's'}
    </span>
  );
}

// Small trust pill: Confirmed (≥ threshold independent reports) vs Unconfirmed
function ConfidenceChip({ confirms = 0, size = 'md' }) {
  const th = useTheme();
  const ok = confirms >= CONFIRM_THRESHOLD;
  const c = ok ? th.on : th.partial, deep = ok ? th.onDeep : th.partialDeep;
  const bg = ok ? th.onBg : th.partialBg, line = ok ? th.onLine : th.partialLine;
  const sm = size === 'sm';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: sm ? 4 : 6, padding: sm ? '3px 8px' : '5px 10px',
      borderRadius: 999, background: bg, border: `1.5px solid ${line}`, color: deep, fontFamily: GPT_FONT, fontWeight: 800, fontSize: sm ? 11 : 12.5, lineHeight: 1, whiteSpace: 'nowrap' }}>
      <GPTIcon name={ok ? 'shield' : 'info'} size={sm ? 13 : 15} color={c} /> {ok ? 'Confirmed' : 'Unconfirmed'}
    </span>
  );
}

// One-line trust explainer used on the zone detail
function TrustLine({ confirms = 0 }) {
  const th = useTheme();
  const ok = confirms >= CONFIRM_THRESHOLD;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: GPT_FONT, fontSize: 12.5, color: GPT_T.ink70, fontWeight: 600, lineHeight: 1.4 }}>
      <span style={{ marginTop: 1 }}><GPTIcon name={ok ? 'shield' : 'info'} size={15} color={ok ? th.on : th.partial} /></span>
      {ok
        ? <span><b style={{ color: GPT_T.ink }}>Confirmed</b> by {confirms} independent reports in the last hour. Auto-expires if neighbours stop reconfirming.</span>
        : <span>Only <b style={{ color: GPT_T.ink }}>{confirms}</b> report{confirms === 1 ? '' : 's'} so far — needs <b style={{ color: GPT_T.ink }}>{Math.max(1, CONFIRM_THRESHOLD - confirms)}</b> more nearby to confirm.</span>}
    </div>
  );
}

// Resolve the saved area's live status from the current dataset
function areaStatus(myArea, data) {
  if (!myArea) return null;
  if (myArea.kind === 'region') {
    const z = data.zones.find(z => z.id === myArea.id); if (!z) return null;
    return { name: z.name, region: z.region, status: sevToStatus(z.sev), mins: z.todayMin, reports: z.reports, confirms: z.confirms };
  }
  const arr = (data.quarters || {})[myArea.regionId] || [];
  const q = arr.find(x => x.id === myArea.id); const parent = data.zones.find(z => z.id === myArea.regionId);
  if (!q || !parent) return null;
  return { name: q.name, region: myArea.region, status: q.status, mins: q.mins, reports: q.reports, confirms: parent.confirms };
}

// Home: pinned "My area" status card
function MyAreaCard({ st, alertOn, onOpen, onReport, onToggleAlert, onClear }) {
  const th = useTheme();
  const c = th[st.status], bg = th[st.status + 'Bg'], deep = th[st.status + 'Deep'], line = th[st.status + 'Line'];
  return (
    <div style={{ margin: '10px 12px 0', borderRadius: 16, border: `1.5px solid ${line}`, background: bg, overflow: 'hidden', fontFamily: GPT_FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px' }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GPTIcon name={st.status} size={22} color="#fff" strokeColor={c} />
        </span>
        <button onClick={onOpen} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, color: deep, textTransform: 'uppercase' }}>My area</span>
            <GPTIcon name="pin" size={11} color={deep} />
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: deep }}>{st.status === 'on' ? 'Power on' : `${fmtHM(st.mins)} without power`}</div>
        </button>
        <button onClick={onToggleAlert} aria-pressed={alertOn} title="Alert me when power returns"
          style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: alertOn ? GPT_T.ink : GPT_T.paper, border: `1.5px solid ${alertOn ? GPT_T.ink : line}` }}>
          <GPTIcon name={alertOn ? 'bell' : 'bell-off'} size={20} color={alertOn ? '#fff' : GPT_T.ink70} />
        </button>
      </div>
      <div style={{ display: 'flex', borderTop: `1px solid ${line}` }}>
        <button onClick={() => onReport(st.status === 'on' ? 'out' : 'on')} style={{ flex: 1, padding: '9px', background: 'transparent', border: 'none', borderRight: `1px solid ${line}`, cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 800, color: GPT_T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <GPTIcon name={st.status === 'on' ? 'out' : 'on'} size={16} color={st.status === 'on' ? th.out : th.on} strokeColor={bg} /> Quick report
        </button>
        <button onClick={onClear} style={{ padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 700, color: GPT_T.ink45 }}>Unpin</button>
      </div>
    </div>
  );
}

// Zone detail: set-as-my-area + alert toggle
function AreaActions({ isMine, alertOn, onSetMine, onToggleAlert }) {
  const th = useTheme();
  const pill = (active, activeBg) => ({ flex: 1, minHeight: 46, borderRadius: 12, cursor: 'pointer', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13.5,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: active ? activeBg : GPT_T.paper, color: active ? '#fff' : GPT_T.ink70, border: `1.5px solid ${active ? activeBg : GPT_T.line}` });
  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <button onClick={onSetMine} style={pill(isMine, GPT_T.ink)}>
        <GPTIcon name={isMine ? 'check' : 'pin'} size={17} color={isMine ? '#fff' : GPT_T.ink70} /> {isMine ? 'My area' : 'Set as my area'}
      </button>
      <button onClick={onToggleAlert} style={pill(alertOn, th.out)}>
        <GPTIcon name={alertOn ? 'bell' : 'bell-off'} size={17} color={alertOn ? '#fff' : GPT_T.ink70} /> {alertOn ? 'Alerts on' : 'Notify me'}
      </button>
    </div>
  );
}

// ── Community UGC: persistent-pseudonym social layer ────────────────────────────────────────────
// Stories feed + per-zone comments. Content is attributed to a device pseudonym (nickname + avatar)
// that becomes PUBLIC only when the user publishes — it is NEVER linked to the anonymous power-cut
// reports (no rl_key on social rows; reports carry no account_id). Moderation is automatic only:
// sanitise + per-account hourly caps + length caps, with an owner hide/delete backstop. In the
// shipped app the avatar is a pre-generated DiceBear SVG; here it's a simple deterministic stand-in.

// Deterministic pseudonymous avatar stand-in (the real app ships static DiceBear "people" SVGs).
function PseudoAvatar({ id = '', name = '', size = 40 }) {
  const palette = ['#1F8A4C', '#C0392B', '#2C73C2', '#B8860B', '#7D3C98', '#117A65'];
  const seed = (id || name || '?');
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bg = palette[h % palette.length];
  const initial = (name || '·').trim().charAt(0).toUpperCase() || '·';
  return (
    <span style={{ width: size, height: size, minWidth: size, borderRadius: '50%', background: bg, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: GPT_FONT,
      fontWeight: 800, fontSize: size * 0.42, flexShrink: 0 }}>{initial}</span>
  );
}

// One social item — shared by the Stories feed and the per-zone comment thread.
function StoryCard({ item }) {
  const name = item.nickname || 'Anonymous neighbour';
  return (
    <div style={{ display: 'flex', gap: 11, padding: '12px 0', borderBottom: `1px solid ${GPT_T.line2}`, fontFamily: GPT_FONT }}>
      <PseudoAvatar id={item.avatarId} name={item.nickname} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{name}</span>
          <span style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600 }}>{item.ago}</span>
          {item.zoneName && (
            <span style={{ fontSize: 11, fontWeight: 700, color: GPT_T.ink70, background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 999, padding: '2px 8px' }}>
              <GPTIcon name="pin" size={10} color={GPT_T.ink45} /> {item.zoneName}
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, color: GPT_T.ink, lineHeight: 1.45, fontWeight: 500, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.body}</div>
      </div>
    </div>
  );
}

// Small composer reused by Stories (cap 280) and per-zone comments (cap 240).
function SocialComposer({ placeholder, max, cta, onPost }) {
  const th = useTheme();
  const [body, setBody] = React.useState('');
  const left = max - body.length;
  const submit = () => { const v = body.trim(); if (!v) return; onPost({ id: 'local-' + body.length + '-' + v.slice(0, 4), nickname: 'You', avatarId: 'you', body: v, ago: 'just now' }); setBody(''); };
  return (
    <div style={{ background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: 12 }}>
      <textarea value={body} maxLength={max} rows={2} placeholder={placeholder} onChange={e => setBody(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', outline: 'none', resize: 'none',
          fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, lineHeight: 1.45 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11.5, color: left < 20 ? th.out : GPT_T.ink45, fontWeight: 700 }}>{left}</span>
        <button onClick={submit} disabled={!body.trim()} style={{ minHeight: 38, padding: '0 16px', borderRadius: 11, border: 'none', cursor: body.trim() ? 'pointer' : 'default',
          background: body.trim() ? GPT_T.ink : GPT_T.line, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13.5 }}>{cta}</button>
      </div>
    </div>
  );
}

// Community tab "Stories" feed — composer + cross-zone feed (mount above the Wall of Honor).
function StoriesSection({ stories = [] }) {
  const [items, setItems] = React.useState(stories);
  return (
    <div style={{ background: GPT_T.paper, padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}` }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>Outage stories</div>
      <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2, marginBottom: 12 }}>What neighbours are living through — public, under your chosen pseudonym.</div>
      <SocialComposer placeholder="Share what’s happening in your area…" max={280} cta="Post" onPost={(it) => setItems(s => [it, ...s])} />
      <div style={{ marginTop: 6 }}>
        {items.length ? items.map(it => <StoryCard key={it.id} item={it} />)
          : <div style={{ padding: '18px 0', textAlign: 'center', color: GPT_T.ink45, fontFamily: GPT_FONT, fontSize: 13.5 }}>No stories yet — be the first to speak up.</div>}
      </div>
    </div>
  );
}

// Zone detail "Discussion" thread — distinct from the sanitised report-notes feed. Self-contained
// panel (mirrors screen-zone's Section styling) so it can live in this file without cross-file refs.
function ZoneDiscussion({ comments = [] }) {
  const [items, setItems] = React.useState(comments);
  return (
    <div style={{ background: GPT_T.paper, padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}` }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>Discussion</div>
      <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2, marginBottom: 14 }}>Talk to your neighbours about this area — public pseudonym, never linked to your reports.</div>
      <SocialComposer placeholder="Add a comment…" max={240} cta="Comment" onPost={(it) => setItems(s => [it, ...s])} />
      <div style={{ marginTop: 6 }}>
        {items.length ? items.map(it => <StoryCard key={it.id} item={it} />)
          : <div style={{ padding: '14px 0', textAlign: 'center', color: GPT_T.ink45, fontFamily: GPT_FONT, fontSize: 13.5 }}>No comments yet.</div>}
      </div>
    </div>
  );
}

// "From Facebook" — owner-curated external posts ingested via the Telegram bot, shown as LIGHTWEIGHT
// link-out cards. No Facebook SDK, no iframe (fast on 2G, privacy-preserving); tapping the TEXT opens
// FB, tapping the IMAGE opens an in-app Lightbox (never FB). Each card carries an anonymous ❤ like
// (optimistic, device-deduped) + a collapsible PostComments thread. De-dup rule: the FULL feed lives
// ONLY in the News tab — Home + Community render a 3-card teaser (`limit` + "See all N in News").
// Faithful port of web/src/components/community/SocialLinksSection.tsx + PostComments.tsx.
const FB_BLUE = '#1877F2';
const HEART = '#E0245E';

// Deterministic hue from the source name → stable monogram avatar colour (no network).
function _hashHue(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; }

// Source "logo": monogram avatar (initial, deterministic colour) + small platform badge overlay.
function SourceAvatar({ name = '', source = 'facebook' }) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  const fb = source === 'facebook';
  return (
    <div aria-hidden="true" style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: `hsl(${_hashHue(name || source)} 52% 42%)`, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: GPT_FONT, fontWeight: 900, fontSize: 17, lineHeight: 1 }}>{initial}</div>
      {fb && (
        <span style={{ position: 'absolute', right: -2, bottom: -2, width: 17, height: 17, borderRadius: '50%', background: FB_BLUE, color: '#fff',
          border: `2px solid ${GPT_T.paper}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, lineHeight: 1, fontFamily: GPT_FONT }}>f</span>
      )}
    </div>
  );
}

function HeartGlyph({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? HEART : 'none'} stroke={filled ? HEART : GPT_T.ink45} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

// Full-screen in-app image viewer — tap anywhere / ✕ / Esc closes; scroll is implicitly locked by the
// fixed overlay (the prototype lives inside PhoneShell, so `position:absolute, inset:0` covers it).
function Lightbox({ src, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Image — full screen" onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: GPT_FONT, animation: 'gptFade .2s ease' }}>
      <img src={src} alt="" onClick={onClose} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />
      <button type="button" aria-label="Close image" onClick={onClose}
        style={{ position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 22, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  );
}

// Collapsible pseudonymous comment thread under a social card (polymorphic in prod:
// social / community_link / question targets — here mocked per-card).
function PostComments({ comments = [] }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState(comments);
  const [draft, setDraft] = React.useState('');
  const submit = () => {
    const v = draft.trim(); if (!v) return;
    setItems(s => [{ id: 'local-' + s.length, nickname: 'You', avatarId: 'you', body: v, ago: 'just now' }, ...s]);
    setDraft('');
  };
  return (
    <div style={{ borderTop: `1px solid ${GPT_T.line2}`, padding: '6px 12px 10px', fontFamily: GPT_FONT }}>
      <button onClick={() => setOpen(o => !o)} style={{ border: 0, background: 'transparent', color: GPT_T.ink45, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '4px 0' }}>
        💬 {open ? 'Hide comments' : items.length ? `${items.length} comment${items.length === 1 ? '' : 's'}` : 'Add a comment'}
      </button>
      {open && (
        <React.Fragment>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 8 }}>
            <textarea value={draft} maxLength={240} rows={2} placeholder="Write a comment…" onChange={e => setDraft(e.target.value)}
              style={{ flex: 1, boxSizing: 'border-box', border: `1px solid ${GPT_T.line}`, borderRadius: 10, padding: 8, resize: 'none', fontFamily: GPT_FONT, fontSize: 13.5, color: GPT_T.ink, outline: 'none' }} />
            <button onClick={submit} disabled={!draft.trim()}
              style={{ alignSelf: 'flex-end', height: 34, padding: '0 14px', borderRadius: 9, border: 0, background: draft.trim() ? FLAG.green : GPT_T.line, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13, cursor: draft.trim() ? 'pointer' : 'default' }}>Post</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {items.map(c => <StoryCard key={c.id} item={c} />)}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

// Badge pill for SocialLinkCard — labels: OFFICIAL, verified, auto-tracked
function SourceBadge({ label }) {
  const badgeColor = label === 'OFFICIAL' ? FLAG.green : label === 'verified' ? FLAG.blue : GPT_T.ink45;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 999, border: `1px solid ${badgeColor}`, background: 'transparent', fontSize: 10, fontWeight: 800, color: badgeColor, letterSpacing: 0.3, lineHeight: 1.4, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function SocialLinkCard({ link, liked, likes, onLike }) {
  const [zoom, setZoom] = React.useState(false);
  const [videoOpen, setVideoOpen] = React.useState(false);
  const fb = link.source === 'facebook';
  const sourceName = link.author || link.title || (fb ? 'Facebook' : 'Link');
  const headline = link.title && link.title !== sourceName ? link.title : '';
  // Badge logic: OFFICIAL sources get the OFFICIAL badge, verified sources get verified, auto-tracked otherwise
  const badge = link.official ? 'OFFICIAL' : link.verified ? 'verified' : link.autoTracked ? 'auto-tracked' : null;
  // Video embed placeholder: shown when link.hasVideo is set (mock via link.video flag)
  const hasVideo = !!(link.video);
  return (
    <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, overflow: 'hidden', fontFamily: GPT_FONT, color: GPT_T.ink }}>
      {/* Video embed placeholder — tap-to-play thumbnail with play icon overlay */}
      {hasVideo && !link.image && (
        <button type="button" onClick={() => setVideoOpen(v => !v)} aria-label="Play video"
          style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: GPT_T.panel, cursor: 'pointer', position: 'relative', lineHeight: 0, minHeight: 120 }}>
          {/* Thumbnail placeholder rectangle */}
          <div style={{ width: '100%', minHeight: 120, background: GPT_T.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {!videoOpen ? (
              <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.5)' }}>
                <GPTIcon name="play" size={22} color="#fff" />
              </span>
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GPT_T.panelInk, fontSize: 13, fontWeight: 700 }}>
                ▶ Video playing (embed)
              </div>
            )}
          </div>
        </button>
      )}
      {/* Image OUTSIDE the <a>: tapping it opens the full image in-app, NOT Facebook. */}
      {link.image && (
        <button type="button" onClick={() => setZoom(true)} aria-label="Open the full image"
          style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: GPT_T.wash, cursor: 'zoom-in', position: 'relative', lineHeight: 0 }}>
          <img src={link.image} alt="" loading="lazy" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
          <span aria-hidden="true" style={{ position: 'absolute', right: 8, bottom: 8, width: 26, height: 26, borderRadius: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H4a1 1 0 0 0-1 1v5M15 3h5a1 1 0 0 1 1 1v5M9 21H4a1 1 0 0 1-1-1v-5M15 21h5a1 1 0 0 0 1-1v-5" />
            </svg>
          </span>
        </button>
      )}
      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SourceAvatar name={sourceName} source={link.source} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sourceName}</div>
                {badge && <SourceBadge label={badge} />}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GPT_T.ink45, marginTop: 1 }}>{link.pinned ? '📌 ' : ''}{fb ? 'Facebook' : 'Link'}</div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: GPT_T.ink45, flexShrink: 0, textAlign: 'right', lineHeight: 1.25 }}>
              {link.stamp}
              <span style={{ display: 'block', fontWeight: 500, fontSize: 10.5 }}>{link.ago}</span>
            </span>
          </div>
          {headline && <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.3, marginTop: 9 }}>{headline}</div>}
          {link.snippet && <div style={{ fontSize: 13.5, fontWeight: 500, color: GPT_T.ink70, lineHeight: 1.45, marginTop: headline ? 4 : 9 }}>{link.snippet}</div>}
          <div style={{ fontSize: 13, fontWeight: 800, color: FB_BLUE, marginTop: 10 }}>{fb ? 'View on Facebook ↗' : 'Open link ↗'}</div>
        </div>
      </a>
      {/* Like footer — OUTSIDE the <a> so it never navigates. Optimistic + device-deduped. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: `1px solid ${GPT_T.line}` }}>
        <button type="button" onClick={() => onLike(link.id)} disabled={liked} aria-pressed={liked}
          aria-label={liked ? 'You liked this' : 'Like this post'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${liked ? HEART : GPT_T.line}`, background: liked ? 'rgba(224,36,94,0.08)' : GPT_T.paper,
            color: liked ? HEART : GPT_T.ink70, fontWeight: 800, fontSize: 13, fontFamily: GPT_FONT, cursor: liked ? 'default' : 'pointer', lineHeight: 1 }}>
          <HeartGlyph filled={liked} />
          {likes > 0 && <span>{likes}</span>}
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>
        {likes > 0 && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{likes === 1 ? '1 person reacted' : `${likes} people reacted`}</span>
        )}
      </div>
      <PostComments comments={link.comments || []} />
      {zoom && link.image && <Lightbox src={link.image} onClose={() => setZoom(false)} />}
    </div>
  );
}

// `limit` caps the cards (Home/Community teaser = 3); `onSeeAll` adds "See all N in News" → #/news.
// Without them the full feed renders (News tab only).
function SocialLinksSection({ links = [], limit, onSeeAll }) {
  const [liked, setLiked] = useLocal('gpt_liked_links', []);
  const [bumps, setBumps] = React.useState({});
  const onLike = (id) => {
    if (liked.includes(id)) return;
    setLiked([...liked, id]);
    setBumps(b => ({ ...b, [id]: 1 })); // optimistic — prod reconciles to the server total
  };
  if (!links.length) return null;
  const shown = limit ? links.slice(0, limit) : links;
  const hidden = links.length - shown.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: GPT_T.ink45 }}>From Facebook</div>
      {shown.map(l => (
        <SocialLinkCard key={l.id} link={l} liked={liked.includes(l.id)} likes={(l.likes || 0) + (bumps[l.id] || 0)} onLike={onLike} />
      ))}
      {onSeeAll && hidden > 0 && (
        <button type="button" onClick={onSeeAll}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', minHeight: 46, borderRadius: 13, cursor: 'pointer',
            background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, color: GPT_T.ink, fontFamily: GPT_FONT, fontSize: 14, fontWeight: 800 }}>
          See all {links.length} in News <span aria-hidden="true" style={{ color: FB_BLUE }}>↗</span>
        </button>
      )}
    </div>
  );
}

// ── LIVE strip — owner-curated live streams, shown only while one is active (Home + Community).
// FB/YouTube embed on tap (mocked here as a dark stage), link-out for TikTok/IG.
// Mirrors web/src/components/community/LiveStrip.tsx.
function LiveStrip({ lives = [] }) {
  const [playing, setPlaying] = React.useState(null);
  if (!lives.length) return null;
  const canEmbed = (l) => l.source === 'facebook' || l.source === 'youtube';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontFamily: GPT_FONT }}>
      {lives.map(l => (
        <div key={l.id} style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, overflow: 'hidden' }}>
          {playing === l.id && canEmbed(l) ? (
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
              {/* prototype stand-in for the FB/YouTube iframe embed */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                ▶ Live stream playing (embed)
              </div>
            </div>
          ) : null}
          <button type="button"
            onClick={() => canEmbed(l) ? setPlaying(p => p === l.id ? null : l.id) : window.open(l.url, '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: GPT_FONT }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, background: FLAG.red, color: '#fff', fontSize: 10.5, fontWeight: 900, letterSpacing: 0.8, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff', animation: 'gptPulse 1.6s ease-out infinite' }} /> LIVE
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: GPT_T.ink45, flexShrink: 0 }}>{canEmbed(l) ? (playing === l.id ? 'Hide' : 'Watch') : 'Open ↗'}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Gamification primitives (device-local; XP decoupled from reports — claim_nonce model) ────────
// Mirrors web/src/lib/xp.ts. The server is authoritative for awarded XP; this is the client ladder.
const RANKS = [
  { key: 'observer', label: 'Observer', min: 0 },
  { key: 'watcher', label: 'Watcher', min: 10 },
  { key: 'sentinel', label: 'Sentinel', min: 30 },
  { key: 'guardian', label: 'Guardian of the Quarter', min: 50 },
];
function rankFor(xp) { let cur = RANKS[0]; for (const r of RANKS) if (xp >= r.min) cur = r; return cur; }
function rankNext(xp) {
  const cur = rankFor(xp);
  const i = RANKS.findIndex(r => r.key === cur.key);
  return i < RANKS.length - 1 ? RANKS[i + 1] : null;
}
const BADGE_LABEL = { first_witness: 'First Witness', light_spotter: 'Light Spotter', always_watching: 'Always Watching', first_ambassador: 'First Ambassador' };

// 16 avatar preset ids. In the shipped app these are pre-generated static "real-people" SVG portraits
// (weighted ~75% Black/African · 15% Indian · 10% Caucasian, women+men — lib/avatars.generated.ts);
// the prototype stands them in with the deterministic PseudoAvatar (same picker layout/flow).
const AVATAR_PRESETS = Array.from({ length: 16 }, (_, i) => ({ id: 'av' + (i + 1), name: 'P' + String.fromCharCode(65 + i) }));

function XpBar({ xp, toNext, nextLabel }) {
  const th = useTheme();
  const span = xp + toNext;
  const pct = span > 0 ? Math.min(100, Math.round((xp / span) * 100)) : 100;
  return (
    <div style={{ fontFamily: GPT_FONT }}>
      <div style={{ height: 8, borderRadius: 4, background: GPT_T.line }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: th.partial, transition: 'width .4s' }} />
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, color: GPT_T.ink70 }}>
        {nextLabel ? `${toNext} XP to ${nextLabel}` : 'Top rank reached'}
      </div>
    </div>
  );
}

function BadgeChip({ k }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, border: `1px solid ${GPT_T.line}`, fontFamily: GPT_FONT, fontSize: 13, color: GPT_T.ink70 }}>
      {BADGE_LABEL[k] || k}
    </span>
  );
}

// Compact Home XP progress card — renders ONLY once the device has earned XP (null at 0).
function RankChip({ profile }) {
  const th = useTheme();
  if (!profile || profile.xp === 0) return null;
  const next = rankNext(profile.xp);
  return (
    <div style={{ margin: '10px 12px 0', padding: '11px 14px', borderRadius: 14, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, boxShadow: '0 1px 2px rgba(15,23,34,0.04)', fontFamily: GPT_FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: GPT_T.ink70, fontWeight: 600, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: th.partial, flexShrink: 0 }} />
        <span>
          You're <strong style={{ color: GPT_T.ink, fontWeight: 800 }}>{rankFor(profile.xp).label}</strong> · {profile.xp} XP
          {next ? <span style={{ color: GPT_T.ink45 }}> · {next.min - profile.xp} to {next.label}</span> : <span style={{ color: GPT_T.ink45 }}> · top rank</span>}
        </span>
      </div>
      <XpBar xp={profile.xp} toNext={next ? next.min - profile.xp : 0} nextLabel={next ? next.label : null} />
    </div>
  );
}

// Real social proof: distinct contributors + total reports (Home + Profile). Never fabricated —
// renders nothing at zero.
function ContributorsBadge({ stats, variant = 'home' }) {
  if (!stats || !stats.reports) return null;
  const text = stats.contributors > 0
    ? (variant === 'profile'
        ? `You're one of ${stats.contributors} neighbours keeping watch · ${stats.reports.toLocaleString()} reports logged`
        : `Built by ${stats.contributors} neighbours · ${stats.reports.toLocaleString()} reports logged`)
    : `${stats.reports.toLocaleString()} reports logged across The Gambia`;
  if (variant === 'profile') return <p style={{ fontFamily: GPT_FONT, fontSize: 13.5, opacity: 0.75, marginTop: 12, color: GPT_T.ink70 }}>{text}</p>;
  return <div style={{ fontFamily: GPT_FONT, textAlign: 'center', fontSize: 13, opacity: 0.75, padding: '8px 0', color: GPT_T.ink70 }}>{text}</div>;
}

// Lightweight confetti burst — fires once on mount (report logged / rank-up celebration).
function Confetti() {
  const colors = [FLAG.red, FLAG.blue, FLAG.green, '#E08A00', '#F2CF86'];
  const bits = Array.from({ length: 26 }, (_, i) => ({
    left: 4 + (i * 37) % 92, delay: (i % 7) * 0.07, dur: 1.3 + (i % 5) * 0.18,
    color: colors[i % colors.length], size: 6 + (i % 3) * 3, rot: (i * 53) % 360,
  }));
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 85, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`@keyframes gptConfetti { 0% { transform: translateY(-30px) rotate(0deg); opacity: 1; } 100% { transform: translateY(560px) rotate(540deg); opacity: 0; } }`}</style>
      {bits.map((b, i) => (
        <span key={i} style={{ position: 'absolute', top: 0, left: `${b.left}%`, width: b.size, height: b.size * 0.6, background: b.color,
          borderRadius: 1, transform: `rotate(${b.rot}deg)`, animation: `gptConfetti ${b.dur}s ease-in ${b.delay}s both` }} />
      ))}
    </div>
  );
}

Object.assign(window, { useLocal, ConfidenceChip, TrustLine, MyAreaCard, AreaActions, areaStatus, CONFIRM_THRESHOLD,
  SINGLE_REPORT_TRUTH, displayStatus, ReportStrength,
  PseudoAvatar, StoryCard, SocialComposer, StoriesSection, ZoneDiscussion,
  SourceAvatar, Lightbox, PostComments, SocialLinkCard, SocialLinksSection, LiveStrip,
  RANKS, rankFor, rankNext, BADGE_LABEL, AVATAR_PRESETS, XpBar, BadgeChip, RankChip, ContributorsBadge, Confetti });
