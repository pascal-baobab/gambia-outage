// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { getAccountId, claimNonce } from './account'

beforeEach(() => localStorage.clear())

describe('account', () => {
  it('creates a stable 64-hex account id and persists it', async () => {
    const a = await getAccountId()
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    const b = await getAccountId()
    expect(b).toBe(a) // stable across calls
  })

  it('mints unique random claim nonces', () => {
    const n1 = claimNonce(), n2 = claimNonce()
    expect(n1).toMatch(/^[a-f0-9]{32,}$/)
    expect(n1).not.toBe(n2)
  })
})
