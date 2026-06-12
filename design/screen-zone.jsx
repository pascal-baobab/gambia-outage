// screen-zone.jsx — Zone detail. Exports: ZoneScreen

function ZoneScreen({ zone, data, onBack, onReport, onShare, t, isMine, alertOn, onSetMine, onToggleAlert }) {
  const th = useTheme();
  // displayStatus: zero reports ⇒ 'nodata' (AWAITING — no power claim, duration shown as '—').
  const status = displayStatus(zone);
  const awaiting = status === 'nodata';
  const c = th[status], deep = th[status + 'Deep'], bg = th[status + 'Bg'];
  // RegionMaps trigger: only on macro regions (id has no '-'); quarters have ids like '3-01'
  const isMacro = !String(zone.id).includes('-');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label="Back" />
        <div style={{ flex: 1, fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>{zone.region} region</div>
        <IconBtn icon="share" onClick={onShare} label="Share" color={GPT_T.ink70} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* RegionMaps — macro-zone only (id has no '-'). Window global created by Plan 01. */}
        {isMacro && typeof RegionMaps !== 'undefined' && <RegionMaps zone={zone} data={data} />}
        {/* status header */}
        <div style={{ background: bg, padding: '18px 18px 20px', borderBottom: `1px solid ${th[status + 'Line']}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 26 * t, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.6 }}>{zone.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                {/* SINGLE_REPORT_TRUTH (prod ON): 1 OUT ⇒ DARK; the 8-confirm threshold is demoted to
                    a "· N reports" strength counter. Flag off → Confirmed/Unconfirmed chip returns. */}
                <span style={{ fontSize: 13 * t, color: GPT_T.ink70, fontWeight: 600 }}>{zone.reports} reports today</span>
                {SINGLE_REPORT_TRUTH
                  ? <ReportStrength reports={zone.confirms} />
                  : <ConfidenceChip confirms={zone.confirms} size="sm" />}
              </div>
            </div>
            <StatusPill status={status} size="lg" solid={!awaiting} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 44 * t, fontWeight: 800, color: deep, letterSpacing: -1.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{awaiting ? '—' : fmtHM(zone.todayMin)}</span>
            <span style={{ fontSize: 14 * t, fontWeight: 600, color: GPT_T.ink70 }}>{awaiting ? 'awaiting reports' : 'without power today'}</span>
          </div>
          {!SINGLE_REPORT_TRUTH && (
            <div style={{ marginTop: 14, padding: '11px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 12 }}>
              <TrustLine confirms={zone.confirms} />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <AreaActions isMine={isMine} alertOn={alertOn} onSetMine={onSetMine} onToggleAlert={onToggleAlert} />
          </div>
        </div>

        {/* 7-day chart */}
        <Section title="Last 7 days" sub="Daily hours without power">
          <BarChart7 data={zone.week} days={data.weekdays} />
          <div style={{ marginTop: 14, display: 'flex', gap: 16, fontSize: 12.5, color: GPT_T.ink70, fontWeight: 600 }}>
            <span>7-day avg <b style={{ color: GPT_T.ink }}>{(zone.week.reduce((a, b) => a + b, 0) / 7).toFixed(1)}h/day</b></span>
            <span>Worst <b style={{ color: th.out }}>{Math.max(...zone.week)}h</b></span>
          </div>
        </Section>

        {/* events */}
        <Section title="Recent events" sub="Logged outage windows & durations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {zone.events.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < zone.events.length - 1 ? `1px solid ${GPT_T.line2}` : 'none' }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: e.open ? th.out : GPT_T.ink25, flexShrink: 0, boxShadow: e.open ? `0 0 0 3px ${th.outBg}` : 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: GPT_T.ink }}>{e.from} → {e.to}</div>
                  {e.open && <div style={{ fontSize: 12, fontWeight: 700, color: th.out, marginTop: 1 }}>ONGOING</div>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: e.open ? th.out : GPT_T.ink70, fontVariantNumeric: 'tabular-nums' }}>{e.dur}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* notes */}
        {zone.notes.length > 0 && (
          <Section title="Neighbour notes" sub="Short, sanitised reports — no names">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {zone.notes.map((n, i) => (
                <div key={i} style={{ background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px' }}>
                  <div style={{ fontSize: 14, color: GPT_T.ink, lineHeight: 1.4, fontWeight: 500 }}>{n.text}</div>
                  <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 5 }}>{n.t}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* per-zone discussion (persistent pseudonym; distinct from the sanitised report notes above) */}
        <ZoneDiscussion comments={(data.comments || {})[zone.id] || []} />
        <div style={{ height: 8 }} />
      </div>

      {/* confirm dock */}
      <div style={{ padding: '11px 14px calc(11px + env(safe-area-inset-bottom))', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={() => onReport('out', zone)} style={{ flex: 1.6, minHeight: 56, borderRadius: 15, border: 'none', background: th.out, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', boxShadow: `0 8px 18px ${th.out}44` }}>
          <GPTIcon name="out" size={22} color="#fff" strokeColor={th.out} /> Confirm still out
        </button>
        <button onClick={() => onReport('on', zone)} style={{ flex: 1, minHeight: 56, borderRadius: 15, background: th.onBg, color: th.onDeep, border: `2px solid ${th.onLine}`, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
          <GPTIcon name="on" size={20} color={th.on} /> Back
        </button>
      </div>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ background: GPT_T.paper, padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}` }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2, marginBottom: 14 }}>{sub}</div>}
      {children}
    </div>
  );
}

Object.assign(window, { ZoneScreen });
