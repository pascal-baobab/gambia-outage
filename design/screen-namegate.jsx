// screen-namegate.jsx — NameGate overlay (Surface 9: create mode + Surface 10: recover mode)
// React-over-Babel prototype. No imports, no TypeScript, no ES modules.
// Port of web/src/screens/NameGate.tsx — API calls replaced with mock debounced state.
// Exported: NameGate

const { useState, useEffect, useRef } = React;

// Status hint colours (from NameGate.tsx visual logic + PATTERNS.md section "screen-namegate.jsx")
const HINT_COLOR = {
  idle:     GPT_T.ink45,
  short:    GPT_T.ink45,
  checking: GPT_T.ink45,
  ok:       THEMES.standard.on,
  taken:    THEMES.standard.out,
  invalid:  THEMES.standard.out,
  reserved: THEMES.standard.out,
  error:    THEMES.standard.out,
};

const HINT_TEXT = {
  idle:     'Pick a unique public name (3–32 characters)',
  short:    'Too short — at least 3 characters',
  checking: 'Checking availability…',
  ok:       'Available!',
  taken:    'Already taken — try another',
  invalid:  'Only letters, numbers, and underscores',
  reserved: 'This name is reserved',
  error:    'Could not check — tap Claim to try anyway',
};

// Eye-toggle SVG for the password field (visible / hidden)
function EyeToggle({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx={12} cy={12} r={3}/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1={1} y1={1} x2={23} y2={23}/>
    </svg>
  );
}

function NameGate({ onDone, onSkip }) {
  const th = useTheme();
  const [mode, setMode] = useState('create'); // 'create' | 'recover'
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle|short|checking|ok|taken|invalid|error
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rName, setRName] = useState('');
  const [rvMsg, setRvMsg] = useState('');

  const avatarId = (GPT_DATA.profile && GPT_DATA.profile.avatarId) || 'av3';

  // Mock debounced availability check — cycles through checking→ok after 600ms
  useEffect(() => {
    const n = name.trim();
    if (n.length === 0) { setStatus('idle'); return; }
    if (n.length < 3) { setStatus('short'); return; }
    setStatus('checking');
    const id = setTimeout(() => setStatus(n === 'taken' ? 'taken' : 'ok'), 600);
    return () => clearTimeout(id);
  }, [name]);

  const canClaim = (status === 'ok' || status === 'error') && name.trim().length >= 3;

  // Shared field style
  const fieldStyle = {
    width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${status === 'ok' ? th.on : (status === 'taken' || status === 'reserved' || status === 'invalid') ? th.out : GPT_T.line}`,
    borderRadius: 12, padding: '13px 14px 13px 14px',
    fontFamily: GPT_FONT, fontSize: 16, fontWeight: 700,
    color: GPT_T.ink, background: GPT_T.wash, outline: 'none',
  };

  const recoverFieldStyle = {
    width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${GPT_T.line}`,
    borderRadius: 12, padding: '13px 14px',
    fontFamily: GPT_FONT, fontSize: 16, fontWeight: 700,
    color: GPT_T.ink, background: GPT_T.wash, outline: 'none',
  };

  const primaryBtnStyle = {
    width: '100%', minHeight: 56, borderRadius: 16, border: 'none',
    fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16.5, marginTop: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    background: canClaim ? GPT_T.ink : GPT_T.line,
    color: canClaim ? '#fff' : GPT_T.ink45,
    cursor: canClaim ? 'pointer' : 'not-allowed',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 96, display: 'flex', flexDirection: 'column', fontFamily: GPT_FONT }}>

      {/* Dark panel top (~38% height): FlagBg + Logo + avatar preview */}
      <div style={{ background: GPT_T.panel, flex: '0 0 38%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 }}>
        <FlagBg opacity={0.18} scrim="linear-gradient(180deg, rgba(15,23,34,0.62), rgba(15,23,34,0.88))" />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Logo size={16} mono variant="compact" />
          {/* Avatar preview circle */}
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: GPT_T.panelLine, border: `2px solid ${GPT_T.panelInk60}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <PseudoAvatar id={avatarId} name={name || '?'} size={60} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
            {name || 'Your name here'}
          </div>
        </div>
      </div>

      {/* Light bottom sheet: input + status hint + buttons */}
      <div style={{ background: GPT_T.paper, flex: 1, borderRadius: '24px 24px 0 0', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', marginTop: -20 }}>

        {mode === 'create' ? (
          <React.Fragment>
            {/* Name input */}
            <div style={{ position: 'relative' }}>
              <input
                value={name}
                maxLength={32}
                placeholder="Choose your public name"
                onChange={e => setName(e.target.value)}
                style={fieldStyle}
              />
              <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', lineHeight: 0 }}>
                {status === 'ok' && <GPTIcon name="check" size={18} color={th.on} />}
                {(status === 'taken' || status === 'reserved' || status === 'invalid') && <GPTIcon name="close" size={16} color={th.out} />}
              </span>
            </div>

            {/* Status hint line */}
            <div style={{ fontSize: 12.5, fontWeight: 600, color: HINT_COLOR[status] || GPT_T.ink45, marginTop: -8, minHeight: 17, textAlign: 'start' }}>
              {HINT_TEXT[status] || ''}
            </div>

            {/* Claim button */}
            <button
              onClick={() => canClaim && onDone && onDone()}
              disabled={!canClaim}
              style={primaryBtnStyle}
            >
              Claim my name
            </button>

            {/* Skip button */}
            {onSkip && (
              <button
                onClick={onSkip}
                style={{ width: '100%', minHeight: 50, borderRadius: 14, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.wash, cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 15, fontWeight: 800, color: GPT_T.ink, textAlign: 'center' }}
              >
                Skip for now
              </button>
            )}

            {/* Recover existing account link */}
            <button
              onClick={() => { setMode('recover'); setRvMsg(''); }}
              style={{ width: '100%', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 600, color: GPT_T.ink45, textAlign: 'center' }}
            >
              Recover existing account{' '}
              <b style={{ color: GPT_T.ink70 }}>on another phone?</b>
            </button>

            {/* Privacy disclaimer */}
            <div style={{ fontSize: 11.5, color: GPT_T.ink45, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600 }}>
              <GPTIcon name="lock" size={13} color={GPT_T.ink45} />
              Your name is never linked to your reports.
            </div>

            {/* Language badge stub */}
            <div style={{ borderTop: `1px solid ${GPT_T.line}`, paddingTop: 14, display: 'flex', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: `1px solid ${GPT_T.line}`, background: GPT_T.wash, fontFamily: GPT_FONT, fontSize: 12, fontWeight: 800, color: GPT_T.ink }}>
                {'🇬🇧'} EN
              </span>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {/* Recover mode */}
            <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>Recover your account</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: GPT_T.ink45, marginTop: -8, textAlign: 'start' }}>
              Enter the name and password you set on your other device.
            </div>

            {/* Name field */}
            <input
              value={rName}
              maxLength={32}
              placeholder="Your existing name"
              onChange={e => setRName(e.target.value)}
              style={recoverFieldStyle}
            />

            {/* Password field with eye toggle */}
            <div style={{ position: 'relative', marginTop: 4 }}>
              <input
                value={pw}
                type={showPw ? 'text' : 'password'}
                placeholder="Recovery password"
                onChange={e => setPw(e.target.value)}
                style={{ ...recoverFieldStyle, paddingRight: 46 }}
              />
              <button
                onClick={() => setShowPw(v => !v)}
                type="button"
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: GPT_T.ink45, padding: 2, lineHeight: 0 }}
              >
                <EyeToggle visible={showPw} />
              </button>
            </div>

            {/* Error state */}
            {rvMsg && (
              <div style={{ fontSize: 12.5, fontWeight: 700, color: th.out, marginTop: -8, textAlign: 'start' }}>
                {rvMsg}
              </div>
            )}

            {/* Recover button */}
            <button
              onClick={() => {
                if (!rName.trim() || pw.length < 6) {
                  setRvMsg('Please enter your name and a password of at least 6 characters.');
                  return;
                }
                // Mock: always fail with invalid credentials in prototype
                setRvMsg('Name or password not found — check and try again.');
              }}
              style={{
                width: '100%', minHeight: 56, borderRadius: 16, border: 'none',
                fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16.5, marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: (rName.trim() && pw.length >= 6) ? GPT_T.ink : GPT_T.line,
                color: (rName.trim() && pw.length >= 6) ? '#fff' : GPT_T.ink45,
                cursor: (rName.trim() && pw.length >= 6) ? 'pointer' : 'not-allowed',
              }}
            >
              Recover account
            </button>

            {/* Back to create link */}
            <button
              onClick={() => setMode('create')}
              style={{ width: '100%', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 600, color: GPT_T.ink45, textAlign: 'center' }}
            >
              Create a new name instead
            </button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { NameGate });
