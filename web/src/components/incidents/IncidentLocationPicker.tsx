// IncidentLocationPicker.tsx — small Leaflet mini-map with a DRAGGABLE pin for D-10 manual
// position adjustment. The user can drag the marker or tap the map to correct their GPS fix
// before submitting an incident report. Mirrors GambiaMapLive.tsx's lazy-Leaflet init pattern
// but is a small fixed-height map (not the full live map) and does NOT share the canvas renderer.
//
// Props: lat/lng (current position), onChange (called on drag/tap with the new position).
// Cleanup: map.remove() on unmount mirrors GambiaMapLive cleanup discipline.
// Tile provider: SAME CARTO Positron URL + attribution as GambiaMapLive — no new tile provider (D-12).
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import { GPT_T, FLAG } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { rgba } from './incidentVisuals'

// Inline SVG pin (the design's red teardrop) as a divIcon — Leaflet's DEFAULT marker loads
// marker-icon.png from its dist path, which Vite's bundler rewrites/breaks, so the pin renders as a
// broken image ("??"). A divIcon has NO external image dependency. Token-only (D-12); '#fff' the lone literal.
const PIN_SVG =
  `<svg viewBox="0 0 24 34" width="30" height="42" style="display:block;filter:drop-shadow(0 2px 3px ${rgba(GPT_T.ink, 0.35)})">` +
  `<path d="M12 33s10-9.2 10-19A10 10 0 1 0 2 14c0 9.8 10 19 10 19Z" fill="${FLAG.red}" stroke="#fff" stroke-width="2"/>` +
  `<circle cx="12" cy="14" r="3.6" fill="#fff"/></svg>`

export function IncidentLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number
  lng: number
  onChange: (p: { lat: number; lng: number }) => void
}) {
  const t = useT()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  // Keep the latest onChange without re-initialising the map on every parent render.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let cancelled = false

    void (async () => {
      // Dynamic import — mirrors GambiaMapLive.tsx. Leaflet JS + CSS in a separate async chunk.
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !elRef.current || mapRef.current) return

      const map = L.map(elRef.current, {
        preferCanvas: false, // pin map: standard DOM markers for better drag UX
        zoomControl: true,
        attributionControl: true,
        fadeAnimation: false,
        markerZoomAnimation: false,
        minZoom: 6,
        maxZoom: 19,
      })
      mapRef.current = map

      // Same CARTO tile layer + attribution as GambiaMapLive — no new tile provider (D-12).
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        detectRetina: true,
        crossOrigin: true,
        updateWhenIdle: true,
        keepBuffer: 1,
        minZoom: 6,
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
          '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map)

      // Draggable marker — the user drags or taps to correct the GPS fix (D-10). Custom divIcon
      // SVG pin (no Leaflet default PNG → no broken-image "??"). Anchor at the tip (bottom-centre).
      const pinIcon = L.divIcon({
        className: 'go-incident-pin',
        html: PIN_SVG,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      })
      const marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map)
      markerRef.current = marker

      // Drag: update position when the marker is dropped.
      marker.on('dragend', () => {
        const latlng = marker.getLatLng()
        onChangeRef.current({ lat: latlng.lat, lng: latlng.lng })
      })

      // Map click: re-position the marker to where the user tapped.
      map.on('click', (ev) => {
        marker.setLatLng(ev.latlng)
        onChangeRef.current({ lat: ev.latlng.lat, lng: ev.latlng.lng })
      })

      map.setView([lat, lng], 15)
      map.invalidateSize()
    })()

    return () => {
      cancelled = true
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null }
      if (mapRef.current) {
        mapRef.current.remove() // critical: detach DOM, listeners, tiles — mirrors GambiaMapLive
        mapRef.current = null
      }
    }
    // Only run on mount. lat/lng changes after mount are handled by the marker update effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the marker position in sync when the parent updates lat/lng (e.g. GPS fix arrives
  // after the picker has already mounted). Does NOT re-init the map.
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng])
      mapRef.current.setView([lat, lng], mapRef.current.getZoom())
    }
  }, [lat, lng])

  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: GPT_T.ink45,
          marginBottom: 4,
        }}
      >
        {t.incidents.form.locationAdjust}
      </div>
      <div
        ref={elRef}
        style={{
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${GPT_T.line}`,
          background: GPT_T.wash,
        }}
      />
    </div>
  )
}
