// RegionMaps.tsx — the macro-region geographic blocks, ported from the Claude Design
// handoff "Gambia Region Pages.html" (Direction B · Line). Shown ONLY on the macro
// view of ZoneScreen. Four blocks, all driven by LIVE macro data:
//   1. identity hero  — the region silhouette (line map) + macro-area / seat
//   2. locator strip  — the whole country with this region pinned (amber)
//   3. territory zoom — the region enlarged with its quarters plotted at real coords
//   4. summary stats  — quarters tracked · dark now · lit now
//
// Region shapes (real ADM1 boundaries) are lazy-fetched once from /region-shapes.json,
// so nothing here is added to the entry bundle or first paint.
import { useEffect, useState, type ReactNode } from 'react'
import { GPT_T, GPT_FONT, THEMES } from '@/lib/tokens'
import type { Macro } from '@/lib/types'
import { displayStatus } from '@/lib/status'
import { baselineOn } from '@/lib/launch'
import { loadRegionShapes, type RegionShape } from '@/lib/regionGeo'
import { buildRegionLineSVG, buildLocatorSVG, buildZoomSVG, type ZoomQuarter, type Tone } from '@/lib/regionArt'
import { useT } from '@/i18n/useT'

// amber accent from the canonical theme (the design's RT.amber / RT.amberDeep)
const THEMES_ON = THEMES.standard.on
const THEMES_ON_DEEP = THEMES.standard.onDeep

// Admin seat per macro id — not carried in the read-model; static like the design's META.
const REGION_SEAT: Record<string, string> = {
  banjul: 'Banjul',
  kanifing: 'Kanifing · KMC',
  brikama: 'Brikama',
  kerewan: 'Kerewan',
  mansakonko: 'Mansa Konko',
  janjanbureh: 'Janjanbureh',
  basse: 'Basse Santa Su',
}

// Contextual one-liner under the territory zoom (verbatim from the design).
const ZOOM_COPY: Record<string, ReactNode> = {
  banjul: (
    <span>
      All quarters sit on <b style={{ color: GPT_T.ink70 }}>St. Mary&rsquo;s Island</b> — the capital&rsquo;s dense old-town grid,
      the busiest reporting area in the country.
    </span>
  ),
  kanifing: (
    <span>
      Quarters plotted at their real positions across the <b style={{ color: GPT_T.ink70 }}>KMC</b> conurbation — Serrekunda
      inland to the coast at Bakau &amp; Kotu.
    </span>
  ),
  brikama: (
    <span>
      The largest region — towns spread from <b style={{ color: GPT_T.ink70 }}>Sukuta</b> on the coast down to{' '}
      <b style={{ color: GPT_T.ink70 }}>Gunjur</b> and inland to Brikama.
    </span>
  ),
  kerewan: (
    <span>
      Settlements line the <b style={{ color: GPT_T.ink70 }}>north bank</b> of the river, from Barra at the mouth east to
      Farafenni.
    </span>
  ),
  mansakonko: (
    <span>
      A compact south-bank cluster around <b style={{ color: GPT_T.ink70 }}>Soma</b> and the Mansa Konko junction.
    </span>
  ),
  janjanbureh: (
    <span>
      Towns strung along the river — <b style={{ color: GPT_T.ink70 }}>Janjanbureh</b> island, Bansang, and the Kuntaur
      stone-circles area.
    </span>
  ),
  basse: (
    <span>
      The eastern frontier — from <b style={{ color: GPT_T.ink70 }}>Basse Santa Su</b> out to Fatoto, the last major town
      before the border.
    </span>
  ),
}

function rawSVG(html: string, style: React.CSSProperties) {
  return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span
        style={{
          fontFamily: GPT_FONT,
          fontSize: 24,
          fontWeight: 800,
          color: accent || GPT_T.ink,
          letterSpacing: -0.6,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: GPT_FONT,
          fontSize: 11,
          fontWeight: 700,
          color: GPT_T.ink45,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  border: `1px solid ${GPT_T.line}`,
  borderRadius: 14,
}
const EYEBROW: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.8,
  color: GPT_T.ink45,
  textTransform: 'uppercase',
}

/** Map a live quarter's display status to a plot tone (evidence-gated: nodata is neither dark nor lit). */
function toneOf(q: Macro['quarters'][number], baseline: boolean): Tone {
  const ds = displayStatus({ reports: q.reports, status: q.status, sev: q.sev, lastSignal: q.lastSignal, staleClose: q.staleClose }, baseline)
  if (ds === 'on') return 'lit'
  if (ds === 'nodata') return 'nodata'
  return 'dark' // out / partial / estimated
}

export function RegionMaps({ macro }: { macro: Macro }) {
  const t = useT()
  const [shapes, setShapes] = useState<Record<string, RegionShape> | null>(null)
  useEffect(() => {
    let alive = true
    loadRegionShapes().then((s) => {
      if (alive) setShapes(s)
    })
    return () => {
      alive = false
    }
  }, [])

  const region = shapes?.[macro.id]
  // Only render once the geometry for THIS region is available (the locator/zoom also
  // need the sibling shapes, which arrive in the same payload).
  if (!shapes || !region) {
    return <div style={{ height: 8, background: GPT_T.wash }} />
  }

  const regions = Object.values(shapes)
  const isCity = macro.id === 'banjul' || macro.id === 'kanifing'
  const baseline = baselineOn()
  const seat = REGION_SEAT[macro.id]

  // Live quarters with real coords → plotted on the zoom; tone from display status.
  const plotted: ZoomQuarter[] = macro.quarters
    .filter((q) => typeof q.lat === 'number' && typeof q.lng === 'number')
    .map((q) => ({ name: q.name, lng: q.lng as number, lat: q.lat as number, tone: toneOf(q, baseline), reports: q.reports }))

  // Summary counts from display status (nodata counts toward neither dark nor lit).
  let darkN = 0,
    litN = 0
  macro.quarters.forEach((q) => {
    const t = toneOf(q, baseline)
    if (t === 'dark') darkN++
    else if (t === 'lit') litN++
  })

  const heroSVG = buildRegionLineSVG(region, isCity, 360, 282)
  const locatorSVG = buildLocatorSVG(regions, macro.id, 520, 150)
  const zoomSVG = buildZoomSVG(regions, macro.id, macro.region, isCity, plotted, 520, 300)
  const hasPlots = plotted.length > 0

  return (
    <div style={{ background: GPT_T.paper2, padding: '4px 0 18px', borderBottom: `8px solid ${GPT_T.wash}`, fontFamily: GPT_FONT }}>
      {/* identity hero — line map + macro-area / seat */}
      <div style={{ padding: '18px 18px 4px', display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <div
          style={{
            width: 168,
            height: 132,
            borderRadius: 14,
            overflow: 'hidden',
            border: `1px solid rgba(17,22,28,0.12)`,
            flexShrink: 0,
            background: GPT_T.paper2,
          }}
        >
          {rawSVG(heroSVG, { width: '100%', height: '100%' })}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, color: GPT_T.ink45, textTransform: 'uppercase' }}>
            {t.regionMaps.macroAreaLabel}
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.9, lineHeight: 1, marginTop: 6 }}>
            {macro.region}
          </div>
          {seat && <div style={{ fontSize: 13, fontWeight: 600, color: GPT_T.ink70, marginTop: 5 }}>{t.regionMaps.seatLabel(seat)}</div>}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: THEMES_ON, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: GPT_T.ink70 }}>{t.regionMaps.locatorDescription}</span>
          </div>
        </div>
      </div>

      {/* locator strip — whole country with this region pinned */}
      <div style={{ margin: '12px 18px 0', padding: '12px 14px 10px', ...CARD }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={EYEBROW}>{t.regionMaps.locatorTitle}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: THEMES_ON_DEEP }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: THEMES_ON,
                border: '1.5px solid #fff',
                boxShadow: `0 0 0 1.5px ${THEMES_ON}`,
              }}
            />
            {macro.region}
          </span>
        </div>
        <div style={{ width: '100%', height: 84 }}>{rawSVG(locatorSVG, { width: '100%', height: '100%' })}</div>
      </div>

      {/* territory zoom — region enlarged, quarters plotted at real coords */}
      <div style={{ margin: '12px 18px 0', padding: '12px 14px 12px', ...CARD }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={EYEBROW}>{isCity ? t.regionMaps.zoomTitleCity : t.regionMaps.zoomTitleRegion}</span>
          {hasPlots ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: GPT_T.ink }}>
                <span
                  style={{ width: 9, height: 9, borderRadius: 999, background: GPT_T.ink, border: '1.2px solid #fff', boxShadow: `0 0 0 1px ${GPT_T.ink}` }}
                />
                {t.regionMaps.darkLegend}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: THEMES_ON_DEEP }}>
                <span
                  style={{ width: 9, height: 9, borderRadius: 999, background: THEMES_ON, border: '1.2px solid #fff', boxShadow: `0 0 0 1px ${THEMES_ON}` }}
                />
                {t.regionMaps.lightLegend}
              </span>
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 800, color: THEMES_ON_DEEP, letterSpacing: 0.3 }}>{t.regionMaps.banjulCityLabel}</span>
          )}
        </div>
        <div style={{ width: '100%', height: 196, borderRadius: 11, overflow: 'hidden', border: `1px solid rgba(17,22,28,0.10)` }}>
          {rawSVG(zoomSVG, { width: '100%', height: '100%' })}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 9, lineHeight: 1.4 }}>{ZOOM_COPY[macro.id]}</div>
      </div>

      {/* summary strip */}
      <div style={{ margin: '14px 18px 0', padding: '14px 16px', display: 'flex', alignItems: 'center', ...CARD }}>
        <Stat value={macro.quarters.length} label={t.regionMaps.quartersLabel} />
        <span style={{ width: 1, alignSelf: 'stretch', background: GPT_T.line, margin: '2px 4px' }} />
        <Stat value={darkN} label={t.regionMaps.darkNowLabel} accent={GPT_T.ink} />
        <span style={{ width: 1, alignSelf: 'stretch', background: GPT_T.line, margin: '2px 4px' }} />
        <Stat value={litN} label={t.regionMaps.litNowLabel} accent={THEMES_ON_DEEP} />
      </div>
    </div>
  )
}
