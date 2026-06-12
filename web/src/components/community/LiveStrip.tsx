// LiveStrip.tsx — "LIVE now" strip. Shows owner-curated live streams (Facebook/TikTok/Instagram/
// YouTube) at the top of Home + Community while any is active. Facebook + YouTube embed inline
// (lazy: the iframe mounts only on tap); TikTok/Instagram (and Data-saver users) get a link-out card.
// 2G constraint is relaxed for lives (owner: "always 4G+"), with the Data-saver link-out fallback.
import { useEffect, useState } from 'react'
import { useSocial } from '@/hooks/useData'
import type { SocialLink } from '@/lib/types'
import { useAppStore } from '@/app/store'
import { useRadio } from '@/app/radioStore'
import { GPT_T, ACCENT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'

const HEART_RED = ACCENT.live

/** Build an embeddable iframe URL for the platforms we can embed; null ⇒ render a link-out card. */
function embedSrc(l: SocialLink): string | null {
  try {
    if (l.platform === 'facebook')
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(l.url)}&show_text=false&autoplay=false`
    if (l.platform === 'youtube') {
      const u = new URL(l.url)
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v') || ''
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    return null // tiktok / instagram: link-out for v1 (their embeds are heavier)
  } catch {
    return null
  }
}

function platformLabel(p: string): string {
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Live'
}

export function LiveStrip() {
  const t = useT()
  // Reads `lives` from the SHARED social query (useSocial) — same cache the From-Facebook cards use,
  // so the LIVE strip + the cards never double-fetch the same payload, and it renders instantly on
  // navigation. The 30s query refetch keeps starts/stops fresh.
  const { data } = useSocial()
  const lives = data?.lives ?? []
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const dataSaver = useAppStore((s) => s.dataSaver)
  // Exclusive playback: when the radio takes over (collapseSignal bumps), collapse any open video.
  const collapseSignal = useRadio((s) => s.collapseSignal)
  useEffect(() => {
    if (collapseSignal > 0) setOpen({})
  }, [collapseSignal])

  if (!lives.length) return null

  return (
    <div style={{ padding: '12px 12px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 2px 8px' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: HEART_RED, boxShadow: `0 0 0 4px rgba(224,36,94,.18)` }} />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: GPT_T.ink }}>{t.live.liveNow}</span>
      </div>
      {lives.map((l) => {
        const src = embedSrc(l)
        const canEmbed = !dataSaver && !!src
        const showEmbed = canEmbed && open[l.id]
        return (
          <div key={l.id} style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
            {showEmbed ? (
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                <iframe
                  title={l.title || l.author || 'live'}
                  src={src as string}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  if (canEmbed) {
                    useRadio.getState().videoTookOver() // video takes audio focus → pause the radio
                    setOpen((o) => ({ ...o, [l.id]: true }))
                  } else {
                    window.open(l.url, '_blank', 'noopener')
                  }
                }}
                style={{ display: 'block', width: '100%', textAlign: 'start', border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <div style={{ position: 'relative' }}>
                  {l.image ? (
                    <img src={l.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block', aspectRatio: '16 / 9', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16 / 9', background: GPT_T.panel }} />
                  )}
                  <span style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: HEART_RED, color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', padding: '3px 8px', borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> {t.live.live}
                  </span>
                  <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 22, lineHeight: 1, padding: '6px 10px', borderRadius: 999 }}>▶</span>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.25 }}>{l.title || l.author || platformLabel(l.platform)}</div>
                  <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 3 }}>
                    {canEmbed ? t.live.tapToWatch : `${t.live.openLive} · ${platformLabel(l.platform)}`}
                  </div>
                </div>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
