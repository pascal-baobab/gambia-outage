// ReportSheet.tsx — the core report flow (bottom sheet). Ported/adapted from
// design/screen-report.jsx. Submits to POST /api/collections/reports/records.
//
// Deviation from prototype: the prototype's 3-level Region→District→Settlement cascade
// is collapsed to Region(macro)→Quarter, because the launch seed has no district zones
// (CLAUDE.md "region + settlement levels only"). Manual picks submit the chosen quarter's
// zone id (or the macro id if no quarter is chosen). GPS uses navigator.geolocation and
// submits lat/lng for the server to snap.
//
// State ownership + submit logic live here; the location UI is rendered by
// report/LocationPicker and the success card by report/DoneView.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'
import type { Snapshot, Macro, QuarterDir } from '@/lib/types'
import { getMacro, getQuarters, nearestQuarter, createReport, ReportError, NetworkError, type ReportInput } from '@/lib/api'
import { enqueue } from '@/lib/outbox'
import { claimNonce } from '@/lib/account'
import { enqueueClaim, flushClaims } from '@/lib/claims'
import { addMyReport } from '@/lib/myReports'
import { type Profile } from '@/lib/xp'
import { getTurnstileConfig, ensureTurnstile } from '@/lib/turnstile'
import { NOTE_MAX } from '@/lib/constants'
import { GPTIcon, type IconName } from '@/components/icons'
import { IconBtn } from '@/components/shared/IconBtn'
import { LocationPicker, type LocMode, type ReportTarget } from './report/LocationPicker'
import { DoneView } from './report/DoneView'

type Action = 'out' | 'back'
type Step = 'form' | 'sending' | 'done' | 'error'

export type { ReportTarget } from './report/LocationPicker'

function ActionBtn({
  active,
  onClick,
  status,
  title,
  sub,
}: {
  active: boolean
  onClick: () => void
  status: 'out' | 'on'
  title: string
  sub: string
}) {
  const th = useTheme()
  const c = th[status]
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        borderRadius: 15,
        cursor: 'pointer',
        padding: '14px 12px',
        textAlign: 'start',
        border: `2px solid ${active ? c : GPT_T.line}`,
        background: active ? th[`${status}Bg`] : GPT_T.paper,
        fontFamily: GPT_FONT,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: active ? c : th[`${status}Bg`], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GPTIcon name={status} size={20} color={active ? '#fff' : c} strokeColor={active ? c : '#fff'} />
        </span>
        {active && (
          <span style={{ width: 20, height: 20, borderRadius: 999, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GPTIcon name="check" size={14} color="#fff" />
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: active ? th[`${status}Deep`] : GPT_T.ink }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  )
}

export function ReportSheet({
  initialAction = 'out',
  target,
  snapshot,
  onClose,
}: {
  initialAction?: Action
  target?: ReportTarget | null
  snapshot?: Snapshot
  onClose: (submitted: boolean, profile?: Profile | null) => void
}) {
  const th = useTheme()
  const t = useT()
  const queryClient = useQueryClient()

  const [locMode, setLocMode] = useState<LocMode>('gps')
  const [action, setAction] = useState<Action>(initialAction)
  const [note, setNote] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [offline, setOffline] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsQuarter, setGpsQuarter] = useState<QuarterDir | null>(null) // resolved place name
  const [gpsError, setGpsError] = useState('')
  // XP profile resolved from redeeming this report's claim_nonce (online or offline-queued);
  // threaded up via onClose so the app shell can toast the rank/progress feedback.
  const [claimedProfile, setClaimedProfile] = useState<Profile | null>(null)

  // Turnstile: a VISIBLE widget in the form, so a challenged user (VPN/Tor/CGNAT) can SEE and
  // solve the check instead of being silently blocked. No-op when disabled. The token gates
  // submit and is single-use → reset after a failed attempt.
  const tsHostRef = useRef<HTMLDivElement | null>(null)
  const tsWidgetIdRef = useRef<string | null>(null)
  const tsSiteKeyRef = useRef('')
  const [tsEnabled, setTsEnabled] = useState(false)
  const [tsToken, setTsToken] = useState<string | null>(null)
  // 1) fetch config → flips tsEnabled, which mounts the widget host in the footer
  useEffect(() => {
    let cancelled = false
    getTurnstileConfig().then((cfg) => {
      if (cancelled || !cfg.enabled) return
      tsSiteKeyRef.current = cfg.siteKey
      setTsEnabled(true)
    })
    return () => { cancelled = true }
  }, [])
  // 2) once the host is mounted (tsEnabled), render the VISIBLE widget into it
  useEffect(() => {
    if (!tsEnabled || !tsHostRef.current) return
    let cancelled = false
    ensureTurnstile()
      .then((api) => {
        if (cancelled || !tsHostRef.current || tsWidgetIdRef.current) return
        tsWidgetIdRef.current = api.render(tsHostRef.current, {
          sitekey: tsSiteKeyRef.current,
          callback: (t: string) => { if (!cancelled) setTsToken(t) },
          'error-callback': () => { if (!cancelled) setTsToken(null) },
          'expired-callback': () => { if (!cancelled) setTsToken(null) },
        })
      })
      .catch(() => { /* widget unavailable → backend rejects, user can retry */ })
    return () => {
      cancelled = true
      const id = tsWidgetIdRef.current
      if (id && window.turnstile) { try { window.turnstile.remove(id) } catch { /* noop */ } tsWidgetIdRef.current = null }
    }
  }, [tsEnabled])

  const macros = snapshot?.macros ?? []
  // Solidarity count (evidence-only): distinct neighbours reporting darkness now = sum of confirms on
  // non-lit regions. Surfaced on the success card to reframe the outage as shared, never invented.
  const darkNeighbours = macros.reduce((s, m) => s + (m.status !== 'on' ? m.confirms || 0 : 0), 0)
  // quarter directory (centroids) for GPS reverse-geocode + typeable search
  const { data: quarters = [] } = useQuery<QuarterDir[]>({
    queryKey: ['quarters'],
    queryFn: getQuarters,
    staleTime: 24 * 60 * 60 * 1000, // centroids are static
  })

  // manual cascade: Region(macro) → Quarter
  const [regionId, setRegionId] = useState('')
  const [regionName, setRegionName] = useState('')
  const [quarterId, setQuarterId] = useState('')
  const [quarterName, setQuarterName] = useState('')
  const [open, setOpen] = useState<null | 'r' | 'q'>(null)
  // typeable quarter search (alternative to the cascade) — hits are computed in LocationPicker
  const [search, setSearch] = useState('')

  // fetch quarters for the chosen region
  const { data: regionDetail } = useQuery<Macro>({
    queryKey: ['macro', regionId],
    queryFn: () => getMacro(regionId),
    enabled: !!regionId,
    staleTime: 30_000,
  })

  const quarterOptions = useMemo(
    () => (regionDetail ? regionDetail.quarters.map((q) => ({ id: q.id, name: q.name })) : []),
    [regionDetail],
  )

  const place = target
    ? `${target.name}, ${target.region}`
    : locMode === 'gps'
      ? gpsQuarter
        ? `${gpsQuarter.name}, ${gpsQuarter.region}`
        : gpsCoords
          ? 'your location'
          : ''
      : quarterName
        ? `${quarterName}, ${regionName}`
        : regionName

  // can submit?
  const manualZone = quarterId || regionId
  const locReady = target ? true : locMode === 'gps' ? !!gpsCoords : !!manualZone

  const requestGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError(t.report.locationUnavailable)
      return
    }
    setGpsBusy(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGpsCoords({ lat, lng })
        // reverse-geocode to the nearest seeded quarter so the user sees a PLACE, not numbers
        setGpsQuarter(quarters.length ? nearestQuarter(quarters, lat, lng) : null)
        setGpsBusy(false)
      },
      () => {
        setGpsBusy(false)
        setGpsError(t.report.locationOff)
        setLocMode('manual')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const submit = async () => {
    if (!locReady) return
    setStep('sending')
    // Mint a fresh per-report XP capability. The SAME nonce rides the live POST and any
    // offline-outbox replay (replay carries the full input), so the backend dedupes the report
    // by client_uuid and the XP grant by nonce → exactly one grant even if replayed.
    const nonce = claimNonce()
    const input: ReportInput = {
      type: action,
      source: target ? 'manual' : locMode,
      client_uuid: crypto.randomUUID(),
      claim_nonce: nonce,
    }
    if (note.trim()) input.note = note.trim().slice(0, NOTE_MAX)
    // resolve the zone we're reporting for (used for both the POST and the "ME" map marker)
    let reportedZoneId = ''
    let reportedRegionId = ''
    // device-local "my reports" target (name/region for the My-reports card); only when a zone is known.
    let reportedName = ''
    let reportedRegion = ''
    if (target) {
      input.zone = target.id
      reportedZoneId = target.id
      reportedRegionId = target.id.includes('-') ? target.id.split('-')[0] : target.id
      reportedName = target.name
      reportedRegion = target.region
    } else if (locMode === 'gps' && gpsCoords) {
      input.lat = gpsCoords.lat
      input.lng = gpsCoords.lng
      input.source = 'gps'
      // pin to the reverse-geocoded quarter so the event lands on a known zone (also lets the
      // server skip re-snapping); the server still validates via snapZone if zone is absent.
      if (gpsQuarter) {
        input.zone = gpsQuarter.id
        reportedZoneId = gpsQuarter.id
        reportedRegionId = gpsQuarter.regionId
        reportedName = gpsQuarter.name
        reportedRegion = gpsQuarter.region
      }
      // pure-GPS with no resolved quarter → no chosen zone id in scope → skip the my-report entry.
    } else {
      input.zone = manualZone
      input.source = 'manual'
      reportedZoneId = manualZone
      reportedRegionId = regionId
      reportedName = quarterName || regionName
      reportedRegion = regionName
    }
    // Record the reported zone to the device-local My-reports list (accepted OR queued). Skip
    // silently when no zone id is in scope (pure GPS with no snap) — don't fabricate.
    const recordMyReport = () => {
      if (!reportedZoneId) return
      addMyReport({ zoneId: reportedZoneId, name: reportedName || reportedZoneId, region: reportedRegion, type: action, at: Date.now() })
    }

    try {
      await createReport(input, tsToken)
      // remember MY report for the "ME" map marker (yellow, 5 min) — client-side acceptance cue
      if (reportedRegionId && action === 'out') {
        try {
          localStorage.setItem('go_my_report', JSON.stringify({
            zoneId: reportedZoneId, regionId: reportedRegionId, at: Date.now(),
          }))
          window.dispatchEvent(new Event('go-my-report'))
        } catch { /* storage unavailable */ }
      }
      // refresh affected caches
      queryClient.invalidateQueries({ queryKey: ['snapshot'] })
      queryClient.invalidateQueries({ queryKey: ['national'] })
      const affectedMacro = reportedRegionId || (target ? (target.id.includes('-') ? target.id.split('-')[0] : target.id) : regionId)
      if (affectedMacro) queryClient.invalidateQueries({ queryKey: ['macro', affectedMacro] })
      else queryClient.invalidateQueries({ queryKey: ['macro'] })
      recordMyReport() // device-local My-reports (accepted)
      // report accepted → redeem this report's XP capability (idempotent, offline-safe).
      enqueueClaim(nonce)
      try { setClaimedProfile(await flushClaims()) } catch { /* XP is best-effort */ }
      setStep('done')
    } catch (err) {
      if (err instanceof NetworkError) {
        // offline → queue it; the outbox flushes on reconnect (client_uuid makes replay safe).
        try {
          await enqueue({ client_uuid: input.client_uuid!, input, queuedAt: Date.now(), place: place || 'your area' })
          recordMyReport() // device-local My-reports (queued)
          // queue the XP claim too; flushClaims is a no-op while offline and will redeem on reconnect.
          enqueueClaim(nonce)
          try { setClaimedProfile(await flushClaims()) } catch { /* best-effort */ }
          setOffline(true)
          setStep('done')
          return
        } catch {
          /* IndexedDB unavailable → fall through to the error view */
        }
      }
      // report rejected → reset Turnstile so a retry mints a fresh single-use token
      if (tsWidgetIdRef.current && window.turnstile) { try { window.turnstile.reset(tsWidgetIdRef.current) } catch { /* noop */ } }
      setTsToken(null)
      setErrorMsg(err instanceof ReportError ? err.friendly : t.report.errorDefault)
      setStep('error')
    }
  }

  const sheetBase = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    background: GPT_T.paper,
    borderRadius: '24px 24px 0 0',
    boxShadow: '0 -16px 50px rgba(15,23,34,0.3)',
    zIndex: 90,
    maxHeight: '94%',
    display: 'flex',
    flexDirection: 'column',
    animation: 'gptSheetIn .36s cubic-bezier(.2,.8,.25,1)',
    fontFamily: GPT_FONT,
  } as const

  const actionIcon: IconName = action === 'out' ? 'out' : 'on'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 85 }}>
      <div onClick={() => onClose(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.5)', animation: 'gptFade .3s ease' }} />
      <div style={sheetBase}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} />
        </div>

        {step === 'done' ? (
          <DoneView action={action} place={place || 'your area'} offline={offline} profile={claimedProfile} darkNeighbours={darkNeighbours} onClose={() => onClose(true, claimedProfile)} />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 10px' }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>{t.report.title}</div>
              <IconBtn icon="close" onClick={() => onClose(false)} label={t.report.close} />
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '0 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.report.areaLabel}</div>

              <LocationPicker
                target={target}
                locMode={locMode}
                onLocModeChange={setLocMode}
                gpsCoords={gpsCoords}
                gpsQuarter={gpsQuarter}
                gpsBusy={gpsBusy}
                gpsError={gpsError}
                onRequestGps={requestGps}
                search={search}
                onSearchChange={setSearch}
                macros={macros}
                quarters={quarters}
                regionId={regionId}
                regionName={regionName}
                quarterName={quarterName}
                regionLoaded={!!regionDetail}
                quarterOptions={quarterOptions}
                open={open}
                onOpenChange={setOpen}
                onPickRegion={(opt) => {
                  setRegionId(opt.id)
                  setRegionName(opt.name)
                  setQuarterId('')
                  setQuarterName('')
                  setOpen('q')
                }}
                onPickQuarter={(opt) => {
                  setQuarterId(opt.id)
                  setQuarterName(opt.name)
                  setOpen(null)
                }}
                onPickPlace={(pick) => {
                  setRegionId(pick.regionId); setRegionName(pick.regionName)
                  setQuarterId(pick.quarterId); setQuarterName(pick.quarterName)
                  setSearch(''); setOpen(null)
                }}
              />

              <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase', margin: '18px 0 8px' }}>{t.report.whatsHappening}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <ActionBtn active={action === 'out'} onClick={() => setAction('out')} status="out" title={t.report.actionOut} sub={t.report.actionOutSub} />
                <ActionBtn active={action === 'back'} onClick={() => setAction('back')} status="on" title={t.report.actionBack} sub={t.report.actionBackSub} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 8px' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {t.report.addNote} <span style={{ textTransform: 'none', fontWeight: 600, color: GPT_T.ink25 }}>{t.report.optional}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: note.length > NOTE_MAX - 20 ? th.out : GPT_T.ink45, fontVariantNumeric: 'tabular-nums' }}>
                  {note.length}/{NOTE_MAX}
                </span>
              </div>
              <textarea
                value={note}
                maxLength={NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.report.notePlaceholder}
                style={{
                  width: '100%',
                  minHeight: 64,
                  resize: 'none',
                  boxSizing: 'border-box',
                  border: `1.5px solid ${GPT_T.line}`,
                  borderRadius: 13,
                  padding: '11px 13px',
                  fontFamily: GPT_FONT,
                  fontSize: 15,
                  color: GPT_T.ink,
                  outline: 'none',
                  background: GPT_T.wash,
                }}
              />
              <div style={{ fontSize: 11.5, color: GPT_T.ink45, marginTop: 7, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <GPTIcon name="lock" size={13} color={GPT_T.ink45} /> {t.report.privacyDisclaimer}
              </div>
              <div style={{ height: 12 }} />
            </div>

            <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: `1px solid ${GPT_T.line}`, background: GPT_T.paper }}>
              {step === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: th.outDeep, background: th.outBg, padding: '9px 12px', borderRadius: 11, marginBottom: 10 }}>
                  <GPTIcon name="info" size={16} color={th.outDeep} /> {errorMsg}
                </div>
              )}
              {tsEnabled && (
                <div ref={tsHostRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 65, marginBottom: 10 }} />
              )}
              <button
                onClick={submit}
                disabled={!locReady || step === 'sending' || (tsEnabled && !tsToken)}
                style={{
                  width: '100%',
                  minHeight: 56,
                  borderRadius: 16,
                  border: 'none',
                  cursor: locReady ? 'pointer' : 'not-allowed',
                  background: locReady ? th[action === 'out' ? 'out' : 'on'] : GPT_T.line,
                  color: locReady ? '#fff' : GPT_T.ink45,
                  fontFamily: GPT_FONT,
                  fontWeight: 800,
                  fontSize: 17,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  boxShadow: locReady ? `0 8px 20px ${th[action === 'out' ? 'out' : 'on']}44` : 'none',
                  opacity: step === 'sending' ? 0.7 : 1,
                }}
              >
                {step === 'sending' ? (
                  t.report.submitting
                ) : (
                  <>
                    <GPTIcon name={actionIcon} size={22} color="#fff" strokeColor={th[action === 'out' ? 'out' : 'on']} /> {t.report.submit}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
