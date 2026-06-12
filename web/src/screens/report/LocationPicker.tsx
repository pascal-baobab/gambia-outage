// LocationPicker — the "WHERE" section of the report sheet (extracted from ReportSheet.tsx,
// behavior unchanged): fixed-target card, GPS detect card, or the manual flow (typeable quarter
// search + sub-village alias resolution + Region→Quarter cascade). All location STATE stays in
// ReportSheet; this component only renders it and reports picks back via callbacks.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'
import type { Snapshot, QuarterDir } from '@/lib/types'
import { nearestQuarter } from '@/lib/api'
import { loadPlaces, type Place } from '@/lib/places'
import { GPTIcon } from '@/components/icons'

export type LocMode = 'gps' | 'manual'

export interface ReportTarget {
  id: string
  name: string
  region: string
}

// A search/alias pick resolved to the zone the report will count under.
export interface PlacePick {
  regionId: string
  regionName: string
  quarterId: string
  quarterName: string
}

function Picker({
  label,
  value,
  placeholder,
  options,
  onPick,
  disabled,
  open,
  onToggle,
}: {
  label: string
  value: string
  placeholder: string
  options: Array<{ id: string; name: string }>
  onPick: (opt: { id: string; name: string }) => void
  disabled?: boolean
  open: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button
        onClick={() => !disabled && onToggle()}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: 52,
          borderRadius: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: `1.5px solid ${open ? GPT_T.ink : GPT_T.line}`,
          background: disabled ? GPT_T.line2 : GPT_T.paper,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: GPT_FONT,
        }}
      >
        <span style={{ textAlign: 'start' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: GPT_T.ink45, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
          <span style={{ display: 'block', fontSize: 15.5, fontWeight: value ? 800 : 500, color: value ? GPT_T.ink : GPT_T.ink25, marginTop: 1 }}>{value || placeholder}</span>
        </span>
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
          <GPTIcon name="chevron" size={18} color={GPT_T.ink45} />
        </span>
      </button>
      {open && (
        <div style={{ border: `1.5px solid ${GPT_T.line}`, borderTop: 'none', borderRadius: '0 0 13px 13px', marginTop: -2, maxHeight: 168, overflow: 'auto', background: GPT_T.paper }}>
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => onPick(o)}
              style={{
                width: '100%',
                textAlign: 'start',
                padding: '12px 14px',
                border: 'none',
                borderTop: `1px solid ${GPT_T.line2}`,
                background: o.name === value ? GPT_T.wash : GPT_T.paper,
                cursor: 'pointer',
                fontFamily: GPT_FONT,
                fontSize: 15,
                fontWeight: o.name === value ? 800 : 600,
                color: GPT_T.ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {o.name}
              {o.name === value && <GPTIcon name="check" size={17} color={GPT_T.ink} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LocationPicker({
  target,
  locMode,
  onLocModeChange,
  gpsCoords,
  gpsQuarter,
  gpsBusy,
  gpsError,
  onRequestGps,
  search,
  onSearchChange,
  macros,
  quarters,
  regionId,
  regionName,
  quarterName,
  regionLoaded,
  quarterOptions,
  open,
  onOpenChange,
  onPickRegion,
  onPickQuarter,
  onPickPlace,
}: {
  target?: ReportTarget | null
  locMode: LocMode
  onLocModeChange: (mode: LocMode) => void
  gpsCoords: { lat: number; lng: number } | null
  gpsQuarter: QuarterDir | null
  gpsBusy: boolean
  gpsError: string
  onRequestGps: () => void
  search: string
  onSearchChange: (value: string) => void
  macros: Snapshot['macros']
  quarters: QuarterDir[]
  regionId: string
  regionName: string
  quarterName: string
  regionLoaded: boolean
  quarterOptions: Array<{ id: string; name: string }>
  open: null | 'r' | 'q'
  onOpenChange: (open: null | 'r' | 'q') => void
  onPickRegion: (opt: { id: string; name: string }) => void
  onPickQuarter: (opt: { id: string; name: string }) => void
  onPickPlace: (pick: PlacePick) => void
}) {
  const th = useTheme()
  const t = useT()

  // typeable quarter search (alternative to the region→quarter cascade)
  const searchHits = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (term.length < 2) return []
    return quarters
      .filter((q) => q.name.toLowerCase().includes(term) || q.region.toLowerCase().includes(term))
      .slice(0, 6)
  }, [search, quarters])
  // Sub-village alias index — lazy-loaded the first time the user types. Each match resolves to the
  // NEAREST canonical quarter (like a GPS snap) so locals find their place by name without bloating
  // the 55-quarter list or fragmenting the trust pipeline. Falls back silently to the 55 on failure.
  const { data: places = [] } = useQuery<Place[]>({
    queryKey: ['places'],
    queryFn: loadPlaces,
    enabled: search.trim().length >= 2,
    staleTime: Infinity,
  })
  const aliasHits = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (term.length < 2 || !quarters.length || !places.length) return []
    // A canonical quarter > ALIAS_Q_KM away isn't a meaningful match (the 55 are sparse up-country),
    // so beyond it we resolve to the alias's REAL region (precomputed by PiP) instead of a far town —
    // mirroring snapZone's region fallback. Below it, resolve to the nearest quarter.
    const ALIAS_Q_KM = 12
    const km = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const toRad = (x: number) => (x * Math.PI) / 180
      const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng)
      const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
      return 2 * 6371 * Math.asin(Math.sqrt(s))
    }
    const regionName = (id: string) => macros.find((m) => m.id === id)?.region ?? id
    const shown = new Set<string>([...searchHits, ...quarters].map((q) => q.name.toLowerCase()))
    type Hit = { aliasName: string; target: string; sub: string; regionId: string; regionName: string; quarterId: string; quarterName: string }
    const out: Hit[] = []
    for (const p of places) {
      if (out.length >= 6) break
      const n = p.name.toLowerCase()
      if (!n.includes(term) || shown.has(n)) continue // skip non-matches + names already canonical
      const canon = nearestQuarter(quarters, p.lat, p.lng)
      if (!canon) continue
      const d = km(p.lat, p.lng, canon.lat, canon.lng)
      if (d <= ALIAS_Q_KM || !p.r) {
        out.push({ aliasName: p.name, target: canon.name, sub: `counts under ${canon.name} · ${canon.region}`,
          regionId: canon.regionId, regionName: canon.region, quarterId: canon.id, quarterName: canon.name })
      } else {
        const rn = regionName(p.r)
        out.push({ aliasName: p.name, target: `${rn} (region)`, sub: `counts under ${rn} region`,
          regionId: p.r, regionName: rn, quarterId: '', quarterName: '' })
      }
      shown.add(n)
    }
    return out
  }, [search, places, quarters, searchHits, macros])

  if (target) {
    return (
      <div style={{ border: `1.5px solid ${GPT_T.line}`, borderRadius: 15, padding: '13px 14px', background: GPT_T.wash, display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: GPT_T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GPTIcon name="pin" size={20} color="#fff" />
        </span>
        <div>
          <div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600 }}>{t.report.reportingFor}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>
            {target.name}, {target.region}
          </div>
        </div>
      </div>
    )
  }

  if (locMode === 'gps') {
    return (
      <div style={{ border: `1.5px solid ${GPT_T.line}`, borderRadius: 15, padding: '13px 14px', background: GPT_T.wash }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: gpsCoords ? th.on : th.out, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GPTIcon name="pin" size={20} color="#fff" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600 }}>{gpsCoords ? (gpsQuarter ? t.report.nearestArea : t.report.youreLocated) : t.report.useLocation}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>
              {gpsQuarter
                ? `${gpsQuarter.name}, ${gpsQuarter.region}`
                : gpsCoords
                  ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}`
                  : gpsBusy ? t.report.locating : t.report.tapToDetect}
            </div>
          </div>
          {gpsCoords ? <GPTIcon name="check" size={20} color={th.on} /> : null}
        </div>
        {!gpsCoords && (
          <button
            onClick={onRequestGps}
            disabled={gpsBusy}
            style={{ marginTop: 10, width: '100%', height: 40, borderRadius: 10, border: `1px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink, fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}
          >
            {gpsBusy ? t.report.locating : t.report.detectLocation}
          </button>
        )}
        {gpsError && <div style={{ marginTop: 8, fontSize: 12, color: th.out, fontWeight: 700 }}>{gpsError}</div>}
        <button
          onClick={() => onLocModeChange('manual')}
          style={{ marginTop: 10, width: '100%', height: 40, borderRadius: 10, border: `1px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
        >
          {t.report.pickAreaInstead}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {/* typeable search — fastest path for someone who knows their quarter's name */}
      <div style={{ position: 'relative' }}>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.report.searchPlaceholder}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, borderRadius: 13, border: `1.5px solid ${search ? GPT_T.ink : GPT_T.line}`, background: GPT_T.paper, padding: '8px 14px', fontFamily: GPT_FONT, fontSize: 15, color: GPT_T.ink, outline: 'none' }}
        />
        {(searchHits.length > 0 || aliasHits.length > 0) && (
          <div style={{ border: `1.5px solid ${GPT_T.line}`, borderRadius: 12, marginTop: 4, maxHeight: 240, overflow: 'auto', background: GPT_T.paper, boxShadow: '0 8px 24px rgba(15,23,34,0.12)' }}>
            {searchHits.map((q) => (
              <button
                key={q.id}
                onClick={() => onPickPlace({ regionId: q.regionId, regionName: q.region, quarterId: q.id, quarterName: q.name })}
                style={{ width: '100%', textAlign: 'start', padding: '11px 14px', border: 'none', borderTop: `1px solid ${GPT_T.line2}`, background: GPT_T.paper, cursor: 'pointer', fontFamily: GPT_FONT }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink }}>{q.name}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45 }}>{q.region}</div>
              </button>
            ))}
            {/* sub-village aliases → resolve to the nearest canonical quarter (shown after the dash) */}
            {aliasHits.map((a, idx) => (
              <button
                key={`a-${a.aliasName}-${idx}`}
                onClick={() => onPickPlace({ regionId: a.regionId, regionName: a.regionName, quarterId: a.quarterId, quarterName: a.quarterName })}
                style={{ width: '100%', textAlign: 'start', padding: '11px 14px', border: 'none', borderTop: `1px solid ${GPT_T.line2}`, background: GPT_T.paper, cursor: 'pointer', fontFamily: GPT_FONT }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: GPT_T.ink }}>
                  {a.aliasName} <span style={{ color: GPT_T.ink45, fontWeight: 600 }}>→ {a.target}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45 }}>{a.sub}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
        <div style={{ flex: 1, height: 1, background: GPT_T.line2 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: GPT_T.ink25 }}>{t.report.orPickFromList}</span>
        <div style={{ flex: 1, height: 1, background: GPT_T.line2 }} />
      </div>
      <Picker
        label={t.report.regionLabel}
        value={regionName}
        placeholder={t.report.regionPlaceholder}
        open={open === 'r'}
        onToggle={() => onOpenChange(open === 'r' ? null : 'r')}
        options={macros.map((m) => ({ id: m.id, name: m.region }))}
        onPick={onPickRegion}
      />
      <Picker
        label={t.report.quarterLabel}
        value={quarterName}
        placeholder={regionId ? (regionLoaded ? t.report.quarterOptional : t.report.loadingQuarters) : t.report.pickRegionFirst}
        disabled={!regionId}
        open={open === 'q'}
        onToggle={() => onOpenChange(open === 'q' ? null : 'q')}
        options={quarterOptions}
        onPick={onPickQuarter}
      />
      <button
        onClick={() => onLocModeChange('gps')}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: th.out, fontFamily: GPT_FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '2px 0' }}
      >
        {t.report.useGpsInstead}
      </button>
    </div>
  )
}
