// add-ons-launcher.jsx — Gambia Outage · radio strip → add-ons launcher (THROWAWAY SKETCH)
// ⚠ Owner-review sketch for the discoverability fix (owner directive 2026-06-14). NOT the final bundle.
//   Problem: Calculator + Photo-Crush live in the Tools hub at the BOTTOM of HomeScreen (below the fold)
//   → undiscoverable. Fix: the slim radio strip (global, above BottomNav, on nearly every screen) gains
//   an "apps" launcher button → a popover listing every add-on (Radio / Calculator / Photo-Crush /
//   Zone Leaderboard) reachable from anywhere. Mirrors the existing StationPicker popover pattern.
// Consumes ds.jsx globals on window.*: GPT_T, GPT_FONT, FLAG, ACCENT, THEMES, ThemeCtx, GPTIcon, PhoneShell.
// Whitelisted tokens only. Inline SVG glyphs for calculator/game/trophy (GPTIcon has no such cases).
(function () {
  const { GPT_T, GPT_FONT, FLAG, ACCENT, THEMES, ThemeCtx, GPTIcon, PhoneShell } = window;
  const TH = THEMES.standard;

  const STR = {
    EN: {
      addOns: 'Add-ons', radio: 'Radio', radioSub: '14 stations',
      calc: 'Calculator', calcSub: 'With memory · offline',
      game: 'Photo Crush', gameSub: 'Match-3 · personalize tiles',
      board: 'Zone Leaderboard', boardSub: 'Weekly top scores',
      nowPlaying: 'LagosJump Radio', track: 'Burna Boy — Last Last',
    },
    FR: {
      addOns: 'Extensions', radio: 'Radio', radioSub: '14 stations',
      calc: 'Calculatrice', calcSub: 'Avec mémoire · hors ligne',
      game: 'Photo Crush', gameSub: 'Match-3 · tuiles perso',
      board: 'Classement par zone', boardSub: 'Meilleurs scores de la semaine',
      nowPlaying: 'LagosJump Radio', track: 'Burna Boy — Last Last',
    },
    AR: {
      addOns: 'الإضافات', radio: 'راديو', radioSub: '14 محطة',
      calc: 'آلة حاسبة', calcSub: 'بذاكرة · دون اتصال',
      game: 'فوتو كراش', gameSub: 'مطابقة-3 · بلاطات مخصّصة',
      board: 'لوحة الصدارة', boardSub: 'أفضل نتائج الأسبوع',
      nowPlaying: 'LagosJump Radio', track: 'Burna Boy — Last Last',
    },
  };

  // ── inline glyphs (no GPTIcon case) ──
  function CalcGlyph({ c }) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="3" stroke={c} strokeWidth="2" />
        <rect x="7" y="6" width="10" height="4" rx="1" fill={c} />
        <circle cx="8.5" cy="14" r="1.2" fill={c} /><circle cx="12" cy="14" r="1.2" fill={c} /><circle cx="15.5" cy="14" r="1.2" fill={c} />
        <circle cx="8.5" cy="17.5" r="1.2" fill={c} /><circle cx="12" cy="17.5" r="1.2" fill={c} /><circle cx="15.5" cy="17.5" r="1.2" fill={c} />
      </svg>
    );
  }
  function GameGlyph({ c }) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" fill={c} />
        <rect x="13" y="3" width="8" height="8" rx="2" fill={c} opacity="0.55" />
        <rect x="3" y="13" width="8" height="8" rx="2" fill={c} opacity="0.55" />
        <rect x="13" y="13" width="8" height="8" rx="2" fill={c} />
      </svg>
    );
  }
  function TrophyGlyph({ c }) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" stroke={c} strokeWidth="2" />
        <path d="M12 13v4M9 20h6M10 17h4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  function RadioGlyph({ c }) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="8" width="18" height="12" rx="3" stroke={c} strokeWidth="2" />
        <circle cx="15" cy="14" r="3" stroke={c} strokeWidth="2" />
        <path d="M7 4l9 4" stroke={c} strokeWidth="2" strokeLinecap="round" />
        <circle cx="7.5" cy="13.5" r="1" fill={c} />
      </svg>
    );
  }

  function Waveform({ color }) {
    const bars = [6, 12, 8, 14, 9];
    return (
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
        {bars.map((h, i) => (
          <span key={i} style={{ width: 2.5, height: h, background: color, borderRadius: 2, opacity: 0.85 }} />
        ))}
      </span>
    );
  }

  function Row({ glyph, label, sub, active, rtl }) {
    return (
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px',
          border: 'none', background: active ? GPT_T.wash : GPT_T.paper, cursor: 'pointer',
          fontFamily: GPT_FONT, textAlign: rtl ? 'right' : 'left',
          flexDirection: rtl ? 'row-reverse' : 'row',
        }}
      >
        <span
          style={{
            width: 38, height: 38, borderRadius: 11, background: active ? rgba(FLAG.green, 0.14) : GPT_T.wash,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {glyph}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>{label}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{sub}</div>
        </span>
        {active
          ? <GPTIcon name="check" size={16} color={FLAG.green} />
          : <GPTIcon name="chevron" size={15} color={GPT_T.ink45} />}
      </button>
    );
  }

  function rgba(hex, a) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function LauncherDemo({ lang = 'EN' }) {
    const t = STR[lang] || STR.EN;
    const rtl = lang === 'AR';
    const [open, setOpen] = React.useState(true); // open by default so the sketch shows the menu

    return (
      <ThemeCtx.Provider value={{ theme: 'standard' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr', position: 'relative' }}>
          {/* faux page body so the strip sits at the bottom like in the app */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: 24, textAlign: 'center' }}>
            (any screen — the strip is global)
          </div>

          {/* backdrop when open */}
          {open && <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(15,23,34,0.18)' }} onClick={() => setOpen(false)} />}

          {/* add-ons popover */}
          {open && (
            <div style={{ position: 'absolute', bottom: 52, left: 12, right: 12, zIndex: 91, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 18, boxShadow: '0 10px 30px rgba(15,23,34,0.18)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: GPT_T.ink45 }}>{t.addOns}</div>
              <div style={{ borderTop: `1px solid ${GPT_T.line}` }} />
              <Row glyph={<RadioGlyph c={FLAG.green} />} label={t.radio} sub={t.radioSub} active rtl={rtl} />
              <div style={{ borderTop: `1px solid ${GPT_T.line}` }} />
              <Row glyph={<CalcGlyph c={FLAG.blue} />} label={t.calc} sub={t.calcSub} rtl={rtl} />
              <div style={{ borderTop: `1px solid ${GPT_T.line}` }} />
              <Row glyph={<GameGlyph c={ACCENT.tile4} />} label={t.game} sub={t.gameSub} rtl={rtl} />
              <div style={{ borderTop: `1px solid ${GPT_T.line}` }} />
              <Row glyph={<TrophyGlyph c={ACCENT.star} />} label={t.board} sub={t.boardSub} rtl={rtl} />
            </div>
          )}

          {/* the radio strip — now with a launcher button */}
          <div style={{ background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, minHeight: 46, zIndex: 92, position: 'relative' }}>
            {/* NEW launcher button (apps/grid) */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={t.addOns}
              style={{ width: 34, height: 34, borderRadius: 11, border: `1.5px solid ${open ? GPT_T.ink : GPT_T.line}`, background: open ? GPT_T.ink : GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                {[4, 14].map((x) => [4, 14].map((y) => (
                  <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.6" fill={open ? '#fff' : GPT_T.ink70} />
                )))}
              </svg>
            </button>
            {/* play/pause */}
            <button style={{ width: 34, height: 34, borderRadius: 11, border: 'none', background: FLAG.green, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="#fff" /><rect x="14" y="5" width="4" height="14" rx="1" fill="#fff" /></svg>
            </button>
            {/* now-playing */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nowPlaying}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1, flexDirection: rtl ? 'row-reverse' : 'row' }}>
                <Waveform color={FLAG.green} />
                <span style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.track}</span>
              </div>
            </div>
          </div>

          {/* faux bottom nav for context */}
          <div style={{ height: 52, background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexShrink: 0, color: GPT_T.ink45, fontSize: 10, fontWeight: 700 }}>
            {['Home', 'Map', 'News', 'Community', 'Talk', 'You'].map((n) => <span key={n}>{n}</span>)}
          </div>
        </div>
      </ThemeCtx.Provider>
    );
  }

  window.AddOnsLauncherDemo = LauncherDemo;
})();
