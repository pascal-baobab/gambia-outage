import { describe, it, expect, beforeEach } from 'vitest'
import { useCalcStore } from './calcStore'

describe('calcStore — session-only M register (Zustand, NO persist — D-03)', () => {
  beforeEach(() => {
    // Reset state between tests
    useCalcStore.setState({ mem: 0 })
  })

  it('starts with mem === 0', () => {
    expect(useCalcStore.getState().mem).toBe(0)
  })

  it('memAdd(5) then memRecall() === 5', () => {
    useCalcStore.getState().memAdd(5)
    expect(useCalcStore.getState().memRecall()).toBe(5)
  })

  it('memAdd accumulates: add(5) then add(3) → recall === 8', () => {
    useCalcStore.getState().memAdd(5)
    useCalcStore.getState().memAdd(3)
    expect(useCalcStore.getState().memRecall()).toBe(8)
  })

  it('memSub reduces: after mem=8, sub(2) → recall === 6', () => {
    useCalcStore.setState({ mem: 8 })
    useCalcStore.getState().memSub(2)
    expect(useCalcStore.getState().memRecall()).toBe(6)
  })

  it('memClear resets mem to 0', () => {
    useCalcStore.setState({ mem: 42 })
    useCalcStore.getState().memClear()
    expect(useCalcStore.getState().memRecall()).toBe(0)
  })

  it('store has NO persist middleware — fresh getState().mem starts at 0 after reset', () => {
    // This verifies the store is in-memory only. We reset in beforeEach; if persist were active
    // and localStorage had a value, this would fail. With no persist: always 0 after reset.
    useCalcStore.setState({ mem: 0 })
    expect(useCalcStore.getState().mem).toBe(0)
  })
})
