// DoneView — the post-submit success card of the report sheet (extracted from ReportSheet.tsx,
// behavior unchanged). Shows the accepted/queued confirmation plus the XP reward card.
import { useEffect, useMemo } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'
import { RANKS, BADGE_LABEL, type Profile } from '@/lib/xp'
import { GPTIcon } from '@/components/icons'
import { XpBar } from '@/components/profile/XpBar'

type Action = 'out' | 'back'

export function DoneView({ action, place, offline, profile, darkNeighbours, onClose }: { action: Action; place: string; offline: boolean; profile?: Profile | null; darkNeighbours: number; onClose: () => void }) {
  const th = useTheme()
  const t = useT()
  const isOut = action === 'out'
  const c = offline ? GPT_T.ink70 : action === 'out' ? th.out : th.on
  const tintBg = offline ? GPT_T.wash : action === 'out' ? th.outBg : th.onBg

  // Reward: surface the XP this report earned right here (the highest-visibility moment), not just as
  // a fleeting toast after closing. "+N" = this profile's total minus the last total we showed
  // (device-local go_last_xp); first time has no prior, so we show the rank/total without a number and
  // self-seed for next time. The server is authoritative for the amounts.
  const prevXp = useMemo(() => { try { return localStorage.getItem('go_last_xp') } catch { return null } }, [])
  useEffect(() => { if (profile) { try { localStorage.setItem('go_last_xp', String(profile.xp)) } catch { /* storage unavailable */ } } }, [profile])
  const earned = profile && prevXp != null ? Math.max(0, profile.xp - Number(prevXp)) : null
  const nextLabel = profile?.nextRank ? RANKS.find((r) => r.key === profile.nextRank)?.label ?? null : null
  const showReward = !offline && !!profile && profile.xp > 0

  return (
    <div style={{ padding: '8px 24px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 76, height: 76, borderRadius: 24, background: tintBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 16, animation: 'gptPop .4s cubic-bezier(.2,.9,.3,1.3)' }}>
        <GPTIcon name={offline ? 'clock' : 'check'} size={40} color={c} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.4 }}>
        {offline ? t.report.savedOffline : isOut ? t.report.reportedSuccess : t.report.backSuccess}
      </div>
      <div style={{ fontSize: 14.5, color: GPT_T.ink70, fontWeight: 500, marginTop: 8, lineHeight: 1.5, maxWidth: 290 }}>
        {offline ? (
          <>{t.report.offlineMessage(place)}</>
        ) : isOut ? (
          <>
            {t.report.outConfirmation(place)}
            {darkNeighbours > 1 && (
              <>
                {' '}
                <b style={{ color: c }}>{t.report.notAlone(darkNeighbours)}</b>
              </>
            )}
          </>
        ) : (
          <>{t.report.backConfirmation(place)}</>
        )}
      </div>
      {showReward && (
        <div style={{ marginTop: 18, width: '100%', borderRadius: 15, border: `1px solid ${th.partialLine}`, background: th.partialBg, padding: '13px 15px', textAlign: 'start', animation: 'gptPop .45s cubic-bezier(.2,.9,.3,1.3)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: th.partialDeep, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>
              {t.report.xpEarned(earned ?? 0)}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{profile!.rankLabel}</span>
          </div>
          <div style={{ marginTop: 9 }}>
            <XpBar xp={profile!.xp} toNext={profile!.toNext} nextLabel={nextLabel} />
          </div>
          {profile!.badges && profile!.badges.length > 0 && (
            <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile!.badges.map((b) => (
                <span key={b} style={{ fontSize: 11.5, fontWeight: 800, color: th.partialDeep, background: GPT_T.paper, border: `1px solid ${th.partialLine}`, borderRadius: 999, padding: '3px 9px' }}>
                  🏅 {BADGE_LABEL[b] ?? b}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        onClick={onClose}
        style={{ marginTop: showReward ? 14 : 22, width: '100%', minHeight: 54, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}
      >
        {t.report.done}
      </button>
    </div>
  )
}
