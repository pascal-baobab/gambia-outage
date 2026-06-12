import { describe, it, expect } from 'vitest'
import { sevToStatus, displayStatus, isLit, darkFraction } from './status'
import { SINGLE_REPORT_TRUTH } from './flags'

describe('sevToStatus — thresholds must match design/ds.jsx', () => {
  it('≥ 0.66 → out', () => {
    expect(sevToStatus(0.66)).toBe('out')
    expect(sevToStatus(0.95)).toBe('out')
  })
  it('0.38..0.659 → partial', () => {
    expect(sevToStatus(0.38)).toBe('partial')
    expect(sevToStatus(0.62)).toBe('partial')
    expect(sevToStatus(0.659)).toBe('partial')
  })
  it('< 0.38 → on', () => {
    expect(sevToStatus(0.379)).toBe('on')
    expect(sevToStatus(0.16)).toBe('on') // launch baseline (no open event)
    expect(sevToStatus(0)).toBe('on')
  })
  it('server bands map to the right status', () => {
    // §4.5: on=0.16, partial 0.40..0.62, out 0.66..0.95
    expect(sevToStatus(0.16)).toBe('on')
    expect(sevToStatus(0.4)).toBe('partial')
    expect(sevToStatus(0.62)).toBe('partial')
    expect(sevToStatus(0.66)).toBe('out')
    expect(sevToStatus(0.9)).toBe('out')
  })
})

describe('displayStatus — evidence gate (launch P0)', () => {
  it('zero reports ⇒ nodata, regardless of status/sev (no false POWER ON)', () => {
    expect(displayStatus({ reports: 0, status: 'on', sev: 0.16 })).toBe('nodata')
    expect(displayStatus({ reports: 0, sev: 0.16 })).toBe('nodata')
    expect(displayStatus({ reports: 0 })).toBe('nodata')
    // even a stray sev in the out-band makes no claim without a report behind it
    expect(displayStatus({ reports: 0, sev: 0.9 })).toBe('nodata')
  })
  it('reports present ⇒ trust the server-derived status first', () => {
    expect(displayStatus({ reports: 1, status: 'on', sev: 0.16 })).toBe('on')
    expect(displayStatus({ reports: 5, status: 'partial', sev: 0.5 })).toBe('partial')
    expect(displayStatus({ reports: 12, status: 'out', sev: 0.8 })).toBe('out')
  })
  it('reports present but status absent ⇒ fall back to sev-banding', () => {
    expect(displayStatus({ reports: 3, sev: 0.7 })).toBe('out')
    expect(displayStatus({ reports: 3, sev: 0.5 })).toBe('partial')
    expect(displayStatus({ reports: 3, sev: 0.16 })).toBe('on')
    expect(displayStatus({ reports: 3 })).toBe('on') // sev defaults to 0 → on
  })
  it('launch baseline: zero reports ⇒ estimated (not nodata); reports still win', () => {
    expect(displayStatus({ reports: 0, status: 'on', sev: 0.16 }, true)).toBe('estimated')
    expect(displayStatus({ reports: 0 }, true)).toBe('estimated')
    // a single real report overrides the estimate with the real status
    expect(displayStatus({ reports: 1, status: 'on', sev: 0.16 }, true)).toBe('on')
    expect(displayStatus({ reports: 5, status: 'out', sev: 0.8 }, true)).toBe('out')
    // baseline off ⇒ unchanged nodata behaviour
    expect(displayStatus({ reports: 0 }, false)).toBe('nodata')
  })
})

describe('isLit — binary lit/dark for the simplified strip + bars', () => {
  it('only "on" is lit', () => {
    expect(isLit('on')).toBe(true)
  })
  it('every dark/under-confirmed/estimated/no-data state collapses to DARK', () => {
    expect(isLit('out')).toBe(false)
    expect(isLit('partial')).toBe(false)
    expect(isLit('estimated')).toBe(false)
    expect(isLit('nodata')).toBe(false)
  })
})

describe('darkFraction — bars must be REALLY proportional to today\'s darkness', () => {
  it('maps minutes to a 0..1 share of a 24h day', () => {
    expect(darkFraction(0)).toBe(0)
    expect(darkFraction(720)).toBeCloseTo(0.5) // the 12h baseline = exactly half the bar
    expect(darkFraction(360)).toBeCloseTo(0.25)
    expect(darkFraction(1440)).toBe(1)
  })
  it('clamps a too-large value to 1, and treats non-finite/negative junk as 0 (no overflowing or negative bars)', () => {
    expect(darkFraction(2000)).toBe(1)
    expect(darkFraction(-50)).toBe(0)
    expect(darkFraction(Number.NaN)).toBe(0)
    expect(darkFraction(Infinity)).toBe(0) // non-finite ⇒ junk ⇒ 0, same as NaN
  })
})

describe('displayStatus — one-report-true (latest signal)', () => {
  it('1 OUT report (under threshold) reads DARK = out, not partial', () => {
    // server may still send status:"partial" while confirms < 8; with the flag a fresh OUT shows out
    expect(displayStatus({ reports: 1, status: 'partial', sev: 0.5, lastSignal: 'out' })).toBe('out')
  })
  it('1 BACK report re-lights even while the event is still open', () => {
    expect(displayStatus({ reports: 3, status: 'partial', sev: 0.5, lastSignal: 'back' })).toBe('on')
  })
  it('an OPEN event wins over the zero-report gate: a blackout carried from last night reads DARK', () => {
    // reports===0 is *today*'s counter; an open event with no "back" yet is still dark → 'out', not grey
    expect(displayStatus({ reports: 0, status: 'partial', sev: 0.4, lastSignal: 'out' })).toBe('out')
    // a "power back" on the open event re-lights it even with no fresh report today
    expect(displayStatus({ reports: 0, lastSignal: 'back' })).toBe('on')
  })
  it('zero reports AND no open event ⇒ nodata (evidence gate preserved for no-evidence zones)', () => {
    expect(displayStatus({ reports: 0, status: 'on', sev: 0.16 })).toBe('nodata')
    expect(displayStatus({ reports: 0 })).toBe('nodata')
    expect(displayStatus({ reports: 0, lastSignal: null })).toBe('nodata')
  })
  it('no lastSignal ⇒ unchanged server-status path (backward compatible)', () => {
    expect(displayStatus({ reports: 5, status: 'partial', sev: 0.5 })).toBe('partial')
    expect(displayStatus({ reports: 5, status: 'partial', sev: 0.5, lastSignal: null })).toBe('partial')
  })
  it('respects the flag: when off, a fresh OUT falls back to the server status', () => {
    // documents intent: if the constant is later flipped off, the threshold semantics return
    if (!SINGLE_REPORT_TRUTH)
      expect(displayStatus({ reports: 1, status: 'partial', sev: 0.5, lastSignal: 'out' })).toBe('partial')
    else expect(SINGLE_REPORT_TRUTH).toBe(true)
  })
})

describe('displayStatus — stale auto-close gate (2026-06-12)', () => {
  it('a timed-out (auto-closed) outage NEVER renders a lit bulb — the false-ON fix', () => {
    // server derives status 'on' (no open event) with reports>0 today; pre-fix this lit the
    // whole zone at the 6h idle timeout while the power was still out
    expect(displayStatus({ reports: 5, status: 'on', sev: 0.16, staleClose: true })).toBe('nodata')
    expect(isLit(displayStatus({ reports: 5, status: 'on', sev: 0.16, staleClose: true }))).toBe(false)
  })
  it('live open-event evidence still wins over the stale flag', () => {
    expect(displayStatus({ reports: 2, status: 'out', sev: 0.8, lastSignal: 'out', staleClose: true })).toBe('out')
  })
  it('a community-confirmed restore stays lit (staleClose false from closureInfo)', () => {
    expect(displayStatus({ reports: 4, status: 'on', sev: 0.16, staleClose: false })).toBe('on')
  })
  it('stale gate precedes the zero-report gate but never invents an estimate', () => {
    // a stale zone under the launch baseline reads 'nodata' (we know an outage timed out
    // unresolved — that is MORE information than the generic load-shedding estimate)
    expect(displayStatus({ reports: 3, status: 'on', sev: 0.16, staleClose: true }, true)).toBe('nodata')
  })
})
