// HonorCard.tsx — bottom-sheet share-card for the weekly Wall of Honor (Phase 5). Same idiom as
// ShareModal: the preview IS the exported Canvas, scaled to fit. Facebook-first (sharer URL) +
// native Web Share of the PNG (best on the Gambian Android Facebook app) + PNG download fallback.
import { useEffect, useRef, useState } from 'react'
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { GPTIcon } from '@/components/icons'
import { IconBtn } from '@/components/shared/IconBtn'
import { drawHonorCard, renderHonorBlob, type HonorCardData } from '@/lib/honorCard'
import { shareImage, downloadImage } from '@/lib/share'
import { useT } from '@/i18n/useT'

const WEEK_URL = 'https://gambiaoutage.com/#/community'

export function HonorCard({ data, onClose, onToast }: { data: HonorCardData; onClose: () => void; onToast: (text: string) => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const blobRef = useRef<Blob | null>(null)

  useEffect(() => {
    let cancelled = false
    blobRef.current = null
    const canvas = previewRef.current
    if (canvas) drawHonorCard(canvas, data)
    renderHonorBlob(data).then((b) => { if (!cancelled) blobRef.current = b })
    return () => { cancelled = true }
  }, [data])

  const filename = 'gambia-outage-wall-of-honor.png'

  const onSave = async () => {
    setBusy(true)
    try {
      const blob = blobRef.current ?? (await renderHonorBlob(data))
      downloadImage(blob, filename)
      onToast(t.honorCard.saveToast)
    } finally {
      setBusy(false)
    }
  }

  const onShare = async () => {
    setBusy(true)
    try {
      const blob = blobRef.current ?? (await renderHonorBlob(data))
      const res = await shareImage(blob, filename, 'The Gambia’s Wall of Honor · gambiaoutage.com')
      if (res === 'failed') { downloadImage(blob, filename); onToast(t.honorCard.saveToast) }
      else if (res === 'shared') onToast(t.honorCard.shareToast)
    } finally {
      setBusy(false)
    }
  }

  const onFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(WEEK_URL)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const previewW = 300
  const scale = previewW / 1080

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 92, fontFamily: GPT_FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.62)' }} />
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, background: GPT_T.paper,
          borderRadius: '24px 24px 0 0', padding: '10px 18px calc(18px + env(safe-area-inset-bottom))',
          maxHeight: '94%', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>{t.honorCard.title}</div>
          <IconBtn icon="close" onClick={onClose} label={t.honorCard.closeAria} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto', minHeight: 0, padding: '4px 0' }}>
          <div style={{ width: previewW, height: 1080 * scale, borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,34,0.28)', flexShrink: 0, background: GPT_T.panel }}>
            <canvas ref={previewRef} style={{ width: previewW, height: 1080 * scale, display: 'block' }} aria-label={t.honorCard.canvasAria} />
          </div>
        </div>

        <button
          onClick={onFacebook}
          style={{ marginTop: 14, width: '100%', minHeight: 52, borderRadius: 15, border: 'none', background: FLAG.blue, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
        >
          <GPTIcon name="share" size={20} color="#fff" /> {t.honorCard.facebookBtn}
        </button>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            onClick={onSave}
            disabled={busy}
            style={{ flex: 1, minHeight: 52, borderRadius: 15, border: `2px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            {t.honorCard.saveBtn}
          </button>
          <button
            onClick={onShare}
            disabled={busy}
            style={{ flex: 1.2, minHeight: 52, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
          >
            <GPTIcon name="share" size={20} color="#fff" /> {t.honorCard.shareBtn}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: GPT_T.ink45, textAlign: 'center', marginTop: 10, fontWeight: 600 }}>
          {t.honorCard.footerNote}
        </div>
      </div>
    </div>
  )
}
