// ShareLinkComposer.tsx — bottom sheet to submit a Facebook/TikTok link to the "From the community"
// feed. Requires a valid FB/TikTok URL + a caption + a cover image (per the design). Publishes
// instantly under the device pseudonym (nickname + avatar) — never linked to outage reports. The
// image is downscaled client-side so it comfortably clears the 5MB server cap on phone photos.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { getAccountId } from '@/lib/account'
import { getIdentity } from '@/lib/identity'
import { submitCommunityLink } from '@/lib/api'
import { downscaleImage } from '@/lib/image'
import { qk } from '@/lib/queryKeys'
import { useT } from '@/i18n/useT'
import type { CommunityLink } from '@/lib/types'

const CAPTION_MAX = 200
const FB_BLUE = ACCENT.facebook

function detectPlatform(url: string): 'facebook' | 'tiktok' | null {
  try {
    const h = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '')
    if (h === 'facebook.com' || h === 'm.facebook.com' || h === 'fb.watch' || h === 'fb.com') return 'facebook'
    if (h === 'tiktok.com' || h === 'vm.tiktok.com' || h === 'vt.tiktok.com') return 'tiktok'
  } catch { /* not a URL yet */ }
  return null
}


export function ShareLinkComposer({ onClose, onToast }: { onClose: () => void; onToast: (text: string) => void }) {
  const t = useT()
  const qc = useQueryClient()
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>('')
  const acct = useRef<{ id: string; nickname: string; avatarId: string } | null>(null)

  useEffect(() => {
    getAccountId().then((id) => { const i = getIdentity(id); acct.current = { id, nickname: i.nickname ?? '', avatarId: i.avatarId } }).catch(() => {})
  }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const platform = detectPlatform(url)
  const urlOk = !!platform
  const ready = urlOk && caption.trim().length > 0 && !!file && !busy

  function pickFile(f: File | null) {
    setErr('')
    if (!f) { setFile(null); setPreview(''); return }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setErr(t.shareLink.imageFormatError); return }
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!ready || !file || !acct.current) return
    setBusy(true); setErr('')
    try {
      const image = await downscaleImage(file, 'cover.jpg')
      const created = await submitCommunityLink({
        account_id: acct.current.id, nickname: acct.current.nickname, avatar_id: acct.current.avatarId,
        url: url.trim(), caption: caption.trim(), image,
      })
      // prepend into the shared cache so it shows immediately everywhere the section is mounted
      qc.setQueryData<CommunityLink[]>(qk.communityLinks, (prev) => [created, ...(prev ?? [])])
      onToast(t.shareLink.successToast)
      onClose()
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : t.shareLink.errorToast)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, fontFamily: GPT_FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.62)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: GPT_T.paper, borderRadius: '24px 24px 0 0', padding: '10px 18px calc(18px + env(safe-area-inset-bottom))', maxHeight: '94%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>{t.shareLink.title}</div>
          <button onClick={onClose} aria-label={t.shareLink.closeAria} style={{ border: 0, background: 'transparent', fontSize: 22, color: GPT_T.ink45, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginBottom: 14, lineHeight: 1.4 }}>
          {t.shareLink.description}
        </div>

        {/* URL */}
        <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: GPT_T.ink70 }}>{t.shareLink.urlLabel}</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.shareLink.urlPlaceholder}
          inputMode="url"
          autoCapitalize="off"
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, border: `1.5px solid ${url && !urlOk ? FLAG.red : GPT_T.line}`, borderRadius: 10, padding: '10px 12px', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, outline: 'none' }}
        />
        {url && !urlOk && <div style={{ fontSize: 11.5, color: FLAG.red, fontWeight: 600, marginTop: 4 }}>{t.shareLink.urlError}</div>}
        {urlOk && <div style={{ fontSize: 11.5, color: platform === 'facebook' ? FB_BLUE : GPT_T.ink70, fontWeight: 700, marginTop: 4 }}>{platform === 'facebook' ? t.shareLink.facebookValid : t.shareLink.tiktokValid}</div>}

        {/* Caption */}
        <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: GPT_T.ink70, marginTop: 16, display: 'block' }}>{t.shareLink.captionLabel}</label>
        <textarea
          value={caption}
          maxLength={CAPTION_MAX}
          rows={2}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t.shareLink.captionPlaceholder}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, border: `1.5px solid ${GPT_T.line}`, borderRadius: 10, padding: '10px 12px', resize: 'none', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, outline: 'none', lineHeight: 1.4 }}
        />
        <div style={{ fontSize: 11, color: GPT_T.ink45, fontWeight: 600, textAlign: 'end' }}>{caption.length}/{CAPTION_MAX}</div>

        {/* Cover image */}
        <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: GPT_T.ink70, marginTop: 10, display: 'block' }}>{t.shareLink.coverLabel}</label>
        <label style={{ display: 'block', marginTop: 6, cursor: 'pointer' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
          {preview ? (
            <img src={preview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, display: 'block', border: `1px solid ${GPT_T.line}` }} />
          ) : (
            <div style={{ width: '100%', minHeight: 88, borderRadius: 12, border: `1.5px dashed ${GPT_T.line}`, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GPT_T.ink45, fontWeight: 700, fontSize: 13.5 }}>
              {t.shareLink.coverPlaceholder}
            </div>
          )}
        </label>

        {err && <div style={{ fontSize: 12.5, color: FLAG.red, fontWeight: 700, marginTop: 12 }}>{err}</div>}

        <button
          onClick={submit}
          disabled={!ready}
          style={{ marginTop: 16, minHeight: 54, borderRadius: 15, border: 'none', background: ready ? GPT_T.ink : GPT_T.line, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15.5, cursor: ready ? 'pointer' : 'default' }}
        >
          {busy ? t.shareLink.submitting : t.shareLink.submitBtn}
        </button>
      </div>
    </div>,
    document.body,
  )
}
