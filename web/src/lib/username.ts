// username.ts — device-local state for the forced, globally-unique public name. PII-free, localStorage
// only. The server registry (usernames collection) is the source of truth for uniqueness + the 60-day
// change cooldown; these keys just let the app know whether THIS device has claimed yet (to force the
// NameGate at first run) and when its next change is allowed.
const CLAIMED_KEY = 'go_name_claimed'        // the claimed display name (presence = claimed)
const NEXT_CHANGE_KEY = 'go_name_next_change' // ISO timestamp the next name change is allowed
const NICK_KEY = 'go_nickname'                // legacy device nickname (grandfathering anchor)
const SKIPPED_KEY = 'go_name_skipped'         // user has skipped the NameGate (presence = skipped)

/** Has this device claimed a unique name yet? Existing devices that already show a nickname are
 *  grandfathered (treated as claimed) so the gate never blocks a returning user. */
export function hasClaimedName(): boolean {
  try {
    if (localStorage.getItem(CLAIMED_KEY)) return true
    const nick = (localStorage.getItem(NICK_KEY) || '').trim()
    if (nick) { localStorage.setItem(CLAIMED_KEY, nick); return true } // grandfather
    return false
  } catch {
    return true // storage unavailable → never hard-block the app behind the gate
  }
}

/** Has this device skipped the NameGate? */
export function hasSkippedName(): boolean {
  try { return !!localStorage.getItem(SKIPPED_KEY) } catch { return false }
}

/** Mark that this device has skipped the NameGate. */
export function markNameSkipped(): void {
  try { localStorage.setItem(SKIPPED_KEY, '1') } catch { /* storage unavailable */ }
}

/** Clear the skip flag — called when the user explicitly wants to set a name. */
export function clearNameSkipped(): void {
  try { localStorage.removeItem(SKIPPED_KEY) } catch { /* storage unavailable */ }
}

export function markNameClaimed(name: string, nextChangeAt?: string): void {
  try {
    localStorage.setItem(CLAIMED_KEY, name)
    localStorage.removeItem(SKIPPED_KEY)
    if (nextChangeAt) localStorage.setItem(NEXT_CHANGE_KEY, nextChangeAt)
  } catch { /* storage unavailable */ }
}

/** When the next name change is allowed (null = no cooldown recorded → allowed now). */
export function nameChangeAvailableAt(): Date | null {
  try { const v = localStorage.getItem(NEXT_CHANGE_KEY); return v ? new Date(v) : null } catch { return null }
}

export function canChangeName(): boolean {
  const at = nameChangeAvailableAt()
  return !at || Date.now() >= at.getTime()
}

/** Whole days until the next change is allowed (0 if allowed now). */
export function daysUntilNameChange(): number {
  const at = nameChangeAvailableAt()
  if (!at) return 0
  return Math.max(0, Math.ceil((at.getTime() - Date.now()) / 86400000))
}
