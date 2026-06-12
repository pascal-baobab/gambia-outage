// App.tsx — production app shell + hash router + report sheet + toast.
// Phase 1: Home (list-first), List (grouped quarters), Zone detail, About. No Leaflet
// map, no SSE, no Web Push (those are Phase 2/3). The prototype's device PhoneShell is
// not ported — the app fills the real viewport.
import { Suspense, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Providers } from '@/app/providers'
import { applyVersionUpdateOnOpen, checkForUpdate } from '@/lib/appRefresh'
import { useAppStore } from '@/app/store'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { useSnapshot, useQuickReport } from '@/hooks/useData'
import { useGeoGate } from '@/hooks/useGeoGate'
import { useT } from '@/i18n/useT'
import { useRealtime } from '@/hooks/useRealtime'
import { useOutboxFlush } from '@/hooks/useOutboxFlush'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { recordReport, recordScreen } from '@/lib/pwa'
import { startAnimatedFavicon } from '@/lib/animatedFavicon'
import { recordContribution } from '@/lib/contrib'
import { flushClaims } from '@/lib/claims'
import { getAccountId } from '@/lib/account'
import { fetchProfile } from '@/lib/api'
import { setProfile } from '@/lib/profileStore'
import { RANKS, rankFor, type Profile } from '@/lib/xp'
import { HomeScreen } from '@/screens/HomeScreen'
import { ListScreen } from '@/screens/ListScreen'
import { ZoneScreen } from '@/screens/ZoneScreen'
import { AboutScreen } from '@/screens/AboutScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { MapScreen } from '@/screens/MapScreen'
import { NewsScreen } from '@/screens/NewsScreen'
import { BottomNav } from '@/components/shared/BottomNav'
import { RadioPlayer } from '@/components/RadioPlayer'
import { ThumbDock } from '@/components/shared/ThumbDock'
import { AppHeader } from '@/components/shared/AppHeader'
import { CommunityScreen } from '@/screens/CommunityScreen.lazy'
import { TalkScreen } from '@/screens/TalkScreen.lazy'
import { HonorsScreen } from '@/screens/HonorsScreen'
import { AmbassadorScreen } from '@/screens/AmbassadorScreen'
import { FirstRunOverlay } from '@/screens/FirstRunOverlay'
import { NameGate } from '@/screens/NameGate'
import { hasClaimedName, hasSkippedName, markNameSkipped, clearNameSkipped } from '@/lib/username'
import { useNameGateStore, closeNameGate } from '@/app/nameGateStore'
import { SplashScreen } from '@/screens/SplashScreen'
import { ReportSheet, type ReportTarget } from '@/screens/ReportSheet'
import { ShareModal } from '@/screens/ShareModal'
import { InstallSheet } from '@/components/shared/InstallSheet'
import { PushPrompt, wasPrompted, markPrompted } from '@/components/shared/PushPrompt'
import { listMyReports, lastOutReport, type MyReport } from '@/lib/myReports'
import { LaunchBanner } from '@/components/LaunchBanner'
import { Confetti } from '@/components/Confetti'
import { AdminBar } from '@/components/AdminBar'
import { Toast, type ToastTone } from '@/components/shared/Toast'

interface ReportState {
  action: 'out' | 'back'
  target: ReportTarget | null
}

const LAST_RANK_KEY = 'go_last_rank'
const rankIdx = (key: string) => {
  const i = RANKS.findIndex((r) => r.key === key)
  return i < 0 ? 0 : i
}

function Shell() {
  const route = useHashRoute()
  const queryClient = useQueryClient()
  const { data: snapshot, isLoading, isError: snapshotError, refetch: refetchSnapshot } = useSnapshot()

  // Reset-on-open, hidden behind the ~2.5s splash banner: pull fresh read-models AND apply any newer
  // deployed version (a found update reloads ONCE under the splash — never mid-session). On returning
  // to the foreground we only refetch data + re-check for an update (no reload, so it stays smooth).
  useEffect(() => {
    applyVersionUpdateOnOpen()
    void queryClient.invalidateQueries()
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      checkForUpdate()
      void queryClient.invalidateQueries()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [queryClient])
  // SSE realtime → debounced query invalidation. Mounted once here; internally
  // gated behind data-saver (falls back to 30s polling when on).
  useRealtime()
  // flush queued offline reports on start + reconnect; toast when delivered.
  useOutboxFlush((sent) => flash(`${sent} queued ${sent === 1 ? 'report' : 'reports'} sent.`, 'on'))
  // reconnect: redeem any XP claims queued while offline (alongside the outbox report flush).
  // setProfile() keeps the header avatar/rank + RankChip + ProfileScreen live.
  useEffect(() => {
    const onOnline = () => { void flushClaims().then((p) => { if (p) setProfile(p) }) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  // App load: fetch the current profile so the header/chip have data immediately. Also seed
  // go_last_rank to the loaded rank WITHOUT celebrating, so a returning user with existing XP
  // doesn't get a false rank-up party on open.
  useEffect(() => {
    getAccountId()
      .then(fetchProfile)
      .then((p) => {
        setProfile(p)
        // Seed go_last_rank (no false rank-up party) AND go_last_xp (so the first report's reward card
        // shows a correct "+N" delta against the already-earned total, not a jump from zero).
        try {
          localStorage.setItem(LAST_RANK_KEY, rankFor(p.xp).key)
          localStorage.setItem('go_last_xp', String(p.xp))
        } catch { /* storage unavailable */ }
      })
      .catch(() => { /* offline / no profile yet — header falls back to Observer */ })
  }, [])
  const dataSaver = useAppStore((s) => s.dataSaver)
  const setDataSaver = useAppStore((s) => s.setDataSaver)
  const firstRunDone = useAppStore((s) => s.firstRunDone)
  const dismissFirstRun = useAppStore((s) => s.dismissFirstRun)

  // PWA install: auto sheet appears after engagement (first report or ≥2 screens), never when
  // installed, re-appears every N reports after a dismissal. About has a manual entry point too.
  const pwa = usePwaInstall()
  const [installOpen, setInstallOpen] = useState(false)

  // Brand splash shown on every app open (this component-state resets each page load, so it is NOT
  // persisted — a reopen always replays it). A returning user (firstRunDone) gets the splash as the
  // whole gate; a brand-new user sees it briefly, then the full first-run below.
  // Splash → home/first-run cross-dissolve: instead of unmounting the splash on its onDone (an
  // abrupt cut), it transitions through 'playing' → 'fading' (the fixed overlay animates opacity
  // 1→0 over FADE_MS, revealing the already-painted home/first-run beneath = a true cross-dissolve)
  // → 'gone' (unmount). `prefers-reduced-motion` skips the fade (instant, as before).
  const [splashPhase, setSplashPhase] = useState<'playing' | 'fading' | 'gone'>('playing')
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const SPLASH_FADE_MS = 480
  const splashGate = splashPhase !== 'playing' // the splash beat has finished (drives first-run reveal)
  const beginSplashFade = () => {
    setSplashPhase((p) => (p === 'playing' ? 'fading' : p)) // guard double onDone (tap + auto timer)
    window.setTimeout(() => setSplashPhase('gone'), reduceMotion ? 0 : SPLASH_FADE_MS)
  }
  const [report, setReport] = useState<ReportState | null>(null)
  // The device's active outage (most-recent fresh OUT) → drives the one-tap "Still dark · Ankum si"
  // reconfirm button in the global dock. Recomputed on every report (the 'go-my-report' event).
  const [myOut, setMyOut] = useState<MyReport | null>(() => lastOutReport())
  useEffect(() => {
    const sync = () => setMyOut(lastOutReport())
    window.addEventListener('go-my-report', sync)
    return () => window.removeEventListener('go-my-report', sync)
  }, [])
  // Geo-gate: reporting is restricted to inside The Gambia (backend enforces via CF-IPCountry; this
  // disables the UI + messages when the visitor is abroad). Fails open when country is unknown.
  const { blocked: geoBlocked } = useGeoGate()
  const t = useT()
  const quickReport = useQuickReport()
  const confirmStillDark = async () => {
    if (!myOut) return
    if (geoBlocked) { flash(t.dock.geoBlocked, 'out'); return }
    const res = await quickReport('out', { id: myOut.zoneId, name: myOut.name, region: myOut.region })
    if (res.status === 'ok') flash(`Still dark in ${myOut.name} — logged. You're not alone. 🤝`, 'out')
    else if (res.status === 'counted') flash(`Already counted — thank you for holding the line.`, 'on')
    else if (res.status === 'offline') flash(`Saved — will send when you're back online.`, 'on')
    else flash(res.message || 'Could not send. Please try again.', 'out')
    setMyOut(lastOutReport())
  }
  // Forced unique name: any device that hasn't claimed a public name yet is gated once (after the splash
  // + first-run). Existing devices with a nickname are grandfathered (hasClaimedName → true).
  const [needName, setNeedName] = useState(false)
  const [nameClaimed, setNameClaimed] = useState(hasClaimedName)
  const [nameGateInitialMode, setNameGateInitialMode] = useState<'create' | 'recover'>('create')
  useEffect(() => { if (firstRunDone) setNeedName(!hasClaimedName() && !hasSkippedName()) }, [firstRunDone])
  const nameGateSignal = useNameGateStore((s) => s.open)
  const nameGateMode = useNameGateStore((s) => s.mode)
  useEffect(() => {
    if (nameGateSignal) {
      if (!hasClaimedName()) {
        clearNameSkipped() // explicit intent → ignore any previous skip
        setNameGateInitialMode(nameGateMode) // 'create' nudge or 'recover' ("Already have an account?")
        setNeedName(true)
      }
      closeNameGate()
    }
  }, [nameGateSignal, nameGateMode])
  const [shareOpen, setShareOpen] = useState(false)
  const [toast, setToast] = useState<{ tone: ToastTone; text: string } | null>(null)
  const [confettiKey, setConfettiKey] = useState(0) // bump to re-fire the report confetti
  const [pushPrompt, setPushPrompt] = useState<{ id: string; name: string } | null>(null)

  // Engagement gate: count each distinct screen the user visits.
  useEffect(() => { recordScreen(route.name) }, [route.name])

  // Looping lightning on the desktop browser-tab favicon (no-op under reduced-motion / on mobile,
  // where the tab favicon is unused; never animates the installed home-screen icon — platform static).
  useEffect(() => { startAnimatedFavicon() }, [])

  const flash = (text: string, tone: ToastTone = 'on') => {
    setToast({ tone, text })
    window.setTimeout(() => setToast(null), 4200)
  }

  // Community pulse (owner 2026-06-10): once per session, right after the splash clears, surface
  // how many reports neighbours logged TODAY — new users land in an evidently alive community.
  // Skipped when the count is zero (an empty brag reads as a dead app).
  useEffect(() => {
    if (splashPhase !== 'gone') return
    const n = snapshot?.national?.reports ?? 0
    if (n <= 0) return
    try {
      if (sessionStorage.getItem('go_pulse_shown')) return
      sessionStorage.setItem('go_pulse_shown', '1')
    } catch { return }
    flash(t.dock.todayPulse(n), 'on')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splashPhase, snapshot])

  const openReport = (action: 'out' | 'back', target: ReportTarget | null = null) => {
    // Geo-gate: outside The Gambia → don't open the sheet; the backend rejects anyway. UX message only.
    if (geoBlocked) { flash(t.dock.geoBlocked, 'out'); return }
    setReport({ action, target })
  }
  const closeReport = (submitted: boolean, profile?: Profile | null) => {
    setReport(null)
    if (submitted) {
      recordReport() // online success OR offline-queued both reach the Done view → count it
      recordContribution() // device-local weekly civic tally (Community tab "Your reports this week")
      // One coherent toast: when XP redeemed (online), surface the rank/progress; otherwise the
      // neutral "logged" thank-you (covers offline-queued reports, where XP redeems on reconnect).
      if (profile) {
        setProfile(profile) // keep header + chip + ProfileScreen live
        const newRank = rankFor(profile.xp)
        const prevKey = (() => { try { return localStorage.getItem(LAST_RANK_KEY) || 'observer' } catch { return 'observer' } })()
        const rankedUp = rankIdx(newRank.key) > rankIdx(prevKey)
        try { localStorage.setItem(LAST_RANK_KEY, newRank.key) } catch { /* storage unavailable */ }
        if (rankedUp) {
          // Rank-up: a bigger, clearly celebratory beat — confetti + a prominent congratulatory toast.
          flash(`🎉 You're now a ${newRank.label}!`, 'on')
        } else {
          flash(`+XP · ${profile.rankLabel}${profile.toNext ? ` · ${profile.toNext} to next rank` : ''}`, 'on')
        }
      } else {
        flash('Report logged. Thank you for strengthening the record.', 'on')
      }
      setConfettiKey((k) => k + 1) // celebrate — more active visibility at launch (also fires on rank-up)
      setMyOut(lastOutReport()) // refresh the "Still dark" reconfirm target (a 'back' clears it)

      // Highest-intent moment to offer alerts: the zone just reported (read from the device-local
      // my-reports list, newest last). Ask at most once per zone, and never if already granted/denied.
      try {
        const mine = listMyReports()
        const last = mine.length ? mine[mine.length - 1] : null
        const perm = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
        if (last && perm === 'default' && !wasPrompted(last.zoneId)) {
          markPrompted(last.zoneId)
          window.setTimeout(() => setPushPrompt({ id: last.zoneId, name: last.name }), 600)
        }
      } catch { /* notifications unavailable — skip the prompt */ }
    }
  }

  // Show the install sheet when manually opened, or auto-eligible and nothing else is in the way.
  const showInstall =
    !pwa.installed && (installOpen || (pwa.canShow && firstRunDone && !report && !shareOpen))
  const closeInstall = () => {
    if (!installOpen) pwa.dismiss() // auto-shown → snooze; manual open → don't penalise the cadence
    setInstallOpen(false)
  }

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column' }}>
      <LaunchBanner />
      {/* Global brand bar — identical on every primary tab. Drill-down screens (zone/list/about/honors)
          keep their own back-arrow headers instead. */}
      {(route.name === 'home' || route.name === 'map' || route.name === 'news' || route.name === 'community' || route.name === 'talk' || route.name === 'profile') && (
        <AppHeader onProfile={() => navigate({ name: 'profile' })} onAbout={() => navigate({ name: 'about' })} />
      )}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', isolation: 'isolate' }}>
        {route.name === 'home' && (
          <HomeScreen
            snapshot={snapshot}
            loading={isLoading}
            error={snapshotError && !snapshot}
            onRetry={() => refetchSnapshot()}
            saver={dataSaver}
            onToggleSaver={() => setDataSaver(!dataSaver)}
            onList={() => navigate({ name: 'list' })}
            onOpenZone={(id) => navigate({ name: 'zone', id })}
            onCommunity={() => navigate({ name: 'community' })}
            onNews={() => navigate({ name: 'news' })}
            onReport={(action) => openReport(action, null)}
          />
        )}
        {route.name === 'list' && (
          <ListScreen
            snapshot={snapshot}
            onBack={() => navigate({ name: 'home' })}
            onMap={() => navigate({ name: 'map' })}
            onOpenQuarter={(id) => navigate({ name: 'zone', id })}
            onReport={(action) => openReport(action, null)}
          />
        )}
        {route.name === 'zone' && (
          <ZoneScreen
            routeId={route.id}
            onBack={() => navigate({ name: 'home' })}
            onReport={(action, zone) => openReport(action, zone)}
            onShare={() => setShareOpen(true)}
            onToast={(t) => flash(t, 'on')}
            onOpenZone={(id) => navigate({ name: 'zone', id })}
          />
        )}
        {route.name === 'about' && (
          <AboutScreen
            onBack={() => navigate({ name: 'home' })}
            onReport={(action) => openReport(action, null)}
            onInstall={() => setInstallOpen(true)}
            onProfile={() => navigate({ name: 'profile' })}
            installed={pwa.installed}
          />
        )}
        {route.name === 'profile' && <ProfileScreen />}
        {route.name === 'map' && (
          <MapScreen snapshot={snapshot} onOpenZone={(id) => navigate({ name: 'zone', id })} />
        )}
        {route.name === 'news' && <NewsScreen onToast={(t) => flash(t, 'on')} />}
        {route.name === 'community' && (
          <Suspense fallback={<div style={{ position: 'absolute', inset: 0 }} />}>
            <CommunityScreen
              onOpenZone={(id) => navigate({ name: 'zone', id })}
              onToast={(t) => flash(t, 'on')}
            />
          </Suspense>
        )}

        {route.name === 'honors' && (
          <HonorsScreen
            onBack={() => navigate({ name: 'home' })}
            onOpenZone={(id) => navigate({ name: 'zone', id })}
            onToast={(t) => flash(t, 'on')}
          />
        )}

        {route.name === 'ambassador' && (
          <AmbassadorScreen token={route.token} />
        )}

        {route.name === 'talk' && (
          <Suspense fallback={<div style={{ position: 'absolute', inset: 0 }} />}>
            <TalkScreen onBack={() => navigate({ name: 'community' })} />
          </Suspense>
        )}

        {toast && (
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        )}
      </div>

      {/* Global report dock — the app's core action, pinned on the five primary tabs. Drill-down
          screens (list/zone/about) carry their own context-aware dock instead; the zone dock is
          zone-targeted, so the global one is suppressed there. */}
      {(route.name === 'home' || route.name === 'map' || route.name === 'community' || route.name === 'news' || route.name === 'profile' || route.name === 'talk') && (
        <ThumbDock
          onReport={(action) => openReport(action, null)}
          stillDark={myOut ? { zoneName: myOut.name, onConfirm: confirmStillDark } : null}
          blocked={geoBlocked}
        />
      )}

      {/* Mini radio player — discreet global play/pause for the single fixed station. Audio lives in
          the radioStore singleton, so it keeps playing across tab navigation. */}
      <RadioPlayer />

      {/* Bottom navigation — present on EVERY screen so any section is one tap away. Highlights a tab
          only on the five tab routes; drill-down routes (zone/list/talk/about) highlight nothing. */}
      <BottomNav active={route.name} onNav={(t) => navigate({ name: t })} nameClaimed={nameClaimed} />

      {report && <ReportSheet initialAction={report.action} target={report.target} snapshot={snapshot} onClose={closeReport} />}

      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} onToast={(t) => flash(t, 'on')} />}

      {showInstall && (
        <InstallSheet platform={pwa.platform} canPrompt={pwa.canPrompt} onInstall={pwa.promptInstall} onClose={closeInstall} />
      )}

      {/* First-run takes over only AFTER the splash beat (new users: splash → location → name). */}
      {!firstRunDone && splashGate && (
        <FirstRunOverlay
          onAllow={dismissFirstRun}
          onSkip={dismissFirstRun}
          onRecover={() => { dismissFirstRun(); setNameGateInitialMode('recover'); setNeedName(true) }}
        />
      )}
      {/* Forced unique-name gate — once first-run is done, before the app, if no name claimed yet. */}
      {firstRunDone && splashGate && needName && (
        <NameGate
          initialMode={nameGateInitialMode}
          onDone={() => { setNeedName(false); setNameClaimed(true); setNameGateInitialMode('create') }}
          onSkip={() => { markNameSkipped(); setNeedName(false); setNameGateInitialMode('create') }}
        />
      )}

      {/* Brand splash — on top of everything, every open. Returning users (firstRunDone) get the
          optional non-blocking "Allow location"; the timer auto-enters the app either way. On done it
          cross-dissolves out (wrapper opacity 1→0) over the home/first-run already painted beneath,
          then unmounts — see splashPhase above. */}
      {splashPhase !== 'gone' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 6000,
            opacity: splashPhase === 'fading' ? 0 : 1,
            transition: reduceMotion ? 'none' : `opacity ${SPLASH_FADE_MS}ms ease`,
            pointerEvents: splashPhase === 'fading' ? 'none' : 'auto',
          }}
        >
          <SplashScreen
            onDone={beginSplashFade}
            showGps={firstRunDone}
            onRecover={() => {
              // Lost-phone path from the splash: skip first-run, open the gate straight in recover mode.
              clearNameSkipped()
              dismissFirstRun()
              setNameGateInitialMode('recover')
              setNeedName(true)
              beginSplashFade()
            }}
          />
        </div>
      )}

      {pushPrompt && !report && !shareOpen && (
        <PushPrompt
          zone={pushPrompt}
          onNeedsInstall={() => setInstallOpen(true)}
          onClose={() => setPushPrompt(null)}
          onToast={(t) => flash(t, 'on')}
        />
      )}

      {confettiKey > 0 && <Confetti key={confettiKey} />}

      {/* Superadmin (owner) login via #/su + ADMIN chip; unlocks long-press delete on content. */}
      <AdminBar />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <Shell />
      </Providers>
    </ErrorBoundary>
  )
}
