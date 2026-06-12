// CommunityLinksSection.tsx — "From the community" (Dai cittadini): USER-submitted FB/TikTok links,
// distinct from the owner-curated "From Facebook" feed. Each card shows the submitter's pseudonym
// (avatar + nickname), a required cover image, a caption, ❤ like, ⚐ report, and 💬 comments. Tapping
// the cover embeds the post inline where possible (Facebook) or opens it (TikTok / Data-saver).
// Anonymity intact: like/report are anonymous (daily rl_key); the row carries only the pseudonym.
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT, ACCENT } from '@/lib/tokens'
import { useAppStore } from '@/app/store'
import { useRadio } from '@/app/radioStore'
import { useCommunityLinks } from '@/hooks/useData'
import { likeCommunityLink, reportCommunityLink } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useAdminDelete } from '@/hooks/useAdminDelete'
import { Avatar } from '@/components/profile/Avatar'
import { PostComments } from './PostComments'
import { useT } from '@/i18n/useT'
import type { CommunityLink } from '@/lib/types'

const HEART = ACCENT.live
const FB_BLUE = ACCENT.facebook
const LIKED_KEY = 'go_liked_clinks'

function readSet(k: string): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]') as string[]) } catch { return new Set() } }
function persistSet(k: string, s: Set<string>) { try { localStorage.setItem(k, JSON.stringify([...s])) } catch { /* */ } }

// Facebook embeds inline (plugin); TikTok (+ Data-saver) opens out — same policy as the LIVE strip.
function fbEmbed(url: string): string {
  return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden fill={filled ? HEART : 'none'} stroke={filled ? HEART : GPT_T.ink45} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const fb = platform === 'facebook'
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: fb ? FB_BLUE : '#111', borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {fb ? 'Facebook' : 'TikTok'}
    </span>
  )
}

function LinkCard({ link, liked, likes, onLike }: { link: CommunityLink; liked: boolean; likes: number; onLike: (id: string) => void }) {
  const t = useT()
  const dataSaver = useAppStore((s) => s.dataSaver)
  const qc = useQueryClient()
  const mod = useAdminDelete('community_link', link.id, () => qc.setQueryData<CommunityLink[]>(qk.communityLinks, (prev) => (prev ?? []).filter((l) => l.id !== link.id)), 'link')
  const [embed, setEmbed] = useState(false)
  const [reported, setReported] = useState(false)
  const canEmbed = link.platform === 'facebook' && !dataSaver
  // Exclusive playback: collapse this embed when the radio takes over.
  const collapseSignal = useRadio((s) => s.collapseSignal)
  useEffect(() => {
    if (collapseSignal > 0) setEmbed(false)
  }, [collapseSignal])

  function openMedia() {
    if (canEmbed) {
      useRadio.getState().videoTookOver() // video takes audio focus → pause the radio
      setEmbed(true)
    } else {
      window.open(link.url, '_blank', 'noopener')
    }
  }
  function report() {
    if (reported) return
    setReported(true)
    reportCommunityLink(link.id).then((res) => {
      if (res.hidden) qc.setQueryData<CommunityLink[]>(qk.communityLinks, (prev) => (prev ?? []).filter((l) => l.id !== link.id))
    }).catch(() => setReported(false))
  }

  return (
    <div {...mod.bind} style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, overflow: 'hidden', fontFamily: GPT_FONT, color: GPT_T.ink, ...mod.ring }}>
      {/* cover image / inline embed on tap */}
      {embed ? (
        <div style={{ position: 'relative', width: '100%', paddingTop: '120%' }}>
          <iframe title={link.caption} src={fbEmbed(link.url)} allow="encrypted-media; picture-in-picture" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
      ) : (
        <button type="button" onClick={openMedia} aria-label={t.communityLinks.openPostAria} style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: GPT_T.wash, cursor: 'pointer', position: 'relative', lineHeight: 0 }}>
          <img src={link.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
          <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>▶</span>
          </span>
          <span style={{ position: 'absolute', left: 8, top: 8 }}><PlatformBadge platform={link.platform} /></span>
        </button>
      )}

      <div style={{ padding: 12 }}>
        {/* submitter pseudonym */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {link.avatarId && <Avatar avatarId={link.avatarId} size={30} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.nickname || t.communityLinks.anonymous}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45 }}>{link.ago}</div>
          </div>
          <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: FB_BLUE, textDecoration: 'none', flexShrink: 0 }}>
            {link.platform === 'facebook' ? t.communityLinks.openFacebook : t.communityLinks.openTikTok}
          </a>
        </div>
        {link.caption && <div style={{ fontSize: 14.5, fontWeight: 600, color: GPT_T.ink, lineHeight: 1.4, marginTop: 9 }}>{link.caption}</div>}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: `1px solid ${GPT_T.line}` }}>
        <button type="button" onClick={() => onLike(link.id)} disabled={liked} aria-pressed={liked} aria-label={liked ? t.communityLinks.likedAria : t.communityLinks.likeAria}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, border: `1px solid ${liked ? HEART : GPT_T.line}`, background: liked ? 'rgba(224,36,94,0.08)' : GPT_T.paper, color: liked ? HEART : GPT_T.ink70, fontWeight: 800, fontSize: 13, fontFamily: GPT_FONT, cursor: liked ? 'default' : 'pointer', lineHeight: 1 }}>
          <Heart filled={liked} />{likes > 0 && <span>{likes}</span>}<span>{liked ? t.communityLinks.liked : t.communityLinks.like}</span>
        </button>
        <button type="button" onClick={report} disabled={reported} aria-label={t.communityLinks.reportAria}
          style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 999, border: `1px solid ${GPT_T.line}`, background: GPT_T.paper, color: reported ? GPT_T.ink45 : GPT_T.ink70, fontWeight: 700, fontSize: 12, fontFamily: GPT_FONT, cursor: reported ? 'default' : 'pointer', lineHeight: 1 }}>
          ⚐ {reported ? t.communityLinks.reported : t.communityLinks.report}
        </button>
      </div>
      <PostComments targetType="community_link" targetId={link.id} />
    </div>
  )
}

export function CommunityLinksSection({ onShare }: { onShare?: () => void }) {
  const t = useT()
  const { data: links } = useCommunityLinks()
  const qc = useQueryClient()
  const [liked, setLiked] = useState<Set<string>>(() => readSet(LIKED_KEY))

  function onLike(id: string) {
    if (liked.has(id)) return
    const next = new Set(liked); next.add(id); setLiked(next); persistSet(LIKED_KEY, next)
    qc.setQueryData<CommunityLink[]>(qk.communityLinks, (prev) => (prev ?? []).map((l) => (l.id === id ? { ...l, likes: (l.likes || 0) + 1 } : l)))
    likeCommunityLink(id).then((res) => {
      qc.setQueryData<CommunityLink[]>(qk.communityLinks, (prev) => (prev ?? []).map((l) => (l.id === id ? { ...l, likes: res.likes } : l)))
    }).catch(() => {
      const back = new Set(next); back.delete(id); setLiked(back); persistSet(LIKED_KEY, back)
      qc.setQueryData<CommunityLink[]>(qk.communityLinks, (prev) => (prev ?? []).map((l) => (l.id === id ? { ...l, likes: Math.max(0, (l.likes || 1) - 1) } : l)))
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontFamily: GPT_FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: GPT_T.ink45 }}>{t.communityLinks.sectionTitle}</div>
        {onShare && (
          <button type="button" onClick={onShare} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
            {t.communityLinks.shareButton}
          </button>
        )}
      </div>
      {!links || links.length === 0 ? (
        <div style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600, padding: '4px 2px', lineHeight: 1.5 }}>
          {t.communityLinks.empty}
        </div>
      ) : (
        links.map((l) => <LinkCard key={l.id} link={l} liked={liked.has(l.id)} likes={l.likes || 0} onLike={onLike} />)
      )}
    </div>
  )
}
