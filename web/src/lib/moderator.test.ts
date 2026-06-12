// moderator.test.ts — guards the moderator hard-delete feature (ATPC/VALDA & co):
//  • authorisation is by the is_moderator capability (never by nickname);
//  • it is a real HARD delete with cascade to child comments (not a soft-hide);
//  • the audit log NEVER re-links a moderator's account_id to the anonymous reports stream
//    (it uses a dedicated mod_account field, and no rl_key / report linkage appears in the block).
// Source-scan style, mirroring community-anonymity.test.ts (PB JSVM hooks aren't runtime-unit-testable).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8')

describe('moderator hard-delete', () => {
  const go = read('pb/pb_hooks/lib/go.js')
  // The moderator helpers live between the Q&A block and the People directory header — well BEFORE
  // the likeCommunityLink→module.exports slice that the anonymity scan inspects for account_id writes.
  const modBlock = () => {
    const s = go.indexOf('function isModeratorAccount')
    const e = go.indexOf('// ── People directory')
    expect(s).toBeGreaterThan(-1)
    expect(e).toBeGreaterThan(s)
    return go.slice(s, e)
  }

  it('modDelete authorises by the is_moderator capability', () => {
    const b = modBlock()
    expect(/function modDelete/.test(b)).toBe(true)
    expect(/is_moderator/.test(b)).toBe(true)
    expect(/ACCT_RE\.test/.test(b)).toBe(true)
  })

  it('modDelete is a HARD delete with cascade to child comments (not a soft-hide)', () => {
    const b = modBlock()
    expect(/app\.delete\(/.test(b)).toBe(true)
    expect(/set\(['"]hidden['"]\s*,\s*true/.test(b)).toBe(false)
    expect(/target_type/.test(b)).toBe(true)
  })

  it('the moderator audit never re-links account_id (uses mod_account, no report linkage)', () => {
    const b = modBlock()
    expect(/mod_account/.test(b)).toBe(true)
    expect(/set\(['"]account_id/.test(b)).toBe(false)
    expect(/rl_key|reports/.test(b)).toBe(false)
  })

  it('socialProfile exposes is_moderator so the client can detect its own capability', () => {
    const s = go.indexOf('function socialProfile')
    const e = go.indexOf('function postShape')
    expect(s).toBeGreaterThan(-1)
    expect(e).toBeGreaterThan(s)
    expect(/is_moderator/.test(go.slice(s, e))).toBe(true)
  })

  it('the mod route exists and delegates to go.modDelete', () => {
    const hook = read('pb/pb_hooks/go_mod.pb.js')
    expect(/routerAdd\(\s*['"]POST['"]\s*,\s*['"]\/api\/go\/mod\/delete['"]/.test(hook)).toBe(true)
    expect(/go\.modDelete/.test(hook)).toBe(true)
  })

  it('migration adds is_moderator to profiles and creates the mod_log audit collection', () => {
    const mig = read('pb/pb_migrations/1782300000_moderator.js')
    expect(/is_moderator/.test(mig)).toBe(true)
    expect(/mod_log/.test(mig)).toBe(true)
    expect(/mod_account/.test(mig)).toBe(true)
  })

  it('the long-press delete is iOS-reliable (no native selection hijack; movement-tolerant)', () => {
    const hook = read('web/src/hooks/useAdminDelete.ts')
    // disable iOS text selection / magnifier callout so it cannot eat the long-press
    expect(/WebkitTouchCallout/.test(hook)).toBe(true)
    expect(/userSelect/.test(hook)).toBe(true)
    // cancel only on a real drag (scroll), not the finger jitter the magnifier produces
    expect(/MOVE_TOL|clientX/.test(hook)).toBe(true)
  })

  it('useAdminDelete calls NO hooks after the not-admin early return (Rules of Hooks)', () => {
    // Regression for the v0.99/v0.100 moderator-only crash: `mod` flips false→true asynchronously,
    // so any use* call below the `if (!active...)` guard changes the hook count between renders —
    // React #310 — and the whole app dies to the ErrorBoundary on moderator devices only.
    const hook = read('web/src/hooks/useAdminDelete.ts')
    const guard = hook.indexOf('if (!active')
    expect(guard).toBeGreaterThan(0)
    const afterGuard = hook.slice(guard)
    expect(/\buse(Ref|Effect|State|Memo|Callback)\s*\(/.test(afterGuard)).toBe(false)
  })
})
