// MyReportsCard.tsx — DEVICE-LOCAL list of zones THIS device reported, with live status + resolve
// actions. The list itself (lib/myReports) is localStorage-only and NEVER sent to the server; this
// card only reads the PUBLIC national snapshot to show each zone's live status. Reporting "back" goes
// through the normal anonymous report pipeline (no identity attached).
import { useMemo, useState } from 'react'
import { createReport, ReportError, type ReportInput } from '@/lib/api'
import { useSnapshot } from '@/hooks/useData'
import { listMyReports, removeMyReport, addMyReport, type MyReport } from '@/lib/myReports'
import { claimNonce } from '@/lib/account'
import { enqueueClaim, flushClaims } from '@/lib/claims'
import { setProfile } from '@/lib/profileStore'
import { displayStatus, type DisplayStatus } from '@/lib/status'
import type { QuarterPin } from '@/lib/types'
import { StatusPill } from '@/components/StatusPill'
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import type { Strings } from '@/i18n/en'

/** "just now" / "12m ago" / "3h ago" / "2d ago" — computed at render, never at import time. */
function relTime(at: number, t: Strings['myReports']): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 45) return t.justNow
  const m = Math.round(s / 60)
  if (m < 60) return t.minutesAgo(m)
  const h = Math.round(m / 60)
  if (h < 24) return t.hoursAgo(h)
  const d = Math.round(h / 24)
  return t.daysAgo(d)
}

type RowState = { busy: boolean; note: string | null }

export function MyReportsCard() {
  const t = useT()
  const [reports, setReports] = useState<MyReport[]>(() => [...listMyReports()].reverse())
  // Live zone status comes from the SHARED snapshot cache (useSnapshot) — no extra fetch, and it's
  // already warm from Home, so this card shows status instantly. `resolved` overlays an optimistic
  // "back" so a zone the user just cleared drops to "Resolved ✓" before the next snapshot refetch.
  const { data: snap } = useSnapshot()
  const quarters = useMemo(() => {
    if (!snap) return null
    const map = new Map<string, QuarterPin>()
    for (const q of snap.quarters ?? []) map.set(q.id, q)
    return map
  }, [snap])
  const [resolved, setResolved] = useState<Set<string>>(() => new Set())
  const [rowState, setRowState] = useState<Record<string, RowState>>({})

  if (reports.length === 0) {
    return (
      <div style={{ marginTop: 22 }}>
        <Heading t={t} />
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: GPT_T.ink70 }}>
          {t.myReports.empty}
        </p>
      </div>
    )
  }

  function dropRow(zoneId: string) {
    removeMyReport(zoneId)
    setReports((prev) => prev.filter((r) => r.zoneId !== zoneId))
  }

  async function reportBack(r: MyReport) {
    setRowState((s) => ({ ...s, [r.zoneId]: { busy: true, note: null } }))
    try {
      const nonce = claimNonce()
      const input: ReportInput = { type: 'back', zone: r.zoneId, source: 'manual', claim_nonce: nonce }
      await createReport(input)
      enqueueClaim(nonce)
      addMyReport({ zoneId: r.zoneId, name: r.name, region: r.region, type: 'back', at: Date.now() })
      flushClaims().then((p) => { if (p) setProfile(p) }).catch(() => { /* best-effort */ })
      // optimistically mark this zone resolved + flip the local row to a 'back' record
      setResolved((prev) => new Set(prev).add(r.zoneId))
      setReports((prev) =>
        prev.map((x) => (x.zoneId === r.zoneId ? { ...x, type: 'back', at: Date.now() } : x)),
      )
      setRowState((s) => ({ ...s, [r.zoneId]: { busy: false, note: t.myReports.backSuccessNote } }))
    } catch (err) {
      const soft = err instanceof ReportError ? t.myReports.duplicateError : t.myReports.sendError
      setRowState((s) => ({ ...s, [r.zoneId]: { busy: false, note: soft } }))
    }
  }

  return (
    <div style={{ marginTop: 22 }}>
      <Heading t={t} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reports.map((r) => {
          const q = quarters?.get(r.zoneId)
          const open = !!q && !resolved.has(r.zoneId)
          const ds: DisplayStatus = q ? displayStatus({ reports: q.reports, status: q.status, sev: q.sev, lastSignal: q.lastSignal, staleClose: q.staleClose }) : 'on'
          const canBack = open && r.type === 'out'
          const st = rowState[r.zoneId] ?? { busy: false, note: null }
          return (
            <div
              key={r.zoneId}
              style={{
                background: GPT_T.paper,
                border: `1px solid ${GPT_T.line}`,
                borderRadius: 12,
                padding: '11px 12px',
                fontFamily: GPT_FONT,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 12, color: GPT_T.ink70, marginTop: 1 }}>{r.region}</div>
                </div>
                {open ? (
                  <StatusPill status={ds} size="sm" />
                ) : (
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink70, whiteSpace: 'nowrap' }}>
                    {t.myReports.resolved}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: GPT_T.ink70, marginTop: 7 }}>
                {r.type === 'out' ? t.myReports.outageReported(relTime(r.at, t.myReports)) : t.myReports.backReported(relTime(r.at, t.myReports))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                {canBack && (
                  <button
                    onClick={() => reportBack(r)}
                    disabled={st.busy}
                    style={{
                      ...btn,
                      background: st.busy ? GPT_T.wash : FLAG.green,
                      color: st.busy ? GPT_T.ink70 : '#fff',
                      borderColor: st.busy ? GPT_T.line : FLAG.green,
                      cursor: st.busy ? 'default' : 'pointer',
                    }}
                  >
                    {st.busy ? t.myReports.sending : t.myReports.powerBack}
                  </button>
                )}
                <button
                  onClick={() => dropRow(r.zoneId)}
                  style={{ ...btn, background: GPT_T.paper, color: GPT_T.ink70, borderColor: GPT_T.line, cursor: 'pointer' }}
                >
                  {t.myReports.moveOn}
                </button>
                {st.note && (
                  <span style={{ fontSize: 12, color: GPT_T.ink70, marginInlineStart: 'auto' }}>{st.note}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  border: '1.5px solid',
  borderRadius: 999,
  padding: '6px 13px',
  fontFamily: GPT_FONT,
  fontWeight: 700,
  fontSize: 13,
  lineHeight: 1,
}

function Heading({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: GPT_T.ink70, marginBottom: 10 }}>
      {t.myReports.sectionTitle}
    </div>
  )
}
