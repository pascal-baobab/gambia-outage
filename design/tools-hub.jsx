// tools-hub.jsx — Gambia Outage v2.0 · Tools hub card section on HomeScreen
// Consumes ds.jsx globals on window.*: GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell, LogoMark.
// Whitelisted tokens only. ToolsHub is decoupled: it calls onOpen(id) — routing is the host's job.
// Icon note for Claude Code: GPTIcon has no 'calculator'/'grid'/'game' case — this prototype ships
// two small inline glyphs (CalcGlyph, BoardGlyph). Recommend adding 'calculator' + 'grid' to the
// GPTIcon switch in ds.jsx, or reuse these inline glyphs.
(function () {
  const { GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell, LogoMark } = window;
  const TH = THEMES.standard;

  const STR = {
    EN: { title: 'Tools', calculator: 'Calculator', photoCrush: 'Photo Crush', comingSoon: 'Coming soon', rightNow: 'The Gambia right now', calcSub: 'Quick everyday maths', gameSub: 'Match-3 · Gambia tiles', soonSub: 'More tools on the way' },
    FR: { title: 'Outils', calculator: 'Calculatrice', photoCrush: 'Photo Crush', comingSoon: 'Bientôt disponible', rightNow: 'La Gambie en ce moment', calcSub: 'Calculs du quotidien', gameSub: 'Match-3 · tuiles gambiennes', soonSub: 'D’autres outils arrivent' },
    AR: { title: 'الأدوات', calculator: 'الآلة الحاسبة', photoCrush: 'فوتو كراش', comingSoon: 'قريباً', rightNow: 'غامبيا الآن', calcSub: 'حسابات يومية سريعة', gameSub: 'مطابقة 3 · بلاطات غامبية', soonSub: 'المزيد من الأدوات قريباً' },
  };

  function CalcGlyph({ size = 19, color = GPT_T.ink70 }) {
    return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="1.8" /><rect x="7" y="6" width="10" height="3.5" rx="1" fill={color} /><g fill={color}><circle cx="8.5" cy="13" r="1.2" /><circle cx="12" cy="13" r="1.2" /><circle cx="15.5" cy="13" r="1.2" /><circle cx="8.5" cy="17" r="1.2" /><circle cx="12" cy="17" r="1.2" /><circle cx="15.5" cy="17" r="1.2" /></g></svg>);
  }
  function BoardGlyph({ size = 19, color = GPT_T.ink70 }) {
    return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><g fill={color}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></g></svg>);
  }

  // The deliverable section (drop-in for HomeScreen). Renders heading + entry cards.
  function ToolsHubSection({ lang = 'EN', onOpen, showThird = true, rtl }) {
    const t = STR[lang];
    const chev = (
      <span style={{ display: 'inline-flex', transform: rtl ? 'scaleX(-1)' : 'none' }}><GPTIcon name="chevron" size={18} color={GPT_T.ink45} /></span>
    );
    return (
      <section style={{ background: GPT_T.wash, padding: '4px 16px 18px', direction: rtl ? 'rtl' : 'ltr' }}>
        {/* t('tools.title') */}
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: GPT_T.ink45, margin: '6px 0 10px' }}>{t.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {/* Calculator — t('tools.calculator') */}
          <button onClick={() => onOpen && onOpen('calculator')} aria-label={t.calculator}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', minHeight: 44, cursor: 'pointer', fontFamily: GPT_FONT, flexDirection: rtl ? 'row-reverse' : 'row', textAlign: rtl ? 'right' : 'left' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CalcGlyph /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>{t.calculator}</span>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{t.calcSub}</span>
            </span>
            {chev}
          </button>
          {/* Photo Crush — t('tools.photoCrush') */}
          <button onClick={() => onOpen && onOpen('photoCrush')} aria-label={t.photoCrush}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', minHeight: 44, cursor: 'pointer', fontFamily: GPT_FONT, flexDirection: rtl ? 'row-reverse' : 'row', textAlign: rtl ? 'right' : 'left' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BoardGlyph /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>{t.photoCrush}</span>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{t.gameSub}</span>
            </span>
            {chev}
          </button>
          {/* scalability placeholder — proves the section grows without a redesign */}
          {showThird && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: GPT_T.paper, border: `1px dashed ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', minHeight: 44, fontFamily: GPT_FONT, opacity: 0.85, flexDirection: rtl ? 'row-reverse' : 'row', textAlign: rtl ? 'right' : 'left' }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><GPTIcon name="info" size={18} color={GPT_T.ink25} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink45 }}>{t.soonSub}</span>
              </span>
              {/* t('tools.comingSoon') */}
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: GPT_T.ink45, background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 999, padding: '3px 9px', flexShrink: 0, whiteSpace: 'nowrap' }}>{t.comingSoon}</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Full demo: the Tools hub shown inside a mock HomeScreen (placement = below outage content).
  function ToolsHubApp({ lang = 'EN', onOpen }) {
    const t = STR[lang];
    const rtl = lang === 'AR';
    return (
      <ThemeCtx.Provider value={TH}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr' }}>
          {/* light AppHeader */}
          <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, padding: '10px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, direction: 'ltr' }}>
                <LogoMark size={30} />
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.04 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: GPT_T.ink, letterSpacing: 0.3, textTransform: 'uppercase' }}>Gambia</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: GPT_T.ink45, letterSpacing: 0.3, textTransform: 'uppercase' }}>Outage</span>
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 7, border: `1px solid ${GPT_T.line}`, background: GPT_T.wash, fontSize: 11, fontWeight: 800, color: GPT_T.ink }}>🇬🇧 {lang}</span>
                <GPTIcon name="bell" size={22} color={GPT_T.ink45} />
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {/* mock outage content above the hub */}
            <div style={{ padding: '14px 16px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.3 }}>{t.rightNow}</span>
              </div>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {[1, 0, 0, 1, 0, 1, 0].map((lit, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <GPTIcon name="on" size={28} color={lit ? TH.on : TH.out} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: lit ? TH.onDeep : GPT_T.ink25 }}>{lit ? 'on' : fmt()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 10 }} />
            {/* === the deliverable: Tools hub === */}
            <ToolsHubSection lang={lang} onOpen={onOpen} rtl={rtl} showThird />
            {/* footer hint below */}
            <div style={{ padding: '6px 16px 18px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink25 }}>Built by neighbours · gambiaoutage.com</span>
            </div>
          </div>
        </div>
      </ThemeCtx.Provider>
    );
  }
  function fmt() { return '—'; }

  function ToolsHubDemo({ lang = 'EN', onOpen }) { return <PhoneShell><ToolsHubApp lang={lang} onOpen={onOpen} /></PhoneShell>; }

  window.ToolsHubSection = ToolsHubSection;
  window.ToolsHubApp = ToolsHubApp;
  window.ToolsHubDemo = ToolsHubDemo;
})();
