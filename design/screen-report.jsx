// screen-report.jsx — Report bottom sheet (the core 2-tap flow). Exports: ReportSheet

const GPS_GUESS = { settlement: 'Latrikunda Sabiji', district: 'Serrekunda', region: 'Kanifing' };
const NOTE_MAX = 140;

function ReportSheet({ initialAction = 'out', zone, gpsDenied, offline, data, onClose, onSubmitted, profile }) {
  const th = useTheme();
  const [locMode, setLocMode] = React.useState(gpsDenied ? 'manual' : 'gps');
  const [action, setAction] = React.useState(initialAction);
  const [note, setNote] = React.useState('');
  const [step, setStep] = React.useState('form'); // form | sending | done
  // manual cascade (persisted)
  const saved = (() => { try { return JSON.parse(localStorage.getItem('gpt_place') || 'null'); } catch { return null; } })();
  const [region, setRegion] = React.useState(saved?.region || (zone?.region) || '');
  const [district, setDistrict] = React.useState(saved?.district || '');
  const [settlement, setSettlement] = React.useState(saved?.settlement || '');
  const [open, setOpen] = React.useState(null);

  const place = zone ? { settlement: zone.name, region: zone.region }
    : locMode === 'gps' ? { settlement: GPS_GUESS.settlement, region: GPS_GUESS.region }
    : { settlement, region };
  const locReady = !!(place.settlement && place.region);

  const districts = region ? Object.keys(data.places[region] || {}) : [];
  const settlements = (region && district) ? (data.places[region][district] || []) : [];

  const submit = () => {
    if (!locReady) return;
    setStep('sending');
    if (locMode === 'manual') { try { localStorage.setItem('gpt_place', JSON.stringify({ region, district, settlement })); } catch {} }
    setTimeout(() => { setStep('done'); onSubmitted && onSubmitted(action, offline); }, 900);
  };

  const sheetBase = { position: 'absolute', left: 0, right: 0, bottom: 0, background: GPT_T.paper, borderRadius: '24px 24px 0 0',
    boxShadow: '0 -16px 50px rgba(15,23,34,0.3)', zIndex: 90, maxHeight: '94%', display: 'flex', flexDirection: 'column',
    animation: 'gptSheetIn .36s cubic-bezier(.2,.8,.25,1)', fontFamily: GPT_FONT };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 85 }}>
      <div onClick={() => onClose(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.5)', animation: 'gptFade .3s ease' }} />
      <div style={sheetBase}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}><div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} /></div>

        {step === 'done' ? (
          <DoneView action={action} offline={offline} place={place} onClose={() => onClose(true)} th={th} profile={profile} />
        ) : (
          <React.Fragment>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 10px' }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>Report power status</div>
              <IconBtn icon="close" onClick={() => onClose(false)} label="Close" />
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '0 16px' }}>
              {/* LOCATION */}
              <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Your area</div>
              {locMode === 'gps' && !zone ? (
                <div style={{ border: `1.5px solid ${GPT_T.line}`, borderRadius: 15, padding: '13px 14px', background: GPT_T.wash }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, background: th.out, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><GPTIcon name="pin" size={20} color="#fff" /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600 }}>You're in</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>{GPS_GUESS.settlement}, {GPS_GUESS.region}</div>
                    </div>
                    <GPTIcon name="check" size={20} color={th.on} />
                  </div>
                  <button onClick={() => setLocMode('manual')} style={{ marginTop: 10, width: '100%', height: 40, borderRadius: 10, border: `1px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Not right? Change area</button>
                </div>
              ) : zone ? (
                <div style={{ border: `1.5px solid ${GPT_T.line}`, borderRadius: 15, padding: '13px 14px', background: GPT_T.wash, display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: GPT_T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><GPTIcon name="pin" size={20} color="#fff" /></span>
                  <div><div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600 }}>Reporting for</div><div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>{zone.name}, {zone.region}</div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {gpsDenied && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: GPT_T.ink70, fontWeight: 600, background: th.partialBg, padding: '8px 11px', borderRadius: 10 }}><GPTIcon name="info" size={15} color={th.partialDeep} /> Location off — pick your area. We'll remember it.</div>}
                  <Picker label="Region" value={region} placeholder="Select region" open={open === 'r'} onToggle={() => setOpen(open === 'r' ? null : 'r')}
                    options={Object.keys(data.places)} onPick={(v) => { setRegion(v); setDistrict(''); setSettlement(''); setOpen('d'); }} />
                  <Picker label="District" value={district} placeholder={region ? 'Select district' : 'Pick a region first'} disabled={!region} open={open === 'd'} onToggle={() => setOpen(open === 'd' ? null : 'd')}
                    options={districts} onPick={(v) => { setDistrict(v); setSettlement(''); setOpen('s'); }} />
                  <Picker label="Settlement" value={settlement} placeholder={district ? 'Select settlement' : 'Pick a district first'} disabled={!district} open={open === 's'} onToggle={() => setOpen(open === 's' ? null : 's')}
                    options={settlements} onPick={(v) => { setSettlement(v); setOpen(null); }} />
                  {!gpsDenied && <button onClick={() => setLocMode('gps')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: th.out, fontFamily: GPT_FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '2px 0' }}>← Use my GPS location instead</button>}
                </div>
              )}

              {/* ACTION */}
              <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase', margin: '18px 0 8px' }}>What's happening?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <ActionBtn active={action === 'out'} onClick={() => setAction('out')} status="out" title="Power OUT" sub="No electricity now" th={th} />
                <ActionBtn active={action === 'on'} onClick={() => setAction('on')} status="on" title="Power BACK" sub="It's restored" th={th} />
              </div>

              {/* NOTE */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 8px' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase' }}>Add a note <span style={{ textTransform: 'none', fontWeight: 600, color: GPT_T.ink25 }}>· optional</span></span>
                <span style={{ fontSize: 12, fontWeight: 700, color: note.length > NOTE_MAX - 20 ? th.out : GPT_T.ink45, fontVariantNumeric: 'tabular-nums' }}>{note.length}/{NOTE_MAX}</span>
              </div>
              <textarea value={note} maxLength={NOTE_MAX} onChange={e => setNote(e.target.value)} placeholder="e.g. Out since 6am, whole street dark."
                style={{ width: '100%', minHeight: 64, resize: 'none', boxSizing: 'border-box', border: `1.5px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', fontFamily: GPT_FONT, fontSize: 15, color: GPT_T.ink, outline: 'none', background: GPT_T.wash }} />
              <div style={{ fontSize: 11.5, color: GPT_T.ink45, marginTop: 7, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <GPTIcon name="lock" size={13} color={GPT_T.ink45} /> No account · no personal data · location used only to place this report.
              </div>
              <div style={{ height: 12 }} />
            </div>

            {/* submit */}
            <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: `1px solid ${GPT_T.line}`, background: GPT_T.paper }}>
              {offline && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: '#8A5400', background: th.partialBg, padding: '9px 12px', borderRadius: 11, marginBottom: 10 }}><GPTIcon name="cloud-off" size={16} color={th.partialDeep} /> Offline — we'll send this when you're back online.</div>}
              <button onClick={submit} disabled={!locReady || step === 'sending'} style={{ width: '100%', minHeight: 56, borderRadius: 16, border: 'none', cursor: locReady ? 'pointer' : 'not-allowed',
                background: locReady ? th[action] : GPT_T.line, color: locReady ? '#fff' : GPT_T.ink45, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 17,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: locReady ? `0 8px 20px ${th[action]}44` : 'none', opacity: step === 'sending' ? 0.7 : 1 }}>
                {step === 'sending' ? 'Submitting…' : <React.Fragment><GPTIcon name={action} size={22} color="#fff" strokeColor={th[action]} /> Submit report</React.Fragment>}
              </button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ active, onClick, status, title, sub, th }) {
  const c = th[status];
  return (
    <button onClick={onClick} aria-pressed={active} style={{ flex: 1, borderRadius: 15, cursor: 'pointer', padding: '14px 12px', textAlign: 'left',
      border: `2px solid ${active ? c : GPT_T.line}`, background: active ? th[status + 'Bg'] : GPT_T.paper, fontFamily: GPT_FONT,
      display: 'flex', flexDirection: 'column', gap: 6, transition: 'all .15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: active ? c : th[status + 'Bg'], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GPTIcon name={status} size={20} color={active ? '#fff' : c} strokeColor={active ? c : '#fff'} />
        </span>
        {active && <span style={{ width: 20, height: 20, borderRadius: 999, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GPTIcon name="check" size={14} color="#fff" /></span>}
      </div>
      <div><div style={{ fontSize: 15.5, fontWeight: 800, color: active ? th[status + 'Deep'] : GPT_T.ink }}>{title}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{sub}</div></div>
    </button>
  );
}

function Picker({ label, value, placeholder, options, onPick, disabled, open, onToggle }) {
  return (
    <div>
      <button onClick={() => !disabled && onToggle()} disabled={disabled} style={{ width: '100%', minHeight: 52, borderRadius: 13, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1.5px solid ${open ? GPT_T.ink : GPT_T.line}`, background: disabled ? GPT_T.line2 : GPT_T.paper, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: GPT_FONT }}>
        <span style={{ textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: GPT_T.ink45, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
          <span style={{ display: 'block', fontSize: 15.5, fontWeight: value ? 800 : 500, color: value ? GPT_T.ink : GPT_T.ink25, marginTop: 1 }}>{value || placeholder}</span>
        </span>
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><GPTIcon name="chevron" size={18} color={GPT_T.ink45} /></span>
      </button>
      {open && (
        <div style={{ border: `1.5px solid ${GPT_T.line}`, borderTop: 'none', borderRadius: '0 0 13px 13px', marginTop: -2, maxHeight: 168, overflow: 'auto', background: GPT_T.paper }}>
          {options.map(o => (
            <button key={o} onClick={() => onPick(o)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderTop: `1px solid ${GPT_T.line2}`, background: o === value ? GPT_T.wash : GPT_T.paper, cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 15, fontWeight: o === value ? 800 : 600, color: GPT_T.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {o}{o === value && <GPTIcon name="check" size={17} color={GPT_T.ink} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DoneView({ action, offline, place, onClose, th, profile }) {
  const isOut = action === 'out';
  const c = th[action];
  // Mock dark-neighbours count — in the prototype use a fixed mock value
  const darkNeighbours = (window.TWEAK && window.TWEAK.darkNeighbours != null) ? window.TWEAK.darkNeighbours : 23;
  // XP reward card: visible when not offline, profile exists, and profile has XP
  const mockProfile = profile || { xp: 42 };
  const showReward = !offline && mockProfile && mockProfile.xp > 0;
  return (
    <div style={{ padding: '8px 24px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 76, height: 76, borderRadius: 24, background: offline ? GPT_T.ink : th[action + 'Bg'], display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 16, animation: 'gptPop .4s cubic-bezier(.2,.9,.3,1.3)' }}>
        <GPTIcon name={offline ? 'cloud-off' : 'check'} size={40} color={offline ? '#fff' : c} />
      </div>
      {offline ? (
        <React.Fragment>
          <div style={{ fontSize: 22, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.4 }}>Saved on your phone</div>
          <div style={{ fontSize: 14.5, color: GPT_T.ink70, fontWeight: 500, marginTop: 8, lineHeight: 1.5, maxWidth: 280 }}>We'll send your <b>{isOut ? 'power-out' : 'power-back'}</b> report for <b>{place.settlement}</b> automatically once you're back online.</div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <div style={{ fontSize: 22, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.4 }}>{isOut ? 'Reported. Thank you.' : 'Marked as back on.'}</div>
          <div style={{ fontSize: 14.5, color: GPT_T.ink70, fontWeight: 500, marginTop: 8, lineHeight: 1.5, maxWidth: 290 }}>
            {isOut ? <React.Fragment><b style={{ color: th.out }}>23 others</b> near <b>{place.settlement}</b> also report no power. Your report strengthens the record.</React.Fragment>
                   : <React.Fragment>Thanks — once enough neighbours confirm, we'll close the outage for <b>{place.settlement}</b> and log its duration.</React.Fragment>}
          </div>
          {/* Dark-neighbours solidarity line */}
          {darkNeighbours > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, fontSize: 13, fontWeight: 700, color: th.outDeep }}>
              <span aria-hidden>🤝</span>
              <span>{darkNeighbours} neighbours reporting darkness</span>
            </div>
          )}
          {/* XP reward card — shown when the device has XP (decoupled from reports, claim_nonce model) */}
          {showReward && (
            <div style={{ marginTop: 18, width: '100%', borderRadius: 15, border: `1px solid ${th.partialLine}`, background: th.partialBg, padding: '13px 15px', textAlign: 'start', animation: 'gptPop .45s cubic-bezier(.2,.9,.3,1.3)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: th.partialDeep, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>+6 XP</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{rankFor(mockProfile.xp).label}</span>
              </div>
              {/* XpBar stub: progress track showing xp % 100 */}
              <div style={{ marginTop: 9, height: 6, borderRadius: 3, background: GPT_T.line, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (mockProfile.xp % 100))}%`, background: th.partialDeep, borderRadius: 3, transition: 'width .4s' }} />
              </div>
            </div>
          )}
        </React.Fragment>
      )}
      <button onClick={onClose} style={{ marginTop: 22, width: '100%', minHeight: 54, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Done</button>
    </div>
  );
}

Object.assign(window, { ReportSheet });
