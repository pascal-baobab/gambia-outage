// OutageTimeline.tsx — the national hero centerpiece. Reads top-down in plain language:
//   1. a big "10h 34m  in the dark today"
//   2. a words subtitle "country-wide average · all 7 regions hit"
//   3. a 24-hour band (00→24): each hour's RED height = the real share of regions in the dark that
//      hour, GREEN above = the share with power; the current hour is outlined, future hours ghosted
//   4. a one-line caption + legend so the bars are self-explanatory
// No internal jargon ("est. floor", "peak 00:00") on screen. Pure presentation; data is national.hourly
// (server-derived; value = fraction of regions dark, future = -1). Falls back to the number if hourly
// is absent (legacy cached snapshot rows).
import { GPT_T } from '@/lib/tokens'
import type { StatusTheme } from '@/lib/tokens'
import type { National } from '@/lib/types'

/** "country-wide average · all 7 regions hit" / "… · 3 of 7 regions hit". */
function regionsHit(out: number, total: number): string {
  return out >= total ? `country-wide average · all ${total} regions hit` : `country-wide average · ${out} of ${total} regions hit`
}

export function OutageTimeline({
  national,
  th,
  estimated,
  t = 1,
}: {
  national: National
  th: StatusTheme
  estimated: boolean
  t?: number
}) {
  const hourly = national.hourly
  const hours = national.hours
  const mins = national.mins
  const bigNumber = (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
      <span style={{ fontSize: 40 * t, fontWeight: 800, letterSpacing: -1.6, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>
        {hours}h {String(mins).padStart(2, '0')}m
      </span>
      <span style={{ fontSize: 13 * t, fontWeight: 700, color: GPT_T.panelInk60 }}>in the dark today</span>
      {estimated && <span style={{ fontSize: 10 * t, fontWeight: 700, color: GPT_T.panelInk60, letterSpacing: 0.3 }}>est.</span>}
    </div>
  )

  // Fallback: no hourly data (old cached row) → number + subtitle only.
  if (!hourly || hourly.length !== 24) {
    return (
      <div style={{ marginTop: 4 }}>
        {bigNumber}
        <div style={{ fontSize: 11.5 * t, fontWeight: 600, color: GPT_T.panelInk60, marginTop: 4 }}>{regionsHit(national.regionsOut, national.regionsTotal)}</div>
      </div>
    )
  }

  const nowHour = hourly.findIndex((v) => v < 0) // first future bucket; -1 if all past (end of day)
  const nowIdx = nowHour < 0 ? 23 : Math.max(0, nowHour - 1)

  return (
    <div style={{ marginTop: 4 }}>
      {bigNumber}
      <div style={{ fontSize: 11.5 * t, fontWeight: 600, color: GPT_T.panelInk60, marginTop: 4, marginBottom: 8 }}>
        {regionsHit(national.regionsOut, national.regionsTotal)}
      </div>

      {/* bars — each hour a full-height stacked split: green (power) over red (dark) */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 1.5, height: 40 * t }}>
        {hourly.map((frac, h) => {
          const isFuture = frac < 0
          const darkPct = isFuture ? 0 : Math.min(1, frac) * 100 // red share (regions in the dark)
          const onCount = isFuture ? 0 : national.regionsTotal - Math.round(frac * national.regionsTotal)
          return (
            <div
              key={h}
              title={isFuture ? `${String(h).padStart(2, '0')}:00 — not yet` : `${String(h).padStart(2, '0')}:00 — ${onCount}/${national.regionsTotal} regions with power`}
              style={{
                flex: 1,
                height: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: isFuture ? '#1B2531' : th.on,
                outline: h === nowIdx && nowHour >= 0 ? `1.5px solid ${GPT_T.panelInk}` : 'none',
                outlineOffset: 0,
                opacity: isFuture ? 0.5 : 1,
              }}
            >
              {!isFuture && (
                <>
                  <div style={{ height: `${100 - darkPct}%`, background: th.on, transition: 'height .4s' }} />
                  <div style={{ height: `${darkPct}%`, background: th.out, transition: 'height .4s' }} />
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* caption + legend — make the bars self-explanatory in plain words */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 5, fontSize: 9.5 * t, color: GPT_T.panelInk60, fontWeight: 700, flexWrap: 'wrap' }}>
        <span>regions in the dark, hour by hour</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: th.on }} /> power
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: th.out }} /> in the dark
          </span>
        </span>
      </div>

      {/* hour ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9 * t, color: GPT_T.panelInk60, fontWeight: 700, letterSpacing: 0.3 }}>
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  )
}
