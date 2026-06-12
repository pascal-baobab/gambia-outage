// screen-honors.jsx — Wall of Honor leaderboard screen (Surface 5)
// React-over-Babel prototype. No imports, no TypeScript, no ES modules.
// Port of web/src/screens/HonorsScreen.tsx — useCommunity() replaced with window.MOCK_HOURS.
// Reuses SegToggle and IconBtn from design/shared-ui.jsx (do NOT redefine here).
// Exported: HonorsScreen

// HoursRow — one leaderboard row card (worst-first rank)
function HoursRow({ row, rank }) {
  const th = useTheme();
  return (
    <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 28, fontSize: 13, fontWeight: 800, color: GPT_T.ink25, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {String(rank).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>{row.name}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{row.region}</div>
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: th.outDeep, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {fmtHM(row.darkMinutes)}
      </div>
    </div>
  );
}

// HoursBoard — ordered list of neighbourhood hours-in-the-dark cards
function HoursBoard({ hours }) {
  if (!hours || hours.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13.5, color: GPT_T.ink45, fontWeight: 600 }}>
        No data yet — keep reporting.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {hours.map(function(row, i) {
        return <HoursRow key={row.zoneId || i} row={row} rank={i + 1} />;
      })}
    </div>
  );
}

// VoiceBoard placeholder — civic voice tab (no mock data in this plan; stub only)
function VoiceBoard() {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13.5, color: GPT_T.ink45, fontWeight: 600 }}>
      Civic voice data coming soon.
    </div>
  );
}

function HonorsScreen({ onBack, onOpenZone }) {
  const th = useTheme();
  const [tab, setTab] = React.useState('hours'); // 'hours' | 'voice'
  const hours = window.MOCK_HOURS || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>

      {/* Top bar: back button + Logo + title + subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 12px 10px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label="Back" />
        <Logo size={11} variant="compact" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>Wall of Honor</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>What our neighbourhoods documented together</div>
        </div>
      </div>

      {/* Scrollable board */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Segmented toggle: Hours in the Dark / Civic Voice */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SegToggle
            value={tab}
            options={[
              { v: 'hours', icon: 'clock', label: 'Hours in the Dark' },
              { v: 'voice', icon: 'shield', label: 'Civic Voice' },
            ]}
            onChange={setTab}
          />
        </div>

        {/* Lead copy */}
        <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, lineHeight: 1.45, marginTop: -4 }}>
          {tab === 'hours'
            ? 'Neighbourhoods ranked by total hours without power this week.'
            : 'Neighbourhoods ranked by community participation and reporting activity.'}
        </div>

        {/* Board */}
        {tab === 'hours' ? <HoursBoard hours={hours} /> : <VoiceBoard />}

      </div>
    </div>
  );
}

Object.assign(window, { HonorsScreen });
