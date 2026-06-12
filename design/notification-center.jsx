// notification-center.jsx — Gambia Outage v2.0
// Bell-in-header + bottom-sheet notification tray. Consumes ds.jsx globals on window.*:
//   GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell, LogoMark.
// Whitelisted tokens only. Reuses the screen-report.jsx bottom-sheet pattern (sheetBase + scrim).
(function () {
  const { GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell, LogoMark } = window;
  const TH = THEMES.standard;

  // one-time global keyframes (fixed px translate — never overshoots)
  if (!document.getElementById('nc-kf')) {
    const s = document.createElement('style');
    s.id = 'nc-kf';
    s.textContent = '@keyframes ncSheetIn{from{transform:translateY(40px);opacity:.5}to{transform:translateY(0);opacity:1}}@keyframes ncFade{from{opacity:0}to{opacity:1}}';
    document.head.appendChild(s);
  }

  // rgba from a whitelisted token hex (no new hex literals introduced)
  function rgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  // ── i18n stub ─────────────────────────────────────────────────────────────
  const STR = {
    EN: {
      title: 'Notifications', empty: 'No notifications yet', markAll: 'Mark all as read',
      xpRankup: 'New rank achieved!', outboxDelivered: 'Report confirmed',
      pushAlert: 'Outage in your area', todayPulse: "Today's outage summary",
      whatsapp: 'Share on WhatsApp', update: 'Update & reload', about: 'About', caughtUp: "You're all caught up",
    },
    FR: {
      title: 'Notifications', empty: 'Aucune notification', markAll: 'Tout marquer comme lu',
      xpRankup: 'Nouveau rang atteint !', outboxDelivered: 'Signalement confirmé',
      pushAlert: 'Coupure dans votre zone', todayPulse: 'Résumé des coupures',
      whatsapp: 'Partager sur WhatsApp', update: 'Mettre à jour', about: 'À propos', caughtUp: 'Vous êtes à jour',
    },
    AR: {
      title: 'الإشعارات', empty: 'لا إشعارات بعد', markAll: 'تحديد الكل كمقروء',
      xpRankup: 'مرتبة جديدة!', outboxDelivered: 'تم تأكيد البلاغ',
      pushAlert: 'انقطاع في منطقتك', todayPulse: 'ملخص اليوم',
      whatsapp: 'مشاركة على واتساب', update: 'تحديث وإعادة تحميل', about: 'حول', caughtUp: 'لا جديد لديك',
    },
  };
  const SUBS = {
    EN: { xp: '+20 XP · you are now Watcher', out: '3 neighbours confirmed Kanifing', push: 'Latrikunda Sabiji reported dark', pulse: '4 of 7 regions dark · peaked 19:00' },
    FR: { xp: '+20 XP · vous êtes Observateur', out: '3 voisins ont confirmé Kanifing', push: 'Coupure signalée à Latrikunda Sabiji', pulse: '4 régions sur 7 dans le noir · pic 19:00' },
    AR: { xp: '+20 نقطة · أنت الآن مراقب', out: 'أكّد 3 جيران كانيفينغ', push: 'تم الإبلاغ عن انقطاع في لاتريكوندا سابيجي', pulse: '4 من 7 مناطق مظلمة · الذروة 19:00' },
  };
  const AGO = { EN: ['2m', '14m', '1h', '3h'], FR: ['2 min', '14 min', '1 h', '3 h'], AR: ['٢ د', '١٤ د', '١ س', '٣ س'] };

  // ── per-type icon in an accent badge ───────────────────────────────────────
  function StarGlyph({ size, color }) {
    return (<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d="M12 3.2l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 21l-5.1 2.6 1.1-5.7-4.3-4 5.8-.7L12 3.2Z" fill={color} /></svg>);
  }
  function PulseSpark({ color }) {
    const data = [3, 5, 4, 8, 12, 9, 14, 11, 7, 5];
    const w = 52, h = 22, max = Math.max.apply(null, data), min = Math.min.apply(null, data);
    const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / (max - min || 1)) * (h - 4) - 2).toFixed(1)}`);
    return (<svg width={w} height={h} aria-hidden="true" style={{ display: 'block' }}><polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx={w} cy={pts[pts.length - 1].split(',')[1]} r="2.4" fill={color} /></svg>);
  }
  function NotifBadgeIcon({ type, accent }) {
    const badge = { width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rgba(accent, 0.12) };
    let glyph;
    if (type === 'xp_rankup') glyph = <StarGlyph size={22} color={accent} />;
    else if (type === 'outbox_delivered') glyph = <GPTIcon name="check" size={23} color={accent} />;
    else if (type === 'push_alert') glyph = <GPTIcon name="bell" size={22} color={accent} />;
    else glyph = <GPTIcon name="on" size={22} color={accent} />;
    return <span style={badge}>{glyph}</span>;
  }

  // ── bell + badge (badge is LTR-ALWAYS — never mirrors) ─────────────────────
  function NotifBell({ count = 0, onClick, color = GPT_T.ink45 }) {
    let badge = null;
    if (count === 1) {
      badge = <span style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 999, background: ACCENT.live, border: `1.5px solid ${GPT_T.paper}` }} />;
    } else if (count >= 2) {
      badge = (
        <span style={{ position: 'absolute', top: -5, right: -6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: ACCENT.live, color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${GPT_T.paper}`, fontFamily: GPT_FONT }}>
          {count > 9 ? '9+' : count}
        </span>
      );
    }
    return (
      <button onClick={onClick} aria-label="Notifications" style={{ position: 'relative', width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, direction: 'ltr' }}>
        <GPTIcon name="bell" size={22} color={color} />
        {badge}
      </button>
    );
  }

  // ── one notification row ───────────────────────────────────────────────────
  function NotifRow({ n, lang, onDismiss }) {
    const t = STR[lang], subs = SUBS[lang];
    const titleMap = { xp_rankup: t.xpRankup, outbox_delivered: t.outboxDelivered, push_alert: t.pushAlert, today_pulse: t.todayPulse };
    const subMap = { xp_rankup: subs.xp, outbox_delivered: subs.out, push_alert: subs.push, today_pulse: subs.pulse };
    return (
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12,
        background: n.read ? GPT_T.paper : rgba(n.accent, 0.05),
        border: `1px solid ${GPT_T.line}`, borderInlineStart: `3px solid ${n.read ? GPT_T.line : n.accent}`,
        borderRadius: 14, padding: '12px 12px 12px 13px',
      }}>
        <NotifBadgeIcon type={n.type} accent={n.accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.25 }}>{titleMap[n.type]}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{n.ago}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: GPT_T.ink70, lineHeight: 1.4 }}>{subMap[n.type]}</span>
            {n.type === 'today_pulse' && <PulseSpark color={TH.on} />}
          </div>
        </div>
        <button onClick={() => onDismiss(n.id)} aria-label="Dismiss" style={{ flexShrink: 0, width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginInlineEnd: -2, marginTop: -2 }}>
          <GPTIcon name="close" size={15} color={GPT_T.ink25} />
        </button>
      </div>
    );
  }

  // ── tray footer action row (displaced from the old ⓘ panel) ────────────────
  function FooterRow({ icon, label, sub, color }) {
    return (
      <button style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', cursor: 'pointer', fontFamily: GPT_FONT }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: GPT_T.ink }}>{label}</span>
          {sub && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{sub}</span>}
        </span>
        <GPTIcon name="chevron" size={17} color={GPT_T.ink25} />
      </button>
    );
  }

  const WA_GREEN = ACCENT.whatsapp;
  function WhatsAppGlyph({ size, color }) {
    return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ display: 'block' }}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.5c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.48-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31s-.87.85-.87 2.07c0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>);
  }

  // ── the tray (bottom sheet) ────────────────────────────────────────────────
  function NotificationTray({ lang, notes, onClose, onDismiss, onMarkAll }) {
    const t = STR[lang];
    const rtl = lang === 'AR';
    const hasUnread = notes.some((n) => !n.read);
    const sheetBase = {
      position: 'absolute', left: 0, right: 0, bottom: 0, background: GPT_T.paper, borderRadius: '24px 24px 0 0',
      boxShadow: '0 -16px 50px rgba(15,23,34,0.3)', zIndex: 90, maxHeight: '92%', display: 'flex', flexDirection: 'column',
      fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr', animation: 'ncSheetIn .34s cubic-bezier(.2,.8,.25,1) both',
    };
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 85 }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.5)', animation: 'ncFade .3s ease both' }} />
        <div style={sheetBase}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}><div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} /></div>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 16px 12px' }}>
            {/* t('notifications.title') */}
            <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>{t.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {hasUnread && (
                /* t('notifications.markAllRead') */
                <button onClick={onMarkAll} style={{ border: 'none', background: 'transparent', color: FLAG.blue, fontFamily: GPT_FONT, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '6px 8px', borderRadius: 9 }}>{t.markAll}</button>
              )}
              <button onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, border: 'none', background: GPT_T.wash, cursor: 'pointer', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GPTIcon name="close" size={18} color={GPT_T.ink70} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 16px 16px' }}>
            {notes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '14px 24px 30px' }}>
                <img src="assets/empty-notifications.svg" alt="" width="200" height="167" style={{ display: 'block' }} />
                {/* t('notifications.empty') */}
                <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, marginTop: 6 }}>{t.empty}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: GPT_T.ink45, marginTop: 6, lineHeight: 1.45, maxWidth: 240 }}>{t.caughtUp}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {notes.map((n) => <NotifRow key={n.id} n={n} lang={lang} onDismiss={onDismiss} />)}
              </div>
            )}

            {/* footer — displaced actions from the old ⓘ panel */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${GPT_T.line2}`, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {/* t('share.whatsapp') */}
              <FooterRow icon={<WhatsAppGlyph size={19} color={WA_GREEN} />} label={t.whatsapp} />
              {/* t('update.reload') */}
              <FooterRow icon={<GPTIcon name="info" size={19} color={GPT_T.ink70} />} label={t.update} sub="v2.0.0 · build 214" />
              {/* t('about.title') */}
              <FooterRow icon={<GPTIcon name="shield" size={19} color={GPT_T.ink70} />} label={t.about} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── full demo: light home backdrop + AppHeader bell + tray ─────────────────
  const SEED = [
    { id: 'n1', type: 'push_alert', accent: ACCENT.live, read: false, agoIx: 1 },
    { id: 'n2', type: 'today_pulse', accent: TH.on, read: false, agoIx: 3 },
    { id: 'n3', type: 'xp_rankup', accent: ACCENT.star, read: true, agoIx: 0 },
    { id: 'n4', type: 'outbox_delivered', accent: FLAG.green, read: true, agoIx: 2 },
  ];

  function NotificationCenterApp({ lang = 'EN' }) {
    const rtl = lang === 'AR';
    const [open, setOpen] = React.useState(true);
    const [notes, setNotes] = React.useState(() => SEED.map((n) => ({ ...n, ago: AGO.EN[n.agoIx] })));
    React.useEffect(() => { setNotes((ns) => ns.map((n) => ({ ...n, ago: AGO[lang][n.agoIx] }))); }, [lang]);
    const unread = notes.filter((n) => !n.read).length;
    const dismiss = (id) => setNotes((ns) => ns.filter((n) => n.id !== id));
    const markAll = () => setNotes((ns) => ns.map((n) => ({ ...n, read: true })));

    return (
      <ThemeCtx.Provider value={TH}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr', position: 'relative', overflow: 'hidden' }}>
          {/* AppHeader (light) — bell replaces the old ⓘ */}
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
                <NotifBell count={unread} onClick={() => setOpen(true)} />
              </div>
            </div>
          </div>

          {/* faint mock content so the sheet has context */}
          <div style={{ flex: 1, minHeight: 0, padding: 16, opacity: 0.96 }}>
            <div style={{ background: TH.onBg, border: `1px solid ${TH.onLine}`, borderRadius: 14, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <GPTIcon name="on" size={20} color={TH.on} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink70, lineHeight: 1.35 }}>The Gambia right now · 4 of 7 regions dark</span>
            </div>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {[1, 0, 0, 1, 0, 1, 0].map((lit, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <GPTIcon name="on" size={26} color={lit ? TH.on : TH.out} />
                  <span style={{ width: 16, height: 4, borderRadius: 2, background: GPT_T.line }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 56, borderRadius: 13, background: GPT_T.paper, border: `1px solid ${GPT_T.line}` }} />
              ))}
            </div>
          </div>

          {open && <NotificationTray lang={lang} notes={notes} onClose={() => setOpen(false)} onDismiss={dismiss} onMarkAll={markAll} />}

          {/* re-open affordance when closed */}
          {!open && (
            <button onClick={() => setOpen(true)} style={{ position: 'absolute', insetInlineEnd: 16, bottom: 18, zIndex: 70, height: 46, padding: '0 18px', borderRadius: 999, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 10px 26px rgba(15,23,34,0.28)' }}>
              <GPTIcon name="bell" size={18} color="#fff" /> Open tray
            </button>
          )}
        </div>
      </ThemeCtx.Provider>
    );
  }

  function NotificationCenterDemo({ lang = 'EN' }) {
    return <PhoneShell><NotificationCenterApp lang={lang} /></PhoneShell>;
  }

  window.NotifBell = NotifBell;
  window.NotificationCenterApp = NotificationCenterApp;
  window.NotificationCenterDemo = NotificationCenterDemo;
})();
