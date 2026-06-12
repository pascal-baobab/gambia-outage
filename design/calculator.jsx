// calculator.jsx — Gambia Outage v2.0 · light-direction PILOT (CALC-06)
// Consumes ds.jsx globals on window.*: GPT_T, GPT_FONT, FLAG, THEMES, ThemeCtx, GPTIcon, PhoneShell.
// Tokens only (whitelist): GPT_T.keyDigit / keyOp / wash / paper / ink / ink45 / ink70 / line,
//   THEMES.standard.on (operator active). No invented hex.
// Immediate-execution engine (5 + 3 × 2 = 16). Keypad is LTR-ALWAYS (CALC-03); only the display
// substitutes Arabic-Indic numerals in AR locale via JS string replacement.
(function () {
  const { GPT_T, GPT_FONT, THEMES, ThemeCtx, GPTIcon, PhoneShell } = window;
  const TH = THEMES.standard;

  // ── i18n (prototype stub — every string carries its t() key) ──────────────
  const STR = {
    EN: { title: 'Calculator' /* t('calculator.title') */, mem: 'M' /* t('calculator.memory') */ },
    FR: { title: 'Calculatrice', mem: 'M' },
    AR: { title: 'الآلة الحاسبة', mem: 'م' },
  };
  // Arabic-Indic numeral substitution — DISPLAY ONLY (CALC-03), keypad labels stay ASCII.
  const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function localizeNum(s, lang) {
    if (lang !== 'AR') return s;
    return String(s).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
  }

  // ── numeric formatting — kill float dust, cap length ──────────────────────
  function fmt(n) {
    if (!isFinite(n)) return 'Error';
    if (n === 0) return '0';
    let s = (Math.round(n * 1e10) / 1e10).toString();
    if (s.replace('-', '').replace('.', '').length > 12) {
      s = n.toPrecision(10).replace(/\.?0+$/, '');
      if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)) s = n.toExponential(6);
    }
    return s;
  }
  function compute(a, b, op) {
    switch (op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return b === 0 ? NaN : a / b; default: return b; }
  }
  const OP_SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  function CalculatorApp({ lang = 'EN', onBack }) {
    const t = STR[lang] || STR.EN;
    const rtl = lang === 'AR';
    const [st, setSt] = React.useState({ display: '0', acc: null, pending: null, waiting: false, mem: 0 });

    const haptic = () => { try { navigator.vibrate && navigator.vibrate(10); } catch (e) {} };

    const act = (fn) => () => { haptic(); setSt((s) => fn({ ...s })); };

    const inputDigit = (d) => act((s) => {
      if (s.display === 'Error') s.display = '0';
      if (s.waiting) { s.display = d; s.waiting = false; }
      else s.display = s.display === '0' ? d : s.display + d;
      return s;
    });
    const inputDot = act((s) => {
      if (s.waiting) { s.display = '0.'; s.waiting = false; }
      else if (!s.display.includes('.')) s.display += '.';
      return s;
    });
    const setOperator = (op) => act((s) => {
      const val = parseFloat(s.display);
      if (s.pending != null && !s.waiting) { const r = compute(s.acc, val, s.pending); s.acc = r; s.display = fmt(r); }
      else s.acc = val;
      s.pending = op; s.waiting = true;
      return s;
    });
    const equals = act((s) => {
      if (s.pending == null) return s;
      const val = parseFloat(s.display);
      const r = compute(s.acc, val, s.pending);
      s.display = fmt(r); s.acc = null; s.pending = null; s.waiting = true;
      return s;
    });
    const clearAll = act((s) => ({ ...s, display: '0', acc: null, pending: null, waiting: false }));
    const backspace = act((s) => {
      if (s.waiting || s.display === 'Error') return s;
      s.display = s.display.length > 1 ? s.display.slice(0, -1) : '0';
      if (s.display === '-') s.display = '0';
      return s;
    });
    const percent = act((s) => ({ ...s, display: fmt(parseFloat(s.display) / 100), waiting: false }));
    const negate = act((s) => ({ ...s, display: fmt(-parseFloat(s.display)) }));
    const memAdd = act((s) => ({ ...s, mem: s.mem + parseFloat(s.display || '0'), waiting: true }));
    const memSub = act((s) => ({ ...s, mem: s.mem - parseFloat(s.display || '0'), waiting: true }));
    const memRecall = act((s) => (s.mem ? { ...s, display: fmt(s.mem), waiting: true } : s));
    const memClear = act((s) => ({ ...s, mem: 0 }));

    // secondary expression echo (e.g. "12 ×")
    const secondary = st.pending != null ? `${localizeNum(fmt(st.acc), lang)} ${OP_SYM[st.pending]}` : '\u00A0';
    const shown = localizeNum(st.display, lang);

    // ── key styling ──────────────────────────────────────────────────────
    const keyBase = {
      border: 'none', borderRadius: 16, fontFamily: GPT_FONT, fontWeight: 800, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none',
      transition: 'transform .06s ease, background .12s ease', WebkitTapHighlightColor: 'transparent',
    };
    const digitKey = { ...keyBase, background: GPT_T.keyDigit, color: GPT_T.ink, fontSize: 26 };
    const funcKey = { ...keyBase, background: GPT_T.wash, color: GPT_T.ink70, fontSize: 21 };
    const opKey = (active) => ({ ...keyBase, background: active ? TH.on : GPT_T.keyOp, color: active ? '#fff' : GPT_T.onDeep, fontSize: 26 });
    const memKey = { ...keyBase, background: GPT_T.wash, color: GPT_T.ink70, fontSize: 15, letterSpacing: 0.2, borderRadius: 13 };
    const eqKey = { ...keyBase, background: GPT_T.ink, color: '#fff', fontSize: 30 };

    const Key = ({ style, onClick, label, span, ariaLabel }) => (
      <button type="button" aria-label={ariaLabel || label} onClick={onClick}
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        style={{ ...style, ...(span || {}) }}>{label}</button>
    );

    const opActive = (op) => st.pending === op && st.waiting;

    return (
      <ThemeCtx.Provider value={TH}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 10px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
            <button aria-label="Back" onClick={onBack} style={{ width: 40, height: 40, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 12 }}>
              <GPTIcon name="back" size={24} color={GPT_T.ink70} />
            </button>
            {/* t('calculator.title') */}
            <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.title}</div>
          </div>

          {/* Display */}
          <div style={{ background: GPT_T.paper, padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, position: 'relative', direction: 'ltr', borderBottom: `1px solid ${GPT_T.line}` }}>
            {/* M label — only when memory register is non-zero */}
            <div style={{ position: 'absolute', top: 12, insetInlineStart: 22, height: 18, display: 'flex', alignItems: 'center' }}>
              {st.mem !== 0 && (
                /* t('calculator.memory') */
                <span style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t.mem}</span>
              )}
            </div>
            {/* backspace lives in the display top-right (keeps the keypad a clean 4-col grid) */}
            <button type="button" aria-label="Backspace" onClick={backspace}
              style={{ position: 'absolute', top: 8, insetInlineEnd: 14, width: 38, height: 38, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 11 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7 6-7Z" fill="none" stroke={GPT_T.ink45} strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 9.5l5 5M17 9.5l-5 5" stroke={GPT_T.ink45} strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
            <div style={{ minHeight: 20, fontSize: 17, fontWeight: 600, color: GPT_T.ink45, fontVariantNumeric: 'tabular-nums', marginTop: 18 }}>{secondary}</div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, lineHeight: 0.92, color: GPT_T.ink, fontVariantNumeric: 'tabular-nums', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown}</div>
          </div>

          {/* Keypad — LTR ALWAYS (CALC-03), never mirrors */}
          <div style={{ flex: 1, minHeight: 0, padding: 12, background: GPT_T.wash, direction: 'ltr' }}>
            {/* memory row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
              <Key style={memKey} onClick={memAdd} label="M+" ariaLabel="Memory add" />
              <Key style={memKey} onClick={memSub} label="M−" ariaLabel="Memory subtract" />
              <Key style={memKey} onClick={memRecall} label="MR" ariaLabel="Memory recall" />
              <Key style={memKey} onClick={memClear} label="MC" ariaLabel="Memory clear" />
            </div>
            {/* main keypad: 4 cols × 5 rows, tall = spanning the last two rows */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: 8, height: 'calc(100% - 50px)' }}>
              <Key style={funcKey} onClick={clearAll} label="C" ariaLabel="All clear" />
              <Key style={funcKey} onClick={negate} label="±" ariaLabel="Plus minus" />
              <Key style={funcKey} onClick={percent} label="%" />
              <Key style={opKey(opActive('/'))} onClick={setOperator('/')} label="÷" ariaLabel="Divide" />

              <Key style={digitKey} onClick={inputDigit('7')} label="7" />
              <Key style={digitKey} onClick={inputDigit('8')} label="8" />
              <Key style={digitKey} onClick={inputDigit('9')} label="9" />
              <Key style={opKey(opActive('*'))} onClick={setOperator('*')} label="×" ariaLabel="Multiply" />

              <Key style={digitKey} onClick={inputDigit('4')} label="4" />
              <Key style={digitKey} onClick={inputDigit('5')} label="5" />
              <Key style={digitKey} onClick={inputDigit('6')} label="6" />
              <Key style={opKey(opActive('-'))} onClick={setOperator('-')} label="−" ariaLabel="Subtract" />

              <Key style={digitKey} onClick={inputDigit('1')} label="1" />
              <Key style={digitKey} onClick={inputDigit('2')} label="2" />
              <Key style={digitKey} onClick={inputDigit('3')} label="3" />
              {/* tall = : occupies column 4 across the bottom two rows */}
              <Key style={eqKey} onClick={equals} label="=" span={{ gridColumn: '4', gridRow: '4 / 6' }} />

              <Key style={opKey(opActive('+'))} onClick={setOperator('+')} label="+" ariaLabel="Add" span={{ gridColumn: '1', gridRow: '5' }} />
              <Key style={digitKey} onClick={inputDigit('0')} label="0" span={{ gridColumn: '2', gridRow: '5' }} />
              <Key style={digitKey} onClick={inputDot} label="." ariaLabel="Decimal point" span={{ gridColumn: '3', gridRow: '5' }} />
            </div>
          </div>
        </div>
      </ThemeCtx.Provider>
    );
  }

  function CalculatorDemo({ lang = 'EN' }) {
    return <PhoneShell statusBg={GPT_T.paper} statusTone="light"><CalculatorApp lang={lang} /></PhoneShell>;
  }

  window.CalculatorApp = CalculatorApp;
  window.CalculatorDemo = CalculatorDemo;
})();
