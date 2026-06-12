// photo-crush.jsx — Gambia Outage v2.0 · match-3 mini-game (UNTIMED)
// Consumes ds.jsx globals on window.*: GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell.
// Board base = GPT_T.tileAnchor. Tiles = assets/tile-1..5.svg. Whitelisted tokens only.
(function () {
  const { GPT_T, GPT_FONT, FLAG, THEMES, ACCENT, ThemeCtx, GPTIcon, PhoneShell } = window;
  const TH = THEMES.standard;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!document.getElementById('pc-kf')) {
    const s = document.createElement('style');
    s.id = 'pc-kf';
    s.textContent = '@keyframes pcPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}@keyframes pcShake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(3px)}50%{transform:translateX(-3px)}}@keyframes pcOverIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes pcDim{from{opacity:1}to{opacity:.22}}';
    document.head.appendChild(s);
  }

  const STR = {
    EN: { title: 'Photo Crush', play: 'Play', score: 'Score', best: 'Personal best', paused: 'Paused', over: 'Game Over', again: 'Play again', crop: 'Crop photo', resume: 'Resume', personalize: 'Make a tile yours', use: 'Use photo', cancel: 'Cancel', noMoves: 'No moves left', tapTile: 'Pick a tile to personalize', end: 'End game' },
    FR: { title: 'Photo Crush', play: 'Jouer', score: 'Score', best: 'Meilleur score', paused: 'Pause', over: 'Partie terminée', again: 'Rejouer', crop: 'Recadrer la photo', resume: 'Reprendre', personalize: 'Personnalisez une tuile', use: 'Utiliser', cancel: 'Annuler', noMoves: 'Aucun coup', tapTile: 'Choisissez une tuile', end: 'Terminer' },
    AR: { title: 'فوتو كراش', play: 'العب', score: 'النقاط', best: 'أفضل نتيجة', paused: 'متوقف', over: 'انتهت اللعبة', again: 'العب مجدداً', crop: 'اقتصاص الصورة', resume: 'استئناف', personalize: 'خصّص بلاطة', use: 'استخدام', cancel: 'إلغاء', noMoves: 'لا حركات', tapTile: 'اختر بلاطة', end: 'إنهاء' },
  };

  // ── engine ────────────────────────────────────────────────────────────────
  const N = 7;
  const TILE_ACCENT = { 1: FLAG.red, 2: FLAG.blue, 3: FLAG.green, 4: ACCENT.tile4, 5: ACCENT.tile5 };
  const rndType = () => 1 + Math.floor(Math.random() * 5);
  const ix = (r, c) => r * N + c;
  function makeBoard() {
    const b = new Array(N * N);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      let t; let guard = 0;
      do { t = rndType(); guard++; } while (guard < 20 && ((c >= 2 && b[ix(r, c - 1)] === t && b[ix(r, c - 2)] === t) || (r >= 2 && b[ix(r - 1, c)] === t && b[ix(r - 2, c)] === t)));
      b[ix(r, c)] = t;
    }
    return b;
  }
  function findMatches(b) {
    const m = new Set();
    for (let r = 0; r < N; r++) for (let c = 0; c < N - 2; c++) {
      const t = b[ix(r, c)]; if (t == null) continue;
      if (b[ix(r, c + 1)] === t && b[ix(r, c + 2)] === t) { let k = c; while (k < N && b[ix(r, k)] === t) { m.add(ix(r, k)); k++; } }
    }
    for (let c = 0; c < N; c++) for (let r = 0; r < N - 2; r++) {
      const t = b[ix(r, c)]; if (t == null) continue;
      if (b[ix(r + 1, c)] === t && b[ix(r + 2, c)] === t) { let k = r; while (k < N && b[ix(k, c)] === t) { m.add(ix(k, c)); k++; } }
    }
    return m;
  }
  function collapse(b, matched) {
    const nb = b.slice();
    matched.forEach((i) => { nb[i] = null; });
    for (let c = 0; c < N; c++) {
      let write = N - 1;
      for (let r = N - 1; r >= 0; r--) { if (nb[ix(r, c)] != null) { nb[ix(write, c)] = nb[ix(r, c)]; if (write !== r) nb[ix(r, c)] = null; write--; } }
      for (let r = write; r >= 0; r--) nb[ix(r, c)] = rndType();
    }
    return nb;
  }
  const adj = (a, b) => { const ar = (a / N) | 0, ac = a % N, br = (b / N) | 0, bc = b % N; return Math.abs(ar - br) + Math.abs(ac - bc) === 1; };
  function hasMoves(b) {
    for (let i = 0; i < N * N; i++) { const r = (i / N) | 0, c = i % N;
      [[r, c + 1], [r + 1, c]].forEach; // noop placeholder
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = ix(r, c);
      if (c < N - 1) { const j = ix(r, c + 1); const t = b.slice();[t[i], t[j]] = [t[j], t[i]]; if (findMatches(t).size) return true; }
      if (r < N - 1) { const j = ix(r + 1, c); const t = b.slice();[t[i], t[j]] = [t[j], t[i]]; if (findMatches(t).size) return true; }
    }
    return false;
  }

  // ── tile face (svg or personalized photo) ──────────────────────────────────
  function TileFace({ type, personalized, size }) {
    if (personalized && personalized.type === type) {
      return (
        <div style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: personalized.bg, backgroundSize: '180% 180%', backgroundPosition: personalized.pos, boxShadow: `inset 0 0 0 2px ${rgba(TILE_ACCENT[type], 0.4)}` }} />
      );
    }
    return <img src={`assets/tile-${type}.svg`} alt="" draggable="false" style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />;
  }
  function rgba(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; }

  // ── mini radio strip (mirror of production RadioPlayer) ─────────────────────
  const STATIONS = [{ name: 'GRTS Radio', sub: 'Gambia Radio & TV' }, { name: 'Teranga FM', sub: 'Serrekunda' }, { name: 'FIP', sub: 'World music' }];
  function MiniRadio() {
    const [idx, setIdx] = React.useState(0);
    const [playing, setPlaying] = React.useState(true);
    const st = STATIONS[idx];
    const btn = { width: 32, height: 32, borderRadius: 9, border: 'none', background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };
    const PlayIco = () => playing
      ? <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="#fff" /><rect x="14" y="5" width="4" height="14" rx="1" fill="#fff" /></svg>
      : <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7Z" fill="#fff" /></svg>;
    return (
      <div style={{ background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, minHeight: 46 }}>
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} style={{ ...btn, width: 36, height: 36, background: playing ? FLAG.green : GPT_T.wash }}>
          {playing ? <PlayIco /> : <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7Z" fill={GPT_T.ink70} /></svg>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playing ? st.sub : 'Paused'}</div>
        </div>
        <button onClick={() => setIdx((i) => (i + STATIONS.length - 1) % STATIONS.length)} aria-label="Previous station" style={btn}><GPTIcon name="back" size={16} color={GPT_T.ink70} /></button>
        <button onClick={() => setIdx((i) => (i + 1) % STATIONS.length)} aria-label="Next station" style={btn}><GPTIcon name="chevron" size={16} color={GPT_T.ink70} /></button>
      </div>
    );
  }

  // ── photo personalization crop overlay ──────────────────────────────────────
  const MOCK_PHOTOS = [
    `linear-gradient(135deg, ${FLAG.red}, ${ACCENT.tile4})`,
    `linear-gradient(135deg, ${FLAG.blue}, ${ACCENT.tile5})`,
    `linear-gradient(135deg, ${FLAG.green}, ${TH.on})`,
  ];
  function CropOverlay({ lang, type, onCancel, onUse }) {
    const t = STR[lang];
    const [photo, setPhoto] = React.useState(0);
    const [pos, setPos] = React.useState({ x: 50, y: 50 });
    const drag = React.useRef(null);
    const onDown = (e) => { drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }; e.currentTarget.setPointerCapture(e.pointerId); };
    const onMove = (e) => { if (!drag.current) return; const dx = (e.clientX - drag.current.px) / 2.4, dy = (e.clientY - drag.current.py) / 2.4; setPos({ x: Math.max(0, Math.min(100, drag.current.x - dx)), y: Math.max(0, Math.min(100, drag.current.y - dy)) }); };
    const onUp = () => { drag.current = null; };
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'rgba(15,23,34,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: GPT_T.paper, borderRadius: 22, padding: 18, width: '100%', maxWidth: 320, fontFamily: GPT_FONT }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: rgba(TILE_ACCENT[type], 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={`assets/tile-${type}.svg`} width="22" height="22" alt="" /></span>
            {/* t('game.cropPhoto') */}
            <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>{t.crop}</div>
          </div>
          <div style={{ width: 256, maxWidth: '100%', aspectRatio: '1 / 1', margin: '0 auto', borderRadius: 16, overflow: 'hidden', position: 'relative', touchAction: 'none', cursor: 'grab', background: GPT_T.wash }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div style={{ position: 'absolute', inset: 0, background: MOCK_PHOTOS[photo], backgroundSize: '180% 180%', backgroundPosition: `${pos.x}% ${pos.y}%` }} />
            {/* crop guides */}
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.85)', borderRadius: 16, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px)', backgroundSize: '33.33% 33.33%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            {MOCK_PHOTOS.map((g, i) => (
              <button key={i} onClick={() => setPhoto(i)} aria-label={`Sample photo ${i + 1}`} style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${photo === i ? FLAG.blue : GPT_T.line}`, background: g, backgroundSize: 'cover', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 14, flexDirection: lang === 'AR' ? 'row-reverse' : 'row' }}>
            <button onClick={onCancel} style={{ flex: 1, minHeight: 46, borderRadius: 13, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={() => onUse({ type, bg: MOCK_PHOTOS[photo], pos: `${pos.x}% ${pos.y}%` })} style={{ flex: 1.4, minHeight: 46, borderRadius: 13, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{t.use}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── score header ────────────────────────────────────────────────────────────
  function ScoreBar({ lang, score, best, onPause }) {
    const t = STR[lang];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          {/* t('game.score') */}
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: GPT_T.ink45 }}>{t.score}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: GPT_T.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: lang === 'AR' ? 'left' : 'right' }}>
          {/* t('game.personalBest') */}
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: GPT_T.ink45 }}>{t.best}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink70, lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{best.toLocaleString()}</div>
        </div>
        <button onClick={onPause} aria-label={t.paused} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${GPT_T.line}`, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.4" fill={GPT_T.ink70} /><rect x="14" y="5" width="4" height="14" rx="1.4" fill={GPT_T.ink70} /></svg>
        </button>
      </div>
    );
  }

  // ── game-over illustration: a lightbulb going dark ──────────────────────────
  function GameOverArt() {
    return (
      <svg viewBox="0 0 160 150" width="170" height="160" aria-hidden="true">
        <circle cx="80" cy="66" r="52" fill={GPT_T.wash} />
        <circle cx="80" cy="66" r="52" stroke={GPT_T.line2} strokeWidth="2" />
        {/* faded rays (afterglow) */}
        <g stroke={TH.on} strokeWidth="3" strokeLinecap="round" opacity="0.3">
          <path d="M80 14v8M44 30l5 5M116 30l-5 5M28 66h8M124 66h8" />
        </g>
        {/* unlit (gone-dark) bulb — pale slate fill, clearly distinct from a warm lit bulb */}
        <g>
          <path d="M80 34a20 20 0 0 0-12 36c1.8 1.3 3 3.4 3.2 5.7l.1 2h17.4l.1-2c.2-2.3 1.4-4.4 3.2-5.7A20 20 0 0 0 80 34Z" fill={TH.outBg} stroke={TH.out} strokeWidth="3.2" strokeLinejoin="round" />
          <rect x="71" y="84" width="18" height="4.6" rx="2" fill={TH.out} />
          <rect x="72.5" y="90" width="15" height="4.6" rx="2" fill={TH.out} />
          <path d="M74 96h12c-1 2.8-2.8 4.2-6 4.2S75 98.8 74 96Z" fill={TH.out} />
          {/* dark filament */}
          <path d="M74 70c0-4-4-6-4-11a10 10 0 0 1 20 0c0 5-4 7-4 11" fill="none" stroke={TH.out} strokeWidth="2" opacity="0.5" />
        </g>
      </svg>
    );
  }

  // ── main app ────────────────────────────────────────────────────────────────
  function PhotoCrushApp({ lang = 'EN', onBack }) {
    const t = STR[lang];
    const rtl = lang === 'AR';
    const PB_KEY = 'gpt_pb_photocrush';
    const [phase, setPhase] = React.useState('idle'); // idle | playing | paused | over
    const [board, setBoard] = React.useState(makeBoard);
    const [sel, setSel] = React.useState(null);
    const [clearing, setClearing] = React.useState(() => new Set());
    const [bad, setBad] = React.useState(null);
    const [score, setScore] = React.useState(0);
    const [best, setBest] = React.useState(() => { try { return +localStorage.getItem(PB_KEY) || 0; } catch (e) { return 0; } });
    const [personal, setPersonal] = React.useState(null);
    const [cropType, setCropType] = React.useState(null);
    const busy = React.useRef(false);

    const saveBest = (s) => { if (s > best) { setBest(s); try { localStorage.setItem(PB_KEY, String(s)); } catch (e) {} } };

    const start = () => { setBoard(makeBoard()); setScore(0); setSel(null); setClearing(new Set()); busy.current = false; setPhase('playing'); };

    const step = (cur) => {
      const m = findMatches(cur);
      if (!m.size) { busy.current = false; if (!hasMoves(cur)) { setPhase('over'); } return; }
      setScore((s) => { const ns = s + m.size * 12; return ns; });
      setClearing(m);
      setTimeout(() => {
        const nb = collapse(cur, m);
        setBoard(nb); setClearing(new Set());
        setTimeout(() => step(nb), reduce ? 0 : 150);
      }, reduce ? 0 : 200);
    };

    React.useEffect(() => { if (phase === 'over') saveBest(score); /* eslint-disable-next-line */ }, [phase]);

    const tapCell = (i) => {
      if (busy.current || phase !== 'playing') return;
      if (sel == null) { setSel(i); return; }
      if (sel === i) { setSel(null); return; }
      if (!adj(sel, i)) { setSel(i); return; }
      const nb = board.slice();[nb[sel], nb[i]] = [nb[i], nb[sel]];
      if (findMatches(nb).size) { busy.current = true; setBoard(nb); setSel(null); setTimeout(() => step(nb), reduce ? 0 : 150); }
      else { setBad([sel, i]); setTimeout(() => setBad(null), 320); setSel(null); }
    };

    // sizing: inner width ~ 336; 7 cells + 6*4 gap
    const cell = 'min(46px, calc((100% - 24px) / 7))';

    const boardEl = (preview) => (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 4, padding: 12, background: GPT_T.tileAnchor, borderRadius: 18, direction: rtl ? 'rtl' : 'ltr', boxShadow: 'inset 0 0 0 1px ' + rgba(GPT_T.ink, 0.04) }}>
        {board.map((type, i) => {
          const isSel = sel === i;
          const isClear = clearing.has(i);
          const isBad = bad && (bad[0] === i || bad[1] === i);
          return (
            <button key={i} onClick={() => !preview && tapCell(i)} disabled={preview} aria-label={`tile ${type}`}
              style={{ aspectRatio: '1 / 1', border: 'none', padding: 0, background: 'transparent', cursor: preview ? 'default' : 'pointer', position: 'relative',
                borderRadius: 12, outline: isSel ? `3px solid ${FLAG.blue}` : 'none', outlineOffset: -1,
                transform: isSel ? 'scale(1.08)' : 'scale(1)', transition: reduce ? 'none' : 'transform .12s ease, opacity .2s ease',
                opacity: isClear ? 0 : 1, animation: isBad && !reduce ? 'pcShake .32s ease' : 'none', zIndex: isSel ? 2 : 1 }}>
              <div style={{ width: '100%', height: '100%', transform: isClear ? 'scale(.4)' : 'scale(1)', transition: reduce ? 'none' : 'transform .2s ease' }}>
                <TileFace type={type} personalized={personal} />
              </div>
            </button>
          );
        })}
      </div>
    );

    return (
      <ThemeCtx.Provider value={TH}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT, direction: rtl ? 'rtl' : 'ltr', position: 'relative', overflow: 'hidden' }}>
          {/* top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
            <button aria-label="Back" onClick={onBack} style={{ width: 38, height: 38, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 11 }}><GPTIcon name="back" size={23} color={GPT_T.ink70} /></button>
            {/* t('game.title') */}
            <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, flex: 1 }}>{t.title}</div>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              {[1, 2, 3, 4, 5].map((n) => <img key={n} src={`assets/tile-${n}.svg`} width="18" height="18" alt="" />)}
            </span>
          </div>

          {phase === 'playing' && <ScoreBar lang={lang} score={score} best={best} onPause={() => setPhase('paused')} />}

          {/* body */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: phase === 'playing' ? 'flex-start' : 'center' }}>
            {phase === 'idle' && (
              <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: '100%', filter: 'saturate(1)', pointerEvents: 'none', opacity: 0.96 }}>{boardEl(true)}</div>
                <div style={{ marginTop: 18, fontSize: 13, fontWeight: 700, color: GPT_T.ink45 }}>{t.best}: <span style={{ color: GPT_T.ink, fontWeight: 800 }}>{best.toLocaleString()}</span></div>
                {/* t('game.play') */}
                <button onClick={start} style={{ marginTop: 14, minHeight: 54, width: '100%', borderRadius: 16, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 10px 26px rgba(15,23,34,0.22)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7Z" fill="#fff" /></svg> {t.play}
                </button>
                <button onClick={() => setCropType(1)} style={{ marginTop: 12, fontSize: 13.5, fontWeight: 800, color: FLAG.blue, background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <GPTIcon name="pin" size={16} color={FLAG.blue} /> {t.personalize}
                </button>
              </div>
            )}

            {(phase === 'playing' || phase === 'paused') && (
              <div style={{ width: '100%', maxWidth: 340, position: 'relative' }}>
                {boardEl(false)}
                {phase === 'paused' && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'rgba(246,248,250,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                    {/* t('game.paused') */}
                    <div style={{ fontSize: 24, fontWeight: 800, color: GPT_T.ink }}>{t.paused}</div>
                    <button onClick={() => setPhase('playing')} style={{ minHeight: 48, padding: '0 28px', borderRadius: 14, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>{t.resume}</button>
                    <button onClick={() => setPhase('over')} style={{ fontSize: 13.5, fontWeight: 800, color: TH.out, background: 'transparent', border: 'none', cursor: 'pointer' }}>{t.end}</button>
                  </div>
                )}
              </div>
            )}

            {phase === 'over' && (
              <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <GameOverArt />
                {/* t('game.gameOver') */}
                <div style={{ fontSize: 26, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.4, marginTop: 4 }}>{t.over}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 4 }}>{t.noMoves}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 18, width: '100%' }}>
                  <div style={{ flex: 1, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: '12px 10px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: GPT_T.ink45 }}>{t.score}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: GPT_T.ink, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{score.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: '12px 10px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: GPT_T.ink45 }}>{t.best}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: score >= best ? TH.onDeep : GPT_T.ink70, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{best.toLocaleString()}</div>
                  </div>
                </div>
                {/* t('game.playAgain') */}
                <button onClick={start} style={{ marginTop: 16, minHeight: 54, width: '100%', borderRadius: 16, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                  <GPTIcon name="on" size={20} color="#fff" /> {t.again}
                </button>
              </div>
            )}
          </div>

          <MiniRadio />

          {cropType != null && (
            <CropOverlay lang={lang} type={cropType} onCancel={() => setCropType(null)} onUse={(p) => { setPersonal(p); setCropType(null); }} />
          )}
        </div>
      </ThemeCtx.Provider>
    );
  }

  function PhotoCrushDemo({ lang = 'EN' }) { return <PhoneShell><PhotoCrushApp lang={lang} /></PhoneShell>; }

  window.PhotoCrushApp = PhotoCrushApp;
  window.PhotoCrushDemo = PhotoCrushDemo;
})();
