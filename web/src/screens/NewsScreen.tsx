// NewsScreen.tsx — the "News" tab: official / external information with a newspaper-style masthead.
// A branded masthead (logo + "Live updates from The Gambia" + today's date + flag rule), then a SLIM
// national status banner (NationalStatusBanner — not the heavy Home dashboard), then the "From Facebook"
// feed (monitored pages + curated + NAWEC). Read-only — user-generated links live in the Community tab.
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { SocialLinksSection } from '@/components/community/SocialLinksSection'
import { NationalStatusBanner } from '@/components/shared/NationalStatusBanner'
import { StatusStripConnected } from '@/components/shared/StatusStripConnected'
import { FlagRule } from '@/components/Flag'
import { useSnapshot } from '@/hooks/useData'
import { useT } from '@/i18n/useT'

const TODAY = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function NewsScreen(_props: { onToast?: (text: string) => void } = {}) {
  const snap = useSnapshot()
  const t = useT()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      {/* Slim section masthead (the global AppHeader owns the brand bar + notch clearance). */}
      <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <div style={{ padding: '9px 16px 9px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.4, color: GPT_T.ink, lineHeight: 1 }}>{t.news.title}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, color: FLAG.green, textTransform: 'uppercase' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: FLAG.green }} /> {t.news.liveBadge}
            </span>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.news.liveUpdatesSub(TODAY)}
          </div>
        </div>
        <FlagRule height={3} radius={0} style={{ width: '100%' }} />
      </div>
      {/* 7-region status strip (with last-24h counts), present on every primary tab. */}
      <StatusStripConnected />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Slim national status — the live country state in one glance, dark foregrounded. */}
        {snap.data && <NationalStatusBanner national={snap.data.national} macros={snap.data.macros} />}
        {/* From Facebook — monitored Gambian pages + curated + official NAWEC. */}
        <SocialLinksSection />
      </div>
    </div>
  )
}
