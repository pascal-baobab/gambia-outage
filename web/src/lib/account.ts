// account.ts — anonymous, zero-PII device account for gamification. A random 256-bit secret lives
// ONLY in localStorage; the public account_id = sha256(secret) is a capability the device holds (no
// login, no phone, no email). v1 has NO recovery; the secret-derived id keeps a future BIP39 recovery
// innestable without a schema change. claim_nonce is a per-report random capability the device sends
// with a report and later redeems for XP (see lib/claims.ts) — it is never stored on the report row.
const SECRET_KEY = 'go_account_secret'
const ID_KEY = 'go_account_id'

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Stable per-device account id (sha256 of a locally-stored 256-bit secret). Lazily created. */
export async function getAccountId(): Promise<string> {
  try {
    const cached = localStorage.getItem(ID_KEY)
    if (cached && /^[a-f0-9]{64}$/.test(cached)) return cached
    let secret = localStorage.getItem(SECRET_KEY)
    if (!secret) { secret = randHex(32); localStorage.setItem(SECRET_KEY, secret) }
    const id = await sha256Hex(secret)
    localStorage.setItem(ID_KEY, id)
    return id
  } catch {
    return sha256Hex(randHex(32))
  }
}

/** Fresh random capability to attach to one report and later redeem for XP. */
export function claimNonce(): string {
  return randHex(16) // 128-bit, 32 hex chars
}

/**
 * Adopt a recovered account on this device (from /api/go/account/recover). We only restore the
 * account_id capability (the secret is never stored server-side, and getAccountId() prefers the id),
 * plus the self-declared name/avatar/bio so the new phone feels like home. Caller reloads after.
 */
export function adoptAccount(data: { account_id: string; name?: string; avatarId?: string; bio?: string; nextChangeAt?: string }): void {
  try {
    localStorage.removeItem(SECRET_KEY) // we don't have the original secret; the id alone is the capability
    localStorage.setItem(ID_KEY, data.account_id)
    if (data.name) {
      localStorage.setItem('go_name_claimed', data.name)
      localStorage.setItem('go_nickname', data.name)
    }
    if (data.avatarId) localStorage.setItem('go_avatar', data.avatarId)
    if (data.bio) localStorage.setItem('go_bio', data.bio)
    if (data.nextChangeAt) localStorage.setItem('go_name_next_change', data.nextChangeAt)
  } catch { /* storage unavailable */ }
}

/**
 * Log out of the current account on this device (a device can hold several accounts over time). Clears
 * the identity + device-local activity so the next gate offers "create new" or "recover". Keeps app
 * prefs and first-run state. Caller reloads after. ⚠ Without a recovery password set, an account with
 * no other device becomes unreachable — the UI warns before calling this.
 */
export function logoutAccount(): void {
  const keys = [
    SECRET_KEY, ID_KEY,
    'go_name_claimed', 'go_name_next_change', 'go_name_skipped',
    'go_nickname', 'go_avatar', 'go_bio', 'go_home_zone',
    'go_my_reports', 'go_my_contrib', 'go_my_questions', 'go_liked_links', 'go_liked_clinks',
    'go_xp_claims', 'go_last_rank', 'go_last_xp', 'go_admin_tok',
  ]
  try { keys.forEach((k) => localStorage.removeItem(k)) } catch { /* storage unavailable */ }
}

/**
 * True once this device has an ESTABLISHED account — a chosen nickname OR at least one report made
 * from here — i.e. it is NOT the very first access. Drives the "jump straight to your account"
 * shortcut on the splash / first-run (a returning user shouldn't have to re-onboard). Pure
 * localStorage read (keys mirror lib/identity `go_nickname` + lib/myReports `go_my_reports`), so it
 * stays dependency-free and synchronous.
 */
export function hasEstablishedAccount(): boolean {
  try {
    if ((localStorage.getItem('go_nickname') || '').trim()) return true
    const mr = localStorage.getItem('go_my_reports')
    if (mr && JSON.parse(mr).length > 0) return true
  } catch { /* storage unavailable */ }
  return false
}
