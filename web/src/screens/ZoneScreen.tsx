// ZoneScreen.tsx — macro/quarter detail. Ported from design/screen-zone.jsx.
// Route id is either a macro id ("banjul") or a quarter id ("banjul-0").
// Quarters reuse the parent macro's week/events/notes (prototype behaviour) but show
// their own name/sev/duration/reports/confirms.
import { useEffect, useRef, type ReactNode } from 'react'
import { GPT_T, GPT_FONT, BUTTON_SECONDARY, type Status } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'
import type { Macro, EventItem, NoteItem, Quarter } from '@/lib/types'
import { useMacro, useQuickReport } from '@/hooks/useData'
import { useMyArea } from '@/hooks/useMyArea'
import { displayStatus } from '@/lib/status'
import { SINGLE_REPORT_TRUTH } from '@/lib/flags'
import { baselineOn } from '@/lib/launch'
import { fmtHM } from '@/lib/format'
import { StatusPill } from '@/components/StatusPill'
import { IconBtn } from '@/components/shared/IconBtn'
import { LogoMark } from '@/components/Logo'
import { BarChart7 } from '@/components/shared/charts'
import { Skeleton } from '@/components/shared/Skeleton'
import { ConfidenceChip, ConfidenceMeter, TrustLine, AreaActions } from '@/components/trust'
import { GPTIcon } from '@/components/icons'
import { ZoneDiscussion } from '@/components/community/ZoneDiscussion'
import { RegionMaps } from '@/components/RegionMaps'

interface ResolvedZone {
  id: string
  name: string
  region: string
  status: Status
  sev: number
  todayMin: number
  reports: number
  confirms: number
  lastSignal?: 'out' | 'back' | null
  staleClose?: boolean
  since?: string | null
  week: number[]
  events: EventItem[]
  notes: NoteItem[]
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div style={{ background: GPT_T.paper, padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}` }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2, marginBottom: 14 }}>{sub}</div>}
      {children}
    </div>
  )
}

function resolveZone(macro: Macro, id: string): ResolvedZone | null {
  if (macro.id === id) {
    return {
      id: macro.id,
      name: macro.name,
      region: macro.region,
      status: macro.status,
      sev: macro.sev,
      todayMin: macro.todayMin,
      reports: macro.reports,
      confirms: macro.confirms,
      lastSignal: macro.lastSignal,
      staleClose: macro.staleClose,
      since: macro.since,
      week: macro.week,
      events: macro.events,
      notes: macro.notes,
    }
  }
  const q = macro.quarters.find((x) => x.id === id)
  if (!q) return null
  return {
    id: q.id,
    name: q.name,
    region: macro.region,
    status: q.status,
    sev: q.sev,
    todayMin: q.mins,
    reports: q.reports,
    confirms: q.confirms,
    lastSignal: q.lastSignal,
    staleClose: q.staleClose,
    since: q.since,
    week: macro.week, // prototype: quarter reuses parent's 7-day history
    events: q.events ?? macro.events, // the quarter's OWN timeline (fallback: stale cached snapshot shape)
    notes: q.notes ?? [], // but the community feed is the QUARTER's own notes
  }
}

/** Quarter picker — the neighbourhoods under a macro. Solves "which district is my quarter under?":
 * tapping a macro lists every quarter so a user can find theirs directly (worst-hit first). */
function QuarterPicker({ quarters, currentId, region, onOpen }: { quarters: Quarter[]; currentId: string; region: string; onOpen: (id: string) => void }) {
  const th = useTheme()
  const t = useT()
  const b = baselineOn()
  const list = quarters.filter((q) => q.id !== currentId).sort((a, x) => x.sev - a.sev)
  if (list.length === 0) return null
  const viewingMacro = currentId.indexOf('-') === -1
  return (
    <div style={{ background: GPT_T.paper, borderBottom: `8px solid ${GPT_T.wash}` }}>
      <div style={{ padding: '14px 18px 6px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>
          {viewingMacro ? t.zone.neighbourhoodsIn(region) : t.zone.otherNeighbourhoodsIn(region)}
        </div>
        <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2 }}>
          {viewingMacro ? t.zone.tapYoursSub : t.zone.tapToSwitchSub} · {t.zone.areasCount(list.length)}
        </div>
      </div>
      <div>
        {list.map((q, i) => {
          const ds = displayStatus(q, b)
          const noDur = ds === 'nodata' || ds === 'estimated'
          return (
            <button
              key={q.id}
              onClick={() => onOpen(q.id)}
              style={{ width: '100%', textAlign: 'start', background: GPT_T.paper, border: 'none', borderTop: i === 0 ? `1px solid ${GPT_T.line2}` : 'none', borderBottom: `1px solid ${GPT_T.line2}`, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', minHeight: 52, fontFamily: GPT_FONT }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 999, background: th[ds], flexShrink: 0, boxShadow: `0 0 0 3px ${th[`${ds}Bg`]}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                {/* "0 reports" next to a DARK/EST pill triple-encodes the empty state — same fallback
                    wording as the All-quarters list instead. */}
                <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>{q.reports > 0 ? t.zone.reportsCount(q.reports) : ds === 'estimated' ? t.list.awaitingEstimated : t.list.awaitingReports}</div>
              </div>
              <StatusPill status={ds} size="sm" />
              <span style={{ fontSize: 13.5, fontWeight: 800, color: noDur ? GPT_T.ink25 : GPT_T.ink, fontVariantNumeric: 'tabular-nums', minWidth: 48, textAlign: 'end' }}>{noDur ? '—' : fmtHM(q.mins)}</span>
              <GPTIcon name="chevron" size={16} color={GPT_T.ink25} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ZoneScreen({
  routeId,
  onBack,
  onReport,
  onShare,
  onToast,
  onOpenZone,
}: {
  routeId: string
  onBack: () => void
  onReport: (action: 'out' | 'back', zone: { id: string; name: string; region: string }) => void
  onShare: () => void
  onToast?: (text: string) => void
  onOpenZone: (id: string) => void
}) {
  const th = useTheme()
  const t = useT()
  const macroId = routeId.includes('-') ? routeId.split('-')[0] : routeId
  const { data: macro, isLoading, isError, refetch } = useMacro(macroId)
  const { myArea, pinArea, clearArea, alertOn, toggleAlertWithPush } = useMyArea()
  // Opening another area (e.g. tapping a quarter in the picker) keeps this same screen mounted,
  // so the scroll container would otherwise stay where it was — leaving a new visitor mid-page
  // instead of at the big area title. Reset to the top whenever the zone changes.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [routeId])

  // One-tap "Still dark · Ankum si" reconfirm — the user is already ON their zone, so re-affirming
  // the outage shouldn't reopen the whole report sheet. Posts the OUT directly and toasts the result.
  const quickReport = useQuickReport()
  const confirmStillOut = async (z: { id: string; name: string; region: string }) => {
    const res = await quickReport('out', z)
    if (res.status === 'ok') onToast?.(`Still dark in ${z.name} — logged. You're not alone. 🤝`)
    else if (res.status === 'counted') onToast?.('Already counted — thank you for holding the line.')
    else if (res.status === 'offline') onToast?.("Saved — will send when you're back online.")
    else onToast?.(res.message || 'Could not send. Please try again.')
  }

  const onToggleAlert = async (z: { id: string; name: string }) => {
    const res = await toggleAlertWithPush({ id: z.id, name: z.name }, z.id)
    const msg: Record<typeof res, string> = {
      on: `You'll be alerted when power returns to ${z.name}.`,
      off: 'Alerts turned off for this area.',
      denied: 'Notifications are blocked — enable them in your browser settings.',
      unsupported: 'Your browser does not support notifications.',
      unavailable: `Noted — you'll be alerted when power returns to ${z.name}.`,
      failed: 'Could not update alerts. Please try again.',
    }
    onToast?.(msg[res])
  }

  if (isLoading) {
    return (
      <div style={{ height: '100%', background: GPT_T.wash, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton w="50%" h={24} r={8} />
        <Skeleton w="100%" h={150} r={12} />
        <Skeleton w="100%" h={120} r={12} />
      </div>
    )
  }

  const zone = macro ? resolveZone(macro, routeId) : null
  if (isError || !zone) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 'var(--go-safe-top)', paddingInlineEnd: 10, paddingBottom: 6, paddingInlineStart: 10, background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}` }}>
          <IconBtn icon="back" onClick={onBack} label={t.screenHeader.backAria} />
          <LogoMark size={22} />
          <div style={{ flex: 1, fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>Area</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: GPT_T.ink45, fontFamily: GPT_FONT, fontSize: 14 }}>
          {t.zone.loadError}
          <button onClick={() => refetch()} style={{ ...BUTTON_SECONDARY, minHeight: 40, padding: '8px 22px' }}>
            {t.zone.retry}
          </button>
        </div>
      </div>
    )
  }

  // Evidence gate: zero reports ⇒ 'nodata' (neutral grey, no power claim). Otherwise trust the
  // server-derived status (confirmed + freshness logic in lib/go.js), falling back to sev-banding
  // only if the field is absent — recomputing from sev alone can diverge (e.g. a stale/under-
  // confirmed 'partial' whose sev sits in the 'out' band).
  const status = displayStatus({ reports: zone.reports, status: zone.status, sev: zone.sev, lastSignal: zone.lastSignal, staleClose: zone.staleClose }, baselineOn())
  const deep = th[`${status}Deep`]
  const bg = th[`${status}Bg`]
  // Weekday + calendar date for each of the last 7 days [oldest..today] (Africa/Banjul = UTC).
  // Weekday MUST be derived from the real date — a static ['Mon'..'Sat'] array mislabels every day
  // unless today happens to be Sunday (e.g. 1 Jun 2026 is a Monday, not "Sat").
  const weekDates: string[] = []
  const weekDays: string[] = []
  {
    const n = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() - i))
      weekDates.push(`${d.getUTCDate()}/${d.getUTCMonth() + 1}`)
      weekDays.push(i === 0 ? t.zone.today : t.zone.weekDay(d.getUTCDay()))
    }
  }
  const isMine = !!myArea && myArea.id === zone.id

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      {/* Notch / Dynamic Island clearance up top (shared var) — drill-down has no AppHeader above it. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 'var(--go-safe-top)', paddingInlineEnd: 10, paddingBottom: 6, paddingInlineStart: 10, background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label={t.screenHeader.backAria} />
        <LogoMark size={22} />
        <div style={{ flex: 1, fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>{zone.region} region</div>
        <IconBtn icon="share" onClick={onShare} label={t.screenHeader.shareAria} color={GPT_T.ink70} />
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <div style={{ background: bg, padding: '18px 18px 20px', borderBottom: `1px solid ${th[`${status}Line`]}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.6 }}>{zone.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                {/* "No reports yet today" must never sit next to a real dark-time figure (a DARK zone
                    carried by an open event has todayMin > 0 with 0 reports *today*) — in that case
                    the duration speaks for itself and the line is dropped. */}
                {(zone.reports > 0 || status === 'estimated' || zone.todayMin === 0) && (
                  <span style={{ fontSize: 13, color: GPT_T.ink70, fontWeight: 600 }}>{zone.reports > 0 ? t.zone.reportsToday(zone.reports) : status === 'estimated' ? t.zone.noReportsEstimated : t.zone.noReportsToday}</span>
                )}
                {/* Under SINGLE_REPORT_TRUTH show only the positive "Verified by N" badge (when truly
                    confirmed), never "Unconfirmed" — which would contradict the one-report-true bulb. */}
                {(!SINGLE_REPORT_TRUTH || zone.confirms >= 8) && <ConfidenceChip confirms={zone.confirms} size="sm" />}
              </div>
            </div>
            <StatusPill status={status} size="lg" solid label={status === 'nodata' ? t.status.nodata : status === 'estimated' ? t.zone.darkEstimatedBadge : undefined} />
          </div>
          {status === 'estimated' ? (
            <>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: deep, letterSpacing: -1.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtHM(zone.todayMin)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: GPT_T.ink70 }}>in the dark · est.</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, color: deep, lineHeight: 1.45 }}>
                {t.zone.estimatedExplanation}
              </div>
            </>
          ) : status === 'nodata' ? (
            <div style={{ marginTop: 16, fontSize: 15, fontWeight: 600, color: GPT_T.ink70, lineHeight: 1.4 }}>
              {/* Stale auto-close ≠ virgin zone: the outage timed out unresolved — ask for the missing signal. */}
              {zone.staleClose ? t.zone.staleCloseNote : t.zone.beFirstToReport}
            </div>
          ) : (
            <>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: deep, letterSpacing: -1.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtHM(zone.todayMin)}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: GPT_T.ink70 }}>in the dark today</span>
              </div>
              {zone.since && (
                <div style={{ marginTop: 7, fontSize: 13.5, fontWeight: 700, color: deep }}>
                  {status === 'on' ? t.zone.backSince(zone.since) : t.zone.darkSince(zone.since)}
                </div>
              )}
            </>
          )}
          {/* SINGLE_REPORT_TRUTH phase: the bulb already flips on one report, so the N/8 "needs N
              more to verify" threshold UI would contradict it — hidden while the flag is on. */}
          {!SINGLE_REPORT_TRUTH && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 12 }}>
              {(status === 'out' || status === 'partial') && (
                <div style={{ marginBottom: 11 }}>
                  <ConfidenceMeter confirms={zone.confirms} />
                </div>
              )}
              <TrustLine confirms={zone.confirms} />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <AreaActions
              isMine={isMine}
              alertOn={alertOn(zone.id)}
              onSetMine={() => (isMine ? clearArea() : pinArea({ id: zone.id, name: zone.name, region: zone.region }))}
              onToggleAlert={() => onToggleAlert({ id: zone.id, name: zone.name })}
            />
          </div>
        </div>

        {/* Region geographic blocks (silhouette + locator + territory zoom + summary) — macro view
            only. Ported from the Claude Design handoff "Gambia Region Pages" (Direction B · Line). */}
        {macro && !routeId.includes('-') && <RegionMaps macro={macro} />}

        {macro && <QuarterPicker quarters={macro.quarters} currentId={zone.id} region={zone.region} onOpen={onOpenZone} />}

        <Section title={t.zone.last7Days} sub={t.zone.last7DaysSub}>
          <BarChart7 data={zone.week} days={weekDays} dates={weekDates} todayStatus={status} />
          <div style={{ marginTop: 14, display: 'flex', gap: 16, fontSize: 12.5, color: GPT_T.ink70, fontWeight: 600 }}>
            <span>
              {t.zone.sevenDayAvg((zone.week.reduce((a, b) => a + b, 0) / 7).toFixed(1))}
            </span>
            <span>
              {t.zone.worstHours(String(Math.max(...zone.week)))}
            </span>
          </div>
        </Section>

        <Section title={t.zone.recentEvents} sub={t.zone.recentEventsSub}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {zone.events.map((e, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < zone.events.length - 1 ? `1px solid ${GPT_T.line2}` : 'none' }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 999, background: e.open ? th.out : GPT_T.ink25, flexShrink: 0, boxShadow: e.open ? `0 0 0 3px ${th.outBg}` : 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: GPT_T.ink }}>
                    {e.from} → {e.to}
                    {/* region timeline aggregates its quarters — say WHICH neighbourhood the window belongs to */}
                    {e.where && <span style={{ fontSize: 12.5, fontWeight: 600, color: GPT_T.ink45 }}> · {e.where}</span>}
                  </div>
                  {e.open && <div style={{ fontSize: 12, fontWeight: 700, color: th.out, marginTop: 1 }}>{t.zone.ongoing}</div>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: e.open ? th.out : GPT_T.ink70, fontVariantNumeric: 'tabular-nums' }}>{e.dur}</span>
              </div>
            ))}
            {zone.events.length === 0 && <div style={{ fontSize: 13.5, color: GPT_T.ink45, fontWeight: 600 }}>{t.zone.noEvents}</div>}
          </div>
        </Section>

        <Section title={t.zone.communityFeedTitle} sub={t.zone.communityFeedSub}>
          {zone.notes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {zone.notes.map((n, i) => (
                <div key={i} style={{ background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px' }}>
                  <div style={{ fontSize: 14, color: GPT_T.ink, lineHeight: 1.4, fontWeight: 500 }}>{n.text}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: GPT_T.ink, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n.at || n.t}</span>
                    {n.where && n.where !== zone.name && (
                      <span style={{ fontSize: 11, color: GPT_T.ink45, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <GPTIcon name="pin" size={11} color={GPT_T.ink45} /> {n.where}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: GPT_T.ink45, fontWeight: 500, padding: '4px 2px', lineHeight: 1.5 }}>
              {t.zone.noComments}
            </div>
          )}
        </Section>
        <ZoneDiscussion zoneId={zone.id} onToast={onToast} />
        <div style={{ height: 8 }} />
      </div>

      <div style={{ padding: '11px 14px calc(11px + env(safe-area-inset-bottom))', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        {/* "Power out" is always the prominent action — reporting a cut is the core job, even for an
            estimated/awaiting zone (only ASSUMED dark). "Power back" stays the secondary. */}
        <button
          onClick={() =>
            status === 'out' || status === 'partial'
              ? confirmStillOut({ id: zone.id, name: zone.name, region: zone.region }) // one-tap, no sheet
              : onReport('out', { id: zone.id, name: zone.name, region: zone.region })
          }
          style={{ flex: 1.6, minHeight: 56, borderRadius: 15, border: 'none', background: th.out, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', boxShadow: `0 8px 18px ${th.out}44` }}
        >
          <GPTIcon name="out" size={22} color="#fff" strokeColor={th.out} /> {status === 'out' || status === 'partial' ? t.zone.stillDark : t.zone.powerOut}
        </button>
        <button
          onClick={() => onReport('back', { id: zone.id, name: zone.name, region: zone.region })}
          style={{ flex: 1, minHeight: 56, borderRadius: 15, background: th.onBg, color: th.onDeep, border: `2px solid ${th.onLine}`, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}
        >
          <GPTIcon name="on" size={20} color={th.on} /> {t.zone.powerBack}
        </button>
      </div>
    </div>
  )
}
