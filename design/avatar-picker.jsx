// avatar-picker.jsx — Gambia Outage v2.0 · sectioned fixed-grid avatar picker (AVAT-03)
// Consumes ds.jsx globals on window.*: GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell.
// Whitelisted tokens only. NOTE: production renders the 17 DiceBear human presets from
// avatars.generated.ts; this prototype renders token-only character avatars to demonstrate the
// picker layout, selection state, sections, and the light-surface legibility goal (VISUAL-DIRECTION §1/§3).
(function () {
  const { GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell } = window;
  const TH = THEMES.standard;

  const STR = {
    EN: { pick: 'Pick your avatar', classic: 'Classic', neu: 'New', save: 'Save', cancel: 'Cancel', current: 'Current', saved: 'Saved' },
    FR: { pick: 'Choisissez votre avatar', classic: 'Classique', neu: 'Nouveau', save: 'Enregistrer', cancel: 'Annuler', current: 'Actuel', saved: 'Enregistré' },
    AR: { pick: 'اختر صورتك الرمزية', classic: 'كلاسيكي', neu: 'جديد', save: 'حفظ', cancel: 'إلغاء', current: 'الحالي', saved: 'تم الحفظ' },
  };

  // 17 "Classic" presets (avatarId values stand in for avatars.generated.ts ids)
  const POOL = [FLAG.red, FLAG.blue, FLAG.green, ACCENT.tile4, ACCENT.tile5, ACCENT.amber, TH.on, ACCENT.facebook, ACCENT.whatsapp, FLAG.blueDeep, FLAG.greenDeep, ACCENT.live, ACCENT.amberDeep, GPT_T.ink70];
  const PRESETS = Array.from({ length: 17 }, (_, i) => ({
    id: 'classic-' + (i + 1),
    bg: POOL[i % POOL.length],
    top: i % 5,         // hairstyle / cap variant
    eyes: i % 3,        // eye variant
    mouth: i % 4,       // mouth variant
    acc: (i % 4 === 1), // earrings / accessory
  }));

  // deterministic token-only character avatar
  function PseudoAvatar({ p, size = 48 }) {
    const ink = GPT_T.ink;
    const deep = p.bg === GPT_T.ink70 ? GPT_T.ink : GPT_T.ink70;
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill={GPT_T.wash} />
        {/* head */}
        <circle cx="32" cy="34" r="22" fill={p.bg} />
        {/* hair / cap on top */}
        {p.top === 0 && <path d="M12 30a20 20 0 0 1 40 0c-4-6-11-9-20-9s-16 3-20 9Z" fill={deep} />}
        {p.top === 1 && <path d="M12 32c0-13 9-19 20-19s20 6 20 19c-3-3-5-9-20-9s-17 6-20 9Z" fill={deep} />}
        {p.top === 2 && <g fill={deep}><circle cx="18" cy="20" r="6" /><circle cx="30" cy="15" r="7" /><circle cx="44" cy="19" r="6" /><circle cx="38" cy="14" r="6" /></g>}
        {p.top === 3 && <path d="M11 33a21 21 0 0 1 42 0l-5-1c0-9-7-13-16-13s-16 4-16 13Z" fill={deep} />}
        {p.top === 4 && <React.Fragment><rect x="12" y="14" width="40" height="10" rx="5" fill={deep} /><rect x="22" y="9" width="20" height="8" rx="4" fill={deep} /></React.Fragment>}
        {/* eyes */}
        {p.eyes === 0 && <g fill={ink}><circle cx="25" cy="34" r="2.6" /><circle cx="39" cy="34" r="2.6" /></g>}
        {p.eyes === 1 && <g fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round"><path d="M22 34q3-3 6 0M36 34q3-3 6 0" /></g>}
        {p.eyes === 2 && <g><circle cx="25" cy="34" r="4" fill="#fff" /><circle cx="39" cy="34" r="4" fill="#fff" /><circle cx="25" cy="34" r="2" fill={ink} /><circle cx="39" cy="34" r="2" fill={ink} /></g>}
        {/* mouth */}
        {p.mouth === 0 && <path d="M27 43q5 5 10 0" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />}
        {p.mouth === 1 && <path d="M26 42a6 6 0 0 0 12 0Z" fill={ink} />}
        {p.mouth === 2 && <path d="M28 44h8" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />}
        {p.mouth === 3 && <circle cx="32" cy="44" r="3" fill={ink} />}
        {/* accessory: earrings */}
        {p.acc && <g fill={ACCENT.star}><circle cx="13" cy="38" r="2.2" /><circle cx="51" cy="38" r="2.2" /></g>}
      </svg>
    );
  }

  function AvatarCell({ p, selected, onPick, rtl }) {
    return (
      <button onClick={() => onPick(p.id)} aria-pressed={selected} aria-label="Choose avatar"
        style={{ position: 'relative', aspectRatio: '1 / 1', minHeight: 44, borderRadius: 16, cursor: 'pointer', padding: 6,
          background: selected ? GPT_T.paper : GPT_T.wash, border: `2.5px solid ${selected ? FLAG.blue : GPT_T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .12s, transform .1s', transform: selected ? 'scale(1.02)' : 'scale(1)' }}>
        <PseudoAvatar p={p} size="100%" />
        {selected && (
          <span style={{ position: 'absolute', insetInlineEnd: -7, top: -7, width: 22, height: 22, borderRadius: 999, background: FLAG.blue, border: `2px solid ${GPT_T.paper}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GPTIcon name="check" size={13} color="#fff" />
          </span>
        )}
      </button>
    );
  }

  function AvatarPickerApp({ lang = 'EN', onBack }) {
    const t = STR[lang];
    const rtl = lang === 'AR';
    const [current, setCurrent] = React.useState('classic-3'); // pre-selected current avatar
    const [sel, setSel] = React.useState('classic-3');
    const [saved, setSaved] = React.useState(false);
    const dirty = sel !== current;
    const selP = PRESETS.find((p) => p.id === sel) || PRESETS[0];

    const doSave = () => { setCurrent(sel); setSaved(true); setTimeout(() => setSaved(false), 1400); };

    return (
      <ThemeCtx.Provider value={TH}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr' }}>
          {/* top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
            <button aria-label="Back" onClick={onBack} style={{ width: 40, height: 40, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 12 }}>
              <GPTIcon name={rtl ? 'chevron' : 'back'} size={23} color={GPT_T.ink70} />
            </button>
            {/* t('identity.pickAvatar') */}
            <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.pick}</div>
          </div>

          {/* grid */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 16px 8px' }}>
            {/* t('identity.sections.classic') */}
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: GPT_T.ink45, marginBottom: 12 }}>{t.classic}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {PRESETS.map((p) => <AvatarCell key={p.id} p={p} selected={sel === p.id} onPick={setSel} rtl={rtl} />)}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 16, lineHeight: 1.5, textAlign: 'center' }}>
              All avatars are free. Every tone reads clearly on this light surface.
            </div>
          </div>

          {/* bottom action bar */}
          <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, flexDirection: rtl ? 'row-reverse' : 'row' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
              <span style={{ width: 44, height: 44, borderRadius: 13, overflow: 'hidden', flexShrink: 0, border: `1px solid ${GPT_T.line}` }}><PseudoAvatar p={selP} size={44} /></span>
              <span style={{ fontSize: 12, fontWeight: 700, color: GPT_T.ink45, whiteSpace: 'nowrap' }}>{saved ? t.saved : dirty ? '' : t.current}</span>
            </span>
            <div style={{ display: 'flex', gap: 10, flexDirection: rtl ? 'row-reverse' : 'row' }}>
              {/* t('identity.cancel') */}
              <button onClick={() => setSel(current)} disabled={!dirty} style={{ minHeight: 46, padding: '0 18px', borderRadius: 14, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: dirty ? GPT_T.ink70 : GPT_T.ink25, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14, cursor: dirty ? 'pointer' : 'default' }}>{t.cancel}</button>
              {/* t('identity.save') */}
              <button onClick={doSave} disabled={!dirty} style={{ minHeight: 46, padding: '0 26px', borderRadius: 14, border: 'none', background: dirty ? GPT_T.ink : GPT_T.line, color: dirty ? '#fff' : GPT_T.ink45, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14.5, cursor: dirty ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8 }}>
                {saved && <GPTIcon name="check" size={17} color="#fff" />}{saved ? t.saved : t.save}
              </button>
            </div>
          </div>
        </div>
      </ThemeCtx.Provider>
    );
  }

  function AvatarPickerDemo({ lang = 'EN' }) { return <PhoneShell><AvatarPickerApp lang={lang} /></PhoneShell>; }

  window.PseudoAvatarPicker = PseudoAvatar;
  window.AvatarPickerApp = AvatarPickerApp;
  window.AvatarPickerDemo = AvatarPickerDemo;
})();
