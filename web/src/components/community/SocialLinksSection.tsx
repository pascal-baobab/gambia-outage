// SocialLinksSection.tsx — "From Facebook": owner-curated external posts shown as LIGHTWEIGHT
// link-out cards. No Facebook SDK, no iframe, no third-party script → cheap on 2G and privacy-
// preserving (nothing loads from facebook.com until the user taps through). Tapping the TEXT opens
// the post on Facebook; tapping the IMAGE opens it full-screen in an in-app lightbox (never FB).
// Read-only; rows are ingested via the Telegram bot.
//
// Each card carries an anonymous "like" (heart + count) as a SOCIAL-PROOF signal — it lets a visitor
// feel that others are using the app. The like is deduped server-side by the daily rl_key (one per
// device-day per post); the filled-heart UI state is remembered device-local in `go_liked_links`.
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { likeSocial } from '@/lib/api'
import { logoForUrl } from '@/lib/channelLogos'
import { isVideoUrl, videoEmbedSrc } from '@/lib/videoEmbed'
import { useAppStore } from '@/app/store'
import { useRadio } from '@/app/radioStore'
import { useSocial } from '@/hooks/useData'
import { qk } from '@/lib/queryKeys'
import { useAdminDelete } from '@/hooks/useAdminDelete'
import { PostComments } from './PostComments'
import { useT } from '@/i18n/useT'
import type { SocialLink } from '@/lib/types'

type SocialData = { lives: SocialLink[]; links: SocialLink[] }

const FB_BLUE = ACCENT.facebook
const HEART = ACCENT.live
const LIKED_KEY = 'go_liked_links'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Absolute date + time of the post. Africa/Banjul is UTC+0 (no DST) → read the UTC parts directly.
function fmtPostStamp(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${hh}:${mm}`
}

// Device-local memory of which posts this device already liked → keeps the heart filled across
// refetches/sessions (the server dedupe by rl_key is the real guard; this is UI state only).
function readLiked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]') as string[]) } catch { return new Set() }
}
function persistLiked(s: Set<string>): void {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])) } catch { /* private mode / quota */ }
}

// Deterministic hue from the source name → stable, distinct avatar colour per page (no network).
function hashHue(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

// Source "logo": a monogram avatar (initial of the page name, deterministic colour) with a small
// platform badge overlaid. We can't fetch the real Facebook page picture from the server (FB serves
// a login wall to the datacenter IP), so the monogram stands in — always renders, zero network.
function SourceAvatar({ name, source, official, logo }: { name: string; source: string; official?: boolean; logo?: string | null }) {
  const initial = (name.trim()[0] || '?').toUpperCase()
  const hue = hashHue(name || source || 'x')
  const fb = source === 'facebook'
  return (
    <div aria-hidden style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', background: logo ? GPT_T.wash : `hsl(${hue} 52% 42%)`, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17, lineHeight: 1,
        overflow: 'hidden',
        // OFFICIAL (NAWEC) → a flag-green ring (paper gap + green) marks the authoritative source.
        boxShadow: official ? `0 0 0 2px ${GPT_T.paper}, 0 0 0 3.5px ${FLAG.green}` : 'none',
      }}>
        {/* Real page logo (same-origin cached asset) when we have one; else the deterministic monogram. */}
        {logo
          ? <img src={logo} alt="" width={38} height={38} loading="lazy" decoding="async" style={{ width: 38, height: 38, objectFit: 'cover', display: 'block' }} />
          : initial}
      </div>
      {fb && (
        <span style={{
          position: 'absolute', right: -2, bottom: -2, width: 17, height: 17, borderRadius: '50%',
          background: FB_BLUE, color: '#fff', border: `2px solid ${GPT_T.paper}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, lineHeight: 1,
        }}>
          f
        </span>
      )}
    </div>
  )
}

// Verified-source tick — a small flag-green check next to the page name. Signals the post comes
// from a known, monitored Gambian page (trusted), distinguishing it from an arbitrary pasted link.
function VerifiedTick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill={FLAG.green} />
      <path d="M7 12.4l3.3 3.3L17.2 8.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// OFFICIAL badge — reserved for NAWEC (the national electricity utility). The one source everyone
// most wants to hear from; given the strongest, on-brand (flag-green) treatment.
function OfficialBadge() {
  const t = useT()
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', flexShrink: 0, padding: '1.5px 6px', borderRadius: 5,
      background: FLAG.green, color: '#fff', fontSize: 9.5, fontWeight: 900, letterSpacing: 0.5,
      textTransform: 'uppercase', lineHeight: 1.35, whiteSpace: 'nowrap',
    }}>
      {t.socialLinks.official}
    </span>
  )
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden
      fill={filled ? HEART : 'none'} stroke={filled ? HEART : GPT_T.ink45} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

// Affordance badge over the image: signals it can be opened full-screen (expand arrows).
function ExpandBadge() {
  return (
    <span aria-hidden style={{
      position: 'absolute', right: 8, bottom: 8, width: 26, height: 26, borderRadius: 8,
      background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H4a1 1 0 0 0-1 1v5M15 3h5a1 1 0 0 1 1 1v5M9 21H4a1 1 0 0 1-1-1v-5M15 21h5a1 1 0 0 0 1-1v-5" />
      </svg>
    </span>
  )
}

// Full-screen in-app image viewer. Mounted on document.body via a portal so a parent's overflow /
// transform can't clip it. Tap anywhere (or Esc) to close; body scroll is locked while open.
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const t = useT()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.socialLinks.lightboxAria}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.93)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: GPT_FONT,
      }}
    >
      <img
        src={src}
        alt=""
        onClick={onClose}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
      />
      <button
        type="button"
        aria-label={t.socialLinks.closeImageAria}
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 22, lineHeight: 1, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>,
    document.body,
  )
}

const LinkCard = memo(function LinkCard({ link, liked, likes, onLike }: {
  link: SocialLink; liked: boolean; likes: number; onLike: (id: string) => void
}) {
  const t = useT()
  const [zoom, setZoom] = useState(false)
  // Source = page/profile name (og:title). Fall back to the manual title, then the platform name
  // (keeps legacy rows — pre-`author` — readable: their page name lived in `title`).
  const sourceName = link.author || link.title || (link.source === 'facebook' ? t.socialLinks.platformFacebook : t.socialLinks.platformLink)
  const platform = link.source === 'facebook' ? t.socialLinks.platformFacebook : t.socialLinks.platformLink
  // Manual caption only shown as a headline when it's distinct from the source name.
  const headline = link.title && link.title !== sourceName ? link.title : ''
  // Trust / ingestion metadata (auto-monitored Gambian pages). Optional → falsy on legacy rows.
  const official = !!link.official // NAWEC → OFFICIAL badge + green avatar ring
  const trusted = !!link.trusted // known monitored page → verified tick
  const auto = link.origin === 'auto' // machine-monitored → discreet "Auto-tracked" tag
  const logo = logoForUrl(link.url) // same-origin cached page logo (null → monogram)
  // In-app video: tap-to-play inline (FB plugin / YouTube), Data-saver → link-out (like LiveStrip).
  const dataSaver = useAppStore((s) => s.dataSaver)
  const [playing, setPlaying] = useState(false)
  const isVideo = isVideoUrl(link.url)
  const videoSrc = isVideo ? videoEmbedSrc(link.url) : null
  const canPlay = !dataSaver && !!videoSrc
  const modQc = useQueryClient()
  const mod = useAdminDelete('social_link', link.id, () => modQc.invalidateQueries({ queryKey: qk.social }), 'post')
  return (
    <div {...mod.bind} style={{
      background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, overflow: 'hidden',
      fontFamily: GPT_FONT, color: GPT_T.ink, ...mod.ring,
    }}>
      {/* Video post: tap-to-play inline (the iframe mounts only on tap; Data-saver users link out). */}
      {canPlay && (
        playing ? (
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
            <iframe
              title={headline || sourceName || 'video'}
              src={videoSrc as string}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { useRadio.getState().videoTookOver(); setPlaying(true) }}
            aria-label={t.socialLinks.playVideoAria}
            style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: GPT_T.panel, cursor: 'pointer', position: 'relative', lineHeight: 0 }}
          >
            {link.image
              ? <img src={link.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', aspectRatio: '16 / 9', background: GPT_T.panel }} />}
            <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, paddingLeft: 4 }}>▶</span>
            </span>
          </button>
        )
      )}
      {/* Image OUTSIDE the <a>: tapping it opens the full image in-app, NOT Facebook. */}
      {!canPlay && link.image && (
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={t.socialLinks.openFullImageAria}
          style={{
            display: 'block', width: '100%', padding: 0, border: 'none', background: GPT_T.wash,
            cursor: 'zoom-in', position: 'relative', lineHeight: 0,
          }}
        >
          <img
            src={link.image}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
          />
          <ExpandBadge />
        </button>
      )}
      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SourceAvatar name={sourceName} source={link.source} official={official} logo={logo} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                  {sourceName}
                </span>
                {trusted && <VerifiedTick />}
                {official && <OfficialBadge />}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GPT_T.ink45, marginTop: 1 }}>
                {link.pinned ? '📌 ' : ''}{platform}
                {auto && <span style={{ color: GPT_T.ink25, fontWeight: 600 }}> · {t.socialLinks.autoTracked}</span>}
                {isVideo && !canPlay && <span style={{ color: GPT_T.ink25, fontWeight: 600 }}> · {t.socialLinks.videoTag}</span>}
              </div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: GPT_T.ink45, flexShrink: 0, textAlign: 'end', lineHeight: 1.25 }}>
              {fmtPostStamp(link.created)}
              <span style={{ display: 'block', fontWeight: 500, fontSize: 10.5 }}>{link.ago}</span>
            </span>
          </div>
          {headline && (
            <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.3, marginTop: 9 }}>{headline}</div>
          )}
          {link.snippet && (
            <div style={{
              fontSize: 13.5, fontWeight: 500, color: GPT_T.ink70, lineHeight: 1.45, marginTop: headline ? 4 : 9,
              whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 12, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{link.snippet}</div>
          )}
          <div style={{ fontSize: 13, fontWeight: 800, color: FB_BLUE, marginTop: 10 }}>
            {link.source === 'facebook' ? t.socialLinks.viewFacebook : t.socialLinks.openLink}
          </div>
        </div>
      </a>
      {/* Like footer — OUTSIDE the <a> so it never triggers navigation. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: `1px solid ${GPT_T.line}` }}>
        <button
          type="button"
          onClick={() => onLike(link.id)}
          disabled={liked}
          aria-pressed={liked}
          aria-label={liked ? t.socialLinks.likedAria : t.socialLinks.likeAria}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${liked ? HEART : GPT_T.line}`, background: liked ? 'rgba(224,36,94,0.08)' : GPT_T.paper,
            color: liked ? HEART : GPT_T.ink70, fontWeight: 800, fontSize: 13, fontFamily: GPT_FONT,
            cursor: liked ? 'default' : 'pointer', lineHeight: 1,
          }}
        >
          <Heart filled={liked} />
          {likes > 0 && <span>{likes}</span>}
          <span>{liked ? t.socialLinks.liked : t.socialLinks.like}</span>
        </button>
        {likes > 0 && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>
            {likes === 1 ? t.socialLinks.oneReaction : t.socialLinks.manyReactions(likes)}
          </span>
        )}
      </div>
      <PostComments socialId={link.id} />
      {zoom && link.image && <Lightbox src={link.image} onClose={() => setZoom(false)} />}
    </div>
  )
})

// `limit` caps how many cards render (Home shows a short teaser); `onSeeAll` adds a "See all" link
// under the teaser. Without them the full feed renders (News + Community tabs). The fetch always
// pulls the full set so the count behind "See all" is honest.
export function SocialLinksSection({ limit, onSeeAll }: { limit?: number; onSeeAll?: () => void } = {}) {
  const t = useT()
  // Shared cache (useSocial) — every mounted instance reads the same query, so navigating between
  // Home/Community/News renders instantly from cache instead of refetching + blanking.
  const { data } = useSocial()
  const links = data?.links ?? null
  const qc = useQueryClient()
  const [liked, setLiked] = useState<Set<string>>(() => readLiked())
  // Optimistic +1 layered on top of the server count until the POST reconciles (id → extra).
  const [bumps, setBumps] = useState<Record<string, number>>({})

  // Write a like count back into the shared cache so every instance (and a later navigation) sees it.
  const patchCacheLikes = (id: string, likes: number) =>
    qc.setQueryData<SocialData>(qk.social, (old) =>
      old ? { ...old, links: old.links.map((l) => (l.id === id ? { ...l, likes } : l)) } : old,
    )

  // `onLike` must be STABLE so memo'd LinkCards don't all re-render (and re-decode images) whenever
  // the parent re-renders. Read current `liked` via a ref instead of closing over it, so the callback
  // identity never changes; no side effects inside a setState updater (StrictMode-safe).
  const likedRef = useRef(liked)
  likedRef.current = liked
  const onLike = useCallback((id: string) => {
    if (likedRef.current.has(id)) return
    const next = new Set(likedRef.current); next.add(id)
    setLiked(next); persistLiked(next)
    setBumps((b) => ({ ...b, [id]: 1 })) // optimistic
    likeSocial(id)
      .then((res) => {
        patchCacheLikes(id, res.likes) // reconcile to the authoritative server total
        setBumps((b) => { const n = { ...b }; delete n[id]; return n })
      })
      .catch(() => {
        setLiked((c) => { const back = new Set(c); back.delete(id); persistLiked(back); return back })
        setBumps((b) => { const n = { ...b }; delete n[id]; return n })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Non-critical section: render nothing until we have at least one card (no empty-state clutter).
  if (!links || links.length === 0) return null

  const shown = limit ? links.slice(0, limit) : links
  const hiddenCount = links.length - shown.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: GPT_T.ink45 }}>
        {t.socialLinks.sectionTitle}
      </div>
      {shown.map((l) => (
        <LinkCard
          key={l.id}
          link={l}
          liked={liked.has(l.id)}
          likes={(l.likes || 0) + (bumps[l.id] || 0)}
          onLike={onLike}
        />
      ))}
      {onSeeAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={onSeeAll}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%',
            minHeight: 46, borderRadius: 13, cursor: 'pointer', background: GPT_T.paper,
            border: `1px solid ${GPT_T.line}`, color: GPT_T.ink, fontFamily: GPT_FONT, fontSize: 14, fontWeight: 800,
          }}
        >
          {t.socialLinks.seeAllInNews(links.length)}
          <span aria-hidden style={{ color: FB_BLUE }}>↗</span>
        </button>
      )}
    </div>
  )
}
