// CalculatorScreen.test.ts — Unit tests for the calculator arithmetic engine.
// Tests fmt() and compute() exported from CalculatorScreen for testability.
// Canonical immediate-execution check: 5+3×2=16, 8/0→'Error' (CALC-01).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fmt,
  compute,
  simulateSequence,
  haptic,
  reduce,
  initialCalcState,
  type CalcAction,
} from './CalculatorScreen'
import { useCalcStore } from '@/app/calcStore'

describe('fmt — float formatting (kill dust, cap length)', () => {
  it('returns "0" for zero', () => {
    expect(fmt(0)).toBe('0')
  })

  it('returns "Error" for Infinity', () => {
    expect(fmt(Infinity)).toBe('Error')
  })

  it('returns "Error" for -Infinity', () => {
    expect(fmt(-Infinity)).toBe('Error')
  })

  it('returns "Error" for NaN (divide-by-zero guard)', () => {
    expect(fmt(NaN)).toBe('Error')
  })

  it('rounds float dust — 0.1+0.2 should show "0.3"', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })

  it('handles negative numbers', () => {
    expect(fmt(-5)).toBe('-5')
  })

  it('handles plain integers', () => {
    expect(fmt(42)).toBe('42')
  })

  it('renders a large 12-digit integer as a plain integer, not scientific notation (WR-01)', () => {
    // 123456789012 * 1e10 overflows 2^53 and used to corrupt the value into
    // "1.234567890e+11" — the dust-removal step must be skipped here.
    expect(fmt(123456789012)).toBe('123456789012')
  })

  it('renders 999999 × 999999 as a plain integer (WR-01)', () => {
    expect(fmt(999999 * 999999)).toBe('999998000001')
  })

  it('still switches to scientific notation for genuinely large magnitudes', () => {
    expect(fmt(1e13)).toBe('1.000000e+13')
  })
})

describe('compute — arithmetic engine', () => {
  it('adds two numbers', () => {
    expect(compute(5, 3, '+')).toBe(8)
  })

  it('subtracts two numbers', () => {
    expect(compute(10, 4, '-')).toBe(6)
  })

  it('multiplies two numbers', () => {
    expect(compute(3, 2, '*')).toBe(6)
  })

  it('divides two numbers', () => {
    expect(compute(8, 4, '/')).toBe(2)
  })

  it('returns NaN on divide by zero (not crash)', () => {
    expect(compute(8, 0, '/')).toBeNaN()
  })

  it('unknown op returns b', () => {
    expect(compute(5, 7, '?')).toBe(7)
  })
})

describe('fmt(compute(...)) — divide-by-zero guard', () => {
  it('8/0 → "Error"', () => {
    expect(fmt(compute(8, 0, '/'))).toBe('Error')
  })
})

// Drives the EXACT reduce() the component handlers dispatch into (WR-03):
// simulateSequence is now a thin wrapper over reduce(), so these assertions
// cover the shipped code path, not a parallel reimplementation.
const run = (steps: CalcAction[]) => steps.reduce(reduce, initialCalcState())
const display = (steps: CalcAction[]) => run(steps).display

describe('reduce — immediate-execution engine (the shipped handler logic — WR-03)', () => {
  it('5 + 3 × 2 = yields 16 (not 11, immediate-execution model — CALC-01)', () => {
    // Immediate-execution: 5 + 3 executes immediately on ×, giving 8; then 8 × 2 = 16
    expect(display([
      { type: 'digit', value: '5' },
      { type: 'op',    value: '+' },
      { type: 'digit', value: '3' },
      { type: 'op',    value: '*' },
      { type: 'digit', value: '2' },
      { type: 'equals' },
    ])).toBe('16')
  })

  it('simulateSequence wrapper agrees with reduce on the canonical 5+3×2=16', () => {
    // Guards against the wrapper ever diverging from the reducer.
    expect(simulateSequence([
      { type: 'digit', value: '5' },
      { type: 'op',    value: '+' },
      { type: 'digit', value: '3' },
      { type: 'op',    value: '*' },
      { type: 'digit', value: '2' },
      { type: 'equals' },
    ])).toBe('16')
  })

  it('simple addition 1 + 2 = 3', () => {
    expect(display([
      { type: 'digit', value: '1' },
      { type: 'op',    value: '+' },
      { type: 'digit', value: '2' },
      { type: 'equals' },
    ])).toBe('3')
  })

  it('8 / 0 = → Error (divide-by-zero guard — CALC-01)', () => {
    expect(display([
      { type: 'digit', value: '8' },
      { type: 'op',    value: '/' },
      { type: 'digit', value: '0' },
      { type: 'equals' },
    ])).toBe('Error')
  })

  it('backspace removes last digit when not waiting', () => {
    expect(display([
      { type: 'digit', value: '1' },
      { type: 'digit', value: '2' },
      { type: 'backspace' },
    ])).toBe('1')
  })

  it('backspace is no-op on Error display', () => {
    expect(display([
      { type: 'digit', value: '8' },
      { type: 'op',    value: '/' },
      { type: 'digit', value: '0' },
      { type: 'equals' },
      { type: 'backspace' },
    ])).toBe('Error')
  })

  it('inputDot starts "0." after an operator (waiting) and blocks a second dot', () => {
    expect(display([
      { type: 'op',  value: '+' },   // waiting = true
      { type: 'dot' },               // → "0."
      { type: 'digit', value: '5' }, // → "0.5"
      { type: 'dot' },               // ignored, already has a dot
      { type: 'digit', value: '2' }, // → "0.52"
    ])).toBe('0.52')
  })

  it('inputDot appends a single decimal point to a normal entry', () => {
    expect(display([
      { type: 'digit', value: '3' },
      { type: 'dot' },
      { type: 'digit', value: '1' },
      { type: 'dot' },               // ignored
      { type: 'digit', value: '4' },
    ])).toBe('3.14')
  })

  it('negate (±) flips the sign of the current display', () => {
    expect(display([
      { type: 'digit', value: '5' },
      { type: 'negate' },
    ])).toBe('-5')
  })

  it('negate twice returns to the original value', () => {
    expect(display([
      { type: 'digit', value: '7' },
      { type: 'negate' },
      { type: 'negate' },
    ])).toBe('7')
  })

  it('percent (%) divides the current display by 100', () => {
    expect(display([
      { type: 'digit', value: '5' },
      { type: 'digit', value: '0' },
      { type: 'percent' },
    ])).toBe('0.5')
  })

  it('clear resets back to the initial state', () => {
    const st = run([
      { type: 'digit', value: '9' },
      { type: 'op',    value: '+' },
      { type: 'digit', value: '1' },
      { type: 'clear' },
    ])
    expect(st).toEqual(initialCalcState())
  })
})

// Memory ops live in calcStore (CALC-02: M survives unmount); these exercise
// the actual store mutations + the recall→display rule the handlers apply (WR-03).
describe('memory ops — M+/M-/MR/MC against the real calcStore', () => {
  beforeEach(() => {
    useCalcStore.setState({ mem: 0 })
  })

  it('M+ accumulates the display value into the M register', () => {
    useCalcStore.getState().memAdd(parseFloat('5'))
    useCalcStore.getState().memAdd(parseFloat('3'))
    expect(useCalcStore.getState().mem).toBe(8)
  })

  it('M- subtracts the display value from the M register', () => {
    useCalcStore.getState().memAdd(parseFloat('10'))
    useCalcStore.getState().memSub(parseFloat('4'))
    expect(useCalcStore.getState().mem).toBe(6)
  })

  it('MR recalls the register and the handler maps it to fmt() display', () => {
    useCalcStore.getState().memAdd(parseFloat('42'))
    const recalled = useCalcStore.getState().memRecall()
    // Mirrors handleMemRecall: recall → fmt(value) for the display.
    expect(fmt(recalled)).toBe('42')
  })

  it('MC clears the register back to 0', () => {
    useCalcStore.getState().memAdd(parseFloat('99'))
    useCalcStore.getState().memClear()
    expect(useCalcStore.getState().mem).toBe(0)
  })
})

describe('haptic — navigator.vibrate guard (D-07 / CALC-05)', () => {
  it('calls navigator.vibrate(10) when available', () => {
    const mockVibrate = vi.fn()
    const origVibrate = navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    })
    haptic()
    expect(mockVibrate).toHaveBeenCalledWith(10)
    Object.defineProperty(navigator, 'vibrate', {
      value: origVibrate,
      writable: true,
      configurable: true,
    })
  })

  it('does not throw when navigator.vibrate is undefined (iOS no-op)', () => {
    const origVibrate = navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    expect(() => haptic()).not.toThrow()
    Object.defineProperty(navigator, 'vibrate', {
      value: origVibrate,
      writable: true,
      configurable: true,
    })
  })
})
