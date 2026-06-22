// GambiaMapLive.tsx — vanilla Leaflet 1.9.4 map for Home (NOT react-leaflet:
// its v5 needs React 19; we are on 18.3.1). This module dynamically import()s
// Leaflet (JS) and its CSS inside an effect, so Rollup splits them into their
// own async chunk that is downloaded only after first paint and only past the
// data-saver gate. NEVER import 'leaflet' at file scope here.
//
// Renders the 7 macro pins from snapshot.macros as L.circleMarker on ONE shared
// canvas (preferCanvas: true) — low DOM, low RAM for the 1 GB origin / low-end
// Android. Pins are coloured from the theme-aware status palette (THEMES) and
// click → navigate({ name: 'zone', id }). The map is torn down (map.remove())
// on unmount to avoid leaking DOM/listeners/canvas across hash-route changes.
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, CircleMarker } from 'leaflet'
import type { Snapshot } from '@/lib/types'
import type { IncidentRow } from '@/lib/api'
import { useAppStore } from '@/app/store'
import { THEMES, FLAG, ACCENT, GPT_T } from '@/lib/tokens'
import { displayStatus } from '@/lib/status'
import { baselineOn } from '@/lib/launch'

// Category → token color map (D-12: NO raw hex literals — all values from tokens.ts).
// flooding=FLAG.blue, road=ACCENT.amber, water=ACCENT.tile5, electricity=ACCENT.star,
// waste=GPT_T.ink45, building=FLAG.red, other=ACCENT.tile4
const INCIDENT_CATEGORY_COLOR: Record<string, string> = {
  flooding: FLAG.blue,
  road: ACCENT.amber,
  water: ACCENT.tile5,
  electricity: ACCENT.star,
  waste: GPT_T.ink45,
  building: FLAG.red,
  other: ACCENT.tile4,
}

const ME_TTL_MS = 5 * 60 * 1000 // "ME" marker lifetime: 5 minutes, then it blends in

/** Read the user's own recent report (set by ReportSheet on submit), if still within the TTL. */
function readMyReport(): { zoneId: string; regionId: string; at: number } | null {
  try {
    const raw = localStorage.getItem('go_my_report')
    if (!raw) return null
    const r = JSON.parse(raw) as { zoneId: string; regionId: string; at: number }
    if (!r || typeof r.at !== 'number' || Date.now() - r.at > ME_TTL_MS) {
      localStorage.removeItem('go_my_report')
      return null
    }
    return r
  } catch {
    return null
  }
}

const CARTO_POSITRON = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>'

export default function GambiaMapLive({
  snapshot,
  onPin,
  incidents,
}: {
  snapshot: Snapshot
  onPin: (id: string) => void
  incidents?: IncidentRow[]
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const meCleanupRef = useRef<(() => void) | null>(null)
  const themeName = useAppStore((s) => s.themeName)

  // Keep the latest onPin without re-initialising the map when the parent
  // re-renders with a new closure identity.
  const onPinRef = useRef(onPin)
  onPinRef.current = onPin

  useEffect(() => {
    let cancelled = false
    const markers = new Map<string, CircleMarker>()

    void (async () => {
      // Dynamic import → separate async chunk (JS + CSS), never in entry bundle.
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !elRef.current || mapRef.current) return

      const palette = THEMES[themeName]
      const colorFor = (status: 'out' | 'partial' | 'on' | 'nodata' | 'estimated') => palette[status]
      const baseline = baselineOn()

      const map = L.map(elRef.current, {
        preferCanvas: true, // all circleMarkers share ONE canvas renderer
        zoomControl: true,
        attributionControl: true,
        fadeAnimation: false, // cheaper on weak GPUs / old WebViews
        markerZoomAnimation: false,
        minZoom: 6,
        maxZoom: 19,
      })
      mapRef.current = map

      L.tileLayer(CARTO_POSITRON, {
        subdomains: 'abcd',
        detectRetina: true, // {r} → @2x on hi-dpi, plain 1x on cheap phones
        crossOrigin: true,
        updateWhenIdle: true, // 2G: only fetch tiles when idle, not mid-pan
        keepBuffer: 1, // fewer off-screen tiles cached = less RAM
        minZoom: 6,
        maxZoom: 19,
        attribution: CARTO_ATTRIBUTION,
      }).addTo(map)

      // 7 macro pins (carry lat/lng on MacroPin). Zero reports ⇒ 'nodata' grey,
      // never a false green — the map makes no power claim without evidence.
      for (const m of snapshot.macros) {
        const ds = displayStatus(m, baseline)
        const c = colorFor(ds)
        const marker = L.circleMarker([m.lat, m.lng], {
          radius: 9,
          color: c, // stroke
          weight: m.confirmed ? 3 : ds === 'estimated' ? 2 : 1.5, // confirmed reads heavier; estimated dashed-feel
          fillColor: c,
          fillOpacity: ds === 'on' || ds === 'nodata' ? 0.35 : ds === 'estimated' ? 0.5 : 0.75,
          interactive: true,
        })
          .bindTooltip(
            ds === 'estimated' ? `${m.name} — dark (estimated)` : ds === 'nodata' ? `${m.name} — awaiting reports` : `${m.name} — ${m.status} · ${m.confirms} reports`,
            { direction: 'top' },
          )
          .on('click', () => onPinRef.current(m.id)) // m.id; there is no slug
          .addTo(map)
        markers.set(m.id, marker)
      }

      // ── "ME" marker — the user's own report, yellow + label, for 5 minutes ──
      // Acceptance cue: right after reporting, the user sees THEIR pin stand out, then it
      // blends into the community signal once enough neighbours weigh in (TTL or recompute).
      // Positioned on the reported region's centroid (snapshot pins carry lat/lng).
      let meMarker: CircleMarker | null = null
      let meTimer: ReturnType<typeof setTimeout> | null = null
      const drawMe = () => {
        const mine = readMyReport()
        if (meMarker) { meMarker.remove(); meMarker = null }
        if (meTimer) { clearTimeout(meTimer); meTimer = null }
        if (!mine) return
        const region = snapshot.macros.find((m) => m.id === mine.regionId)
        if (!region) return
        meMarker = L.circleMarker([region.lat, region.lng], {
          radius: 13,
          color: FLAG.red, // strong ring so it's unmistakable
          weight: 3,
          fillColor: '#F2C200', // Gambian-flag yellow → "this one is mine"
          fillOpacity: 0.95,
          interactive: true,
        })
          .bindTooltip('ME · your report', { permanent: true, direction: 'top', className: 'go-me-tip' })
          .on('click', () => onPinRef.current(mine.regionId))
          .addTo(map)
        const remaining = ME_TTL_MS - (Date.now() - mine.at)
        meTimer = setTimeout(() => { if (meMarker) { meMarker.remove(); meMarker = null } }, Math.max(0, remaining))
      }
      drawMe()
      // redraw when a new report is submitted while the map is open
      const onMine = () => drawMe()
      window.addEventListener('go-my-report', onMine)
      meCleanupRef.current = () => {
        window.removeEventListener('go-my-report', onMine)
        if (meTimer) clearTimeout(meTimer)
        if (meMarker) meMarker.remove()
      }

      // Quarter dots — active-outage quarters (snapshot.quarters, backend buildSnapshot) plotted
      // at their REAL centroid so a single-quarter outage isn't drawn at the region pin up to
      // ~30 km away. Smaller than the macro pins, on the same shared canvas. Skipped on legacy
      // cached snapshots that predate the `quarters` field.
      for (const q of snapshot.quarters ?? []) {
        if (typeof q.lat !== 'number' || typeof q.lng !== 'number') continue
        const ds = displayStatus(q, baseline)
        const c = colorFor(ds)
        const marker = L.circleMarker([q.lat, q.lng], {
          radius: 5,
          color: c,
          weight: q.confirmed ? 2.5 : 1.5,
          fillColor: c,
          fillOpacity: ds === 'on' || ds === 'nodata' ? 0.35 : ds === 'estimated' ? 0.5 : 0.8,
          interactive: true,
        })
          .bindTooltip(
            ds === 'estimated' ? `${q.name} — dark (estimated)` : ds === 'nodata' ? `${q.name} — awaiting reports` : `${q.name} — ${q.status} · ${q.confirms} reports`,
            { direction: 'top' },
          )
          .on('click', () => onPinRef.current(q.id))
          .addTo(map)
        markers.set(q.id, marker)
      }

      // ── Incident markers — one circleMarker per incident, color-coded by category ──
      // Uses INCIDENT_CATEGORY_COLOR (token-only, D-12). bindPopup (not bindTooltip) for
      // tap-stable display on mobile. markers.set(inc.id, ...) so markers.clear() cleanup
      // handles them alongside the outage pins.
      for (const inc of incidents ?? []) {
        if (typeof inc.lat !== 'number' || typeof inc.lng !== 'number') continue
        const color = INCIDENT_CATEGORY_COLOR[inc.category] ?? ACCENT.tile4
        // Build the popup with DOM nodes + textContent, NEVER string-concatenated HTML:
        // inc.text is reporter-supplied UGC and bindPopup is an HTML sink. Server tag-strip
        // is a content cleaner, not an HTML-context encoder (an unclosed `<img onerror=…`
        // survives it), so escape structurally at the sink instead.
        const popup = document.createElement('div')
        const heading = document.createElement('strong')
        heading.textContent = inc.category
        popup.appendChild(heading)
        if (inc.text) {
          const p = document.createElement('p')
          p.style.margin = '4px 0 0'
          p.textContent = inc.text
          popup.appendChild(p)
        }
        if (inc.photoUrl) {
          const img = document.createElement('img')
          img.src = inc.photoUrl
          img.width = 120
          img.alt = 'incident photo'
          img.style.cssText = 'margin-top:6px;border-radius:4px;display:block'
          popup.appendChild(img)
        }
        const incMarker = L.circleMarker([inc.lat, inc.lng], {
          radius: 7,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.8,
          interactive: true,
        })
          .bindPopup(popup)
          .addTo(map)
        markers.set(inc.id, incMarker)
      }

      // Frame The Gambia around the macro pins.
      if (snapshot.macros.length > 0) {
        const bounds = L.latLngBounds(
          snapshot.macros.map((m) => [m.lat, m.lng] as [number, number]),
        )
        map.fitBounds(bounds.pad(0.25))
      } else {
        // Fallback: Gambia bbox (~13.0–13.8 N, -16.9 to -13.7 E).
        map.fitBounds([
          [13.0, -16.9],
          [13.85, -13.7],
        ])
      }

      // The container may have mounted while a route transition was animating;
      // recompute size once it's settled so tiles fill the box.
      map.invalidateSize()
    })()

    return () => {
      cancelled = true
      markers.clear()
      if (meCleanupRef.current) { meCleanupRef.current(); meCleanupRef.current = null }
      if (mapRef.current) {
        mapRef.current.remove() // detaches DOM, listeners, canvas — critical on 1 GB
        mapRef.current = null
      }
    }
    // Re-init on snapshot, theme, or incidents change. Theme flip is rare; snapshot changes
    // re-draw pins with fresh status colours/rings. incidents triggers re-init when the feed
    // updates so new/removed incident markers are reflected immediately.
    // (SSE updates arrive via a snapshot refetch → new snapshot prop → re-init, which is
    // acceptable at 7 pins; patching markers in place is the future optimisation.)
  }, [snapshot, themeName, incidents])

  return (
    <div
      ref={elRef}
      style={{ height: '100%', width: '100%' }}
      role="application"
      aria-label="Outage map of The Gambia"
    />
  )
}
