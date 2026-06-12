// tokens.ts — ds.jsx design system, ported 1:1. Canonical source of truth for colours/fonts.
// Mirrors design/ds.jsx (GPT_FONT, GPT_T, THEMES, FLAG). Do NOT redesign these values.

export const GPT_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

// ── Neutrals (constant across themes) ──────────────────────────────────────
export const GPT_T = {
  ink: '#11161C',
  ink70: '#3B454F',
  ink45: '#69737E',
  ink25: '#9AA4AE',
  line: '#E4E8EC',
  line2: '#EEF1F4',
  paper: '#FFFFFF',
  wash: '#F6F8FA',
  panel: '#0F1722',
  panelLine: '#27313F',
  panelInk: '#F4F7FA',
  panelInk60: '#9DAAB8',
  paper2: '#F4F1EA', // warm editorial surface
} as const

// ── Status themes — swappable (standard / sunlight high-contrast) ───────────
export type StatusTheme = {
  out: string; outDeep: string; outBg: string; outLine: string
  partial: string; partialDeep: string; partialBg: string; partialLine: string
  on: string; onDeep: string; onBg: string; onLine: string
  // 'nodata' = evidence gate (zero reports): neutral grey, NOT a power claim.
  nodata: string; nodataDeep: string; nodataBg: string; nodataLine: string
  // 'estimated' = launch blackout baseline (zero reports, estimated dark): MUTED/dusty red,
  // deliberately distinct from the bright confirmed 'out' red so it never reads as confirmed.
  estimated: string; estimatedDeep: string; estimatedBg: string; estimatedLine: string
}

export const THEMES: Record<'standard' | 'sunlight', StatusTheme> = {
  standard: {
    // DARK (power out) — the unlit bulb: dark slate, serious but not alarm-red
    out: '#2C3743', outDeep: '#161E27', outBg: '#E7EBEF', outLine: '#C2CAD3',
    // DARK dim (under-confirmed open outage = still off in this phase)
    partial: '#3C4856', partialDeep: '#202A35', partialBg: '#E9EDF1', partialLine: '#C7CFD8',
    // LIGHT (power on) — the lit bulb: warm amber
    on: '#E08A00', onDeep: '#8A5400', onBg: '#FFF3D6', onLine: '#F2CF86',
    // AWAITING (no reports) — neutral grey, unchanged intent
    nodata: '#8A94A6', nodataDeep: '#5A6271', nodataBg: '#EEF1F5', nodataLine: '#D5DBE3',
    // estimated dark (launch baseline) — muted dark, distinct from confirmed
    estimated: '#4A5260', estimatedDeep: '#2A303A', estimatedBg: '#E8EAEE', estimatedLine: '#C8CDD6',
  },
  sunlight: {
    out: '#212A34', outDeep: '#0E141B', outBg: '#DFE4EA', outLine: '#AEB8C2',
    partial: '#2E3845', partialDeep: '#161E27', partialBg: '#E1E6EC', partialLine: '#B6C0CB',
    on: '#B86E00', onDeep: '#7A4A00', onBg: '#FBE9C2', onLine: '#E6BC6B',
    nodata: '#5A6271', nodataDeep: '#3A404B', nodataBg: '#E4E8EE', nodataLine: '#B8C0CC',
    estimated: '#39424E', estimatedDeep: '#1C232C', estimatedBg: '#DEE2E8', estimatedLine: '#AEB7C2',
  },
}

export type ThemeName = keyof typeof THEMES

// ── Gambian flag (red:white:blue:white:green = 6:1:4:1:6) ───────────────────
export const FLAG = {
  red: '#CE1126',
  white: '#FFFFFF',
  blue: '#0E50A0',
  blueDeep: '#0A3B78',
  green: '#3A7728',
  greenDeep: '#2C5C1E',
} as const

// ── Status labels (icon + label, never colour alone) ────────────────────────
export const STATUS_LABEL: Record<Status, string> = {
  out: 'DARK',
  partial: 'DARK',
  on: 'LIGHT',
}

// Display-only labels: adds 'nodata' (zero reports). Pill copy is kept short
// ('AWAITING') so it never overflows narrow rows; prose uses "Awaiting reports".
export const DISPLAY_STATUS_LABEL: Record<'out' | 'partial' | 'on' | 'nodata' | 'estimated', string> = {
  out: 'DARK',
  partial: 'DARK',
  on: 'LIGHT',
  nodata: 'AWAITING',
  estimated: 'DARK · EST.',
}

export type Status = 'out' | 'partial' | 'on'

// ── Spacing scale (M3 batch A) — 4pt base. New code MUST pick from this scale; existing inline
// values migrate opportunistically (snap to the nearest step when touching a file).
export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32 } as const

// ── Accent colors (M3 batch A) — previously raw hex scattered across components. These are NOT
// status colors (see THEMES): they're brand/emotional accents used identically in every theme.
export const ACCENT = {
  star: '#FFD700', // honors/XP gold (AppHeader sparkles, ProfileChip)
  live: '#E0245E', // LIVE/heart red (LiveStrip, RadioPlayer LIVE dot, link likes)
  danger: '#E5484D', // destructive/error (admin bar, block/delete affordances)
  facebook: '#1877F2',
  whatsapp: '#25D366',
  // Ambassador amber (badge card on Profile/Ambassador screens)
  amber: '#d97706', amberDeep: '#b45309', amberBg: '#fef3c7',
} as const

// ── Shared button styles (M3 batch A) — the three recurring CTA shapes, previously re-invented
// per screen with magic numbers. Spread these and override only what the context needs.
export const BUTTON_PRIMARY = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.s,
  minHeight: 48, padding: `${SPACE.m}px ${SPACE.l}px`, borderRadius: 14, border: 'none',
  background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontSize: 15, fontWeight: 800,
  cursor: 'pointer',
} as const
export const BUTTON_SECONDARY = {
  ...BUTTON_PRIMARY,
  background: GPT_T.wash, color: GPT_T.ink, border: `1.5px solid ${GPT_T.line}`,
} as const
export const BUTTON_GHOST = {
  ...BUTTON_PRIMARY,
  background: 'transparent', color: GPT_T.ink45, border: 'none', fontWeight: 700,
} as const
