// IncidentScreen.tsx — full-screen incident reporting surface (INC-02, INC-03, D-09, D-10).
// Shell discipline mirrors LeaderboardScreen: no AppHeader/BottomNav wrapping (they remain in App.tsx);
// token-only styling (GPT_T/FLAG/ACCENT from @/lib/tokens — D-12); RTL via useLang().
//
// Layout:
//   ┌─ TopBar (back + title + icon) ──────────────────────────────────────────────┐
//   ├─ Category filter chips (All + 7 slugs) ─────────────────────────────────────┤
//   ├─ Feed/Map toggle (D-09: feed primary, map second) ──────────────────────────┤
//   ├─ (feed view) IncidentFeedCard list or IncidentForm (geo-gated) ─────────────┤
//   └─ (map view)  GambiaMapLive with incidents prop ────────────────────────────-┘
//
// Geo-gate: when blocked, the report CTA is disabled and t.incidents.errors.geoBlocked is shown.
// RTL: dir="rtl" when lang === 'ar'; back-arrow mirrors via transform scaleX(-1).
import { useState, Suspense } from 'react'
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import { GPTIcon } from '@/components/icons'
import { useGeoGate } from '@/hooks/useGeoGate'
import { useIncidentFeed } from '@/hooks/useIncidents'
import { useSnapshot } from '@/hooks/useData'
import { IncidentForm } from '@/components/incidents/IncidentForm'
import { IncidentFeedCard } from '@/components/incidents/IncidentFeedCard'
import { GambiaMapLive } from '@/components/map/GambiaMap.lazy'

// ── Category filter state ────────────────────────────────────────────────────
const CATEGORY_SLUGS = ['flooding', 'road', 'water', 'electricity', 'waste', 'building', 'other'] as const

// Category → token color for the filter chip active border/bg.
const CATEGORY_COLOR: Record<string, string> = {
  flooding: FLAG.blue,
  road: ACCENT.amber,
  water: ACCENT.tile5,
  electricity: ACCENT.star,
  waste: GPT_T.ink45,
  building: FLAG.red,
  other: ACCENT.tile4,
}

type ViewMode = 'feed' | 'map'

export function IncidentScreen({ onBack }: { onBack?: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'
  const { blocked } = useGeoGate()

  const [category, setCategory] = useState<string>('') // '' = All
  const [view, setView] = useState<ViewMode>('feed')
  const [showForm, setShowForm] = useState(false)

  const feedQuery = useIncidentFeed(category)
  const rows = feedQuery.data?.rows ?? []

  // Snapshot needed for the GambiaMapLive map view — borrow the global snapshot.
  const snapshotQuery = useSnapshot()

  // All filter chips: "All" + 7 category slugs.
  const chips: { id: string; label: string }[] = [
    { id: '', label: t.incidents.feed.filterAll },
    ...CATEGORY_SLUGS.map((slug) => ({
      id: slug,
      label: (t.incidents.categories as Record<string, string>)[slug] ?? slug,
    })),
  ]

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: GPT_T.wash,
        fontFamily: GPT_FONT,
        direction: rtl ? 'rtl' : 'ltr',
      }}
    >
      {/* ── TopBar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: GPT_T.paper,
          borderBottom: `1px solid ${GPT_T.line}`,
          flexShrink: 0,
        }}
      >
        <button
          aria-label={t.nav.back}
          onClick={onBack}
          style={{
            width: 38,
            height: 38,
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: 11,
            transform: rtl ? 'scaleX(-1)' : undefined,
          }}
        >
          <GPTIcon name="back" size={23} color={GPT_T.ink70} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.incidents.title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.incidents.sub}</div>
        </div>
        {/* Water drop icon to represent incidents/rain */}
        <GPTIcon name="on" size={20} color={FLAG.blue} />
      </div>

      {/* ── Category filter chips ── */}
      <div
        style={{
          display: 'flex',
          gap: 7,
          overflowX: 'auto',
          padding: '10px 12px',
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {chips.map((c) => {
          const on = category === c.id
          const color = c.id ? (CATEGORY_COLOR[c.id] ?? GPT_T.ink) : GPT_T.ink
          return (
            <button
              key={c.id || 'all'}
              onClick={() => setCategory(c.id)}
              style={{
                flexShrink: 0,
                padding: '7px 13px',
                borderRadius: 999,
                border: `1.5px solid ${on ? color : GPT_T.line}`,
                background: on ? color : GPT_T.paper,
                color: on ? '#fff' : GPT_T.ink70,
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* ── Feed/Map toggle (D-09: feed is primary, map is secondary) ── */}
      <div
        style={{
          display: 'flex',
          gap: 1,
          padding: '0 12px 10px',
          flexShrink: 0,
        }}
      >
        {(['feed', 'map'] as ViewMode[]).map((v) => {
          const on = view === v
          // Localized toggle labels (EN/FR/AR) — no hardcoded strings (i18n + RTL safe).
          const tabLabel = v === 'feed' ? t.incidents.feed.feedTab : t.incidents.feed.mapTab
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: v === 'feed' ? '10px 0 0 10px' : '0 10px 10px 0',
                border: `1.5px solid ${on ? GPT_T.ink : GPT_T.line}`,
                background: on ? GPT_T.ink : GPT_T.paper,
                color: on ? '#fff' : GPT_T.ink70,
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {tabLabel}
            </button>
          )
        })}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: view === 'map' ? 'hidden' : 'auto', padding: view === 'map' ? 0 : '0 12px 16px' }}>
        {view === 'map' ? (
          /* Map view — GambiaMapLive with incident markers via the incidents prop (D-09). */
          <div style={{ height: '100%', position: 'relative' }}>
            {snapshotQuery.data ? (
              <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: GPT_T.wash }} />}>
                <GambiaMapLive
                  snapshot={snapshotQuery.data}
                  onPin={() => {}}
                  incidents={rows}
                />
              </Suspense>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: GPT_T.ink45,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                …
              </div>
            )}
          </div>
        ) : (
          /* Feed view */
          <>
            {/* Report CTA or geo-blocked note */}
            {blocked ? (
              <div
                role="alert"
                style={{
                  margin: '4px 0 12px',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: GPT_T.paper,
                  border: `1px solid ${FLAG.red}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: FLAG.red,
                }}
              >
                {t.incidents.errors.geoBlocked}
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                {showForm ? (
                  <div
                    style={{
                      padding: '14px',
                      background: GPT_T.paper,
                      border: `1px solid ${GPT_T.line}`,
                      borderRadius: 14,
                      marginBottom: 4,
                    }}
                  >
                    <IncidentForm
                      onSuccess={() => setShowForm(false)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 14,
                      border: `1.5px solid ${FLAG.blue}`,
                      background: FLAG.blue,
                      color: '#fff',
                      fontFamily: GPT_FONT,
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {t.incidents.report}
                  </button>
                )}
              </div>
            )}

            {/* Feed */}
            {feedQuery.isError ? (
              <div style={{ textAlign: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: '24px 0' }}>
                {t.incidents.feed.error}
              </div>
            ) : feedQuery.isLoading ? (
              <div style={{ textAlign: 'center', color: GPT_T.ink25, fontSize: 13, fontWeight: 600, padding: '24px 0' }}>
                …
              </div>
            ) : rows.length === 0 ? (
              <div style={{ textAlign: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: '24px 0' }}>
                {t.incidents.feed.empty}
              </div>
            ) : (
              rows.map((row) => <IncidentFeedCard key={row.id} row={row} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}
