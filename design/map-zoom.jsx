// map-zoom.jsx — REAL map of The Gambia via Leaflet + free CARTO/OSM tiles (no API key).
// Outages plotted at true coordinates: 7 macro-area pins + ~54 quarter dots.
// Exports: GambiaMapLive (alias GambiaMapZoom)

// Real macro-area coordinates [lat, lng]
const GMZ_MACRO = {
  banjul:     [13.4549, -16.5790],
  kanifing:   [13.4383, -16.6781],
  brikama:    [13.2714, -16.6494],
  kerewan:    [13.4894, -16.0858],
  mansakonko: [13.4520, -15.5460],
  janjanbureh:[13.5366, -14.7660],
  basse:      [13.3082, -14.2151],
};
// Country bounds (Atlantic west → Koina east)
const GMZ_BOUNDS = [[13.02, -16.92], [13.92, -13.72]];

// deterministic scatter offset for quarter i of n: returns [dLat, dLng]
function gmzOffset(i, n, spread) {
  const a = i * 2.39996323;
  const r = spread * Math.sqrt((i + 0.6) / Math.max(n, 1));
  return [Math.sin(a) * r * 0.55, Math.cos(a) * r];
}

function GambiaMapLive({ data, onZone, onQuarter }) {
  const th = useTheme();
  const elRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const layerRef = React.useRef(null);
  const cb = React.useRef({});
  cb.current = { onZone, onQuarter };

  // init map once
  React.useEffect(() => {
    const L = window.L;
    if (!L || mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true, minZoom: 7, maxZoom: 16, zoomSnap: 0.25 });
    mapRef.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    const b = L.latLngBounds(GMZ_BOUNDS);
    map.fitBounds(b, { padding: [8, 8] });
    map.setMaxBounds(b.pad(0.35));
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    const el = elRef.current;
    const updLabels = () => { if (el) el.classList.toggle('gmz-hide-labels', map.getZoom() < 8.6); };
    map.on('zoomend', updLabels); updLabels();
    // The map now mounts/unmounts per tab (Home card ↔ Map tab) — guard the deferred
    // invalidateSize calls so they never fire on a removed map (Leaflet `_leaflet_pos` crash).
    const t1 = setTimeout(() => { if (mapRef.current) map.invalidateSize(); }, 60);
    const t2 = setTimeout(() => { if (mapRef.current) map.invalidateSize(); }, 280);
    return () => { clearTimeout(t1); clearTimeout(t2); mapRef.current = null; map.remove(); };
  }, []);

  // (re)draw markers when data / theme change
  React.useEffect(() => {
    const L = window.L, map = mapRef.current, group = layerRef.current;
    if (!L || !map || !group) return;
    group.clearLayers();
    const quarters = data.quarters || {};

    data.zones.forEach(z => {
      const center = GMZ_MACRO[z.id]; if (!center) return;
      const st = sevToStatus(z.sev);
      const tight = (z.id === 'banjul' || z.id === 'kanifing');
      const spread = tight ? 0.022 : z.id === 'brikama' ? 0.05 : 0.075;
      const qs = quarters[z.id] || [];

      // quarter dots (true-ish positions around the macro centre)
      qs.forEach((q, i) => {
        const [dLat, dLng] = gmzOffset(i, qs.length, spread);
        const m = L.circleMarker([center[0] + dLat, center[1] + dLng], {
          radius: q.status === 'out' ? 5 : 4, color: '#fff', weight: 1,
          fillColor: th[q.status], fillOpacity: 0.92,
        });
        m.bindTooltip(`<b>${q.name}</b> · ${fmtHM(q.mins)}`, { direction: 'top', offset: [0, -4], className: 'gmz-tt' });
        m.on('click', () => cb.current.onQuarter && cb.current.onQuarter(z, q));
        m.addTo(group);
      });

      // macro pin
      const html = `<div class="gmz-pin ${st === 'out' ? 'is-out' : ''}" style="--c:${th[st]}">`
        + `<span class="gmz-ring"></span>`
        + `<svg viewBox="0 0 24 32" width="30" height="40"><path d="M12 31C12 31 22 19 22 11A10 10 0 1 0 2 11C2 19 12 31 12 31Z" fill="${th[st]}" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="11" r="3.6" fill="#fff"/></svg></div>`;
      const icon = L.divIcon({ html, className: 'gmz-pin-wrap', iconSize: [30, 40], iconAnchor: [15, 38], tooltipAnchor: [0, -34] });
      const pin = L.marker(center, { icon, riseOnHover: true });
      pin.bindTooltip(z.region, { permanent: true, direction: 'top', offset: [0, -34], className: 'gmz-label' });
      pin.on('click', () => cb.current.onZone && cb.current.onZone(z));
      pin.addTo(group);
    });
  }, [data, th]);

  return <div ref={elRef} style={{ position: 'absolute', inset: 0, background: '#E7EEF1', zIndex: 0 }} />;
}

const GambiaMapZoom = GambiaMapLive;
Object.assign(window, { GambiaMapLive, GambiaMapZoom });
