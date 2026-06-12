// animatedFavicon.ts — a looping lightning flicker on the BROWSER TAB favicon (desktop only).
//
// Scope/limits: this animates the <link rel="icon"> shown in a desktop browser tab by swapping SVG
// data-URI frames on a timeline. It does NOT (and cannot) animate the installed home-screen/app icon
// on iOS or Android — those are static platform assets. On mobile the tab favicon is unused, so this
// is a desktop nicety. Honors prefers-reduced-motion (stays static) and pauses on hidden tabs.
//
// The art mirrors public/favicon.svg (navy disc · white bolt · Gambian-flag red bar) so the tab mark
// stays on-brand; only the bolt's brightness/glow + an occasional white flash vary across frames.

// One favicon frame as an SVG data URI. `bolt` = bolt fill, `glow` = blur radius (0 = none),
// `flash` = full-disc white flash opacity (the lightning strike).
function frame(bolt: string, glow: number, flash: number): string {
  const filter = glow > 0 ? ` filter="url(#g)"` : ''
  const defs = glow > 0 ? `<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${glow}"/></filter></defs>` : ''
  const flashRect = flash > 0 ? `<circle cx="32" cy="32" r="32" fill="#eaf4ff" opacity="${flash}"/>` : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    defs +
    `<circle cx="32" cy="32" r="32" fill="#0F1722"/>` +
    (glow > 0 ? `<path d="M35 8 16 36h13L26 56l22-28H37l-2-20Z" fill="${bolt}"${filter} opacity="0.9"/>` : '') +
    `<path d="M35 8 16 36h13L26 56l22-28H37l-2-20Z" fill="${bolt}"/>` +
    flashRect +
    `<rect x="6" y="58" width="52" height="3" rx="1.5" fill="#CE1126"/>` +
    `</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

// Lightning loop: a long dim hold, then a quick double-strike, then fade back to dim.
const DIM = '#5b6675'
const TIMELINE: { href: string; ms: number }[] = [
  { href: frame(DIM, 0, 0), ms: 1100 }, // resting (dim bolt)
  { href: frame('#ffffff', 3, 0.0), ms: 70 }, // strike 1 — bright + glow
  { href: frame('#eaf4ff', 4, 0.35), ms: 60 }, // flash peak
  { href: frame(DIM, 0, 0), ms: 90 }, // gap (dark)
  { href: frame('#ffffff', 3, 0.18), ms: 70 }, // strike 2
  { href: frame('#cdd6e0', 1, 0), ms: 150 }, // afterglow
  { href: frame(DIM, 0, 0), ms: 260 }, // settle
]

let timer: number | undefined
let linkEl: HTMLLinkElement | null = null
let idx = 0

function ensureLink(): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'icon'
    document.head.appendChild(el)
  }
  return el
}

function step(): void {
  if (!linkEl) return
  const f = TIMELINE[idx]
  linkEl.type = 'image/svg+xml'
  linkEl.href = f.href
  idx = (idx + 1) % TIMELINE.length
  timer = window.setTimeout(step, f.ms)
}

function stop(): void {
  if (timer) { window.clearTimeout(timer); timer = undefined }
}

/** Start the looping lightning favicon. No-op under reduced-motion; auto-pauses on hidden tabs. */
export function startAnimatedFavicon(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  linkEl = ensureLink()
  const onVisibility = () => {
    if (document.hidden) stop()
    else if (!timer) step()
  }
  document.addEventListener('visibilitychange', onVisibility)
  step()
}
