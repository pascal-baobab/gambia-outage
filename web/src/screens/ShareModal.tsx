// ShareModal.tsx — bottom-sheet share-card generator. Ported from design/screen-share.jsx.
// Preview = the SAME Canvas renderer that produces the export (drawShareCard), scaled to fit,
// so what you see is exactly the file. Square 1080² / wide 1200×630. Buttons: Save image
// (download) + Share (native Web Share, falls back to download). Pre-builds the PNG blob on
// size change so the share tap is synchronous (Web Share Level 2 requirement).
import { useEffect, useRef, useState } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { GPTIcon } from '@/components/icons'
import { IconBtn } from '@/components/shared/IconBtn'
import { SegToggle } from '@/components/shared/SegToggle'
import { useNational } from '@/hooks/useData'
import { drawShareCard, renderShareBlob, type ShareSize } from '@/lib/shareCard'
import { shareImage, downloadImage } from '@/lib/share'
import { useT } from '@/i18n/useT'

const DIMS: Record<ShareSize, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  wide: { w: 1200, h: 630 },
}

export function ShareModal({ onClose, onToast }: { onClose: () => void; onToast: (text: string) => void }) {
  const t = useT()
  const { data: national } = useNational()
  const [size, setSize] = useState<ShareSize>('square')
  const [busy, setBusy] = useState(false)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const blobRef = useRef<Blob | null>(null)

  const dims = DIMS[size]

  // (re)draw the preview canvas + pre-build the export blob whenever data/size change
  useEffect(() => {
    let cancelled = false
    blobRef.current = null
    if (!national) return
    const canvas = previewRef.current
    if (canvas) drawShareCard(canvas, national, size)
    renderShareBlob(national, size).then((b) => { if (!cancelled) blobRef.current = b })
    return () => { cancelled = true }
  }, [national, size])

  const filename = `gambia-outage-${size}.png`

  const onSave = async () => {
    if (!national) return
    setBusy(true)
    try {
      const blob = blobRef.current ?? (await renderShareBlob(national, size))
      downloadImage(blob, filename)
      onToast(t.share.savedToast)
    } finally {
      setBusy(false)
    }
  }

  const onShare = async () => {
    if (!national) return
    setBusy(true)
    try {
      const blob = blobRef.current ?? (await renderShareBlob(national, size))
      const res = await shareImage(blob, filename, "Today's power-outage record · gambiaoutage.com")
      if (res === 'failed') { downloadImage(blob, filename); onToast(t.share.savedToast) }
      else if (res === 'shared') onToast(t.share.sharedToast)
    } finally {
      setBusy(false)
    }
  }

  // preview scaled to a fixed on-screen width
  const previewW = 300
  const scale = previewW / dims.w

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
          <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>{t.share.title}</div>
          <IconBtn icon="close" onClick={onClose} label={t.screenHeader.backAria} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <SegToggle
            value={size}
            onChange={(v) => setSize(v as ShareSize)}
            options={[
              { v: 'square', icon: 'share', label: t.share.squareOption },
              { v: 'wide', icon: 'share', label: t.share.wideOption },
            ]}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto', minHeight: 0, padding: '4px 0' }}>
          <div style={{ width: previewW, height: dims.h * scale, borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,34,0.28)', flexShrink: 0, background: GPT_T.panel }}>
            <canvas
              ref={previewRef}
              style={{ width: previewW, height: dims.h * scale, display: 'block' }}
              aria-label="Share card preview"
            />
          </div>
        </div>
        <div style={{ fontSize: 12, color: GPT_T.ink45, textAlign: 'center', marginTop: 10, fontWeight: 600 }}>{size === 'square' ? t.share.squareDimensions : t.share.wideDimensions}</div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={onSave}
            disabled={busy || !national}
            style={{ flex: 1, minHeight: 54, borderRadius: 15, border: `2px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy || !national ? 0.6 : 1 }}
          >
            {t.share.saveButton}
          </button>
          <button
            onClick={onShare}
            disabled={busy || !national}
            style={{ flex: 1.4, minHeight: 54, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy || !national ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
          >
            <GPTIcon name="share" size={20} color="#fff" /> {t.share.shareButton}
          </button>
        </div>
      </div>
    </div>
  )
}
