// IncidentScreen.tsx — the "Incidents" primary tab (INC-02/03, D-09/10; claude-design pass 2026-06-22).
// A top-level nav tab (it replaced the global Map tab), so it sits UNDER the global AppHeader + above
// the BottomNav (both owned by App.tsx) — it must NOT be position:absolute.
//
// Layout (below the global AppHeader):
//   ┌─ ScreenHeader: "Incident Reports" + subtitle + alert-triangle + tricolor rule ──────────────┐
//   ├─ Category filter chips: [All] [Power cut] + 7 civic slugs, wrapped, colour-dot, glyph ───────┤
//   ├─ Feed/Map toggle (D-09: feed primary, map second) with icons ─────────────────────────────-─┤
//   ├─ (feed) Report CTAs (incident + power cut) / inline IncidentForm + merged feed ──────────────┤
//   └─ (map)  GambiaMapLive (snapshot outage pins = power cuts + civic incident markers) + legend ──┘
//
// Power cuts (owner decision 2026-06-22): the quarters dark right now (snapshot.quarters) surface
// FIRST in the feed + as their own filter chip; the "Report a power cut" CTA routes to the existing
// OUT/BACK flow (onReportPowercut), never the photo-mandatory incident form.
//
// Geo-gate: when blocked, the report CTAs are replaced by t.incidents.errors.geoBlocked.
import { useState, Suspense, useMemo } from 'react'
import { GPT_T, GPT_FONT, FLAG, BUTTON_PRIMARY } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import { GPTIcon } from '@/components/icons'
import { FlagRule } from '@/components/Flag'
import { useGeoGate } from '@/hooks/useGeoGate'
import { useIncidentFeed } from '@/hooks/useIncidents'
import { useSnapshot } from '@/hooks/useData'
import { baselineOn } from '@/lib/launch'
import { IncidentForm } from '@/components/incidents/IncidentForm'
import { IncidentFeedCard } from '@/components/incidents/IncidentFeedCard'
import { PowercutFeedCard } from '@/components/incidents/PowercutFeedCard'
import { buildPowercutEntries } from '@/components/incidents/powercutFeed'
import { GambiaMapLive } from '@/components/map/GambiaMap.lazy'
import {
  CATEGORY_SLUGS,
  CATEGORY_COLOR,
  catText,
  CatGlyph,
  AlertTri,
  rgba,
  POWERCUT_SLUG,
} from '@/components/incidents/incidentVisuals'

type ViewMode = 'feed' | 'map'

// Filter chips order: All → Power cut → 7 civic categories.
const FILTER_SLUGS = [POWERCUT_SLUG, ...CATEGORY_SLUGS] as const

export function IncidentScreen({ onReportPowercut }: { onReportPowercut?: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'
  const { blocked } = useGeoGate()

  const [category, setCategory] = useState<string>('') // '' = All
  const [view, setView] = useState<ViewMode>('feed')
  const [showForm, setShowForm] = useState(false)

  // Civic-incident feed: when "Power cut" is the active filter we want ZERO civic rows, so we fetch
  // the All feed (shared cache) but suppress the rows below.
  const isPowercutFilter = category === POWERCUT_SLUG
  const feedCategory = isPowercutFilter ? '' : category
  const feedQuery = useIncidentFeed(feedCategory)
  const incidentRows = isPowercutFilter ? [] : (feedQuery.data?.rows ?? [])

  // Snapshot drives both the map outage pins AND the dark-now power-cut feed entries.
  const snapshotQuery = useSnapshot()
  const powercuts = useMemo(
    () => buildPowercutEntries(snapshotQuery.data, baselineOn()),
    [snapshotQuery.data],
  )
  const showPowercuts = category === '' || isPowercutFilter

  // Chips: All + Power cut + civic slugs.
  const chips: { id: string; label: string }[] = [
    { id: '', label: t.incidents.feed.filterAll },
    ...FILTER_SLUGS.map((slug) => ({
      id: slug,
      label: (t.incidents.categories as Record<string, string>)[slug] ?? slug,
    })),
  ]

  const feedHasRows = (showPowercuts && powercuts.length > 0) || incidentRows.length > 0

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: GPT_T.wash,
        fontFamily: GPT_FONT,
        direction: rtl ? 'rtl' : 'ltr',
      }}
    >
      {/* ── Screen header — title + subtitle + alert-triangle + tricolor rule (the brand mark lives
            on the global AppHeader above). ── */}
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 16px 10px',
            background: GPT_T.paper,
            flexDirection: rtl ? 'row-reverse' : 'row',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, textAlign: rtl ? 'right' : 'left' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1, letterSpacing: -0.2 }}>{t.incidents.title}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 3 }}>{t.incidents.sub}</div>
          </div>
          <span style={{ display: 'inline-flex', width: 32, height: 32, borderRadius: 9, background: rgba(FLAG.red, 0.09), alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTri size={18} color={FLAG.red} />
          </span>
        </div>
        <FlagRule height={3} radius={0} style={{ width: '100%' }} />
      </div>

      {/* ── Category filter chips — wrapped, colour-dot + power cut first ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '10px 12px', flexShrink: 0 }}>
        {chips.map((c) => {
          const on = category === c.id
          const color = c.id ? (CATEGORY_COLOR[c.id] ?? GPT_T.ink) : GPT_T.ink
          const txt = on ? (c.id ? catText(c.id) : '#fff') : GPT_T.ink70
          return (
            <button
              key={c.id || 'all'}
              onClick={() => setCategory(c.id)}
              style={{
                padding: '7px 13px',
                borderRadius: 999,
                border: `1.5px solid ${on ? color : GPT_T.line}`,
                background: on ? color : GPT_T.paper,
                color: txt,
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {c.id && <span style={{ width: 8, height: 8, borderRadius: 999, background: on ? txt : color, flexShrink: 0 }} />}
              {c.label}
            </button>
          )
        })}
      </div>

      {/* ── Feed/Map toggle (D-09: feed primary, map secondary) ── */}
      <div style={{ display: 'flex', padding: '0 12px 10px', flexShrink: 0 }}>
        {(['feed', 'map'] as ViewMode[]).map((v, i) => {
          const on = view === v
          const startCap = i === 0
          const radius = rtl ? (startCap ? '0 10px 10px 0' : '10px 0 0 10px') : (startCap ? '10px 0 0 10px' : '0 10px 10px 0')
          const label = v === 'feed' ? t.incidents.feed.feedTab : t.incidents.feed.mapTab
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: radius,
                border: `1.5px solid ${on ? GPT_T.ink : GPT_T.line}`,
                marginInlineStart: i ? -1.5 : 0,
                background: on ? GPT_T.ink : GPT_T.paper,
                color: on ? '#fff' : GPT_T.ink70,
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                position: 'relative',
                zIndex: on ? 2 : 1,
              }}
            >
              <GPTIcon name={v === 'feed' ? 'list' : 'map'} size={16} color={on ? '#fff' : GPT_T.ink45} /> {label}
            </button>
          )
        })}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: view === 'map' ? 'hidden' : 'auto', padding: view === 'map' ? 0 : '0 12px 16px' }}>
        {view === 'map' ? (
          /* Map view — GambiaMapLive draws the snapshot outage pins (= power cuts) AND civic incident
             markers via the incidents prop. When the Power-cut filter is active we pass no civic
             markers so only outage pins remain. */
          <div style={{ height: '100%', position: 'relative' }}>
            {snapshotQuery.data ? (
              <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: GPT_T.wash }} />}>
                <GambiaMapLive
                  snapshot={snapshotQuery.data}
                  onPin={() => {}}
                  incidents={isPowercutFilter ? [] : incidentRows}
                />
              </Suspense>
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600 }}>…</div>
            )}

            {/* Category legend overlay (power cut + civic) */}
            <div
              style={{
                position: 'absolute',
                insetInlineStart: 12,
                bottom: 12,
                background: rgba(GPT_T.paper, 0.94),
                border: `1px solid ${GPT_T.line}`,
                borderRadius: 11,
                padding: '8px 10px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '5px 12px',
                zIndex: 500,
                pointerEvents: 'none',
              }}
            >
              {[POWERCUT_SLUG, ...CATEGORY_SLUGS].map((s) => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: GPT_T.ink70 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: CATEGORY_COLOR[s], border: `1.5px solid ${GPT_T.paper}`, boxShadow: `0 0 0 1px ${rgba(GPT_T.ink, 0.15)}`, flexShrink: 0 }} />
                  {((t.incidents.categories as Record<string, string>)[s] ?? s).split(' / ')[0]}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Feed view */
          <>
            {/* Report CTAs or geo-blocked note */}
            {blocked ? (
              <div
                role="alert"
                style={{
                  margin: '4px 0 12px',
                  padding: '11px 13px',
                  borderRadius: 12,
                  background: GPT_T.paper,
                  border: `1px solid ${FLAG.red}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: FLAG.red,
                  display: 'flex',
                  gap: 9,
                  alignItems: 'center',
                  flexDirection: rtl ? 'row-reverse' : 'row',
                  textAlign: rtl ? 'right' : 'left',
                }}
              >
                <AlertTri size={18} color={FLAG.red} />
                <span style={{ flex: 1 }}>{t.incidents.errors.geoBlocked}</span>
              </div>
            ) : showForm ? (
              <div style={{ padding: 14, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, margin: '4px 0 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexDirection: rtl ? 'row-reverse' : 'row' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink }}>{t.incidents.newReport}</span>
                  <button onClick={() => setShowForm(false)} aria-label={t.incidents.close} style={{ width: 30, height: 30, border: 'none', background: GPT_T.wash, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GPTIcon name="close" size={16} color={GPT_T.ink70} />
                  </button>
                </div>
                <IncidentForm onSuccess={() => setShowForm(false)} initialCategory={category} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '4px 0 12px' }}>
                {isPowercutFilter ? (
                  /* Power-cut filter active → the ONLY report action is the CLASSIC outage flow
                     (OUT/BACK ReportSheet), NEVER the photo-mandatory incident form. Primary ink CTA so
                     "select Power cut → report a power cut" is unmistakable (no detour to "add a photo"). */
                  onReportPowercut && (
                    <button onClick={onReportPowercut} style={{ ...BUTTON_PRIMARY, width: '100%' }}>
                      <CatGlyph slug={POWERCUT_SLUG} size={18} color="#fff" /> {t.incidents.reportPowercut}
                    </button>
                  )
                ) : (
                  <>
                    <button onClick={() => setShowForm(true)} style={{ ...BUTTON_PRIMARY, width: '100%' }}>
                      <AlertTri size={18} color="#fff" /> {t.incidents.report}
                    </button>
                    {onReportPowercut && (
                      <button
                        onClick={onReportPowercut}
                        style={{
                          width: '100%',
                          minHeight: 46,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '11px 16px',
                          borderRadius: 14,
                          border: `1.5px solid ${GPT_T.line}`,
                          background: GPT_T.paper,
                          color: GPT_T.ink,
                          fontFamily: GPT_FONT,
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        <CatGlyph slug={POWERCUT_SLUG} size={17} color={CATEGORY_COLOR[POWERCUT_SLUG]} /> {t.incidents.reportPowercut}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Feed: power cuts first (dark-now), then civic incidents */}
            {feedQuery.isError && incidentRows.length === 0 && !showPowercuts ? (
              <div style={{ textAlign: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: '24px 0' }}>{t.incidents.feed.error}</div>
            ) : feedQuery.isLoading && !isPowercutFilter && powercuts.length === 0 ? (
              <div style={{ textAlign: 'center', color: GPT_T.ink25, fontSize: 13, fontWeight: 600, padding: '24px 0' }}>…</div>
            ) : !feedHasRows ? (
              <div style={{ textAlign: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: '24px 0' }}>{isPowercutFilter ? t.incidents.feed.emptyPowercut : t.incidents.feed.empty}</div>
            ) : (
              <>
                {showPowercuts && powercuts.map((p) => <PowercutFeedCard key={`pc-${p.id}`} entry={p} />)}
                {incidentRows.map((row) => <IncidentFeedCard key={row.id} row={row} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
