// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useNameGateStore, openNameGate, closeNameGate } from './nameGateStore'

describe('nameGateStore', () => {
  beforeEach(() => useNameGateStore.setState({ open: false }))

  it('starts closed', () => {
    expect(useNameGateStore.getState().open).toBe(false)
  })

  it('openNameGate sets open=true', () => {
    openNameGate()
    expect(useNameGateStore.getState().open).toBe(true)
  })

  it('closeNameGate sets open=false', () => {
    openNameGate()
    closeNameGate()
    expect(useNameGateStore.getState().open).toBe(false)
  })
})
