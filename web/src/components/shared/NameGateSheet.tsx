import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'

export function NameGateSheet({ onOpenNameGate, onClose }: { onOpenNameGate: () => void; onClose: () => void }) {
  const t = useT()
  const sheet = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    background: GPT_T.paper,
    borderRadius: '22px 22px 0 0',
    boxShadow: '0 -16px 50px rgba(15,23,34,0.28)',
    zIndex: 95,
    fontFamily: GPT_FONT,
    paddingBottom: 'env(safe-area-inset-bottom)',
    animation: 'gptSheetIn .34s cubic-bezier(.2,.8,.25,1)',
  } as const

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 92 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.45)', animation: 'gptFade .3s ease' }} />
      <div style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} />
        </div>
        <div style={{ padding: '18px 22px 22px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.35, marginBottom: 18 }}>
            {t.nameGateSheet.title}
          </div>
          <button
            onClick={() => { onClose(); onOpenNameGate() }}
            style={{ width: '100%', minHeight: 52, borderRadius: 14, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15.5, cursor: 'pointer', marginBottom: 10 }}
          >
            {t.nameGateSheet.cta}
          </button>
          <button
            onClick={onClose}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 600, color: GPT_T.ink45, padding: '6px 0' }}
          >
            {t.nameGateSheet.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
