// screen-about.jsx — About / Methodology + first-run GPS permission overlay
// Exports: AboutScreen, FirstRunOverlay

function AboutScreen({ onBack, onReport, onProject }) {
  const th = useTheme();
  const Block = ({ icon, title, children }) => (
    <div style={{ padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}`, background: GPT_T.paper }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><GPTIcon name={icon} size={19} color={GPT_T.ink70} /></span>
        <span style={{ fontSize: 16.5, fontWeight: 800, color: GPT_T.ink }}>{title}</span>
      </div>
      <div style={{ fontSize: 14.5, color: GPT_T.ink70, lineHeight: 1.55, fontWeight: 500 }}>{children}</div>
    </div>
  );
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label="Back" />
        <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>About & methodology</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* hero */}
        <div style={{ background: GPT_T.panel, color: '#fff', padding: '22px 20px 24px', position: 'relative', overflow: 'hidden' }}>
          <FlagBg opacity={0.2} scrim="linear-gradient(180deg, rgba(15,23,34,0.6), rgba(15,23,34,0.9))" />
          <div style={{ position: 'relative' }}>
            <Logo size={19} mono variant="full" />
            <div style={{ fontSize: 16, color: GPT_T.panelInk, fontWeight: 500, lineHeight: 1.55, marginTop: 16 }}>
              A public, fact-based record of where the power is out in The Gambia, and for how long — built by the people living it.
            </div>
          </div>
        </div>

        <Block icon="list" title="How the data is collected">
          Every figure here comes from <b style={{ color: GPT_T.ink }}>residents tapping “Power out” or “Power back”</b> for their area. When several people in the same place report the same thing, it’s treated as confirmed. Duplicate reports for an active outage <b style={{ color: GPT_T.ink }}>strengthen</b> it rather than inflating the count.
        </Block>
        <Block icon="clock" title="How to read the stats">
          “<b style={{ color: GPT_T.ink }}>11h 20m without power today</b>” is the average time areas with an active or closed outage have been off since midnight. A zone’s <b style={{ color: GPT_T.ink }}>duration</b> is recorded only once enough neighbours confirm power is back — so the numbers reflect lived experience, not guesses.
        </Block>
        <Block icon="lock" title="Your anonymity">
          <b style={{ color: GPT_T.ink }}>No account. No sign-up. No personal data.</b> We never ask for your name, phone, or email. If you allow location, it’s used <b style={{ color: GPT_T.ink }}>only to place your report on the map</b> and is never stored against your identity — because there is no identity to store.
        </Block>
        <Block icon="info" title="A note on neutrality">
          This is a neutral record, not a campaign. We report <b style={{ color: GPT_T.ink }}>what happened and when</b> — no accusations, no edits to make things look worse. The value of this map is that the numbers can be trusted by anyone, including the people responsible for fixing the grid.
        </Block>
        <Block icon="shield" title="Open source — check it yourself">
          The code that runs this app is <b style={{ color: GPT_T.ink }}>public</b>. Anyone can read it and confirm that reporting really is anonymous — and that no company or government controls it. It’s released so it can never be locked up or taken over.
          <button onClick={onProject} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 13px', marginTop: 12, borderRadius: 12, background: GPT_T.wash, border: 'none', color: GPT_T.ink, fontFamily: GPT_FONT, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <span>About this project</span><GPTIcon name="chevron" size={16} color={GPT_T.ink45} />
          </button>
        </Block>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontFamily: GPT_FONT, fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600 }}>gambiaoutage.com · independent & community-run</div>
        </div>
      </div>
      <div style={{ padding: '11px 14px calc(11px + env(safe-area-inset-bottom))', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <button onClick={() => onReport('out')} style={{ width: '100%', minHeight: 54, borderRadius: 15, border: 'none', background: th.out, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer' }}>
          <GPTIcon name="out" size={22} color="#fff" strokeColor={th.out} /> Report an outage
        </button>
      </div>
    </div>
  );
}

// Two steps: (1) location permission, then (2) optional "Introduce yourself to the community" —
// a device pseudonym (avatar + nickname + free-text bio). The bio/nickname are published only if
// the user writes something (persistent-pseudonym model); skipping keeps everything device-local
// and never links anything to reports. Faithful port of web/src/screens/FirstRunOverlay.tsx.
function FirstRunOverlay({ onAllow, onSkip }) {
  const th = useTheme();
  const [step, setStep] = React.useState('loc');
  const [nick, setNick] = React.useState('');
  const [bio, setBio] = React.useState('');
  const primaryBtn = { width: '100%', minHeight: 56, borderRadius: 16, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16.5, marginTop: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 };
  const ghostBtn = { width: '100%', minHeight: 50, borderRadius: 14, border: 'none', background: 'transparent', color: GPT_T.ink70, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 15, marginTop: 6, cursor: 'pointer' };
  const field = { width: '100%', boxSizing: 'border-box', border: `1.5px solid ${GPT_T.line}`, borderRadius: 11, padding: '12px 13px', fontFamily: GPT_FONT, fontSize: 15, color: GPT_T.ink, background: GPT_T.wash, outline: 'none' };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, fontFamily: GPT_FONT, background: GPT_T.panel, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* faint flag + map background */}
      <FlagBg opacity={0.2} scrim="linear-gradient(180deg, rgba(15,23,34,0.72), rgba(15,23,34,0.93))" />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.22 }}><GambiaMap mode="blob" bg="transparent" land="rgba(255,255,255,0.05)" /></div>
      {/* hero region */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '28px 26px 0', display: 'flex', justifyContent: 'center' }}><Logo size={18} mono variant="full" /></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}>
          {step === 'loc' ? (
            <React.Fragment>
              <div style={{ width: 78, height: 78, borderRadius: 24, background: th.out, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: `0 16px 44px ${th.out}77` }}>
                <GPTIcon name="pin" size={42} color="#fff" />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.12 }}>See where the power<br/>is out — right now</div>
              <div style={{ fontSize: 15.5, color: GPT_T.panelInk, fontWeight: 500, lineHeight: 1.5, marginTop: 14, maxWidth: 320 }}>
                A public, anonymous record of outages across The Gambia. Reporting takes two taps.
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <PseudoAvatar name={nick} size={72} />
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.14, marginTop: 16 }}>Introduce yourself<br/>to the community</div>
              <div style={{ fontSize: 14, color: GPT_T.panelInk60, fontWeight: 500, lineHeight: 1.5, marginTop: 10, maxWidth: 320 }}>
                Optional. A nickname &amp; a line about you — no real name, no phone, no email. You stay anonymous when reporting.
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
      {/* card pinned bottom */}
      <div style={{ position: 'relative', background: GPT_T.paper, color: GPT_T.ink, borderRadius: '24px 24px 0 0', padding: '22px 22px calc(22px + env(safe-area-inset-bottom))', textAlign: 'center', boxShadow: '0 -20px 50px rgba(0,0,0,0.45)' }}>
        {step === 'loc' ? (
          <React.Fragment>
            <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>Use your location?</div>
            <div style={{ fontSize: 14.5, color: GPT_T.ink70, fontWeight: 500, lineHeight: 1.5, marginTop: 7, maxWidth: 320, marginInline: 'auto' }}>
              It’s used <b style={{ color: GPT_T.ink }}>only to place your report</b> on the map — no account, no personal data, ever.
            </div>
            <button onClick={() => setStep('intro')} style={primaryBtn}>
              <GPTIcon name="pin" size={20} color="#fff" /> Allow location
            </button>
            <button onClick={() => setStep('intro')} style={ghostBtn}>Skip &amp; pick my area</button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <input value={nick} maxLength={24} placeholder="Nickname (optional)" onChange={e => setNick(e.target.value)} style={field} />
            <textarea value={bio} maxLength={160} rows={2} placeholder="Introduce yourself to the community (optional)" onChange={e => setBio(e.target.value)} style={{ ...field, resize: 'none', marginTop: 9, lineHeight: 1.45 }} />
            <button onClick={onAllow} style={primaryBtn}>{bio.trim() || nick.trim() ? 'Join the community' : 'Continue'}</button>
            <button onClick={onSkip} style={ghostBtn}>Skip for now</button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

// ── SplashScreen — Concept B: Thunderstorm direction.
// Dark storm panel → lightning bolt flashes → thunder rumbles visually → brand rises.
// Returning users see "Enter as {name}" affordance. New users get the original FirstRunOverlay.
// APP_VERSION-style "UPDATED TO v…" line for returning users. Auto-enters after ~4.5s.
// Tap anywhere to skip; tapping a button pauses the auto-timer.
// Tweaks: TWEAK.splashUser = nickname string for returning-user affordance.
function SplashScreen({ onDone, showGps = false }) {
  const [phase, setPhase] = React.useState('dark'); // dark → flash → storm → risen
  const [engaged, setEngaged] = React.useState(false);
  const timer = React.useRef(null);
  const splashUser = (window.TWEAK && window.TWEAK.splashUser) || '';
  // APP_VERSION sourced from the window global if available
  const appVersion = (window.APP_VERSION) || '0.106';
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase('flash'), 600);
    const t2 = setTimeout(() => setPhase('storm'), 1200);
    const t3 = setTimeout(() => setPhase('risen'), 2200);
    timer.current = setTimeout(onDone, 4500);
    return () => { [t1, t2, t3].forEach(clearTimeout); if (timer.current) clearTimeout(timer.current); };
  }, []);
  const pauseAuto = (e) => { e.stopPropagation(); if (timer.current) { clearTimeout(timer.current); timer.current = null; } setEngaged(true); };
  const risen = phase === 'risen';
  return (
    <div onClick={onDone} role="img" aria-label="Gambia Outage — Report the Dark"
      style={{ position: 'absolute', inset: 0, zIndex: 96, background: GPT_T.panel, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: GPT_FONT, padding: 24, cursor: 'pointer', overflow: 'hidden' }}>
      <style>{`
        @keyframes goSplFlash { 0% { opacity: 0; } 8% { opacity: 1; } 20% { opacity: 0; } 28% { opacity: 0.7; } 40% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes goSplLightning { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
        @keyframes goSplStorm { 0% { opacity: 0; transform: scale(0.85) translateY(12px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes goSplRise { 0% { opacity: 0; transform: translateY(18px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes goSplUrl { 0%, 60% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes goSplThunder { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      `}</style>
      {/* Thunderstorm background: dark sky with blue-white lightning ambience */}
      {phase === 'flash' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(180,200,255,0.18)', animation: 'goSplFlash .6s ease-out both', pointerEvents: 'none' }} />
      )}
      {/* Lightning bolt SVG — centre of the screen, flashes on 'flash' phase */}
      {(phase === 'flash' || phase === 'storm') && (
        <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', animation: 'goSplLightning .6s ease-out both' }}>
          <svg width="48" height="96" viewBox="0 0 48 96" fill="none" aria-hidden>
            <polygon points="28,0 8,52 22,52 16,96 44,36 28,36" fill="rgba(180,210,255,0.92)" />
          </svg>
        </div>
      )}
      {/* Brand stack — rises on 'storm' and 'risen' phases */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: phase === 'dark' || phase === 'flash' ? 0 : 1,
        animation: phase === 'storm' || phase === 'risen' ? 'goSplStorm .6s cubic-bezier(.2,.8,.2,1) both' : 'none' }}>
        <div style={{ filter: 'drop-shadow(0 0 24px rgba(100,160,255,0.5))' }}>
          <LogoMark size={110} />
        </div>
        <div style={{ marginTop: 20, fontSize: 29, fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase', color: GPT_T.panelInk, lineHeight: 1,
          animation: risen ? 'goSplRise .5s ease-out both' : 'none' }}>
          Gambia <span style={{ opacity: 0.55 }}>Outage</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
          animation: risen ? 'goSplRise .6s ease-out .08s both' : 'none' }}>
          <FlagRule height={4} radius={1} style={{ width: 26 }} />
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 2.6, textTransform: 'uppercase', color: GPT_T.panelInk60 }}>Report the Dark</span>
          <FlagRule height={4} radius={1} style={{ width: 26 }} />
        </div>
        {/* APP_VERSION line for returning users */}
        {splashUser && (
          <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: GPT_T.panelInk60, letterSpacing: 0.4,
            animation: risen ? 'goSplUrl .5s ease-out .2s both' : 'none' }}>
            UPDATED TO v{appVersion}
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 700, color: GPT_T.panelInk60, letterSpacing: 0.4,
          animation: risen ? 'goSplUrl .5s ease-out .3s both' : 'none' }}>
          gambiaoutage.com · open source
        </div>
      </div>
      {/* Functional actions — rise once the brand has risen */}
      <div style={{ position: 'absolute', bottom: 58, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        opacity: risen ? 1 : 0, transform: risen ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .45s ease-out, transform .45s ease-out', pointerEvents: risen ? 'auto' : 'none' }}>
        {/* Returning-user "Enter as {name}" affordance */}
        {splashUser ? (
          <button onClick={(e) => { pauseAuto(e); onDone(); }}
            style={{ border: 'none', background: GPT_T.panelLine || 'rgba(255,255,255,0.12)', color: GPT_T.panelInk, borderRadius: 999, padding: '11px 24px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚡ Enter as {splashUser}
          </button>
        ) : (
          <WhatsAppButton variant="pill" onActivate={pauseAuto} />
        )}
        {showGps && !splashUser && (
          <button onClick={pauseAuto}
            style={{ border: `1.5px solid ${GPT_T.panelLine || 'rgba(255,255,255,0.2)'}`, background: 'transparent', color: GPT_T.panelInk, borderRadius: 999, padding: '9px 18px', fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
            📍 Allow location
          </button>
        )}
        {/* Tweaks: skip button for the design harness */}
        <button onClick={(e) => { pauseAuto(e); onDone(); }}
          style={{ border: 'none', background: 'transparent', color: GPT_T.panelInk60 || 'rgba(255,255,255,0.4)', fontFamily: GPT_FONT, fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: '4px 0' }}>
          Skip splash
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontSize: 12, fontWeight: 600, color: GPT_T.panelInk60 || 'rgba(255,255,255,0.35)', opacity: engaged ? 1 : 0, transition: 'opacity .3s' }}>
        Tap anywhere to enter →
      </div>
    </div>
  );
}

Object.assign(window, { AboutScreen, FirstRunOverlay, SplashScreen });
