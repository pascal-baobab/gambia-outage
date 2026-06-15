// admin.ts — superadmin (owner) mode for the PUBLIC app. Authenticates against the existing
// PocketBase superuser (same credential that gates /admin and /_/ — no new secret), stores the
// returned token in localStorage, and exposes it so the inline long-press moderation can call the
// superuser-gated /api/go/admin/content/hide. The buttons are harmless without a valid token: the
// server enforces $apis.requireSuperuserAuth() on every destructive call.
//
// Entry point: the hidden hash route #/su (not linked anywhere). A user can hold several device
// accounts, so adminLogout() only drops the admin token — clearing the device IDENTITY is a separate
// concern (see lib/account logout).
import { useSyncExternalStore } from 'react'

const TOK_KEY = 'go_admin_tok'
const EVT = 'go-admin-change'

// Secret-slug gate for the #/su entry (defence-in-depth: hides the login from casual discovery so it's
// not enough to know email+password — you must also know the secret URL). The login form only renders
// at #/su/<slug> where sha256(slug) === SU_SLUG_HASH. The slug itself is NEVER in the repo/bundle —
// only its sha256 (safe to publish). Empty string → #/su is fully disabled.
// ⚠ Owner-chosen: this is sha256(<secret-slug>). The slug itself is NOT in the repo. To rotate: pick a
// new slug, compute its sha256, and replace this hash (the moderation URL becomes #/su/<new-slug>).
export const SU_SLUG_HASH = '690958a245aef36089fbdd5364e375f47768c168b69a02362e875cb902d754bb'

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function read(): string {
  try {
    return localStorage.getItem(TOK_KEY) || ''
  } catch {
    return ''
  }
}

export function adminToken(): string {
  return read()
}

export function isAdmin(): boolean {
  return !!read()
}

function emit() {
  try {
    window.dispatchEvent(new Event(EVT))
  } catch {
    /* SSR / no window */
  }
}

/** Authenticate as the PocketBase superuser; on success the token is stored and admin mode turns on. */
export async function adminLogin(identity: string, password: string): Promise<void> {
  const r = await fetch('/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identity, password }),
  })
  if (!r.ok) throw new Error(r.status === 400 ? 'Email o password errati' : `Login fallito (${r.status})`)
  const data = (await r.json()) as { token?: string }
  if (!data.token) throw new Error('Nessun token restituito')
  try {
    localStorage.setItem(TOK_KEY, data.token)
  } catch {
    /* storage unavailable */
  }
  emit()
}

export function adminLogout(): void {
  try {
    localStorage.removeItem(TOK_KEY)
  } catch {
    /* storage unavailable */
  }
  emit()
}

export type ModType = 'comment' | 'question' | 'post' | 'community_link' | 'social_link' | 'leaderboard'

/** Soft-hide (or restore) a piece of user content. Superuser-gated server-side. */
export async function adminHide(type: ModType, id: string, hidden = true): Promise<void> {
  const token = read()
  if (!token) throw new Error('not admin')
  const r = await fetch('/api/go/admin/content/hide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: token },
    body: JSON.stringify({ type, id, hidden }),
  })
  if (r.status === 401 || r.status === 403) {
    adminLogout() // token expired/invalid → drop it so the UI returns to normal
    throw new Error('Admin session expired — sign in again at #/su')
  }
  if (!r.ok) throw new Error(`Error (${r.status})`)
}

// ── reactive hook ────────────────────────────────────────────────────────────
function subscribe(cb: () => void): () => void {
  window.addEventListener(EVT, cb)
  window.addEventListener('storage', cb) // sync across tabs
  return () => {
    window.removeEventListener(EVT, cb)
    window.removeEventListener('storage', cb)
  }
}

/** True when the device is in superadmin mode. Re-renders on login/logout. */
export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, isAdmin, () => false)
}
