// shared-ui.jsx — reusable pieces across screens
// Exports: fmtHM, StatHero, SeverityGauge, ThumbDock, MapControls, ListRow,
//   Sparkline, BarChart7, Skeleton, Toast, SegToggle, OfflineBanner, IconBtn

function fmtHM(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function IconBtn({ icon, onClick, color, label, size = 40 }) {
  return (
    <button onClick={onClick} aria-label={label} style={{ width: size, height: size, minWidth: size, borderRadius: 12,
      border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      <GPTIcon name={icon} size={24} color={color || GPT_T.ink70} />
    </button>
  );
}

// National stat hero (near-black panel — direction B)
function SeverityGauge({ pct, th, dark }) {
  return (
    <div>
      <div style={{ height: 11, borderRadius: 999, background: dark ? '#1B2531' : '#E7E1D3', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${Math.max(3, pct * 100)}%`, background: `linear-gradient(90deg, ${th.partial}, ${th.out})`, transition: 'width .5s' }} />
      </div>
    </div>
  );
}

// Hourly power timeline — replaces the single 15h08m hero number. 24 full-height bars (00→24), each
// a stacked traffic-light split: GREEN on top = regions WITH power that hour, RED below = regions in
// the dark. Future hours (-1) render as a faint "not yet" ghost; the current hour is outlined.
// Demoted summary keeps the avg/regions/peak numbers. Faithful port of
// web/src/components/shared/OutageTimeline.tsx (data.national.hourly = fraction of regions dark).
function OutageTimeline({ national, t }) {
  const th = useTheme();
  const hourly = Array.isArray(national.hourly) && national.hourly.length === 24 ? national.hourly : null;
  // legacy fallback: no hourly on this (cached) row → the old single number
  if (!hourly) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span style={{ fontSize: 58 * t, fontWeight: 800, letterSpacing: -2.5, lineHeight: 0.92, fontVariantNumeric: 'tabular-nums' }}>{national.hours}h {String(national.mins).padStart(2, '0')}m</span>
      </div>
    );
  }
  const present = hourly.map((v, i) => (v >= 0 ? i : -1)).filter(i => i >= 0);
  const nowHour = present.length ? present[present.length - 1] : 0;
  let peakHour = 0, peakVal = -1;
  hourly.forEach((v, i) => { if (v > peakVal) { peakVal = v; peakHour = i; } });
  const ticks = [0, 6, 12, 18, 24];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, height: 48 }}>
        {hourly.map((v, i) => {
          const isNow = i === nowHour;
          const isFuture = v < 0;
          const darkPct = isFuture ? 0 : Math.min(1, v) * 100;
          const onCount = isFuture ? 0 : national.regionsTotal - Math.round(v * national.regionsTotal);
          return (
            <div key={i} title={isFuture ? `${String(i).padStart(2, '0')}:00 · not yet` : `${String(i).padStart(2, '0')}:00 · ${onCount}/${national.regionsTotal} regions with power`}
              style={{ flex: 1, height: '100%', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                background: isFuture ? 'rgba(255,255,255,0.06)' : th.on,
                outline: isNow ? `1.5px solid ${GPT_T.panelInk}` : 'none', outlineOffset: 1 }}>
              {!isFuture && (
                <React.Fragment>
                  <div style={{ height: `${100 - darkPct}%`, background: th.on, transition: 'height .4s' }} />
                  <div style={{ height: `${darkPct}%`, background: th.out, transition: 'height .4s' }} />
                </React.Fragment>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'relative', height: 14, marginTop: 5 }}>
        {ticks.map(hh => (
          <span key={hh} style={{ position: 'absolute', left: `${(hh / 24) * 100}%`, transform: hh === 0 ? 'none' : hh === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
            fontSize: 9.5 * t, fontWeight: 700, color: GPT_T.panelInk60, fontVariantNumeric: 'tabular-nums' }}>{String(hh).padStart(2, '0')}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 9.5 * t, fontWeight: 700, color: GPT_T.panelInk60 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: th.on }} /> power</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: th.out }} /> in the dark</span>
      </div>
      <div style={{ fontSize: 11 * t, fontWeight: 600, color: GPT_T.panelInk60, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
        {national.hours}h {String(national.mins).padStart(2, '0')}m avg · {national.regionsOut}/{national.regionsTotal} out · peak {String(peakHour).padStart(2, '0')}:00
      </div>
    </div>
  );
}

function StatHero({ data, offline, onAbout, t }) {
  const th = useTheme();
  const n = data.national;
  return (
    <div style={{ background: GPT_T.panel, color: '#fff', padding: '12px 18px 16px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      <FlagBg opacity={0.18} scrim="linear-gradient(180deg, rgba(15,23,34,0.62), rgba(15,23,34,0.86))" />
      <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <Logo size={15} mono variant="compact" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {offline ? <LiveDot dark offline /> : <LiveDot dark />}
          <IconBtn icon="info" onClick={onAbout} color={GPT_T.panelInk60} size={32} label="About & methodology" />
        </div>
      </div>
      <div style={{ fontSize: 11 * t, fontWeight: 800, letterSpacing: 1.2, color: GPT_T.panelInk60, textTransform: 'uppercase' }}>Power across The Gambia today · by hour</div>
      <OutageTimeline national={n} t={t} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5 * t, fontWeight: 700, color: GPT_T.panelInk60 }}>
        <GPTIcon name="shield" size={13} color={th.on} /> Verified by {n.reports.toLocaleString()} independent reports today
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${GPT_T.panelLine}` }}>
        <Stat n={<span><span style={{ color: th.out }}>{data.national.regionsOut}</span><span style={{ color: GPT_T.panelInk60, fontSize: 14 * t, fontWeight: 600 }}>/{data.national.regionsTotal}</span></span>} l="regions out" t={t} />
        <Stat n={data.national.reports.toLocaleString()} l="reports today" t={t} />
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 * t, color: GPT_T.panelInk60, fontWeight: 600 }}>
          <GPTIcon name="clock" size={13} color={GPT_T.panelInk60} /> updated {offline ? '4m ago' : 'just now'}
        </div>
      </div>
      </div>
    </div>
  );
}
function Stat({ n, l, t }) {
  return (<div><div style={{ fontSize: 22 * t, fontWeight: 800, lineHeight: 1 }}>{n}</div><div style={{ fontSize: 11 * t, color: GPT_T.panelInk60, fontWeight: 600, marginTop: 3 }}>{l}</div></div>);
}

// BeTheLightHero — the Home centerpiece (2026-06-05): a lit-bulb "Be the light" panel + a small
// factual subline. Replaces the StatHero red/green timeline on Home (the timeline stays in Community).
// Mirrors web/src/components/shared/BeTheLightHero.tsx.
function BeTheLightHero({ data, offline, onAbout, t }) {
  const th = useTheme();
  const n = data.national;
  return (
    <div style={{ background: th.onBg, border: `1px solid ${th.onLine}`, borderRadius: 18, padding: '13px 18px 18px', position: 'relative', overflow: 'hidden' }}>
      {/* top row: eyebrow (left) + live/info (right) — stays a row so the controls keep their corner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5 * t, fontWeight: 800, letterSpacing: 1.4, color: GPT_T.ink45, textTransform: 'uppercase' }}>Tonight in The Gambia</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {offline ? <LiveDot offline /> : <LiveDot />}
          <IconBtn icon="info" onClick={onAbout} color={GPT_T.ink45} size={32} label="About & methodology" />
        </div>
      </div>
      {/* centered hero block: bulb · headline · subline · stat */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 4 }}>
        <span style={{ filter: 'drop-shadow(0 0 14px rgba(224,138,0,.38))', lineHeight: 0 }}><GPTIcon name="on" size={46 * t} color={th.on} /></span>
        <span style={{ fontSize: 30 * t, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.05, color: GPT_T.ink, marginTop: 9 }}>Be the light</span>
        <div style={{ fontSize: 12.5 * t, color: GPT_T.ink70, fontWeight: 600, marginTop: 7, lineHeight: 1.45, maxWidth: 290 }}>Most of the country is dark. Every report you add makes it impossible to ignore.</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13, paddingTop: 12, borderTop: `1px solid ${th.onLine}`, width: '100%', fontSize: 12 * t, fontWeight: 800 }}>
          <span style={{ color: th.onDeep }}>{n.regionsOut}/{n.regionsTotal}</span><span style={{ color: GPT_T.ink70, fontWeight: 700 }}>regions dark now</span>
        </div>
      </div>
    </div>
  );
}

// AppHeader — global brand bar with notch clearance. 3-zone row: brand left (spinning Logo +
// stacked GAMBIA/OUTAGE wordmark), ProfileChip absolutely centred, LangBadge + info right.
// Mirrors web/src/components/shared/AppHeader.tsx visual structure.
// NOTE: goLogoSpin keyframe is defined in Gambia Outage.html — referenced by name only here.
function AppHeader({ onProfile, onAbout, identity, profile }) {
  const lang = (window.TWEAK && window.TWEAK.lang) || 'EN';
  return (
    <div style={{
      background: GPT_T.paper,
      borderBottom: `1px solid ${GPT_T.line}`,
      paddingTop: 'calc(8px + max(env(safe-area-inset-top, 0px), 22px))',
      paddingInlineStart: 16, paddingInlineEnd: 16, paddingBottom: 9,
      flexShrink: 0, fontFamily: GPT_FONT, direction: 'ltr',
    }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 40 }}>
        {/* Brand lockup left */}
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ display: 'inline-flex', lineHeight: 0, animation: 'goLogoSpin 9s linear infinite' }}>
            <Logo size={18} variant="compact" />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.04 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: GPT_T.ink, letterSpacing: 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Gambia</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: GPT_T.ink45, letterSpacing: 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Outage</span>
          </span>
        </span>
        {/* ProfileChip centred absolutely */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <HeroProfileChip identity={identity} profile={profile} onProfile={onProfile} />
        </div>
        {/* Utilities right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* LangBadge stub — static, no dropdown */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 7, border: `1px solid ${GPT_T.line}`, background: GPT_T.wash, fontFamily: GPT_FONT, fontSize: 11, fontWeight: 800, color: GPT_T.ink }}>
            🇬🇧 EN
          </span>
          <IconBtn icon="info" onClick={onAbout} color={GPT_T.ink45} size={32} label="About" />
        </div>
      </div>
    </div>
  );
}

// StatusStrip — 7-region binary bulb row. Each region shows a lit (amber) or dark (slate) bulb
// plus its abbreviated name and a 24h report count. Sits below AppHeader on non-Home tabs.
// Mirrors web/src/components/shared/StatusStrip.tsx visual structure.
const STRIP_REGIONS = [
  { id: 'banjul',        abbr: 'BJL' },
  { id: 'kanifing',      abbr: 'KMC' },
  { id: 'west-coast',    abbr: 'WCR' },
  { id: 'north-bank',    abbr: 'NBR' },
  { id: 'lower-river',   abbr: 'LRR' },
  { id: 'central-river', abbr: 'CRR' },
  { id: 'upper-river',   abbr: 'URR' },
];
function StripBulb({ lit }) {
  const th = useTheme();
  return lit ? (
    <span style={{ filter: `drop-shadow(0 0 7px ${th.on}99)`, lineHeight: 0 }}>
      <GPTIcon name="on" size={20} color={th.on} />
    </span>
  ) : (
    <span style={{ lineHeight: 0 }}>
      <GPTIcon name="on" size={20} color={th.out} />
    </span>
  );
}
function StatusStrip({ zones, onOpenZone }) {
  const th = useTheme();
  // Build a lookup from zone id to zone data (zones may use region name or id)
  const byId = {};
  if (zones) zones.forEach(function(z) { byId[z.id] = z; byId[z.region] = z; });
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${STRIP_REGIONS.length}, 1fr)`,
      gap: 2,
      padding: '7px 8px 8px',
      background: GPT_T.paper,
      borderBottom: `1px solid ${GPT_T.line}`,
      flexShrink: 0,
      fontFamily: GPT_FONT,
    }}>
      {STRIP_REGIONS.map(function(reg) {
        const z = byId[reg.id] || byId[reg.abbr];
        const status = z ? (z.reports === 0 ? 'nodata' : sevToStatus(z.sev)) : 'nodata';
        const lit = status === 'on';
        const n24 = (z && z.reports24h) ? z.reports24h : (z && z.reports ? Math.min(z.reports, 99) : 0);
        return (
          <button key={reg.id}
            onClick={function() { onOpenZone && onOpenZone(reg.id); }}
            aria-label={`${reg.abbr} ${lit ? 'power on' : 'power out'}, ${n24} reports today`}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '1px 0', minHeight: 44, fontFamily: GPT_FONT }}>
            <StripBulb lit={lit} />
            <span style={{ fontSize: 9, fontWeight: 800, color: lit ? GPT_T.ink70 : GPT_T.ink45, letterSpacing: 0.2, lineHeight: 1 }}>{reg.abbr}</span>
            <span aria-hidden="true" style={{ fontSize: 9.5, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: n24 > 0 ? th.out : GPT_T.ink25 }}>{n24}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── "The Gambia right now" — at-a-glance national status: a horizontal row of 7 region bulbs.
// Replaces the motivational "Be the light" hero. amber lightbulb = light · dim = partial ·
// slate-off = dark · faint dashed-grey = awaiting (0 reports). Geographic order W→E. Tap → region.
const SHORT_REGION = { Banjul: 'Banjul', Kanifing: 'Kanifing', 'West Coast': 'W.Coast', 'North Bank': 'N.Bank', 'Lower River': 'L.River', 'Central River': 'C.River', 'Upper River': 'U.River' };
function RegionBulb({ status, th }) {
  if (status === 'on') return <span style={{ filter: `drop-shadow(0 0 9px ${th.on}99)`, lineHeight: 0 }}><GPTIcon name="on" size={30} color={th.on} /></span>;
  if (status === 'partial') return <span style={{ opacity: 0.5, lineHeight: 0 }}><GPTIcon name="on" size={30} color={th.on} /></span>;
  if (status === 'nodata') return <span style={{ opacity: 0.45, lineHeight: 0 }}><GPTIcon name="out" size={30} color={GPT_T.ink25} /></span>;
  return <span style={{ lineHeight: 0 }}><GPTIcon name="out" size={30} color={th.out} /></span>;
}
function RegionLightRow({ zones, onOpenZone }) {
  const th = useTheme();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${zones.length}, 1fr)`, gap: 2, marginTop: 13 }}>
      {zones.map((z) => {
        const status = z.reports === 0 ? 'nodata' : sevToStatus(z.sev);
        const dark = status === 'out' || status === 'partial';
        const label = SHORT_REGION[z.region] || z.region;
        return (
          <button key={z.id} onClick={() => onOpenZone && onOpenZone(z)} aria-label={`${z.region} — ${status}`}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '4px 0', fontFamily: GPT_FONT }}>
            <RegionBulb status={status} th={th} />
            <span style={{ fontSize: 10, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{label}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: dark ? th.onDeep : GPT_T.ink25, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dark ? fmtHM(z.todayMin) : status === 'on' ? 'on' : '—'}</span>
          </button>
        );
      })}
    </div>
  );
}
// BarRow — one region's proportional darkness bar. Three honest states:
//   lit (status 'on')     → amber sliver + "on"
//   awaiting (nodata)     → empty grey track + "— awaiting"
//   dark (out/partial)    → red fill = REAL share of today in the dark (todayMin / 24h)
// NOTE: goWave keyframe (used by Waveform) is defined in Gambia Outage.html — referenced by name only.
function BarRow({ r, onOpenZone }) {
  const th = useTheme();
  return (
    <button onClick={function() { onOpenZone && onOpenZone(r.id); }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', cursor: 'pointer', padding: '2px 0', fontFamily: GPT_FONT, textAlign: 'start' }}>
      <span style={{ width: 58, flexShrink: 0, fontSize: 12, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{r.label}</span>
      {/* Track: full day; fill = real dark share */}
      <span aria-hidden style={{ flex: 1, height: 9, borderRadius: 5, background: GPT_T.line2, overflow: 'hidden', position: 'relative' }}>
        {r.lit ? (
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: th.on, borderRadius: 5 }} />
        ) : r.awaiting ? null : (
          <span style={{ display: 'block', height: '100%', width: `${Math.max(4, r.frac * 100)}%`, background: th.out, borderRadius: 5, transition: 'width .4s' }} />
        )}
      </span>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 78, justifyContent: 'flex-end' }}>
        {r.lit ? (
          <span style={{ fontSize: 11.5, fontWeight: 800, color: th.on, fontVariantNumeric: 'tabular-nums' }}>on</span>
        ) : r.awaiting ? (
          <React.Fragment>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink25, fontVariantNumeric: 'tabular-nums' }}>—</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: GPT_T.ink45 }}>awaiting</span>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: th.outDeep, fontVariantNumeric: 'tabular-nums' }}>{fmtHM(r.todayMin)}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: GPT_T.ink45 }}>dark</span>
          </React.Fragment>
        )}
      </span>
    </button>
  );
}

// RegionBars — sorts zones worst-first by todayMin, builds row objects, renders BarRow per region.
function RegionBars({ zones, onOpenZone }) {
  var rows = (zones ? zones.slice() : [])
    .sort(function(a, b) { return b.todayMin - a.todayMin; })
    .map(function(z) {
      var status = z.reports === 0 ? 'nodata' : sevToStatus(z.sev);
      return {
        id: z.id,
        label: SHORT_REGION[z.region] || z.region,
        status: status,
        todayMin: z.todayMin,
        lit: z.reports > 0 && status === 'on',
        awaiting: z.reports === 0,
        frac: z.todayMin / (24 * 60),
      };
    });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
      {rows.map(function(r) { return <BarRow key={r.id} r={r} onOpenZone={onOpenZone} />; })}
    </div>
  );
}

// RightNowHero — clean LIGHT header: logo + avatar/rank chip (→ Profile) + WhatsApp + LIVE + info,
// then "The Gambia right now · updated …" + the 7-region lightbulb row.
// Header surfacing (web AppHeader/ProfileChip): tap the avatar chip → the "You" tab; the rank name
// shows only once the device has XP (a fresh user reads "Observer").
function HeroProfileChip({ identity, profile, onProfile }) {
  const rank = profile && profile.xp > 0 ? rankFor(profile.xp).label.split(' ')[0] : 'Observer';
  const name = identity && identity.nickname ? identity.nickname : rank;
  return (
    <button onClick={onProfile} aria-label={`Your profile — ${name}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px 2px 2px', borderRadius: 999, cursor: 'pointer',
        background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, fontFamily: GPT_FONT, fontSize: 10, fontWeight: 800, color: GPT_T.ink, flexShrink: 0 }}>
      <PseudoAvatar id={identity ? identity.avatarId : 'you'} name={name} size={22} />
      {name}
    </button>
  );
}
// RightNowHero v2 — BARS-ONLY section. AppHeader now owns Logo, profile chip, WhatsApp + info.
// Shows: estimated-baseline disclaimer + "The Gambia right now" heading + LIVE dot +
// optional dark-neighbours solidarity line + RegionBars (proportional darkness bars).
function RightNowHero({ data, offline, onOpenZone }) {
  const th = useTheme();
  const darkNeighbours = data.zones ? data.zones.reduce(function(s, z) {
    return s + (sevToStatus(z.sev) !== 'on' ? (z.confirms || 0) : 0);
  }, 0) : 0;
  return (
    <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, paddingTop: 14, paddingInlineStart: 16, paddingInlineEnd: 16, paddingBottom: 15, flexShrink: 0, fontFamily: GPT_FONT }}>
      {/* Estimated-baseline disclaimer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', background: th.onBg, border: `1px solid ${th.onLine}`, borderRadius: 11 }}>
        <span style={{ lineHeight: 0, flexShrink: 0 }}><GPTIcon name="on" size={16} color={th.on} /></span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink70, lineHeight: 1.35 }}>Where no reports have arrived today, duration is an estimate based on recent history.</span>
      </div>
      {/* Section title + LIVE dot */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.4 }}>The Gambia right now</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {offline ? <LiveDot offline /> : <LiveDot />}
          <span style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45 }}>updated just now</span>
        </span>
      </div>
      {/* Dark-neighbours solidarity */}
      {darkNeighbours > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, fontWeight: 700, color: th.outDeep }}>
          <span aria-hidden>🤝</span>
          <span>{darkNeighbours} neighbours reporting darkness</span>
        </div>
      )}
      <RegionBars zones={data.zones} onOpenZone={onOpenZone} />
    </div>
  );
}

// Thumb dock — the two core actions, always reachable.
// Props: onReport, stillDark = null | { zoneName, onConfirm }, blocked = false
// When blocked: dims buttons + shows geo-gate note (outside The Gambia).
// When stillDark provided (and not blocked): shows a reconfirm "Still dark" button.
function ThumbDock({ onReport, stillDark, blocked }) {
  const th = useTheme();
  const base = { borderRadius: 16, border: 'none', fontFamily: GPT_FONT, fontWeight: 800,
    cursor: blocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 };
  return (
    <div style={{ padding: '7px 14px', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, boxShadow: '0 -6px 20px rgba(15,23,34,0.05)' }}>
      <div style={{ display: 'flex', gap: 10, opacity: blocked ? 0.45 : 1 }}>
        <button onClick={() => !blocked && onReport('out')} disabled={blocked}
          style={{ ...base, flex: 1.6, minHeight: 44, background: th.out, color: '#fff', fontSize: 14.5, boxShadow: blocked ? 'none' : `0 5px 14px ${th.out}55` }}>
          <GPTIcon name="out" size={18} color="#fff" strokeColor={th.out} /> POWER OUT
        </button>
        <button onClick={() => !blocked && onReport('on')} disabled={blocked}
          style={{ ...base, flex: 1, minHeight: 44, background: th.onBg, color: th.onDeep, border: `2px solid ${th.onLine}`, fontSize: 12.5, gap: 6, cursor: blocked ? 'not-allowed' : 'pointer' }}>
          <GPTIcon name="on" size={16} color={th.on} /> POWER BACK
        </button>
      </div>
      {blocked && (
        <div style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink45, textAlign: 'center', lineHeight: 1.35 }}>
          Reporting is only available from within The Gambia.
        </div>
      )}
      {!blocked && stillDark && (
        <button onClick={stillDark.onConfirm}
          style={{ ...base, width: '100%', minHeight: 40, gap: 8, background: GPT_T.wash, color: GPT_T.ink70, border: `1.5px solid ${GPT_T.line}`, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
          <GPTIcon name="out" size={16} color={th.out} strokeColor={th.out} />
          Still dark · Ankum si · {stillDark.zoneName}
        </button>
      )}
    </div>
  );
}

// Map control chip
function MapControls({ saver, onSaver, onList, viewLabel = 'List' }) {
  const chip = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 13px', borderRadius: 11,
    background: active ? GPT_T.ink : 'rgba(255,255,255,0.96)', color: active ? '#fff' : GPT_T.ink70,
    border: `1px solid ${active ? GPT_T.ink : GPT_T.line}`, fontFamily: GPT_FONT, fontSize: 13, fontWeight: 700,
    boxShadow: '0 2px 8px rgba(15,23,34,0.10)', cursor: 'pointer' });
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onList} style={chip(false)}><GPTIcon name="list" size={16} color={GPT_T.ink70} /> {viewLabel}</button>
      <button onClick={onSaver} style={chip(saver)} aria-pressed={saver}><GPTIcon name="saver" size={16} color={saver ? '#fff' : GPT_T.ink70} /> Data-saver</button>
    </div>
  );
}

// List row with sparkline
function Sparkline({ data, color, w = 64, h = 26 }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={pts[pts.length - 1].split(',')[1]} r="2.6" fill={color} />
    </svg>
  );
}

function ListRow({ zone, onClick, rank }) {
  const th = useTheme();
  const status = sevToStatus(zone.sev);
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: GPT_T.paper, border: 'none', borderBottom: `1px solid ${GPT_T.line2}`,
      padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer', minHeight: 64, fontFamily: GPT_FONT }}>
      <div style={{ width: 30, fontSize: 13, fontWeight: 800, color: GPT_T.ink25, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{String(rank).padStart(2, '0')}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2 }}>{zone.name}</div>
        <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2 }}>{zone.region} · {zone.reports} reports</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ marginBottom: 5, display: 'flex', justifyContent: 'flex-end' }}><StatusPill status={status} size="sm" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <Sparkline data={zone.week} color={th[status]} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, fontVariantNumeric: 'tabular-nums' }}>{fmtHM(zone.todayMin)}</span>
        </div>
      </div>
      <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
    </button>
  );
}

// 7-day bar chart (zone detail)
function BarChart7({ data, days, color }) {
  const th = useTheme();
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
      {data.map((v, i) => {
        const isToday = i === data.length - 1;
        const sev = v >= 9 ? 'out' : v >= 5 ? 'partial' : 'on';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: GPT_T.ink70, fontVariantNumeric: 'tabular-nums' }}>{v}h</span>
            <div style={{ width: '100%', height: `${(v / max) * 100}%`, minHeight: 4, borderRadius: '5px 5px 0 0',
              background: th[sev], opacity: isToday ? 1 : 0.62, outline: isToday ? `2px solid ${GPT_T.ink}` : 'none', outlineOffset: 1 }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: isToday ? GPT_T.ink : GPT_T.ink45 }}>{days[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// Skeleton shimmer
function Skeleton({ w = '100%', h = 16, r = 8, style = {} }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#EDF0F3 25%,#E2E7EC 37%,#EDF0F3 63%)', backgroundSize: '400% 100%', animation: 'gptShimmer 1.4s ease infinite', ...style }} />;
}

// Toast / confirmation
function Toast({ children, tone = 'on', onClose }) {
  const th = useTheme();
  const c = tone === 'offline' ? GPT_T.ink : th[tone] || th.on;
  return (
    <div style={{ position: 'absolute', left: 14, right: 14, bottom: 16, zIndex: 80,
      background: GPT_T.ink, color: '#fff', borderRadius: 16, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 16px 40px rgba(15,23,34,0.4)', animation: 'gptToastIn .35s cubic-bezier(.2,.8,.3,1)', fontFamily: GPT_FONT }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <GPTIcon name={tone === 'offline' ? 'cloud-off' : 'check'} size={20} color="#fff" />
      </span>
      <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{children}</div>
      {onClose && <IconBtn icon="close" onClick={onClose} color={GPT_T.panelInk60} size={30} label="Dismiss" />}
    </div>
  );
}

// Segmented toggle (map / list)
function SegToggle({ value, options, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: GPT_T.line2, borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: value === o.v ? GPT_T.paper : 'transparent', color: value === o.v ? GPT_T.ink : GPT_T.ink45,
          fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, boxShadow: value === o.v ? '0 1px 4px rgba(15,23,34,0.12)' : 'none' }}>
          <GPTIcon name={o.icon} size={16} color={value === o.v ? GPT_T.ink : GPT_T.ink45} /> {o.label}
        </button>
      ))}
    </div>
  );
}

function OfflineBanner({ pending }) {
  return (
    <div style={{ background: '#2A2520', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 9, fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
      <GPTIcon name="cloud-off" size={16} color="#F0C24B" />
      <span style={{ flex: 1 }}>You're offline. {pending > 0 ? `${pending} report${pending > 1 ? 's' : ''} saved — will send when back online.` : 'Showing last synced data.'}</span>
    </div>
  );
}

// BottomNav — persistent 6-section navigation: Home · Map · News · Community · Talk · You.
// Line-style SVG glyphs (no emoji) — faithful to web/src/components/shared/BottomNav.tsx.
// Highlights a tab only when `active` matches one of the six tab ids; on drill-down routes
// nothing is highlighted, which is correct. Sits BELOW the report dock.
function NavGlyph({ name, color }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block' } };
  switch (name) {
    case 'home':
      return (<svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>);
    case 'map':
      return (<svg {...common}><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
    case 'news':
      return (<svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h7M7 12h10M7 16h10" /></svg>);
    case 'community':
      return (<svg {...common}><circle cx="9" cy="8" r="3" /><path d="M15.5 6.2a3 3 0 0 1 0 5.6" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M17 15c2.5.4 4 2.2 4 5" /></svg>);
    case 'talk':
      return (<svg {...common}><path d="M21 14a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9.5h8M8 12.5h5" /></svg>);
    case 'profile':
      return (<svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></svg>);
    default: return null;
  }
}
function BottomNav({ active, onNav, pendingWaves, nameClaimed }) {
  const th = useTheme();
  const tabs = [
    { id: 'home',      label: 'Home' },
    { id: 'map',       label: 'Map' },
    { id: 'news',      label: 'News' },
    { id: 'community', label: 'Community' },
    { id: 'talk',      label: 'Talk' },
    { id: 'profile',   label: 'You' },
  ];
  const pending = pendingWaves || 0;
  const nameDot = nameClaimed === false;
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, padding: '6px 2px calc(6px + env(safe-area-inset-bottom))', flexShrink: 0, boxShadow: '0 -4px 16px rgba(15,23,34,0.04)' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 340 }}>
        {tabs.map((tb) => {
          const on = tb.id === active;
          const color = on ? GPT_T.ink : GPT_T.ink45;
          const badge = tb.id === 'profile' && pending > 0;
          return (
            <button key={tb.id} onClick={() => onNav && onNav(tb.id)} aria-label={badge ? `${tb.label} (${pending} new)` : tb.label} aria-current={on ? 'page' : undefined}
              style={{ flex: 1, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '3px 0', fontFamily: GPT_FONT }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <NavGlyph name={tb.id} color={color} />
                {badge && (
                  <span style={{ position: 'absolute', top: -3, right: -5, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 999, background: FLAG.red, color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${GPT_T.paper}` }}>
                    {pending > 9 ? '9+' : pending}
                  </span>
                )}
                {!badge && tb.id === 'profile' && nameDot && (
                  <span style={{ position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 999, background: th.on, border: `1.5px solid ${GPT_T.paper}` }} />
                )}
              </span>
              <span style={{ fontSize: 9.5, fontWeight: on ? 800 : 600, color, letterSpacing: 0.1, whiteSpace: 'nowrap' }}>{tb.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── WhatsAppButton — reusable one-tap WhatsApp share (headers + splash). Shares a message whose link
// is EXACTLY https://gambiaoutage.com. WhatsApp green #25D366 is the ONE deliberate non-token colour.
// Mirrors web/src/components/shared/WhatsAppButton.tsx ('icon' for header clusters, 'pill' = full CTA).
const WA_GREEN = '#25D366';
function WhatsAppGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24-1.52 0-3.01-.41-4.3-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.18 8.18 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24zm4.52 9.83c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.48-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31s-.87.85-.87 2.07c0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}
function WhatsAppButton({ variant = 'icon', size = 22, onActivate }) {
  const onClick = (e) => { e.stopPropagation(); onActivate && onActivate(); window.open('https://wa.me/?text=' + encodeURIComponent('See where the power is out in The Gambia — https://gambiaoutage.com'), '_blank'); };
  if (variant === 'pill') {
    return (
      <button type="button" onClick={onClick} aria-label="Share on WhatsApp"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', background: WA_GREEN, color: '#fff', borderRadius: 999,
          padding: '11px 20px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14.5, cursor: 'pointer', boxShadow: '0 6px 18px rgba(37,211,102,.32)' }}>
        <WhatsAppGlyph size={19} /> Share on WhatsApp
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label="Share on WhatsApp"
      style={{ border: 'none', background: 'transparent', padding: 5, cursor: 'pointer', color: WA_GREEN, lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}>
      <WhatsAppGlyph size={size} />
    </button>
  );
}

// Waveform — 16 animated bars for the RadioPlayer strip (plays indicator).
// The goWave keyframe is defined in Gambia Outage.html — referenced by name only here.
const WAVE_BARS = 16;
function Waveform({ color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 13, flexShrink: 0 }} aria-hidden>
      {Array.from({ length: WAVE_BARS }).map(function(_, i) {
        return (
          <span key={i} style={{ width: 2, height: 13, background: color, borderRadius: 1, transformOrigin: 'center', animation: 'goWave 1.1s ease-in-out ' + (i * 0.07).toFixed(2) + 's infinite' }} />
        );
      })}
    </span>
  );
}

// RadioPlayer — slim strip above BottomNav (below ThumbDock on isTab routes).
// Status driven by window.TWEAK.radio ('idle' | 'playing' | 'loading') — no real audio.
// Uses MOCK_STATIONS (3-station stub — no import from shipped constants) as a prototype stub.
const MOCK_STATIONS = [
  { name: 'GRTS Radio', sub: 'Gambia Radio & TV' },
  { name: 'Teranga FM', sub: 'Senegalese hits' },
  { name: 'FIP', sub: 'Paris world music' },
];
function RadioPlayer() {
  const th = useTheme();
  const [stationIdx, setStationIdx] = React.useState(0);
  const [picker, setPicker] = React.useState(false);
  const status = (window.TWEAK && window.TWEAK.radio) || 'idle';
  const active = status === 'playing' || status === 'loading';
  const station = MOCK_STATIONS[stationIdx] || MOCK_STATIONS[0];
  return (
    <div style={{ background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, fontFamily: GPT_FONT, minHeight: 44 }}>
      {/* Play/pause button */}
      <button onClick={function() {}} style={{ width: 34, height: 34, borderRadius: 11, border: 'none', background: active ? FLAG.green : GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <GPTIcon name={active ? 'pause' : 'play'} size={18} color={active ? '#fff' : GPT_T.ink70} />
      </button>
      {/* Station name + track sub-line */}
      <button onClick={function() { setPicker(true); }} style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'start', padding: 0, fontFamily: GPT_FONT }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
          {active ? <Waveform color={FLAG.green} /> : null}
          <span style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status === 'loading' ? 'Connecting…' : station.sub}</span>
        </div>
      </button>
      {/* Mock station picker */}
      {picker && (
        <React.Fragment>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={function() { setPicker(false); }} />
          <div style={{ position: 'absolute', bottom: 54, left: 12, right: 12, zIndex: 91, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 16, boxShadow: '0 8px 28px rgba(15,23,34,0.14)', overflow: 'hidden' }}>
            {MOCK_STATIONS.map(function(s, idx) {
              return (
                <button key={s.name} onClick={function() { setStationIdx(idx); setPicker(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', borderBottom: idx < MOCK_STATIONS.length - 1 ? `1px solid ${GPT_T.line}` : 'none', background: idx === stationIdx ? GPT_T.wash : GPT_T.paper, cursor: 'pointer', fontFamily: GPT_FONT, textAlign: 'start' }}>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 2 }}>{s.sub}</div>
                  </span>
                  {idx === stationIdx && <GPTIcon name="check" size={16} color={FLAG.green} />}
                </button>
              );
            })}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

Object.assign(window, { fmtHM, IconBtn, StatHero, BeTheLightHero, RightNowHero, RegionLightRow, BottomNav, NavGlyph, WhatsAppButton, WhatsAppGlyph, WA_GREEN, OutageTimeline, SeverityGauge, ThumbDock, MapControls, ListRow, Sparkline, BarChart7, Skeleton, Toast, SegToggle, OfflineBanner, AppHeader, StatusStrip, BarRow, RegionBars, Waveform, RadioPlayer });
