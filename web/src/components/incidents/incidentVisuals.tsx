// incidentVisuals.tsx — shared design language for the Incidents tab (claude-design pass,
// palette locked 2026-06-22). One source of truth for the category palette, contrast rule,
// per-category glyphs, the alert-triangle, and the evidence-photo placeholder — consumed by
// IncidentScreen, IncidentFeedCard, PowercutFeedCard, and IncidentForm.
//
// Token-only (D-12): every colour comes from @/lib/tokens; '#fff' is the sole raw literal.
import { GPT_T, FLAG, ACCENT, THEMES } from '@/lib/tokens'

const TH = THEMES.standard

// rgba() from a hex token — for tints/shadows that need an alpha channel (still token-derived).
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// ── Civic incident categories (the closed report set) ────────────────────────
export const CATEGORY_SLUGS = ['flooding', 'road', 'water', 'electricity', 'waste', 'building', 'other'] as const
export type CategorySlug = (typeof CATEGORY_SLUGS)[number]

// The power-cut pseudo-category — NOT a reportable incident form option (power cuts are reported via
// the OUT/BACK flow). It surfaces in the feed/filter as the FIRST chip so the app's core signal leads.
export const POWERCUT_SLUG = 'powercut'

// Final category palette (locked 2026-06-22). Token-only.
//  flooding=deep blue · road=gold · water=sky · electricity=lit-bulb amber · waste=grey ·
//  building=red · other=purple · powercut=unlit-bulb slate (the THEMES 'out' dark).
export const CATEGORY_COLOR: Record<string, string> = {
  flooding: FLAG.blue,
  road: ACCENT.star,
  water: ACCENT.tile5,
  electricity: TH.on,
  waste: GPT_T.ink45,
  building: FLAG.red,
  other: ACCENT.tile4,
  [POWERCUT_SLUG]: TH.out,
}

// Contrast rule: gold / sky-blue / amber are too light for white label text (white-on-gold fails AA).
// Those three carry INK text; every other category (all dark) carries white.
const CAT_INK_TEXT: Record<string, boolean> = { road: true, water: true, electricity: true }
export function catText(slug: string): string {
  return CAT_INK_TEXT[slug] ? GPT_T.ink : '#fff'
}

// ── tiny per-category glyph (feed pill · map legend · photo watermark) ────────
export function CatGlyph({ slug, size = 14, color = '#fff' }: { slug: string; size?: number; color?: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const box = { width: size, height: size, display: 'block' as const }
  switch (slug) {
    case 'flooding':
      return (<svg viewBox="0 0 24 24" style={box}><path d="M3 14q3-3 6 0t6 0 6 0M3 19q3-3 6 0t6 0 6 0" {...p} /><path d="M8 11l4-7 4 7" {...p} /></svg>)
    case 'road':
      return (<svg viewBox="0 0 24 24" style={box}><path d="M5 21 8 4M19 21 16 4" {...p} /><path d="M12 5v3M12 11v3M12 17v3" {...p} /></svg>)
    case 'water':
      return (<svg viewBox="0 0 24 24" style={box}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" {...p} /></svg>)
    case 'electricity':
      return (<svg viewBox="0 0 24 24" style={box}><path d="M13 2 5 13h6l-1 9 8-12h-6l1-8Z" {...p} /></svg>)
    case 'waste':
      return (<svg viewBox="0 0 24 24" style={box}><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" {...p} /></svg>)
    case 'building':
      return (<svg viewBox="0 0 24 24" style={box}><path d="M4 21V8l7-4 7 4v13M9 21v-5h4v5" {...p} /><path d="M14 12h.01M9 12h.01" {...p} /></svg>)
    case POWERCUT_SLUG:
      // unlit bulb — base + outline, no rays (distinct from the lit-bulb electricity bolt)
      return (<svg viewBox="0 0 24 24" style={box}><path d="M9.5 18h5M10.5 21h3" {...p} /><path d="M12 3a6 6 0 0 0-3.8 10.6c.7.6 1.1 1.1 1.3 2.4h5c.2-1.3.6-1.8 1.3-2.4A6 6 0 0 0 12 3Z" {...p} /></svg>)
    default:
      return (<svg viewBox="0 0 24 24" style={box}><circle cx="12" cy="12" r="8" {...p} /><path d="M12 8v5M12 16h.01" {...p} /></svg>)
  }
}

// ── alert-triangle (screen header + error rows) ──────────────────────────────
export function AlertTri({ size = 18, color = FLAG.red }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 3.6 22 20H2L12 3.6Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="11" y="9.5" width="2" height="5.5" rx="1" fill={color} />
      <circle cx="12" cy="17.4" r="1.2" fill={color} />
    </svg>
  )
}

// ── evidence-photo placeholder — used when a feed row has no photoUrl (power cuts) or as the
// dropzone fill. A neutral horizon, lightly tinted by category, with a faint centred glyph.
export function photoBg(slug: string): string {
  const c = CATEGORY_COLOR[slug] ?? GPT_T.ink45
  return `linear-gradient(158deg, ${rgba(c, 0.3)}, ${rgba(c, 0.04)}), linear-gradient(180deg, ${GPT_T.wash} 0%, ${GPT_T.wash} 56%, ${GPT_T.line2} 57%, ${GPT_T.line} 100%)`
}

export function PhotoThumb({ slug, size = 64, radius = 10 }: { slug: string; size?: number; radius?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, position: 'relative', overflow: 'hidden', background: photoBg(slug), border: `1px solid ${GPT_T.line}` }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        <CatGlyph slug={slug} size={size * 0.34} color={rgba(GPT_T.ink, 0.55)} />
      </div>
    </div>
  )
}
