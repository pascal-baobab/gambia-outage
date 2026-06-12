// ListScreen.tsx — grouped + searchable + filterable list of macros & quarters.
// Ported from design/screens-main.jsx ListScreen. Quarters come from each macro's
// detail endpoint (the snapshot omits them), fetched with useQueries.
import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import type { Snapshot, Macro, Quarter } from '@/lib/types'
import { displayStatus, type DisplayStatus } from '@/lib/status'
import { baselineOn } from '@/lib/launch'
import { getMacro } from '@/lib/api'
import { fmtHM } from '@/lib/format'
import { StatusPill } from '@/components/StatusPill'
import { IconBtn } from '@/components/shared/IconBtn'
import { LogoMark } from '@/components/Logo'
import { SegToggle } from '@/components/shared/SegToggle'
import { ThumbDock } from '@/components/shared/ThumbDock'
import { Skeleton } from '@/components/shared/Skeleton'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'

interface SectionSummary {
  total: number
  out: number
  partial: number
  affected: number
  worst: DisplayStatus
}

function summarize(list: Quarter[]): SectionSummary {
  const b = baselineOn()
  const out = list.filter((x) => displayStatus(x, b) === 'out').length
  const partial = list.filter((x) => displayStatus(x, b) === 'partial').length
  const estimated = list.filter((x) => displayStatus(x, b) === 'estimated').length
  const on = list.filter((x) => displayStatus(x, b) === 'on').length
  // worst prefers confirmed signals, then the estimated-dark baseline, then on, then nodata.
  const worst: DisplayStatus = out ? 'out' : partial ? 'partial' : estimated ? 'estimated' : on ? 'on' : 'nodata'
  return { total: list.length, out, partial, affected: out + partial, worst }
}

function QuarterRow({ q, onOpen }: { q: Quarter; onOpen: () => void }) {
  const th = useTheme()
  const t = useT()
  const ds = displayStatus(q, baselineOn())
  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%',
        textAlign: 'start',
        background: GPT_T.paper,
        border: 'none',
        borderBottom: `1px solid ${GPT_T.line2}`,
        padding: '11px 14px 11px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        cursor: 'pointer',
        minHeight: 54,
        fontFamily: GPT_FONT,
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, background: th[ds], flexShrink: 0, boxShadow: `0 0 0 3px ${th[`${ds}Bg`]}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
        <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>{q.reports > 0 ? t.list.reportsCount(q.reports) : ds === 'estimated' ? t.list.awaitingEstimated : t.list.awaitingReports}</div>
      </div>
      <StatusPill status={ds} size="sm" />
      {/* nodata, or estimated with nothing accrued yet, ⇒ no claim ('—'). When an estimated figure
          shows, the EST. pill on the row already qualifies it — no second "est." tag. */}
      <span style={{ fontSize: 13.5, fontWeight: 800, color: ds === 'nodata' || q.mins === 0 ? GPT_T.ink25 : GPT_T.ink, fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'end' }}>
        {ds === 'nodata' || (ds === 'estimated' && q.mins === 0) ? '—' : fmtHM(q.mins)}
      </span>
      <GPTIcon name="chevron" size={16} color={GPT_T.ink25} />
    </button>
  )
}

function MacroHeader({ region, sum, expanded, onToggle }: { region: string; sum: SectionSummary; expanded: boolean; onToggle: () => void }) {
  const th = useTheme()
  const t = useT()
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        textAlign: 'start',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        background: GPT_T.wash,
        border: 'none',
        borderTop: `1px solid ${GPT_T.line}`,
        borderBottom: `1px solid ${GPT_T.line}`,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        minHeight: 56,
        fontFamily: GPT_FONT,
      }}
    >
      <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'flex', flexShrink: 0 }}>
        <GPTIcon name="chevron" size={18} color={GPT_T.ink45} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>{region}</div>
        <div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>
          {t.list.quartersOf(sum.total)} ·{' '}
          {sum.affected ? (
            <span style={{ color: th[sum.worst === 'on' || sum.worst === 'nodata' || sum.worst === 'estimated' ? 'partial' : sum.worst], fontWeight: 700 }}>{sum.affected} {t.list.affected}</span>
          ) : sum.worst === 'estimated' ? (
            <span style={{ color: th.estimatedDeep, fontWeight: 700 }}>{t.list.estimatedLabel}</span>
          ) : sum.worst === 'nodata' ? (
            <span style={{ color: th.nodataDeep, fontWeight: 700 }}>{t.list.awaitingLabel}</span>
          ) : (
            t.list.allOn
          )}
        </div>
      </div>
      <StatusPill status={sum.worst} size="sm" />
    </button>
  )
}

export function ListScreen({
  snapshot,
  onBack,
  onMap,
  onOpenQuarter,
  onReport,
}: {
  snapshot?: Snapshot
  onBack: () => void
  onMap: () => void
  onOpenQuarter: (quarterId: string) => void
  onReport: (action: 'out' | 'back') => void
}) {
  const t = useT()
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // initialise filter to the "All" label after t is available (language-aware)
  // we use a derived value so the filter always compares to the current t.list.allFilter
  const allLabel = t.list.allFilter

  const macros = snapshot?.macros ?? []
  const macroQueries = useQueries({
    queries: macros.map((m) => ({
      queryKey: ['macro', m.id],
      queryFn: () => getMacro(m.id),
      staleTime: 30_000,
    })),
  })

  const details = useMemo(() => {
    const map: Record<string, Macro> = {}
    macroQueries.forEach((res) => {
      if (res.data) map[res.data.id] = res.data
    })
    return map
  }, [macroQueries])

  const loading = macros.length > 0 && macroQueries.some((r) => r.isLoading)
  const query = q.trim().toLowerCase()
  const regionNames = macros.map((m) => m.region)
  const order = [...macros].sort((a, b) => b.sev - a.sev)

  const sections = order
    .filter((m) => !region || m.region === region)
    .map((m) => {
      const all = details[m.id]?.quarters ?? []
      let items = [...all].sort((a, b) => b.sev - a.sev)
      if (query) items = items.filter((it) => it.name.toLowerCase().includes(query) || m.region.toLowerCase().includes(query))
      return { macro: m, items }
    })
    .filter((s) => s.items.length > 0)

  const totalQ = Object.values(details).reduce((n, d) => n + d.quarters.length, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.paper }}>
      <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        {/* Notch / Dynamic Island clearance up top (shared var) — this drill-down has no AppHeader above it. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 'var(--go-safe-top)', paddingInlineEnd: 10, paddingBottom: 8, paddingInlineStart: 10 }}>
          <IconBtn icon="back" onClick={onBack} label={t.list.backButton} />
          <LogoMark size={22} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>{t.list.screenTitle}</div>
            <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600 }}>
              {t.list.quartersCountSub(totalQ, macros.length)}
            </div>
          </div>
          <SegToggle
            value="list"
            onChange={(v) => v === 'map' && onMap()}
            options={[
              { v: 'map', icon: 'map', label: t.list.mapToggle },
              { v: 'list', icon: 'list', label: t.list.listToggle },
            ]}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: GPT_T.wash, margin: '0 14px 12px', borderRadius: 12, padding: '0 12px', height: 44, border: `1px solid ${GPT_T.line}` }}>
          <GPTIcon name="search" size={18} color={GPT_T.ink45} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.list.searchPlaceholder}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: GPT_FONT, fontSize: 15, color: GPT_T.ink }}
          />
          {q && <IconBtn icon="close" onClick={() => setQ('')} size={28} label={t.profile.clear} />}
        </div>
        <div style={{ display: 'flex', gap: 7, padding: '0 14px 11px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* "All" filter chip — sentinel value is empty string */}
          <button
            key="__all__"
            onClick={() => setRegion('')}
            style={{
              flexShrink: 0,
              height: 32,
              padding: '0 13px',
              borderRadius: 999,
              cursor: 'pointer',
              border: `1.5px solid ${!region ? GPT_T.ink : GPT_T.line}`,
              background: !region ? GPT_T.ink : GPT_T.paper,
              color: !region ? '#fff' : GPT_T.ink70,
              fontFamily: GPT_FONT,
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {allLabel}
          </button>
          {regionNames.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              style={{
                flexShrink: 0,
                height: 32,
                padding: '0 13px',
                borderRadius: 999,
                cursor: 'pointer',
                border: `1.5px solid ${region === r ? GPT_T.ink : GPT_T.line}`,
                background: region === r ? GPT_T.ink : GPT_T.paper,
                color: region === r ? '#fff' : GPT_T.ink70,
                fontFamily: GPT_FONT,
                fontSize: 12.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} w="100%" h={54} r={10} />
            ))}
          </div>
        ) : sections.length ? (
          sections.map((s) => {
            const expanded = query ? true : !collapsed[s.macro.id]
            return (
              <div key={s.macro.id}>
                <MacroHeader
                  region={s.macro.region}
                  sum={summarize(details[s.macro.id]?.quarters ?? [])}
                  expanded={expanded}
                  onToggle={() => setCollapsed((c) => ({ ...c, [s.macro.id]: !c[s.macro.id] }))}
                />
                {expanded && s.items.map((it) => <QuarterRow key={it.id} q={it} onOpen={() => onOpenQuarter(it.id)} />)}
              </div>
            )
          })
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: GPT_T.ink45, fontFamily: GPT_FONT, fontSize: 14 }}>{t.list.noResults(q)}</div>
        )}
        <div style={{ height: 8 }} />
      </div>

      <ThumbDock onReport={onReport} />
    </div>
  )
}
