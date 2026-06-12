// regionArt.ts — SVG builders for the macro-region map blocks. Ported 1:1 from the
// design bundle's gambia-art.js (Direction B "Line"), retyped for TS and driven by
// LIVE quarter data instead of the prototype's bundled fixtures. Outline-only,
// app palette (ink slates + amber accent).
//
// Three builders, matching the design:
//   buildRegionLineSVG — the region silhouette (line style) for the identity hero
//   buildLocatorSVG    — the whole country with this region lit + an amber pin
//   buildZoomSVG       — the region enlarged with its quarters plotted at real coords
import { GPT_T, THEMES } from './tokens'
import { type RegionShape, type LngLat, fitTo, toPath, centroidFitted, allPoints } from './regionGeo'

// Palette: reuse canonical tokens where they exist; the few remaining values are
// cartography-only fills carried verbatim from the ported design (map surfaces,
// not UI chrome — they never gate any colour the design system defines).
const RT = {
  ink: GPT_T.ink,
  ink45: GPT_T.ink45,
  line: GPT_T.line,
  paper2: GPT_T.paper2,
  amber: THEMES.standard.on, // #E08A00
  amberDeep: THEMES.standard.onDeep, // #8A5400
  nodata: THEMES.standard.nodata, // grey dot — evidence gate: never a false dark/lit claim
  locBase: '#D3DBE1',
  locStroke: '#B4BEC7',
  neighborFill: '#E7E1D5',
  neighborStroke: '#CFC8B8',
}

export type Tone = 'dark' | 'lit' | 'nodata'

/** A plotted quarter for the territory zoom. */
export interface ZoomQuarter {
  name: string
  lng: number
  lat: number
  tone: Tone
  reports: number
}

let UID = 0

// ── region silhouette (line variant, its own framing) ───────────────────────
export function buildRegionLineSVG(region: RegionShape, isCity: boolean, W: number, H: number): string {
  const pad = isCity ? 24 : 16
  const fit = fitTo(allPoints([region]), W, H, pad)
  const land = toPath(region, fit)
  const uid = 'cl' + UID++
  const inner =
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${RT.paper2}"/>` +
    `<path d="${land}" fill="#ffffff" fill-opacity="0.5" stroke="${RT.ink}" stroke-width="1.6" stroke-linejoin="round" fill-rule="evenodd"/>`
  return (
    `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">` +
    `<defs><clipPath id="${uid}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>` +
    `<g clip-path="url(#${uid})">${inner}</g></svg>`
  )
}

// ── locator: whole country, this region lit + amber pin ──────────────────────
export function buildLocatorSVG(regions: RegionShape[], highlightId: string, W: number, H: number): string {
  const fit = fitTo(allPoints(regions), W, H, 7)
  const hi = RT.amber
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`
  let hiReg: RegionShape | null = null
  regions.forEach((r) => {
    const lit = r.id === highlightId
    if (lit) hiReg = r
    s += `<path d="${toPath(r, fit)}" fill="${lit ? hi : RT.locBase}" fill-opacity="${lit ? 1 : 0.85}" stroke="${lit ? RT.amberDeep : RT.locStroke}" stroke-width="${lit ? 0.8 : 0.5}" stroke-linejoin="round" fill-rule="evenodd"/>`
  })
  if (hiReg) {
    const c = centroidFitted(hiReg, fit)
    const R = W * 0.052,
      R2 = W * 0.034,
      R3 = W * 0.021
    // pin: soft outer ring + white halo + amber dot → reads even for tiny areas
    s += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${R.toFixed(1)}" fill="${hi}" fill-opacity="0.18" stroke="${hi}" stroke-width="${(W * 0.006).toFixed(1)}"/>`
    s += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${R2.toFixed(1)}" fill="#fff"/>`
    s += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${R3.toFixed(1)}" fill="${RT.amberDeep}"/>`
  }
  return s + '</svg>'
}

const toneColor = (t: Tone): string => (t === 'lit' ? RT.amber : t === 'nodata' ? RT.nodata : RT.ink)

// ── territory zoom: active region enlarged, neighbours faint, quarters plotted ─
export function buildZoomSVG(
  regions: RegionShape[],
  activeId: string,
  label: string,
  isCity: boolean,
  quarters: ZoomQuarter[],
  W: number,
  H: number,
): string {
  const active = regions.find((r) => r.id === activeId)
  if (!active) return ''
  // frame on the ACTIVE region's bbox, expanded so neighbours peek in; smaller
  // relative margin for big regions so the detail still reads.
  const ll = allPoints([active])
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity
  ll.forEach((p) => {
    if (p[0] < minLng) minLng = p[0]
    if (p[1] < minLat) minLat = p[1]
    if (p[0] > maxLng) maxLng = p[0]
    if (p[1] > maxLat) maxLat = p[1]
  })
  const marg = isCity ? 0.42 : 0.12
  const mx = (maxLng - minLng) * marg,
    my = (maxLat - minLat) * marg
  const corners: LngLat[] = [
    [minLng - mx, minLat - my],
    [maxLng + mx, maxLat + my],
  ]
  const fit = fitTo(corners, W, H, W * 0.02)
  const uid = 'zm' + UID++

  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`
  s += `<defs><clipPath id="${uid}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>`
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="${RT.paper2}"/>`
  s += `<g clip-path="url(#${uid})">`
  // neighbouring regions as faint context, then active emphasized
  regions
    .filter((r) => r.id !== activeId)
    .forEach((reg) => {
      s += `<path d="${toPath(reg, fit)}" fill="${RT.neighborFill}" fill-opacity="0.85" stroke="${RT.neighborStroke}" stroke-width="1" stroke-linejoin="round" fill-rule="evenodd"/>`
    })
  s += `<path d="${toPath(active, fit)}" fill="#FFFFFF" stroke="${RT.ink}" stroke-width="2" stroke-linejoin="round" fill-rule="evenodd"/>`
  // quarter points for the active region (real coords only)
  const labels: { name: string; x: number; y: number; reports: number }[] = []
  quarters.forEach((q) => {
    const p = fit.map([q.lng, q.lat])
    const col = toneColor(q.tone)
    const r = isCity ? W * 0.0125 : W * 0.0115
    s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(r + 2.6).toFixed(1)}" fill="#fff"/>`
    s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" stroke="#fff" stroke-width="1.2"/>`
    labels.push({ name: q.name, x: p[0], y: p[1], reports: q.reports })
  })
  s += `</g>`
  // active region watermark, centred on its mainland
  const c = centroidFitted(active, fit)
  const fsW = W * 0.038
  s += `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, sans-serif" font-size="${fsW.toFixed(1)}" font-weight="800" letter-spacing="0.6" fill="${RT.ink}" opacity="0.09">${escapeXml(label.toUpperCase())}</text>`
  // collision-avoided labels for plotted quarters, priority by reports
  if (labels.length) {
    const fs = W * 0.0235,
      ch = W * 0.0135,
      charW = fs * 0.54
    const ranked = labels.slice().sort((a, b) => b.reports - a.reports)
    const placed: { x1: number; y1: number; x2: number; y2: number }[] = []
    const overlaps = (
      a: { x1: number; y1: number; x2: number; y2: number },
      b: { x1: number; y1: number; x2: number; y2: number },
    ) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2)
    ranked.forEach((l) => {
      const w = l.name.length * charW
      const cands = [{ x: l.x + ch + 3 }, { x: l.x - ch - 3 - w }]
      for (const cand of cands) {
        const box = { x1: cand.x - 1, y1: l.y - fs * 0.6, x2: cand.x + w + 1, y2: l.y + fs * 0.6 }
        if (box.x1 < 2 || box.x2 > W - 2) continue
        if (placed.some((p) => overlaps(p, box))) continue
        placed.push(box)
        s += `<text x="${cand.x.toFixed(1)}" y="${(l.y + fs * 0.34).toFixed(1)}" font-family="-apple-system, Segoe UI, Roboto, sans-serif" font-size="${fs.toFixed(1)}" font-weight="700" fill="${RT.ink}" stroke="#fff" stroke-width="${(fs * 0.18).toFixed(1)}" paint-order="stroke" style="paint-order:stroke">${escapeXml(l.name)}</text>`
        break
      }
    })
  }
  return s + '</svg>'
}

// quarter names are app data (e.g. "St. Mary's"), so escape before inlining into SVG markup.
function escapeXml(t: string): string {
  return t.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' })[c] as string)
}
