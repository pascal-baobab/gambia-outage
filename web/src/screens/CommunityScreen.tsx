// CommunityScreen.tsx — the "Community" tab: the participation / user-generated layer. Live streams,
// a link into the News tab, citizen-submitted links ("Dai cittadini"), and Community Stories (text
// posts under the device pseudonym, never linked to reports). The Wall of Honor boards moved to their
// own screen (reached from Home); the official "From Facebook" feed lives in the News tab.
import { useState } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { GPTIcon } from '@/components/icons'
import { StoriesSection } from '@/components/community/StoriesSection'
import { PeopleSection } from '@/components/community/PeopleSection'
import { CommunityLinksSection } from '@/components/community/CommunityLinksSection'
import { ShareLinkComposer } from '@/components/community/ShareLinkComposer'
import { LiveStrip } from '@/components/community/LiveStrip'
import { navigate } from '@/hooks/useHashRoute'
import { StatusStripConnected } from '@/components/shared/StatusStripConnected'
import { FlagRule } from '@/components/Flag'
import { useT } from '@/i18n/useT'

export function CommunityScreen({ onOpenZone, onToast }: { onOpenZone: (regionId: string) => void; onToast?: (text: string) => void }) {
  const t = useT()
  const [linkComposer, setLinkComposer] = useState(false)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      {/* Slim section header (the global AppHeader owns the brand bar + notch clearance). */}
      <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <div style={{ padding: '12px 16px 10px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>{t.community.title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.community.sub}</div>
        </div>
        <FlagRule height={3} radius={0} style={{ width: '100%' }} />
      </div>
      {/* 7-region status strip, under the header (present on every primary tab). */}
      <StatusStripConnected />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* LIVE now — owner-curated live streams (embed or link-out), shown only while active. */}
        <LiveStrip />

        {/* Latest news → the official feed lives in the News tab; Community links straight to it. */}
        <button
          onClick={() => navigate({ name: 'news' })}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', fontFamily: GPT_FONT }}
        >
          <GPTIcon name="list" size={20} color={GPT_T.ink45} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>Latest news</span>
            <span style={{ display: 'block', fontSize: 12, color: GPT_T.ink45, fontWeight: 600 }}>Official updates &amp; From Facebook</span>
          </span>
          <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
        </button>

        {/* People nearby — opt-in neighbour directory + lightweight "wave" contact requests. */}
        <PeopleSection onToast={onToast} />

        {/* From the community — user-submitted FB/TikTok links ("Dai cittadini"). */}
        <CommunityLinksSection onShare={() => setLinkComposer(true)} />

        {/* Community Stories — text posts under the device pseudonym (never linked to reports). */}
        <StoriesSection onOpenZone={onOpenZone} onToast={onToast} />
      </div>

      {linkComposer && <ShareLinkComposer onClose={() => setLinkComposer(false)} onToast={(t) => onToast?.(t)} />}
    </div>
  )
}
