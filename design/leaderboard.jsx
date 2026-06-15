// leaderboard.jsx — Gambia Outage v2.0 · Phase 6 Zone Leaderboard (THROWAWAY SKETCH)
// ⚠ This is an owner-review sketch, NOT the final design bundle. The design-led workflow
//   still calls for a Claude Design brief before implementation — this only exists so the
//   owner can react to the visual + flow in the morning and unblock the plan fast.
// Consumes ds.jsx globals on window.*: GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell.
// Whitelisted tokens only — no invented colours. Mirrors HonorsScreen row pattern (screen-honors.jsx).
//
// Anonymity (P0): rows carry pseudonym + zone + score ONLY. No report/event/rl/ip linkage.
//   Submitting needs a pseudonym (NameGate, same gate as community content); PLAYING never does.
(function () {
  const { GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell } = window;
  const TH = THEMES.standard;

  const STR = {
    EN: {
      title: 'Zone Leaderboard', sub: 'Top Photo-Crush scores by neighbourhood',
      thisWeek: 'This week', resetsIn: (d) => `resets in ${d}`, you: 'You',
      allZones: 'All zones', empty: 'No scores yet this week — be the first.',
      submit: 'Submit to leaderboard', submitted: 'Submitted ✓', namePrompt: 'Pick a nickname to submit',
      playing: 'Play anonymously — submitting is optional', score: 'Score', best: 'Personal best',
      report: 'Report row', moderated: 'Removed by moderator',
    },
    FR: {
      title: 'Classement par zone', sub: 'Meilleurs scores Photo-Crush par quartier',
      thisWeek: 'Cette semaine', resetsIn: (d) => `réinitialisé dans ${d}`, you: 'Vous',
      allZones: 'Toutes les zones', empty: 'Aucun score cette semaine — soyez le premier.',
      submit: 'Publier au classement', submitted: 'Publié ✓', namePrompt: 'Choisissez un pseudo pour publier',
      playing: 'Jouez anonymement — publier est facultatif', score: 'Score', best: 'Meilleur score',
      report: 'Signaler', moderated: 'Retiré par un modérateur',
    },
    AR: {
      title: 'لوحة الصدارة حسب المنطقة', sub: 'أفضل نتائج فوتو كراش حسب الحي',
      thisWeek: 'هذا الأسبوع', resetsIn: (d) => `يُعاد ضبطها خلال ${d}`, you: 'أنت',
      allZones: 'كل المناطق', empty: 'لا نتائج هذا الأسبوع — كن الأول.',
      submit: 'أضف إلى اللوحة', submitted: 'تمت الإضافة ✓', namePrompt: 'اختر اسمًا للإضافة',
      playing: 'العب بشكل مجهول — الإضافة اختيارية', score: 'النقاط', best: 'أفضل نتيجة',
      report: 'إبلاغ', moderated: 'أُزيلت بواسطة مشرف',
    },
  };

  // ── illustrative seed data (pseudonyms only — no identity linkage) ──
  const SEED = [
    { id: 'a', name: 'ATPC', zone: 'Banjul', score: 4320, avatar: FLAG.red },
    { id: 'b', name: 'KairabaKid', zone: 'Serekunda', score: 3960, avatar: FLAG.blue },
    { id: 'c', name: 'VALDA', zone: 'Brikama', score: 3744, avatar: FLAG.green, you: true },
    { id: 'd', name: 'NightOwl', zone: 'Bakau', score: 3120, avatar: ACCENT.tile4 },
    { id: 'e', name: 'SolarSam', zone: 'Farafenni', score: 2880, avatar: ACCENT.tile5 },
    { id: 'f', name: 'GridGhost', zone: 'Banjul', score: 2412, avatar: FLAG.blue },
  ];
  const ZONES = ['All', 'Banjul', 'Serekunda', 'Brikama', 'Bakau', 'Farafenni'];

  function medal(rank) {
    if (rank === 1) return ACCENT.star;
    if (rank === 2) return GPT_T.ink45;
    if (rank === 3) return ACCENT.amber;
    return null;
  }

  // ── one ranked row (mirrors HoursRow in screen-honors.jsx) ──
  function Row({ row, rank, rtl }) {
    const m = medal(rank);
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
          background: row.you ? rgba(FLAG.blue, 0.08) : GPT_T.paper,
          border: `1px solid ${row.you ? rgba(FLAG.blue, 0.35) : GPT_T.line}`,
          borderRadius: 14, marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 26, textAlign: 'center', fontSize: 14, fontWeight: 800,
            color: m || GPT_T.ink45, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}
        >
          {String(rank).padStart(2, '0')}
        </div>
        <span
          style={{
            width: 34, height: 34, borderRadius: '50%', background: rgba(row.avatar, 0.18),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: row.avatar, fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}
        >
          {row.name[0]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {row.name}
            {row.you && (
              <span style={{ marginInlineStart: 6, fontSize: 10.5, fontWeight: 800, color: FLAG.blue }}>
                · {tFor(window.__lbLang || 'EN').you}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{row.zone}</div>
        </div>
        <div
          style={{
            fontSize: 16, fontWeight: 800, color: GPT_T.ink, fontVariantNumeric: 'tabular-nums',
            textAlign: rtl ? 'left' : 'right', flexShrink: 0,
          }}
        >
          {row.score.toLocaleString()}
        </div>
      </div>
    );
  }

  function rgba(hex, a) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const tFor = (lang) => STR[lang] || STR.EN;

  // ── submit affordance, as it would appear on the Photo-Crush game-over card ──
  function SubmitCard({ lang, hasName, submitted, onSubmit, onName }) {
    const t = tFor(lang);
    return (
      <div
        style={{
          marginTop: 14, padding: 12, borderRadius: 14, background: GPT_T.wash,
          border: `1px dashed ${GPT_T.line2}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: GPT_T.ink45, marginBottom: 8, textAlign: 'center' }}>
          {hasName ? '' : t.playing}
        </div>
        {submitted ? (
          <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: TH.on }}>{t.submitted}</div>
        ) : (
          <button
            onClick={hasName ? onSubmit : onName}
            style={{
              width: '100%', minHeight: 46, borderRadius: 13, border: 'none',
              background: FLAG.blue, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            {hasName ? t.submit : t.namePrompt}
          </button>
        )}
      </div>
    );
  }

  function LeaderboardScreen({ lang = 'EN', onBack }) {
    const t = tFor(lang);
    const rtl = lang === 'AR';
    window.__lbLang = lang;
    const [zone, setZone] = React.useState('All');
    const [hasName, setHasName] = React.useState(true);
    const [submitted, setSubmitted] = React.useState(false);

    const rows = SEED.filter((r) => zone === 'All' || r.zone === zone).sort((a, b) => b.score - a.score);

    return (
      <ThemeCtx.Provider value={{ theme: 'standard' }}>
        <div
          style={{
            height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash,
            fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr',
          }}
        >
          {/* TopBar */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0,
            }}
          >
            <button
              aria-label="Back" onClick={onBack}
              style={{
                width: 38, height: 38, border: 'none', background: 'transparent', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 11,
              }}
            >
              <GPTIcon name="back" size={23} color={GPT_T.ink70} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.title}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.sub}</div>
            </div>
            <GPTIcon name="on" size={20} color={ACCENT.star} />
          </div>

          {/* Week banner */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px', background: GPT_T.paper2 || GPT_T.paper,
              borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink70, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t.thisWeek}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.resetsIn('3d 14h')}</span>
          </div>

          {/* Zone filter chips */}
          <div
            style={{
              display: 'flex', gap: 7, overflowX: 'auto', padding: '10px 12px', flexShrink: 0,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {ZONES.map((z) => {
              const on = zone === z;
              const label = z === 'All' ? t.allZones : z;
              return (
                <button
                  key={z} onClick={() => setZone(z)}
                  style={{
                    flexShrink: 0, padding: '7px 13px', borderRadius: 999,
                    border: `1.5px solid ${on ? GPT_T.ink : GPT_T.line}`,
                    background: on ? GPT_T.ink : GPT_T.paper, color: on ? '#fff' : GPT_T.ink70,
                    fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '4px 12px 16px' }}>
            {rows.length === 0 ? (
              <div style={{ textAlign: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: '40px 16px' }}>
                {t.empty}
              </div>
            ) : (
              rows.map((row, i) => <Row key={row.id} row={row} rank={i + 1} rtl={rtl} />)
            )}

            {/* Submit affordance preview (would live on the game-over card, shown here for review) */}
            <SubmitCard
              lang={lang}
              hasName={hasName}
              submitted={submitted}
              onSubmit={() => setSubmitted(true)}
              onName={() => setHasName(true)}
            />
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button
                onClick={() => { setHasName(false); setSubmitted(false); }}
                style={{ background: 'transparent', border: 'none', color: GPT_T.ink25, fontSize: 11, cursor: 'pointer' }}
              >
                (sketch: toggle no-pseudonym state)
              </button>
            </div>
          </div>
        </div>
      </ThemeCtx.Provider>
    );
  }

  function LeaderboardDemo({ lang = 'EN' }) {
    return (
      <PhoneShell>
        <LeaderboardScreen lang={lang} onBack={() => {}} />
      </PhoneShell>
    );
  }

  window.LeaderboardScreen = LeaderboardScreen;
  window.LeaderboardDemo = LeaderboardDemo;
})();
