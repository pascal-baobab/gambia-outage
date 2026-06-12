// screen-share.jsx — Share-card generator (1080×1080 + 1200×630) + modal
// Exports: ShareModal, ShareCard

const SHARE_DATE = 'Saturday, 31 May 2026';

// The actual generated card, rendered at full pixel size (scaled in preview/export)
function ShareCard({ data, size = 'square' }) {
  const th = useTheme();
  const W = size === 'square' ? 1080 : 1200;
  const H = size === 'square' ? 1080 : 630;
  const pad = size === 'square' ? 84 : 64;
  return (
    <div style={{ width: W, height: H, background: GPT_T.panel, position: 'relative', overflow: 'hidden', fontFamily: GPT_FONT, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <FlagBg opacity={0.13} scrim="linear-gradient(160deg, rgba(15,23,34,0.82), rgba(15,23,34,0.95))" />
      {/* top accent — Gambian tricolour */}
      <FlagRule height={14} />
      <div style={{ position: 'relative', flex: 1, padding: pad, display: 'flex', flexDirection: size === 'square' ? 'column' : 'row', gap: size === 'square' ? 0 : 56 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <LogoMark size={64} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase' }}>Gambia <span style={{ opacity: 0.6 }}>Outage</span></span>
              <span style={{ fontSize: 18, fontWeight: 700, color: GPT_T.panelInk60, letterSpacing: 2, marginTop: 7, textTransform: 'uppercase' }}>Report the Dark</span>
            </div>
          </div>
          <div style={{ marginTop: size === 'square' ? 'auto' : 44 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: GPT_T.panelInk60, letterSpacing: 1.5, textTransform: 'uppercase' }}>Without power today</div>
            <div style={{ fontSize: size === 'square' ? 230 : 170, fontWeight: 800, letterSpacing: -8, lineHeight: 0.86, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
              {data.national.hours}h {String(data.national.mins).padStart(2, '0')}m
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#fff', marginTop: 26, lineHeight: 1.3 }}>
              <span style={{ color: th.out, fontWeight: 900 }}>{data.national.regionsOut} of {data.national.regionsTotal} regions</span> reporting outages
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: GPT_T.panelInk60, marginTop: 14 }}>{SHARE_DATE} · {data.national.reports.toLocaleString()} reports</div>
          </div>
        </div>
        {/* mini heatmap */}
        <div style={{ width: size === 'square' ? '100%' : 420, height: size === 'square' ? 220 : '100%', marginTop: size === 'square' ? 40 : 0, borderRadius: 24, overflow: 'hidden', border: `2px solid ${GPT_T.panelLine}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}><GambiaMap mode="blob" bg="#10202A" land="#16303C" /></div>
        </div>
      </div>
      <div style={{ padding: `0 ${pad}px ${pad - 24}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${GPT_T.panelLine}`, paddingTop: 28, marginInline: pad, marginBottom: 0 }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.5 }}>gambiaoutage.com</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: GPT_T.panelInk60 }}>Crowd-reported · anonymous</span>
      </div>
      <div style={{ height: pad - 24 }} />
    </div>
  );
}

function ShareModal({ data, onClose }) {
  const th = useTheme();
  const [size, setSize] = React.useState('square');
  const W = size === 'square' ? 1080 : 1200;
  const H = size === 'square' ? 1080 : 630;
  const previewW = 300;
  const scale = previewW / W;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 92, fontFamily: GPT_FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.62)', animation: 'gptFade .3s ease' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: GPT_T.paper, borderRadius: '24px 24px 0 0', padding: '10px 18px calc(18px + env(safe-area-inset-bottom))', animation: 'gptSheetIn .36s cubic-bezier(.2,.8,.25,1)', maxHeight: '94%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}><div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>Share today’s record</div>
          <IconBtn icon="close" onClick={onClose} label="Close" />
        </div>
        {/* size toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <SegToggle value={size} onChange={setSize} options={[{ v: 'square', icon: 'share', label: 'Square 1:1' }, { v: 'wide', icon: 'share', label: 'Link 1.91:1' }]} />
        </div>
        {/* preview */}
        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto', minHeight: 0, padding: '4px 0' }}>
          <div style={{ width: previewW, height: H * scale, borderRadius: 14 * scale * 6, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,34,0.28)', flexShrink: 0 }}>
            <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <ShareCard data={data} size={size} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: GPT_T.ink45, textAlign: 'center', marginTop: 10, fontWeight: 600 }}>
          {size === 'square' ? '1080 × 1080 — stories & posts' : '1200 × 630 — link previews'}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button style={{ flex: 1, minHeight: 54, borderRadius: 15, border: `2px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Save image</button>
          <button style={{ flex: 1.4, minHeight: 54, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            <GPTIcon name="share" size={20} color="#fff" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ShareModal, ShareCard });
