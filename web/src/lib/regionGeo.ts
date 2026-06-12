// regionGeo.ts — geometry over the REAL ADM1 boundaries of The Gambia.
// Ported from the design bundle's gambia-geo.js (Claude Design handoff, chat5/6).
// Source shapes are the app's own data/geo/region-polygons.json, copied to
// web/public/region-shapes.json and lazy-fetched (NOT in the entry bundle) the
// first time a macro region page is opened — same pattern as places.ts.
//
// All 7 regions share one [lng,lat] space so the pieces tessellate into the
// whole country (used by the locator). Outline-only (no synthetic river).

export type LngLat = [number, number]

/** A region normalised from a GeoJSON MultiPolygon into flat rings. */
export interface RegionShape {
  id: string
  rings: LngLat[][] // every ring (outer + holes) across all polygons
  poly: LngLat[] // largest outer ring (mainland) — for centroid/label
}

interface MultiPolygon {
  type: string
  coordinates: LngLat[][][] // [ polygon, ... ] → polygon = [ ring, ... ] → ring = [ [lng,lat], ... ]
}

// ── normalise GeoJSON MultiPolygon → flat-ring RegionShape ──────────────────
function ringArea(ring: LngLat[]): number {
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  return Math.abs(a) * 0.5
}

function normalize(id: string, mp: MultiPolygon): RegionShape {
  const rings: LngLat[][] = []
  let poly: LngLat[] = []
  let best = -1
  ;(mp.coordinates || []).forEach((polygon) => {
    polygon.forEach((ring, ri) => {
      rings.push(ring)
      // mainland candidate = the largest OUTER ring (ring index 0 of each polygon)
      if (ri === 0) {
        const a = ringArea(ring)
        if (a > best) {
          best = a
          poly = ring
        }
      }
    })
  })
  if (!poly.length && rings.length) poly = rings[0]
  return { id, rings, poly }
}

let cache: Promise<Record<string, RegionShape>> | null = null

/** Fetch + normalise the region shapes once (cached). Returns {} on failure → the
 *  map blocks simply don't render and the rest of the page is unaffected. */
export function loadRegionShapes(): Promise<Record<string, RegionShape>> {
  if (!cache) {
    cache = fetch('/region-shapes.json', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((raw: Record<string, MultiPolygon>) => {
        const out: Record<string, RegionShape> = {}
        for (const id of Object.keys(raw || {})) out[id] = normalize(id, raw[id])
        return out
      })
      .catch(() => ({}))
  }
  return cache
}

// ── projection: equirectangular, longitude corrected for latitude ───────────
const COSLAT = Math.cos((13.45 * Math.PI) / 180) // ≈ 0.9726 — true proportions
const px = (p: LngLat): [number, number] => [p[0] * COSLAT, -p[1]] // north up

export interface BBox {
  minx: number
  miny: number
  maxx: number
  maxy: number
  w: number
  h: number
}

export function bbox(points: LngLat[]): BBox {
  let a = Infinity,
    b = Infinity,
    c = -Infinity,
    d = -Infinity
  points.forEach((p) => {
    const [x, y] = px(p)
    if (x < a) a = x
    if (y < b) b = y
    if (x > c) c = x
    if (y > d) d = y
  })
  return { minx: a, miny: b, maxx: c, maxy: d, w: c - a, h: d - b }
}

export interface Fit {
  s: number
  map: (p: LngLat) => [number, number]
  bbox: BBox
}

/** Fit source points into a w×h box (uniform scale, centred). */
export function fitTo(points: LngLat[], w: number, h: number, pad = 0): Fit {
  const bb = bbox(points)
  const s = Math.min((w - 2 * pad) / (bb.w || 1), (h - 2 * pad) / (bb.h || 1))
  const ox = (w - bb.w * s) / 2 - bb.minx * s
  const oy = (h - bb.h * s) / 2 - bb.miny * s
  const map = (p: LngLat): [number, number] => {
    const q = px(p)
    return [q[0] * s + ox, q[1] * s + oy]
  }
  return { s, map, bbox: bb }
}

const ringPath = (ring: LngLat[], fit: Fit): string =>
  ring
    .map((p, i) => {
      const [x, y] = fit.map(p)
      return (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)
    })
    .join(' ') + 'Z'

/** Full region path = all its rings (mainland + islands/holes) as one path string. */
export const toPath = (region: RegionShape, fit: Fit): string => region.rings.map((r) => ringPath(r, fit)).join(' ')

/** Area-weighted centroid of a ring set, in fitted space. */
export function centroidFitted(region: RegionShape, fit: Fit): [number, number] {
  let cx = 0,
    cy = 0,
    tot = 0
  region.rings.forEach((ring) => {
    let area = 0,
      x = 0,
      y = 0
    for (let i = 0; i < ring.length - 1; i++) {
      const p0 = fit.map(ring[i]),
        p1 = fit.map(ring[i + 1])
      const cross = p0[0] * p1[1] - p1[0] * p0[1]
      area += cross
      x += (p0[0] + p1[0]) * cross
      y += (p0[1] + p1[1]) * cross
    }
    area *= 0.5
    if (Math.abs(area) > 1e-6) {
      cx += (x / (6 * area)) * Math.abs(area)
      cy += (y / (6 * area)) * Math.abs(area)
      tot += Math.abs(area)
    }
  })
  if (!tot) {
    const p = fit.map(region.poly[0])
    return [p[0], p[1]]
  }
  return [cx / tot, cy / tot]
}

/** All [lng,lat] points across a set of regions (used by the whole-country locator). */
export function allPoints(regions: RegionShape[]): LngLat[] {
  return regions.reduce<LngLat[]>((a, r) => a.concat(...r.rings), [])
}
