// app.jsx — Gambia Outage · app shell, navigation, states, tweaks.
// Mirrors web/src/App.tsx (2026-06-10 shell, Phase 01.1 re-sync): SplashScreen on every open →
// (new users) 2-step FirstRunOverlay → the app. NameGate overlay on t.namegate='show'.
// 6-tab BottomNav (Home · Map · News · Community · Talk · You) — active only on tab routes,
// drill-downs (zone/list/about) highlight nothing.
// Shell render order: OfflineBanner > AppHeader > screen content > ThumbDock > RadioPlayer >
// BottomNav > ReportSheet > HonorsScreen > NameGate > FirstRunOverlay > SplashScreen.
const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "contrast": "standard",
  "textScale": 1,
  "dataSaver": false,
  "network": "live",
  "scene": "active",
  "gps": "allowed",
  "namegate": "skip",
  "radio": "idle",
  "stillDark": false,
  "stillDarkZone": "Your zone",
  "geoblocked": false,
  "hasPassword": false,
  "pendingWaves": 0,
  "discoverable": false,
  "nameClaimed": true,
  "lang": "EN"
}/*EDITMODE-END*/;

const TAB_ROUTES = ['home', 'map', 'news', 'community', 'talk', 'profile'];

// Build an "all power on" dataset for the empty/positive state
function emptyData(d) {
  return {
    ...d,
    national: { ...d.national, hours: 0, mins: 0, regionsOut: 0, reports: 0, updated: 'just now' },
    zones: d.zones.map(z => ({ ...z, sev: 0.04, todayMin: 0 })),
    quarters: Object.fromEntries(Object.entries(d.quarters || {}).map(([k, arr]) => [k, arr.map(x => ({ ...x, status: 'on', sev: 0.12, mins: 0 }))])),
  };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = THEMES[t.contrast] || THEMES.standard;
  const offline = t.network === 'offline';
  const empty = t.scene === 'empty';
  const gpsDenied = t.gps === 'denied';

  const baseData = empty ? emptyData(GPT_DATA) : GPT_DATA;

  const [view, setView] = useState('home');      // home | map | community | news | profile | list | zone | talk | about
  const [prev, setPrev] = useState('home');
  const [zone, setZone] = useState(null);
  const [report, setReport] = useState(null);     // {action, zone} | null
  const [share, setShare] = useState(false);
  const [splash, setSplash] = useState(true);     // brand splash on EVERY open (replay via Tweaks)
  const [firstRun, setFirstRun] = useState(true);
  const [saver, setSaver] = useState(t.dataSaver);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0); // bump to re-fire the report/rank-up confetti
  const [pending, setPending] = useState(0);
  const [honors, setHonors] = useState(false);
  const [myArea, setMyArea] = useLocal('gpt_myarea', null);
  const [alerts, setAlerts] = useLocal('gpt_alerts', []);
  // Device-local pseudonym (avatar + nickname + bio) — published only when the user writes
  // something; NEVER linked to reports. Surfaces on the Home header chip + Profile.
  const [identity, setIdentity] = useLocal('gpt_identity', { nickname: '', avatarId: 'av3', bio: '' });
  // Device-local XP/rank mock (prod: server-authoritative via claim_nonce + xp_grants — decoupled
  // from reports). Drives RankChip, ProfileScreen and the rank-up celebration.
  const [profile, setProfile] = useState(baseData.profile || { xp: 0, badges: [], streakWeeks: 0 });

  const flash = (text, tone = 'on') => { setToast({ tone, text }); setTimeout(() => setToast(null), 4200); };
  const alertOn = (id) => alerts.some(a => a.id === id);
  const toggleAlert = (z) => {
    if (alertOn(z.id)) { setAlerts(alerts.filter(a => a.id !== z.id)); flash(`Alerts off for ${z.name}.`, 'offline'); }
    else { setAlerts([...alerts, { id: z.id, name: z.name }]); flash(`We'll alert you the moment power returns to ${z.name}.`, 'on'); }
  };
  const setArea = (z) => {
    const isQ = String(z.id).includes('-');
    setMyArea({ id: z.id, name: z.name, region: z.region, regionId: isQ ? String(z.id).split('-')[0] : z.id, kind: isQ ? 'quarter' : 'region' });
    flash(`${z.name} is now your area — pinned to your home screen.`, 'on');
  };
  const openMyArea = () => {
    if (!myArea) return;
    if (myArea.kind === 'region') { const z = baseData.zones.find(z => z.id === myArea.id); if (z) openZone(z); return; }
    const parent = baseData.zones.find(z => z.id === myArea.regionId);
    const q = (baseData.quarters[myArea.regionId] || []).find(x => x.id === myArea.id);
    if (parent && q) openZone({ ...parent, id: q.id, name: q.name, region: myArea.region, sev: q.sev, todayMin: q.mins, reports: q.reports });
  };

  useEffect(() => { setSaver(t.dataSaver); }, [t.dataSaver]);
  useEffect(() => { const id = setTimeout(() => setLoading(false), 1400); return () => clearTimeout(id); }, []);

  const go = (v) => { setPrev(view); setView(v); };
  const openZone = (z) => { setZone(z); setPrev(view); setView('zone'); };
  const openReport = (action, z) => { setReport({ action, zone: z || null }); };
  const onSubmitted = (action, wasOffline) => {
    if (wasOffline) setPending(p => p + 1);
  };
  const closeReport = (submitted) => {
    setReport(null);
    if (submitted === true) {
      if (offline) {
        flash('Report saved — will send when you’re back online.', 'offline');
        return;
      }
      // Visible reward: +XP toast (rank-up ⇒ a bigger celebratory beat) + confetti on every report.
      const gained = 6;
      const before = rankFor(profile.xp).key;
      const xp = profile.xp + gained;
      const after = rankFor(xp);
      setProfile(p => ({ ...p, xp }));
      const next = rankNext(xp);
      if (after.key !== before) flash(`🎉 You’re now a ${after.label}!`, 'on');
      else flash(`+${gained} XP · ${after.label}${next ? ` · ${next.min - xp} to next rank` : ''}`, 'on');
      setConfettiKey(k => k + 1);
    }
  };

  const isTab = TAB_ROUTES.includes(view);
  const statusBg = splash || (firstRun && !splash) ? GPT_T.panel : GPT_T.paper;
  const statusTone = splash || (firstRun && !splash) ? 'dark' : 'light';

  // ThumbDock stillDark prop: null or {zoneName, onConfirm}
  const stillDarkProp = t.stillDark ? { zoneName: t.stillDarkZone || 'Your zone', onConfirm: () => flash('Still-dark confirmed.', 'offline') } : null;

  // stage scaling
  const stageRef = useRef(null), phoneRef = useRef(null);
  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const s = Math.min(1, (vh - 24) / 812, (vw - 24) / 384);
      if (phoneRef.current) phoneRef.current.style.transform = `scale(${s})`;
    };
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <ThemeCtx.Provider value={theme}>
      <div ref={stageRef} style={{ position: 'fixed', inset: 0, background: '#E7EBEF',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,34,0.05) 1px, transparent 0)', backgroundSize: '22px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div ref={phoneRef} style={{ transformOrigin: 'center center' }}>
          <PhoneShell statusBg={statusBg} statusTone={statusTone}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              {offline && <OfflineBanner pending={pending} />}

              {/* AppHeader — brand bar with spinning logo, profile chip, lang badge, info.
                  Shown on all tab routes; not shown on drill-down routes (zone/list/about). */}
              {isTab && (
                <AppHeader
                  identity={identity}
                  profile={profile}
                  onProfile={() => go('profile')}
                  onAbout={() => go('about')}
                  lang={t.lang}
                />
              )}

              {/* StatusStrip — 7-region binary bulb row; shown on home route only (below AppHeader). */}
              {isTab && view === 'home' && (
                <StatusStrip zones={baseData.zones} />
              )}

              <div style={{ flex: 1, minHeight: 0, position: 'relative', isolation: 'isolate' }}>
                {view === 'home' && (
                  <HomeScreen data={baseData} offline={offline} saver={saver} empty={empty} loading={loading} t={t.textScale}
                    onSaver={() => setSaver(s => !s)} onList={() => go('list')} onOpenZone={openZone}
                    onReport={openReport} onAbout={() => go('about')} onNews={() => go('news')} onProfile={() => go('profile')}
                    identity={identity} profile={profile}
                    myArea={areaStatus(myArea, baseData)} myAreaAlert={!!myArea && alertOn(myArea.id)}
                    onOpenMyArea={openMyArea} onToggleMyAreaAlert={() => myArea && toggleAlert({ id: myArea.id, name: myArea.name })}
                    onClearMyArea={() => { setMyArea(null); flash('Area unpinned.', 'offline'); }}
                    hours={window.MOCK_HOURS || []}
                    onHonors={() => setHonors(true)} />
                )}
                {view === 'map' && (
                  <MapScreen data={baseData} onOpenZone={openZone} />
                )}
                {view === 'news' && (
                  <NewsScreen data={baseData} />
                )}
                {view === 'community' && (
                  <CommunityScreen data={baseData} t={t.textScale} onOpenZone={openZone}
                    onNews={() => go('news')} onTalk={() => go('talk')}
                    discoverable={t.discoverable} />
                )}
                {view === 'talk' && (
                  <TalkScreen data={baseData} onBack={() => go('community')} />
                )}
                {view === 'profile' && (
                  <ProfileScreen data={baseData} identity={identity} onIdentity={setIdentity} profile={profile} onReport={openReport}
                    hasPassword={t.hasPassword} discoverable={t.discoverable} />
                )}
                {view === 'list' && (
                  <ListScreen data={baseData} offline={offline} t={t.textScale}
                    onBack={() => go('home')} onMap={() => go('map')} onOpenZone={openZone} onReport={openReport} />
                )}
                {view === 'zone' && zone && (
                  <ZoneScreen zone={baseData.zones.find(z => z.id === zone.id) || zone} data={baseData} t={t.textScale}
                    onBack={() => go(prev === 'zone' ? 'home' : prev)} onReport={openReport} onShare={() => setShare(true)}
                    isMine={!!myArea && myArea.id === zone.id} alertOn={alertOn(zone.id)}
                    onSetMine={() => setArea(baseData.zones.find(z => z.id === zone.id) || zone)}
                    onToggleAlert={() => toggleAlert(baseData.zones.find(z => z.id === zone.id) || zone)} />
                )}
                {view === 'about' && (
                  <AboutScreen onBack={() => go(prev === 'about' ? 'home' : prev)} onReport={openReport} onProject={() => go('project')} />
                )}
                {view === 'project' && (
                  <ProjectScreen onBack={() => go(prev === 'project' ? 'about' : prev)} />
                )}

                {toast && <Toast tone={toast.tone} onClose={() => setToast(null)}>{toast.text}</Toast>}
                {confettiKey > 0 && <Confetti key={confettiKey} />}
              </div>

              {/* Global report dock — pinned on the six tab routes. Drill-downs (zone/list/about)
                  carry their OWN contextual dock, so the global one is suppressed there. */}
              {isTab && <ThumbDock onReport={openReport} stillDark={stillDarkProp} blocked={t.geoblocked} />}

              {/* RadioPlayer strip — between ThumbDock and BottomNav on tab routes. */}
              {isTab && <RadioPlayer />}

              {/* Bottom navigation — present on EVERY screen; highlights only on tab routes. */}
              <BottomNav active={isTab ? view : null} onNav={(tab) => go(tab)}
                pendingWaves={t.pendingWaves} nameClaimed={t.nameClaimed} />

              {report && (
                <ReportSheet initialAction={report.action} zone={report.zone} gpsDenied={gpsDenied} offline={offline} data={baseData}
                  profile={profile}
                  onClose={(submitted) => closeReport(submitted === true)} onSubmitted={(a, o) => { onSubmitted(a, o); }} />
              )}
              {share && <ShareModal data={baseData} onClose={() => setShare(false)} />}

              {/* HonorsScreen overlay — opened from WallOfHonorTeaser on Home. */}
              {honors && (
                <HonorsScreen onBack={() => setHonors(false)} onOpenZone={openZone} />
              )}

              {/* NameGate overlay — shown when Tweaks namegate = 'show'. */}
              {t.namegate === 'show' && (
                <NameGate
                  onDone={(name) => { setTweak('namegate', 'skip'); setTweak('nameClaimed', true); flash(`Welcome, ${name}!`, 'on'); }}
                  onSkip={() => setTweak('namegate', 'skip')} />
              )}

              {/* First-run takes over only AFTER the splash beat (new users: splash → location → intro). */}
              {firstRun && !splash && <FirstRunOverlay onAllow={() => setFirstRun(false)} onSkip={() => { setFirstRun(false); setTweak('gps', 'denied'); }} />}

              {/* Brand splash — on top of everything, every open. Returning users get the optional
                  non-blocking "Allow location"; the timer auto-enters the app either way. */}
              {splash && <SplashScreen onDone={() => setSplash(false)} showGps={!firstRun} />}
            </div>
          </PhoneShell>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Data state" />
        <TweakRadio label="Network" value={t.network} options={['live', 'offline']} onChange={v => setTweak('network', v)} />
        <TweakRadio label="Scene" value={t.scene} options={['active', 'empty']} onChange={v => setTweak('scene', v)} />
        <TweakSection label="Display" />
        <TweakRadio label="Status colours" value={t.contrast} options={['standard', 'sunlight']} onChange={v => setTweak('contrast', v)} />
        <TweakToggle label="Data-saver mode" value={t.dataSaver} onChange={v => setTweak('dataSaver', v)} />
        <TweakSlider label="Text scale" value={t.textScale} min={0.9} max={1.18} step={0.02} onChange={v => setTweak('textScale', v)} />
        <TweakSection label="Try states" />
        <TweakRadio label="GPS permission" value={t.gps} options={['allowed', 'denied']} onChange={v => setTweak('gps', v)} />
        <TweakRadio label="NameGate" value={t.namegate} options={['skip', 'show']} onChange={v => setTweak('namegate', v)} />
        <TweakRadio label="Radio" value={t.radio} options={['idle', 'playing', 'loading']} onChange={v => setTweak('radio', v)} />
        <TweakToggle label="Still dark (reconfirm)" value={t.stillDark} onChange={v => setTweak('stillDark', v)} />
        <TweakToggle label="Geo-blocked" value={t.geoblocked} onChange={v => setTweak('geoblocked', v)} />
        <TweakToggle label="Has password" value={t.hasPassword} onChange={v => setTweak('hasPassword', v)} />
        <TweakSlider label="Pending waves" value={t.pendingWaves} min={0} max={12} step={1} onChange={v => setTweak('pendingWaves', v)} />
        <TweakToggle label="Discoverable" value={t.discoverable} onChange={v => setTweak('discoverable', v)} />
        <TweakToggle label="Name claimed" value={t.nameClaimed} onChange={v => setTweak('nameClaimed', v)} />
        <TweakButton label="Replay splash" onClick={() => setSplash(true)} />
        <TweakButton label="Replay intro" onClick={() => { setFirstRun(true); setSplash(true); }} />
        <TweakButton label="Show loading skeletons" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1600); }} />
        <TweakButton label="Open Wall of Honor" onClick={() => setHonors(true)} />
        <TweakButton label="Open Project page" onClick={() => go('project')} />
      </TweaksPanel>
    </ThemeCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
