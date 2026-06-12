// HomeScreen.tsx — Home. Map-first when tiles are allowed (data-saver OFF), else
// list-first (Phase 2). Ported/adapted from design/screens-main.jsx HomeScreen.
// When data-saver is off, the sorted-list block is preceded by a lazy-loaded
// Leaflet map (no tiles/JS until rendered); when on, the existing list-first
// view is shown with the data-saver banner. StatHero, MyAreaCard, ThumbDock and
// the all-on EmptyState all carry over faithfully.
import { Suspense } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import type { Snapshot, MacroPin } from '@/lib/types'
import { RightNowHero } from '@/components/shared/RightNowHero'
import { LiveStrip } from '@/components/community/LiveStrip'
import { ListRow } from '@/components/shared/ListRow'
import { Skeleton } from '@/components/shared/Skeleton'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'
import { MyAreaCard } from '@/components/MyAreaCard'
import { CommunityFeed } from '@/components/CommunityFeed'
import { SocialLinksSection } from '@/components/community/SocialLinksSection'
import { ContributorsBadge } from '@/components/profile/ContributorsBadge'
import { RankChip } from '@/components/profile/RankChip'
import { WallOfHonorTeaser } from '@/components/community/WallOfHonorTeaser'
import { useMyArea } from '@/hooks/useMyArea'
import { useMacro } from '@/hooks/useData'
import { sevToStatus } from '@/lib/status'
import { baselineOn } from '@/lib/launch'
import { shouldLoadMap } from '@/lib/netGate'
import { GambiaMapLive } from '@/components/map/GambiaMap.lazy'
import { FlagRule } from '@/components/Flag'
import { StatusStripConnected } from '@/components/shared/StatusStripConnected'

const MAP_HEIGHT = 168

/** Map-first region: lazy Leaflet map + a compact data-saver toggle above it. */
function MapRegion({
  snapshot,
  saver,
  onToggleSaver,
  onOpenZone,
}: {
  snapshot: Snapshot
  saver: boolean
  onToggleSaver: () => void
  onOpenZone: (id: string) => void
}) {
  const t = useT()
  return (
    <div style={{ margin: '8px 16px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontFamily: GPT_FONT, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase' }}>Live map</div>
        <button
          onClick={onToggleSaver}
          aria-pressed={saver}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 30,
            padding: '0 11px',
            borderRadius: 9,
            flexShrink: 0,
            cursor: 'pointer',
            background: saver ? GPT_T.ink : GPT_T.paper,
            color: saver ? '#fff' : GPT_T.ink70,
            border: `1px solid ${saver ? GPT_T.ink : GPT_T.line}`,
            fontFamily: GPT_FONT,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <GPTIcon name="saver" size={14} color={saver ? '#fff' : GPT_T.ink70} /> {t.home.dataSaverBtn}
        </button>
      </div>
      <div
        style={{
          height: MAP_HEIGHT,
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${GPT_T.line}`,
          background: GPT_T.wash,
        }}
      >
        <Suspense fallback={<Skeleton w="100%" h={MAP_HEIGHT} r={0} />}>
          <GambiaMapLive snapshot={snapshot} onPin={onOpenZone} />
        </Suspense>
      </div>
    </div>
  )
}

/** Data-saver banner shown in place of the map when tiles are suppressed. */
function MapSaverBanner({ saver, onToggleSaver }: { saver: boolean; onToggleSaver: () => void }) {
  const t = useT()
  return (
    <div
      style={{
        margin: '12px 16px',
        borderRadius: 14,
        border: `1px dashed ${GPT_T.line}`,
        background: GPT_T.paper,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: GPT_FONT,
      }}
    >
      <span style={{ width: 38, height: 38, borderRadius: 11, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <GPTIcon name="map" size={20} color={GPT_T.ink45} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink }}>{t.home.mapOffTitle}</div>
        <div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>{t.home.mapOffBody}</div>
      </div>
      <button
        onClick={onToggleSaver}
        aria-pressed={saver}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 34,
          padding: '0 12px',
          borderRadius: 10,
          flexShrink: 0,
          cursor: 'pointer',
          background: saver ? GPT_T.ink : GPT_T.paper,
          color: saver ? '#fff' : GPT_T.ink70,
          border: `1px solid ${saver ? GPT_T.ink : GPT_T.line}`,
          fontFamily: GPT_FONT,
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <GPTIcon name="saver" size={15} color={saver ? '#fff' : GPT_T.ink70} /> {t.home.dataSaverBtn}
      </button>
    </div>
  )
}

/** Connected MyAreaCard: resolves the saved area's live status from snapshot (region)
 * or the macro detail (quarter). Renders nothing until resolvable. */
function MyAreaCardConnected({
  snapshot,
  onReport,
  onOpen,
}: {
  snapshot: Snapshot
  onReport: (action: 'out' | 'back') => void
  onOpen: (id: string) => void
}) {
  const { myArea, clearArea, alertOn, toggleAlert } = useMyArea()
  const isQuarter = myArea?.kind === 'quarter'
  const macroQuery = useMacro(isQuarter ? (myArea?.regionId ?? null) : null)

  if (!myArea) return null

  if (myArea.kind === 'region') {
    const z = snapshot.macros.find((m) => m.id === myArea.id)
    if (!z) return null
    return (
      <MyAreaCard
        st={{ id: z.id, name: z.name, region: z.region, status: z.status, mins: z.todayMin, reports: z.reports, confirms: z.confirms, lastSignal: z.lastSignal, staleClose: z.staleClose, since: z.since }}
        alertOn={alertOn(z.id)}
        onOpen={() => onOpen(z.id)}
        onReport={onReport}
        onToggleAlert={() => toggleAlert({ id: z.id, name: z.name })}
        onClear={clearArea}
      />
    )
  }

  // quarter
  const macro = macroQuery.data
  if (!macro) return null
  const q = macro.quarters.find((x) => x.id === myArea.id)
  if (!q) return null
  return (
    <MyAreaCard
      st={{ id: q.id, name: q.name, region: myArea.region, status: q.status, mins: q.mins, reports: q.reports, confirms: q.confirms, lastSignal: q.lastSignal, staleClose: q.staleClose, since: q.since }}
      alertOn={alertOn(q.id)}
      onOpen={() => onOpen(myArea.regionId)}
      onReport={onReport}
      onToggleAlert={() => toggleAlert({ id: q.id, name: q.name })}
      onClear={clearArea}
    />
  )
}

/** Compact Wall of Honor entry point (Phase 5). Light civic card — keeps Home airy (the dark mass
 * ends at the hero) and consistent with the other light content cards. No fetch on first paint. */
function CommunityStrip({ onCommunity }: { onCommunity: () => void }) {
  const t = useT()
  const th = useTheme()
  return (
    <button
      onClick={onCommunity}
      style={{
        margin: '10px 16px 2px', width: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', gap: 11,
        textAlign: 'start', padding: '10px 14px', borderRadius: 14, cursor: 'pointer',
        background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, boxShadow: '0 1px 2px rgba(15,23,34,0.04)', fontFamily: GPT_FONT,
      }}
    >
      <span style={{ width: 32, height: 32, borderRadius: 10, background: th.onBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <GPTIcon name="shield" size={17} color={th.on} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink }}>{t.community.strip}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{t.community.stripSub}</div>
      </div>
      <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
    </button>
  )
}


export function HomeScreen({
  snapshot,
  loading,
  error = false,
  onRetry,
  saver,
  onToggleSaver,
  onList,
  onOpenZone,
  onCommunity,
  onNews,
  onReport,
}: {
  snapshot?: Snapshot
  loading: boolean
  /** M4: snapshot fetch failed AND there's no cached copy to show — offer a Retry instead of an
      empty "no reports" reading that would misrepresent a network error as a quiet grid. */
  error?: boolean
  onRetry?: () => void
  saver: boolean
  onToggleSaver: () => void
  onList: () => void
  onOpenZone: (id: string) => void
  onCommunity: () => void
  onNews: () => void
  onReport: (action: 'out' | 'back') => void
}) {
  const th = useTheme()
  const t = useT()
  const national = snapshot?.national ?? { hours: 0, mins: 0, regionsOut: 0, regionsTotal: 7, reports: 0 }
  const macros: MacroPin[] = snapshot?.macros ?? []
  const sorted = [...macros].sort((a, b) => b.sev - a.sev)
  // Launch baseline: the country is (estimated) dark → always show the map + list so the reality
  // is front-and-centre, not the "all on" empty state.
  const anyOut = baselineOn() || sorted.some((m) => sevToStatus(m.sev) !== 'on')
  // Map-first when tiles are allowed (data-saver OFF + not 2G); else list-first.
  const showMap = !!snapshot && shouldLoadMap(saver)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      <FlagRule height={3} radius={0} style={{ width: '100%' }} />
      <StatusStripConnected />
      <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <LiveStrip />
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 16px 0', padding: '11px 14px', borderRadius: 13, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, fontFamily: GPT_FONT }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: GPT_T.ink70 }}>{t.zone.loadError}</span>
            <button onClick={onRetry} style={{ flexShrink: 0, height: 34, padding: '0 16px', borderRadius: 10, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.wash, color: GPT_T.ink, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
              {t.zone.retry}
            </button>
          </div>
        )}
        {/* M3-B: reserve the hero's footprint while the snapshot loads — without this the bars pop
            in mid-paint and shove everything below (visible layout shift on every cold open). */}
        {loading ? (
          <div style={{ padding: '14px 16px 15px' }}>
            <Skeleton w="100%" h={230} r={16} />
          </div>
        ) : (
          <RightNowHero macros={macros} onOpenZone={onOpenZone} />
        )}
        <RankChip />
        {snapshot && <MyAreaCardConnected snapshot={snapshot} onReport={onReport} onOpen={onOpenZone} />}

        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton w="100%" h={56} r={12} />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} w="100%" h={64} r={10} />
            ))}
          </div>
        ) : !anyOut ? (
          national.reports > 0 ? (
            // Genuine: neighbours reported and nothing is currently out ⇒ power is on.
            // Kept compact (no minHeight) so the From-Facebook feed below is visible without scrolling.
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', textAlign: 'start', padding: '14px 16px', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: th.onBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GPTIcon name="on" size={24} color={th.on} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.3 }}>{t.empty.title}</div>
                <div style={{ fontSize: 12.5, color: GPT_T.ink70, fontWeight: 500, lineHeight: 1.35, marginTop: 1 }}>
                  {t.empty.body(national.regionsTotal)}
                </div>
              </div>
            </div>
          ) : (
            // Evidence gate: ZERO reports anywhere ⇒ make NO power claim (neutral grey, not green).
            // Compact (no minHeight) so the From-Facebook feed below stays visible.
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', textAlign: 'start', padding: '14px 16px', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: th.nodataBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GPTIcon name="nodata" size={24} color={th.nodataDeep} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.3 }}>{t.empty.noReportsTitle}</div>
                <div style={{ fontSize: 12.5, color: GPT_T.ink70, fontWeight: 500, lineHeight: 1.35, marginTop: 1 }}>
                  {t.empty.noReportsBody}
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            {showMap && snapshot ? (
              <MapRegion snapshot={snapshot} saver={saver} onToggleSaver={onToggleSaver} onOpenZone={onOpenZone} />
            ) : (
              <MapSaverBanner saver={saver} onToggleSaver={onToggleSaver} />
            )}
            {snapshot?.feed && snapshot.feed.length > 0 && (
              <CommunityFeed notes={snapshot.feed} onSeeAll={onCommunity} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px' }}>
              <div style={{ fontFamily: GPT_FONT, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase' }}>{t.home.tapArea}</div>
              <button
                onClick={onList}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 700, color: GPT_T.ink70, padding: 0 }}
              >
                <GPTIcon name="list" size={15} color={GPT_T.ink70} /> {t.home.allQuarters}
              </button>
            </div>
            {sorted.map((z, i) => (
              <ListRow key={z.id} zone={z} rank={i + 1} onClick={() => onOpenZone(z.id)} />
            ))}
            <div style={{ height: 8 }} />
          </>
        )}

        {/* M3-C information hierarchy: the civic teasers (honors, community door, social proof) used
            to sit between the hero and the zone list — 8 competing sections before the fold. They now
            follow the outage data: hero + my-area + zones first, discovery second. */}
        <WallOfHonorTeaser />
        <CommunityStrip onCommunity={onCommunity} />
        <ContributorsBadge variant="home" />

        {/* "From Facebook" — owner-curated posts. On Home we show a short teaser (the full feed lives
            in the News tab) so the single scroll container stays manageable. Self-fetches; renders
            nothing when empty. */}
        <div style={{ padding: '8px 16px 12px' }}>
          <SocialLinksSection limit={3} onSeeAll={onNews} />
        </div>
      </div>
    </div>
  )
}
