// LeaderboardScreen.tsx — full-screen Zone Leaderboard (lazy chunk, no AppHeader/BottomNav, same
// shell discipline as PhotoCrushScreen). Renders the live current-week ranked board of Photo-Crush
// scores by neighbourhood.
//
// Design contract: .planning/phases/06-zone-leaderboard/06-UI-SPEC.md (approved) + design/leaderboard.jsx.
//   • Tokens ONLY from lib/tokens.ts; the sole permitted raw hex is '#fff' on ink/blue fills (D-05).
//   • FLAG.blue is reserved EXCLUSIVELY for the current user's own row (tint + border + "· You" tag).
//     The Submit CTA + View link live on the Photo-Crush game-over card (UI-SPEC Deviation 2), NOT here.
//   • Real Avatar component per row (avatarId → baked DiceBear), never a letter-circle (Deviation 1).
//   • paper2 used directly for the week banner (Deviation 4). Empty/error/loading states (Deviation 3).
//   • RTL (AR): direction rtl; rank/avatar/name flow mirrors; score aligns inline-end; "· You" uses
//     marginInlineStart (logical props, never hard left/right).
//
// Anonymity (P0, invariant #4): a LeaderboardRow carries pseudonym + score ONLY — no zone/week/report/
// event/rl/ip linkage. Every row is moderator-deletable day one (modType="leaderboard"; D-06 / LEAD-02).
import { useState, useEffect, useRef } from 'react'
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import { GPTIcon } from '@/components/icons'
import { Avatar } from '@/components/profile/Avatar'
import { useLeaderboard } from '@/hooks/useData'
import { useAdminDelete } from '@/hooks/useAdminDelete'
import { isoWeekId } from '@/lib/week'
import { REGION_ORDER } from '@/lib/regionOrder'
import { getAccountId } from '@/lib/account'
import { getIdentity } from '@/lib/identity'
import type { LeaderboardRow } from '@/lib/types'

// Token-derived translucent FLAG.blue (never a raw hex) — the sketch's rgba() helper, kept tokens-only.
function blueA(a: number): string {
  const n = parseInt(FLAG.blue.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// rank 1 = gold, rank 2 = ink45, rank 3 = amber — the rank NUMBER color only (not a fill). UI-SPEC Color.
function medal(rank: number): string | null {
  if (rank === 1) return ACCENT.star
  if (rank === 2) return GPT_T.ink45
  if (rank === 3) return ACCENT.amber
  return null
}

// Time until the current ISO week rolls over (next Monday 00:00 UTC — Banjul is UTC+0, no DST). Mirrors
// the server's weekly freeze boundary that isoWeekId encodes. Returns a compact "Nd Nh" string.
function resetsCountdown(): string {
  const now = new Date()
  const dayNum = (now.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  nextMonday.setUTCDate(nextMonday.getUTCDate() + (7 - dayNum))
  const ms = Math.max(0, nextMonday.getTime() - now.getTime())
  const totalH = Math.floor(ms / 3_600_000)
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  return `${d}d ${h}h`
}

// ── one ranked row (mirrors HoursRow in design/screen-honors.jsx) ──
function Row({ row, rank, you, rtl, onModDeleted }: {
  row: LeaderboardRow
  rank: number
  you: boolean
  rtl: boolean
  onModDeleted: () => void
}) {
  const t = useT()
  const m = medal(rank)
  // Per-row moderator hard-delete (D-06 / LEAD-02). English label only — never the StoryCard 'messaggio'.
  const mod = useAdminDelete('leaderboard', row.id, onModDeleted, 'score')
  return (
    <div
      {...mod.bind}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 12px',
        background: you ? blueA(0.08) : GPT_T.paper,
        border: `1px solid ${you ? blueA(0.35) : GPT_T.line}`,
        borderRadius: 14,
        marginBottom: 8,
        ...mod.ring,
      }}
    >
      <div
        style={{
          width: 26,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 800,
          color: m || GPT_T.ink45,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        {String(rank).padStart(2, '0')}
      </div>
      <Avatar avatarId={row.avatarId} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: GPT_T.ink,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {row.nickname}
          {you && (
            <span style={{ marginInlineStart: 6, fontSize: 10.5, fontWeight: 800, color: FLAG.blue }}>
              · {t.leaderboard.you}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{row.ago}</div>
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: GPT_T.ink,
          fontVariantNumeric: 'tabular-nums',
          textAlign: rtl ? 'left' : 'right',
          flexShrink: 0,
        }}
      >
        {row.score.toLocaleString()}
      </div>
    </div>
  )
}

export function LeaderboardScreen({ onBack }: { onBack?: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'
  const week = isoWeekId(new Date())
  const [zone, setZone] = useState('') // '' = All zones (server aggregates every zone)
  const [deleted, setDeleted] = useState<Set<string>>(() => new Set())
  // A leaderboard row carries NO account_id (P0 invariant #4 — never linkable). The "you" highlight
  // therefore matches on the device's own pseudonym + avatar (exactly what this device submitted),
  // which leaks no new identity: the pseudonym is already public on the row.
  const me = useRef<{ nickname: string; avatarId: string } | null>(null)
  useEffect(() => {
    getAccountId()
      .then((id) => { const i = getIdentity(id); me.current = { nickname: (i.nickname ?? '').trim(), avatarId: i.avatarId } })
      .catch(() => {})
  }, [])

  const q = useLeaderboard(zone, week)
  const rows = (q.data?.rows ?? []).filter((r) => !deleted.has(r.id))
  const countdown = resetsCountdown()

  // Chips: "All zones" (default) + the 7 macro regions in geographic order (the app-wide zone grouping).
  // Each chip's value is the real zone id the backend filters on ('' for All).
  const chips: { id: string; label: string }[] = [
    { id: '', label: t.leaderboard.allZones },
    ...REGION_ORDER.map((r) => ({ id: r.id, label: r.label })),
  ]

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: GPT_T.wash,
        fontFamily: GPT_FONT,
        direction: rtl ? 'rtl' : 'ltr',
      }}
    >
      {/* TopBar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: GPT_T.paper,
          borderBottom: `1px solid ${GPT_T.line}`,
          flexShrink: 0,
        }}
      >
        <button
          aria-label="Back"
          onClick={onBack}
          style={{
            width: 38,
            height: 38,
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: 11,
            transform: rtl ? 'scaleX(-1)' : undefined,
          }}
        >
          <GPTIcon name="back" size={23} color={GPT_T.ink70} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.leaderboard.title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.leaderboard.sub}</div>
        </div>
        <GPTIcon name="on" size={20} color={ACCENT.star} />
      </div>

      {/* Week banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: GPT_T.paper2,
          borderBottom: `1px solid ${GPT_T.line}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink70, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t.leaderboard.thisWeek}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.leaderboard.resetsIn(countdown)}</span>
      </div>

      {/* Zone filter chips */}
      <div
        style={{
          display: 'flex',
          gap: 7,
          overflowX: 'auto',
          padding: '10px 12px',
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {chips.map((c) => {
          const on = zone === c.id
          return (
            <button
              key={c.id || 'all'}
              onClick={() => setZone(c.id)}
              style={{
                flexShrink: 0,
                padding: '7px 13px',
                borderRadius: 999,
                border: `1.5px solid ${on ? GPT_T.ink : GPT_T.line}`,
                background: on ? GPT_T.ink : GPT_T.paper,
                color: on ? '#fff' : GPT_T.ink70,
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '4px 12px 16px' }}>
        {q.isError ? (
          <div style={{ textAlign: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: '32px 16px' }}>
            {t.leaderboard.error}
          </div>
        ) : q.isLoading ? (
          <div style={{ textAlign: 'center', color: GPT_T.ink25, fontSize: 13, fontWeight: 600, padding: '32px 16px' }}>
            …
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: GPT_T.ink45, fontSize: 13, fontWeight: 600, padding: '32px 16px' }}>
            {t.leaderboard.empty}
          </div>
        ) : (
          rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              rank={row.rank ?? 0}
              you={!!me.current && !!me.current.nickname && row.nickname === me.current.nickname && row.avatarId === me.current.avatarId}
              rtl={rtl}
              onModDeleted={() => setDeleted((prev) => new Set(prev).add(row.id))}
            />
          ))
        )}
      </div>
    </div>
  )
}
