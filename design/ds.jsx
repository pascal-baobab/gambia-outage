// ds.jsx — Power Watch Gambia · design-system primitives
// System-font only (no downloads), AA contrast, sunlight-legible status colours.
// Exports to window: GPT_T, GPT_FONT, THEMES, ThemeCtx, useTheme,
//   GPTIcon, StatusPill, LiveDot, GambiaMap, Logo, PhoneShell, GAMBIA_ZONES

const GPT_FONT =
'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ── Neutrals (constant across themes) ────────────────────────────────────
const GPT_T = {
  ink: '#11161C', ink70: '#3B454F', ink45: '#69737E', ink25: '#9AA4AE',
  line: '#E4E8EC', line2: '#EEF1F4', paper: '#FFFFFF', wash: '#F6F8FA',
  panel: '#0F1722', panelLine: '#27313F', panelInk: '#F4F7FA', panelInk60: '#9DAAB8',
  paper2: '#F4F1EA', // warm editorial surface (from direction C)
  keyDigit: '#EAEEF2', // calculator digit key background (0–9, decimal, sign) — LOCKED 2026-06-10
  keyOp: '#FFE5B4',    // calculator operator key background (÷ × − +) un-pressed state — LOCKED 2026-06-10
  tileAnchor: '#F0F4F8' // Photo-Crush tile base — game tile background, SVG icon on top — LOCKED 2026-06-10
};

// ── Status themes — swappable via Tweaks (standard / sunlight high-contrast)
// Bulb semantics (2026-06-05 re-skin): `on` = LIGHT (warm amber, lit bulb) · `out`/`partial` = DARK
// (unlit bulb) · grey AWAITING = zero reports. Moves away from the red/green semaphore to a lamp on/off
// reading. KEYS unchanged so StatusPill + every screen stay untouched.
const THEMES = {
  standard: {
    out: '#2C3743', outDeep: '#161E27', outBg: '#E7EBEF', outLine: '#C2CAD3',
    partial: '#3C4856', partialDeep: '#202A35', partialBg: '#E9EDF1', partialLine: '#C7CFD8',
    on: '#E08A00', onDeep: '#8A5400', onBg: '#FFF3D6', onLine: '#F2CF86',
    // AWAITING (zero reports — evidence gate, NO power claim): neutral grey
    nodata: '#8A94A6', nodataDeep: '#5A6271', nodataBg: '#EEF1F5', nodataLine: '#D5DBE3',
    // estimated dark (launch baseline) — muted, deliberately distinct from confirmed
    estimated: '#4A5260', estimatedDeep: '#2A303A', estimatedBg: '#E8EAEE', estimatedLine: '#C8CDD6'
  },
  sunlight: {
    out: '#212A34', outDeep: '#0E141B', outBg: '#DFE4EA', outLine: '#AEB8C2',
    partial: '#2E3845', partialDeep: '#161E27', partialBg: '#E1E6EC', partialLine: '#B6C0CB',
    on: '#B86E00', onDeep: '#7A4A00', onBg: '#FBE9C2', onLine: '#E6BC6B',
    nodata: '#5A6271', nodataDeep: '#3A404B', nodataBg: '#E4E8EE', nodataLine: '#B8C0CC',
    estimated: '#39424E', estimatedDeep: '#1C232C', estimatedBg: '#DEE2E8', estimatedLine: '#AEB7C2'
  }
};
const ThemeCtx = React.createContext(THEMES.standard);
const useTheme = () => React.useContext(ThemeCtx);

// ── Gambian flag ─────────────────────────────────────────────────────────
// Bands red:white:blue:white:green = 6:1:4:1:6 · red=sun/savannah, blue=River Gambia, green=land
const FLAG = { red: '#CE1126', white: '#FFFFFF', blue: '#0E50A0', blueDeep: '#0A3B78', green: '#3A7728', greenDeep: '#2C5C1E' };

// ── Accent palette (ported from web/src/lib/tokens.ts — single source of truth) ─────────────
// Ported in full to prevent ReferenceError on ACCENT.star/live/etc in prototypes (Plan 02 2026-06-10).
// tile4 + tile5 are new light-surface game-tile accents (approved 2026-06-10 VISUAL-DIRECTION.md).
const ACCENT = {
  star:      '#FFD700', // XP / honors gold (AppHeader sparkles, ProfileChip)
  live:      '#E0245E', // LIVE / heart / notification badge dot (unread indicator)
  danger:    '#E5484D', // destructive actions (admin bar, block/delete affordances)
  facebook:  '#1877F2', // Facebook brand
  whatsapp:  '#25D366', // WhatsApp brand
  amber:     '#d97706', // Ambassador amber (badge card on Profile/Ambassador screens)
  amberDeep: '#b45309', // Ambassador amber deep
  amberBg:   '#fef3c7', // Ambassador amber background
  tile4:     '#A855F7', // Photo-Crush game tile 4 accent — purple (baobab/mysticism) — LOCKED 2026-06-10
  tile5:     '#0EA5E9', // Photo-Crush game tile 5 accent — sky blue (River Gambia) — LOCKED 2026-06-10
};
window.ACCENT = ACCENT;

// Shaded flag wash for dark surfaces — subtle tricolour, faded with a scrim on top
function FlagBg({ opacity = 0.16, scrim = 'rgba(15,23,34,0.74)', angle = 0 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
      <div style={{ position: 'absolute', inset: '-20%', display: 'flex', flexDirection: 'column', opacity, transform: angle ? `rotate(${angle}deg) scale(1.4)` : 'none' }}>
        <div style={{ flex: 6, background: FLAG.red }} />
        <div style={{ flex: 1, background: FLAG.white }} />
        <div style={{ flex: 4, background: FLAG.blue }} />
        <div style={{ flex: 1, background: FLAG.white }} />
        <div style={{ flex: 6, background: FLAG.green }} />
      </div>
      {scrim && <div style={{ position: 'absolute', inset: 0, background: scrim }} />}
    </div>);

}

// Thin horizontal tricolour rule (red·blue·green with white hairlines)
function FlagRule({ height = 4, radius = 0, style = {} }) {
  return (
    <div style={{ display: 'flex', height, borderRadius: radius, overflow: 'hidden', ...style }} aria-hidden="true">
      <div style={{ flex: 6, background: FLAG.red }} />
      <div style={{ flex: 0.5, background: FLAG.white }} />
      <div style={{ flex: 4, background: FLAG.blue }} />
      <div style={{ flex: 0.5, background: FLAG.white }} />
      <div style={{ flex: 6, background: FLAG.green }} />
    </div>);

}

// ── Icons (distinct SHAPES per status for colour-blind safety) ───────────
function GPTIcon({ name, size = 22, color = 'currentColor', strokeColor }) {
  const sw = { width: size, height: size, display: 'block', flexShrink: 0 };
  switch (name) {
    case 'out': // unlit bulb = DARK (power out)
    case 'partial': // unlit bulb = DARK (under-confirmed open outage — still off this phase)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M10.1 14.1c0-1.5-1.3-2.2-1.3-3.7a3.2 3.2 0 0 1 6.4 0c0 1.5-1.3 2.2-1.3 3.7" fill="none" stroke={color} strokeWidth="1.1" opacity=".5" />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} />
          <path d="M10.4 21.6h3.2c-.3.85-.85 1.3-1.6 1.3s-1.3-.45-1.6-1.3Z" fill={color} />
        </svg>);

    case 'nodata': // dashed bulb = AWAITING reports (NO power claim)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2.4 2.2" />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} opacity=".7" />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} opacity=".7" />
        </svg>);

    case 'estimated': // unlit bulb + crescent = estimated dark (load-shedding baseline)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill="none" stroke={color} strokeWidth="1.6" />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} />
          <path d="M10.4 21.6h3.2c-.3.85-.85 1.3-1.6 1.3s-1.3-.45-1.6-1.3Z" fill={color} />
          <path d="M17.6 4.8a2.5 2.5 0 1 0 1.8 3.1 3.1 3.1 0 0 1-1.8-3.1Z" fill={color} />
        </svg>);

    case 'on': // lit bulb = LIGHT (power on)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill={color} />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} />
          <path d="M10.4 21.6h3.2c-.3.85-.85 1.3-1.6 1.3s-1.3-.45-1.6-1.3Z" fill={color} />
          <g stroke={color} strokeWidth="1.3" strokeLinecap="round">
            <path d="M12 .8v1M3.7 4.3l.7.7M20.3 4.3l-.7.7M.9 12h1.1M21.9 12H23" />
          </g>
        </svg>);

    case 'list':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="3.5" cy="6" r="1.5" fill={color} /><circle cx="3.5" cy="12" r="1.5" fill={color} /><circle cx="3.5" cy="18" r="1.5" fill={color} />
        </svg>);

    case 'map':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 4v13M15 6.5v13" stroke={color} strokeWidth="2" />
        </svg>);

    case 'saver': // data-saver / leaf-bolt
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M13 2 4 13.6h6.2L9 22l9.4-11.2H12L13 2Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>);

    case 'pin':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z" fill={color} />
          <circle cx="12" cy="10" r="2.6" fill="#fff" />
        </svg>);

    case 'share':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <circle cx="6" cy="12" r="2.6" fill={color} /><circle cx="18" cy="5.5" r="2.6" fill={color} /><circle cx="18" cy="18.5" r="2.6" fill={color} />
          <path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" stroke={color} strokeWidth="1.8" />
        </svg>);

    case 'chevron':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'back':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="m15 5-7 7 7 7" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'check':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="m4 12.5 5 5 11-12" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'close':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" /></svg>;
    case 'search':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke={color} strokeWidth="2" /><path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
    case 'cloud-off':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.5 8.2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 4l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
    case 'info':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" /><rect x="11" y="10.5" width="2" height="6.5" rx="1" fill={color} /><circle cx="12" cy="7.5" r="1.3" fill={color} /></svg>;
    case 'clock':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" /><path d="M12 7v5.3l3.4 2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'lock':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill={color} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke={color} strokeWidth="2" /></svg>;
    case 'shield':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M12 3 5 5.6v5.2c0 4.3 2.9 7.6 7 9.2 4.1-1.6 7-4.9 7-9.2V5.6L12 3Z" fill={color} /><path d="m8.6 12 2.4 2.4 4.4-4.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'bell':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" fill={color} /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
    case 'bell-off':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M6 9a6 6 0 0 1 9.6-4.8M18 12c0 3 2 4 2 4H7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M3 3l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
    default:return null;
  }
}

// ── Status pill (icon + label + colour, never colour alone) ─────────────
// Display superset: 'nodata' = AWAITING (zero reports — never a power claim), 'estimated' = launch
// blackout baseline. Mirrors web/src/lib/tokens.ts DISPLAY_STATUS_LABEL.
const STATUS_LABEL = { out: 'DARK', partial: 'DARK', on: 'LIGHT', nodata: 'AWAITING', estimated: 'DARK · EST.' };
function StatusPill({ status, size = 'md', solid = false, label }) {
  const th = useTheme();
  const c = th[status],deep = th[status + 'Deep'],bg = th[status + 'Bg'],line = th[status + 'Line'];
  const pad = size === 'sm' ? '4px 9px 4px 7px' : size === 'lg' ? '8px 15px 8px 12px' : '5px 11px 5px 8px';
  const fs = size === 'sm' ? 11.5 : size === 'lg' ? 15 : 13;
  const ic = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'sm' ? 5 : 7, padding: pad, borderRadius: 999,
      background: solid ? c : bg, border: `1.5px solid ${solid ? c : line}`, color: solid ? '#fff' : deep,
      fontFamily: GPT_FONT, fontWeight: 800, fontSize: fs, letterSpacing: 0.3, lineHeight: 1, whiteSpace: 'nowrap' }}>
      <GPTIcon name={status} size={ic} color={solid ? '#fff' : c} strokeColor={solid ? c : '#fff'} />
      {label || STATUS_LABEL[status]}
    </span>);

}

// ── Live indicator ───────────────────────────────────────────────────────
function LiveDot({ color, label = 'LIVE', dark = false, sub, offline = false }) {
  const th = useTheme();
  const c = offline ? GPT_T.ink45 : color || th.out;
  if (offline) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: GPT_FONT }}>
        <GPTIcon name="cloud-off" size={15} color={dark ? GPT_T.panelInk60 : GPT_T.ink45} />
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, color: dark ? GPT_T.panelInk60 : GPT_T.ink45 }}>OFFLINE</span>
      </span>);

  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: GPT_FONT }}>
      <span style={{ position: 'relative', width: 9, height: 9, flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: c, animation: 'gptPulse 2s ease-out infinite' }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: c }} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: dark ? '#fff' : GPT_T.ink }}>{label}</span>
      {sub && <span style={{ fontSize: 11.5, fontWeight: 600, color: dark ? GPT_T.panelInk60 : GPT_T.ink45 }}>{sub}</span>}
    </span>);

}

// ── Trademark — POWER WATCH ──────────────────────────────────────────────
// Mark: the circular Gambia Outage badge (C∞O lightning + power button).
function LogoMark({ size = 30 }) {
  return (
    <img src="assets/logo-circle.png" alt="Gambia Outage" width={size} height={size}
    style={{ display: 'block', borderRadius: '50%', flexShrink: 0, objectFit: 'cover', width: "50px", height: "50px" }} />);

}
function Logo({ size = 18, mono = false, variant = 'full' }) {
  const ink = mono ? '#fff' : GPT_T.ink;
  const sub = mono ? GPT_T.panelInk60 : GPT_T.ink45;
  if (variant === 'mark') return <LogoMark size={size} />;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.46, fontFamily: GPT_FONT }}>
      <LogoMark size={size * 1.7} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: size, fontWeight: 900, color: ink, letterSpacing: size > 20 ? -0.4 : 0.2, textTransform: 'uppercase' }}>
          Gambia <span style={{ color: ink, opacity: 0.6 }}>Outage</span>
        </span>
        {variant === 'full' &&
        <span style={{ display: 'flex', alignItems: 'center', gap: size * 0.34, marginTop: size * 0.2 }}>
            <FlagRule height={Math.max(3, size * 0.18)} radius={1} style={{ width: size * 1.5 }} />
            <span style={{ fontSize: size * 0.5, fontWeight: 800, color: sub, letterSpacing: 1.6, textTransform: 'uppercase' }}>
              Report the Dark
            </span>
          </span>
        }
      </span>
    </span>);

}

// ── Stylized Gambia heatmap (no tiles, pure SVG, interactive) ────────────
const GAMBIA_ZONES = [
{ id: 'banjul', name: 'Banjul', region: 'Banjul', x: 38, y: 84, r: 15, sev: 0.95 },
{ id: 'kanifing', name: 'Kanifing', region: 'Kanifing', x: 58, y: 95, r: 18, sev: 0.90 },
{ id: 'brikama', name: 'Brikama', region: 'West Coast', x: 80, y: 108, r: 20, sev: 0.78 },
{ id: 'kerewan', name: 'Kerewan', region: 'North Bank', x: 124, y: 64, r: 18, sev: 0.50 },
{ id: 'mansakonko', name: 'Mansa Konko', region: 'Lower River', x: 156, y: 104, r: 17, sev: 0.40 },
{ id: 'janjanbureh', name: 'Janjanbureh', region: 'Central River', x: 238, y: 84, r: 19, sev: 0.80 },
{ id: 'basse', name: 'Basse', region: 'Upper River', x: 322, y: 80, r: 18, sev: 0.62 }];

function sevToStatus(sev) {return sev >= 0.66 ? 'out' : sev >= 0.38 ? 'partial' : 'on';}

function GambiaMap({ mode = 'blob', bg = '#E8EEF1', land = '#FBFCFD', zones = GAMBIA_ZONES,
  onZone, activeZone, faded = false }) {
  const th = useTheme();
  const [hover, setHover] = React.useState(null);
  const sevColor = (sev) => th[sevToStatus(sev)];
  const country =
  'M14 72 C 40 60 64 64 96 72 C 150 84 200 64 252 70 C 296 75 330 68 348 80 ' +
  'C 354 84 354 90 348 94 C 330 104 296 100 252 96 C 200 92 150 110 96 104 ' +
  'C 64 100 40 112 16 98 C 8 92 8 80 14 72 Z';
  const river = 'M16 88 C 50 84 80 92 120 86 C 170 79 210 92 252 86 C 296 80 330 88 348 85';
  return (
    <svg viewBox="0 0 360 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
    style={{ display: 'block', background: bg }} aria-label="Heatmap of current power outages across The Gambia">
      <defs>
        {zones.map((z) =>
        <radialGradient id={`g-${z.id}`} key={z.id}>
            <stop offset="0%" stopColor={sevColor(z.sev)} stopOpacity={faded ? 0.34 : 0.92} />
            <stop offset="50%" stopColor={sevColor(z.sev)} stopOpacity={faded ? 0.15 : 0.45} />
            <stop offset="100%" stopColor={sevColor(z.sev)} stopOpacity="0" />
          </radialGradient>
        )}
        <clipPath id="gambia-clip"><path d={country} /></clipPath>
      </defs>
      <rect x="0" y="0" width="360" height="150" fill={bg} />
      <path d={country} fill={land} stroke="#C9D4DA" strokeWidth="1.2" />
      <g clipPath="url(#gambia-clip)">
        <path d={river} fill="none" stroke={FLAG.blue} strokeWidth="3" opacity="0.42" />
        <path d={river} fill="none" stroke={FLAG.blue} strokeWidth="1.2" opacity="0.7" />
        {mode === 'blob' && zones.map((z) =>
        <circle key={z.id} cx={z.x} cy={z.y} r={z.r * 1.45} fill={`url(#g-${z.id})`} />
        )}
        {mode === 'dot' && zones.map((z) => {
          const n = Math.round(5 + z.sev * 14);
          return Array.from({ length: n }).map((_, i) => {
            const a = i * 137.5 * Math.PI / 180;
            const rr = z.r * 1.05 * Math.sqrt(i / n);
            return <circle key={z.id + i} cx={z.x + Math.cos(a) * rr} cy={z.y + Math.sin(a) * rr}
            r={1.5 + z.sev * 1.4} fill={sevColor(z.sev)} opacity={faded ? 0.45 : 0.85} />;
          });
        })}
      </g>
      {/* centroid markers + interactive hotspots */}
      {zones.map((z) => {
        const act = activeZone === z.id || hover === z.id;
        return (
          <g key={'h' + z.id} style={{ cursor: onZone ? 'pointer' : 'default' }}
          onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)}
          onClick={() => onZone && onZone(z)}>
            {act && <circle cx={z.x} cy={z.y} r={11} fill="none" stroke={sevColor(z.sev)} strokeWidth="2" opacity="0.9" />}
            <circle cx={z.x} cy={z.y} r={act ? 4.6 : 3.4} fill={sevColor(z.sev)} stroke="#fff" strokeWidth="1.6" />
            {act &&
            <g>
                <rect x={z.x - 30} y={z.y - 26} width="60" height="15" rx="7.5" fill={GPT_T.ink} />
                <text x={z.x} y={z.y - 15.5} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff" fontFamily={GPT_FONT}>{z.name}</text>
              </g>
            }
            {onZone && <circle cx={z.x} cy={z.y} r={16} fill="transparent" />}
          </g>);

      })}
    </svg>);

}

// ── Phone shell (own status bar so header colour bleeds to the very top) ─
function PhoneShell({ children, width = 384, height = 812, statusBg = '#0F1722', statusTone = 'dark' }) {
  const lightIcons = statusTone === 'dark';
  const c = lightIcons ? '#fff' : GPT_T.ink;
  return (
    <div style={{ width, height, borderRadius: 34, position: 'relative', background: '#0a0c0f',
      border: '7px solid #15171B', boxSizing: 'border-box', boxShadow: '0 30px 70px rgba(15,23,34,0.28)', fontFamily: GPT_FONT }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 27, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: GPT_T.paper }}>
        <div style={{ height: 36, background: statusBg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, zIndex: 5, transition: 'background .25s' }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}>9:30</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="11" viewBox="0 0 16 12"><path d="M8 11.5 1 5a9.6 9.6 0 0 1 14 0L8 11.5Z" fill={c} opacity="0.95" /></svg>
            <svg width="16" height="11" viewBox="0 0 16 12"><path d="M14.7 12V1L2 12h12.7Z" fill={c} opacity="0.55" /></svg>
            <svg width="22" height="11" viewBox="0 0 22 12"><rect x="1" y="1.5" width="18" height="9" rx="2.2" fill="none" stroke={c} strokeWidth="1.2" opacity="0.7" /><rect x="2.6" y="3" width="12" height="6" rx="1" fill={c} /><rect x="20" y="4.2" width="1.6" height="3.6" rx="0.8" fill={c} opacity="0.7" /></svg>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>{children}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 124, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.5)', zIndex: 60 }} />
    </div>);

}

Object.assign(window, { GPT_T, GPT_FONT, FLAG, FlagBg, FlagRule, THEMES, ThemeCtx, useTheme, GPTIcon, StatusPill, LiveDot, Logo, LogoMark, GambiaMap, PhoneShell, GAMBIA_ZONES, sevToStatus });