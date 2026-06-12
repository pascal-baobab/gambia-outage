// HonorsScreen.tsx — the "Wall of Honor" board, moved off the Community tab (which is now pure UGC)
// to its own screen, reached from a compact teaser on Home. Two weekly boards: Hours in the Dark
// (accountability, primary) + Civic Voice (participation). Pride is QUARTER-level only (rl_key rotates
// daily → no person is ever tracked). Framing is civic-proud-but-sober.
import { useEffect, useMemo, useRef, useState } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { IconBtn } from '@/components/shared/IconBtn'
import { LogoMark } from '@/components/Logo'
import { SegToggle } from '@/components/shared/SegToggle'
import { Skeleton } from '@/components/shared/Skeleton'
import { HoursBoard } from '@/components/community/HoursBoard'
import { VoiceBoard } from '@/components/community/VoiceBoard'
import { BadgeRow } from '@/components/community/BadgeRow'
import { HonorCard } from '@/components/community/HonorCard'
import { CommunityFeed } from '@/components/CommunityFeed'
import { useCommunity, useAmbassadors } from '@/hooks/useData'
import { Avatar } from '@/components/profile/Avatar'
import { useMyArea } from '@/hooks/useMyArea'
import { getContribution } from '@/lib/contrib'
import { useT } from '@/i18n/useT'
import type { HoursRow, VoiceRow, Badge, NoteItem } from '@/lib/types'
import type { HonorCardData } from '@/lib/honorCard'

interface BoardVM {
  illustrative: boolean
  national: { darkMinutes: number; activeQuarters: number; watchDays?: number }
  hours: HoursRow[]
  voice: VoiceRow[]
  badges: Badge[]
  feed?: NoteItem[]
  ranksVisible: boolean
}

export function HonorsScreen({ onBack, onOpenZone, onToast }: { onBack: () => void; onOpenZone: (regionId: string) => void; onToast?: (text: string) => void }) {
  const t = useT()
  const th = useTheme()
  const [tab, setTab] = useState<'hours' | 'voice'>('hours')
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { scrollRef.current?.scrollTo(0, 0) }, [tab])
  const [shareOpen, setShareOpen] = useState(false)

  const live = useCommunity()
  const { myArea } = useMyArea()
  const contrib = getContribution()
  const yourZoneId = myArea?.kind === 'quarter' ? myArea.id : undefined

  const vm: BoardVM | null = useMemo(() => {
    const d = live.data
    if (!d) return null
    return { illustrative: false, national: d.national, hours: d.hours, voice: d.voice, badges: d.badges ?? [], feed: d.feed, ranksVisible: d.ranksVisible }
  }, [live.data])

  const loading = live.isLoading
  const { data: ambassadors = [] } = useAmbassadors()
  const yourDark = vm?.hours.find((r) => r.zoneId === yourZoneId)
  const yourVoice = vm?.voice.find((r) => r.zoneId === yourZoneId)
  const honorData: HonorCardData | null = vm ? { illustrative: vm.illustrative, national: vm.national, hours: vm.hours } : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: 'var(--go-safe-top)', paddingInlineEnd: 12, paddingBottom: 10, paddingInlineStart: 12, background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label="Back" />
        <LogoMark size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>Wall of Honor</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>What our neighbourhoods documented together</div>
        </div>
        {vm && vm.hours.length > 0 && <IconBtn icon="share" onClick={() => setShareOpen(true)} label="Share the Wall of Honor" />}
      </div>

      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton w="100%" h={92} r={16} />
            {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} w="100%" h={62} r={13} />))}
          </div>
        ) : !vm ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13.5, color: GPT_T.ink45, fontWeight: 600 }}>{t.community.emptyBoard}</div>
        ) : (
          <>
            {(yourDark || yourVoice || contrib.count > 0) && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(yourDark || yourVoice) && (
                  <div style={{ flex: 1, minWidth: 150, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: GPT_T.ink45, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.community.yourArea}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: GPT_T.ink, marginTop: 2 }}>{yourDark?.name ?? yourVoice?.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 12, fontWeight: 700 }}>
                      {yourDark && <span style={{ color: th.out }}>{t.community.yourRankDark(yourDark.rankDark)}</span>}
                      {yourVoice && <span style={{ color: th.onDeep }}>{t.community.yourRankVoice(yourVoice.rankVoice)}</span>}
                    </div>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 150, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: contrib.count > 0 ? GPT_T.ink : GPT_T.ink45, lineHeight: 1.35 }}>
                    {contrib.count > 0 ? t.community.contrib(contrib.count) : t.community.contribZero}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SegToggle
                value={tab}
                onChange={(v) => setTab(v as 'hours' | 'voice')}
                options={[
                  { v: 'hours', icon: 'out', label: t.community.tabHours },
                  { v: 'voice', icon: 'shield', label: t.community.tabVoice },
                ]}
              />
            </div>
            <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, lineHeight: 1.45, marginTop: -4 }}>
              {tab === 'hours' ? t.community.hoursLead : t.community.voiceLead}
            </div>

            {!vm.ranksVisible && (
              <div style={{ background: th.nodataBg, border: `1px solid ${th.nodataLine}`, borderRadius: 12, padding: '11px 13px', fontSize: 12.5, fontWeight: 600, color: th.nodataDeep, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <GPTIcon name="nodata" size={16} color={th.nodataDeep} />
                <span>{t.community.coldStart}</span>
              </div>
            )}

            {tab === 'hours'
              ? <HoursBoard rows={vm.hours} yourZoneId={yourZoneId} onOpenZone={onOpenZone} />
              : <VoiceBoard rows={vm.voice} yourZoneId={yourZoneId} onOpenZone={onOpenZone} />}

            <BadgeRow badges={vm.badges} />

            {vm.hours.length > 0 && (
              <button
                onClick={() => setShareOpen(true)}
                style={{ width: '100%', minHeight: 52, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
              >
                <GPTIcon name="share" size={20} color="#fff" /> {t.community.share}
              </button>
            )}

            {vm.feed && vm.feed.length > 0 && (
              <CommunityFeed notes={vm.feed} inset={0} title={t.zone.communityFeedTitle} />
            )}

            {ambassadors.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 20, borderTop: `1px solid ${GPT_T.line}` }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
                  {t.ambassador.wallTitle}
                </div>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
                  {ambassadors.map((a) => (
                    <div key={a.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Avatar avatarId={a.avatarId || ''} size={40} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: GPT_T.ink70, maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.name ?? t.ambassador.anonymous}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {shareOpen && honorData && <HonorCard data={honorData} onClose={() => setShareOpen(false)} onToast={(t) => onToast?.(t)} />}
    </div>
  )
}
