// AdminApp.tsx — owner ops dashboard (read-only). Two gates protect it: Cloudflare Access (email
// OTP on /admin, same policy as /_/) AND a PocketBase superuser login here, whose token authorises
// the /api/go/admin/* calls (those routes use $apis.requireSuperuserAuth server-side). No custom
// auth, no new secret — it reuses the existing superuser credential. Self-contained styling.
import { useCallback, useEffect, useRef, useState } from 'react'

// ── tokens (self-contained — no dependency on the public app's theme) ──────────
const C = {
  bg: '#0B121C', panel: '#0F1722', panel2: '#14202E', line: '#1E2C3B',
  ink: '#E7EEF6', dim: '#8AA0B6',
  on: '#36C26A', out: '#E5484D', partial: '#E8A13A', nodata: '#5C7184',
  accent: '#3B82F6', red: '#E5484D', flag: '#C2410C',
}
const TOK_KEY = 'go_admin_tok'

// ── api ────────────────────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const t = sessionStorage.getItem(TOK_KEY) || ''
  return t ? { Authorization: t } : {}
}
async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: { Accept: 'application/json', ...authHeaders() }, cache: 'no-store' })
  if (r.status === 401 || r.status === 403) {
    sessionStorage.removeItem(TOK_KEY)
    throw new Error('unauthorized')
  }
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json() as Promise<T>
}
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) })
  if (r.status === 401 || r.status === 403) { sessionStorage.removeItem(TOK_KEY); throw new Error('unauthorized') }
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json() as Promise<T>
}
async function login(identity: string, password: string): Promise<void> {
  const r = await fetch('/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
  })
  if (!r.ok) throw new Error(r.status === 400 ? 'Wrong email or password' : `Login failed (${r.status})`)
  const data = (await r.json()) as { token?: string }
  if (!data.token) throw new Error('No token returned')
  sessionStorage.setItem(TOK_KEY, data.token)
}

// ── shapes (mirror go.js buildAdminOverview / recentReports) ───────────────────
interface Overview {
  now: string
  national: { hours: number; mins: number; regionsOut: number; regionsTotal: number; reports: number; date: string }
  reports: { today: number; lastHour: number; last24h: number; out24h: number; back24h: number; gps24h: number; manual24h: number; flagged24h: number; total: number }
  events: { zone: string; name: string; region: string; startedAt: string; ageMin: number; idleMin: number | null; peak: number; out: number; back: number; distinct60: number }[]
  push: { depth: number; retrying: number; maxAttempts: number }
  subscriptions: number
  zones: { regions: number; settlements: number }
  feed: { t: string; at: string; text: string; where: string }[]
  communityLinks: { id: string; caption: string; url: string; platform: string; nickname: string; likes: number; reportCount: number; hidden: boolean; image: string; created: string; ago: string }[]
  system: { confirmThreshold: number; backCloseFloor: number; communityConfirmFloor: number; autocloseIdleHours: number; maxEventHours: number; snapRadiusKm: number; rlOutWindowMin: number; rlHourly: number; turnstile: boolean; lastReportAt: string | null }
}
interface Rpt { id: string; created: string; type: string; source: string; zone: string; where: string; note: string; flagged: boolean; hidden: boolean; lat: number; lng: number; event: string; rlKey8: string }
interface AmbReq { id: string; created: string; account_id: string; nickname: string; message: string; status: string }

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtAge = (m: number | null) => (m == null ? '—' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`)
const fmtClock = (iso: string) => { try { return iso.replace('T', ' ').replace(/\..*Z?$/, '').slice(11, 16) } catch { return iso } }

export function AdminApp() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem(TOK_KEY))
  return authed ? <Dashboard onLogout={() => { sessionStorage.removeItem(TOK_KEY); setAuthed(false) }} /> : <Login onDone={() => setAuthed(true)} />
}

// ── login ─────────────────────────────────────────────────────────────────────
function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await login(email.trim(), pass); onDone() } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: C.bg, color: C.ink, fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', padding: 20 }}>
      <form onSubmit={submit} style={{ width: 320, maxWidth: '100%', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 13, letterSpacing: 1.5, color: C.dim, textTransform: 'uppercase' }}>Gambia Outage</div>
        <h1 style={{ fontSize: 22, margin: '4px 0 2px' }}>Ops dashboard</h1>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 0 }}>Superuser sign-in</p>
        <input autoFocus type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)}
          style={inp} autoComplete="username" />
        <input type="password" placeholder="password" value={pass} onChange={(e) => setPass(e.target.value)}
          style={inp} autoComplete="current-password" />
        {err && <div style={{ color: C.red, fontSize: 13, margin: '8px 0' }}>{err}</div>}
        <button disabled={busy || !email || !pass} type="submit" style={btn(busy || !email || !pass)}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '10px 12px', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, color: C.ink, fontSize: 15 }
const btn = (dis: boolean): React.CSSProperties => ({ width: '100%', marginTop: 14, padding: '11px 12px', background: dis ? C.line : C.accent, color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: dis ? 'default' : 'pointer' })

// ── dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [ov, setOv] = useState<Overview | null>(null)
  const [rpts, setRpts] = useState<Rpt[] | null>(null)
  const [ambReqs, setAmbReqs] = useState<AmbReq[] | null>(null)
  const [err, setErr] = useState('')
  const [refreshedAt, setRefreshedAt] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const timer = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const o = await apiGet<Overview>('/api/go/admin/overview')
      setOv(o); setErr('')
      setRefreshedAt(new Date().toLocaleTimeString())
    } catch (x) {
      const m = (x as Error).message
      if (m === 'unauthorized') { onLogout(); return }
      setErr(m)
    }
  }, [onLogout])

  useEffect(() => {
    load()
    timer.current = window.setInterval(load, 15000)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [load])

  const loadReports = useCallback(async () => {
    try { const d = await apiGet<{ reports: Rpt[] }>('/api/go/admin/reports'); setRpts(d.reports) } catch (x) {
      if ((x as Error).message === 'unauthorized') onLogout()
    }
  }, [onLogout])

  useEffect(() => { if (showDebug && !rpts) loadReports() }, [showDebug, rpts, loadReports])

  const moderateLink = useCallback(async (id: string, hidden: boolean) => {
    try { await apiPost('/api/go/admin/community-links/hide', { id, hidden }); load() } catch (x) {
      if ((x as Error).message === 'unauthorized') onLogout()
    }
  }, [load, onLogout])

  const loadAmbReqs = useCallback(async () => {
    try { const d = await apiGet<{ requests: AmbReq[] }>('/api/go/admin/ambassador/requests'); setAmbReqs(d.requests) } catch (x) {
      if ((x as Error).message === 'unauthorized') onLogout()
    }
  }, [onLogout])

  const reviewAmbReq = useCallback(async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await apiPost(`/api/go/admin/ambassador/${action}`, { request_id: requestId })
      loadAmbReqs()
    } catch (x) {
      if ((x as Error).message === 'unauthorized') onLogout()
    }
  }, [loadAmbReqs, onLogout])

  useEffect(() => { loadAmbReqs() }, [loadAmbReqs])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      {/* header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 5, background: C.panel, borderBottom: `1px solid ${C.line}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Gambia Outage <span style={{ color: C.dim, fontWeight: 400 }}>· Ops</span></div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: C.dim }}>
          {ov && <span><Dot c={ov.reports.lastHour > 0 ? C.on : C.nodata} /> {ov.reports.lastHour} reports/last hour</span>}
          <span>refresh {refreshedAt || '…'}</span>
          <button onClick={load} style={miniBtn}>↻</button>
          <button onClick={onLogout} style={miniBtn}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        {err && <Banner>API error: {err}</Banner>}
        {!ov && !err && <p style={{ color: C.dim }}>Loading…</p>}

        {ov && (
          <>
            {/* stat cards */}
            <div style={grid(4)}>
              <Stat label="Confirmed avg today" value={`${ov.national.hours}h ${String(ov.national.mins).padStart(2, '0')}m`} sub="nationwide, macros with outage" />
              <Stat label="Regions out now" value={`${ov.national.regionsOut} / ${ov.national.regionsTotal}`} sub="open events at region level" accent={ov.national.regionsOut > 0 ? C.out : C.on} />
              <Stat label="Reports today" value={String(ov.reports.today)} sub={`${ov.reports.lastHour} in the last hour`} />
              <Stat label="Open events" value={String(ov.events.length)} sub={`${ov.subscriptions} push subscribers`} accent={ov.events.length > 0 ? C.partial : C.on} />
            </div>

            {/* open events */}
            <Section title={`Open events (${ov.events.length})`}>
              {ov.events.length === 0 ? <Empty>No open events — everything reads clear.</Empty> : (
                <Table head={['Zone', 'Region', 'Age', 'Idle', 'Peak', 'OUT', 'BACK', 'Distinct/60m', 'Confirmed?']}>
                  {ov.events.map((e) => (
                    <tr key={e.zone} style={tr}>
                      <Td bold>{e.name}</Td><Td dim>{e.region}</Td>
                      <Td>{fmtAge(e.ageMin)}</Td><Td>{fmtAge(e.idleMin)}</Td>
                      <Td>{e.peak}</Td><Td>{e.out}</Td><Td>{e.back}</Td>
                      <Td>{e.distinct60}</Td>
                      <Td><Pill ok={e.distinct60 >= ov.system.confirmThreshold}>{e.distinct60 >= ov.system.confirmThreshold ? 'verified' : `${e.distinct60}/${ov.system.confirmThreshold}`}</Pill></Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Section>

            <div style={grid(2)}>
              {/* volume */}
              <Section title="Report volume · last 24h">
                <KV k="Total 24h" v={ov.reports.last24h} />
                <KV k="OUT / BACK" v={`${ov.reports.out24h} / ${ov.reports.back24h}`} />
                <KV k="GPS / manual" v={`${ov.reports.gps24h} / ${ov.reports.manual24h}`} />
                <KV k="Flagged" v={ov.reports.flagged24h} warn={ov.reports.flagged24h > 0} />
                <KV k="All-time total" v={ov.reports.total} />
              </Section>

              {/* system + delivery */}
              <Section title="System & delivery">
                <KV k="Push queue depth" v={ov.push.depth} warn={ov.push.depth > 20} />
                <KV k="Push retrying" v={ov.push.retrying} warn={ov.push.retrying > 0} />
                <KV k="Max attempts seen" v={ov.push.maxAttempts} warn={ov.push.maxAttempts >= 3} />
                <KV k="Zones" v={`${ov.zones.regions} regions · ${ov.zones.settlements} quarters`} />
                <KV k="Last report" v={ov.system.lastReportAt ? fmtClock(ov.system.lastReportAt) : '—'} />
                <KV k="Turnstile" v={ov.system.turnstile ? 'ON' : 'off'} />
                <KV k="Thresholds" v={`confirm ${ov.system.confirmThreshold} · back-close ${ov.system.backCloseFloor} · autoclose ${ov.system.autocloseIdleHours}h`} />
              </Section>
            </div>

            {/* community feed */}
            <Section title="Recent community notes">
              {ov.feed.length === 0 ? <Empty>No notes yet.</Empty> : (
                <div>
                  {ov.feed.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < ov.feed.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                      <span style={{ color: C.dim, fontSize: 12, minWidth: 64 }}>{f.t}</span>
                      <span style={{ flex: 1 }}>{f.text || <em style={{ color: C.dim }}>(no text)</em>}</span>
                      <span style={{ color: C.accent, fontSize: 12 }}>{f.where}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* community links — user-submitted, moderation */}
            <Section title={`Community links · ${ov.communityLinks.length} (moderation)`}>
              {ov.communityLinks.length === 0 ? <Empty>No user-submitted links yet.</Empty> : (
                <Table head={['Cover', 'Caption', 'By', 'Platform', '♥', '⚐', 'State', '']}>
                  {ov.communityLinks.map((l) => (
                    <tr key={l.id} style={{ ...tr, opacity: l.hidden ? 0.55 : 1 }}>
                      <Td>{l.image ? <img src={l.image} alt="" style={{ width: 44, height: 30, objectFit: 'cover', borderRadius: 4, display: 'block' }} /> : <span style={{ color: C.dim }}>—</span>}</Td>
                      <Td><a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none' }}>{l.caption || <em style={{ color: C.dim }}>(no caption)</em>}</a></Td>
                      <Td dim>{l.nickname || '—'}</Td>
                      <Td dim>{l.platform}</Td>
                      <Td>{l.likes}</Td>
                      <Td><span style={{ color: l.reportCount > 0 ? C.red : C.dim }}>{l.reportCount}</span></Td>
                      <Td><Pill ok={!l.hidden}>{l.hidden ? 'hidden' : 'live'}</Pill></Td>
                      <Td><button onClick={() => moderateLink(l.id, !l.hidden)} style={miniBtn}>{l.hidden ? 'Unhide' : 'Hide'}</button></Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Section>

            {/* ambassador requests */}
            <Section
              title={`Ambassador requests · ${ambReqs ? ambReqs.filter((r) => r.status === 'pending').length : '…'} pending`}
              action={<button onClick={loadAmbReqs} style={miniBtn}>↻</button>}
            >
              {!ambReqs ? <Empty>Loading…</Empty> : ambReqs.length === 0 ? <Empty>No requests yet.</Empty> : (
                <Table head={['Name', 'Message', 'Status', 'Date', '']}>
                  {ambReqs.map((r) => (
                    <tr key={r.id} style={{ ...tr, opacity: r.status !== 'pending' ? 0.55 : 1 }}>
                      <Td bold>{r.nickname || <span style={{ color: C.dim }}>anonymous</span>}</Td>
                      <Td>{r.message ? <span style={{ maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.message}</span> : <span style={{ color: C.dim }}>—</span>}</Td>
                      <Td><Pill ok={r.status === 'approved'}>{r.status}</Pill></Td>
                      <Td dim>{r.created.slice(0, 10)}</Td>
                      <Td>
                        {r.status === 'pending' && (
                          <span style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => reviewAmbReq(r.id, 'accept')} style={{ ...miniBtn, background: '#10341F', color: C.on, borderColor: '#1E5A34' }}>Accept</button>
                            <button onClick={() => reviewAmbReq(r.id, 'reject')} style={{ ...miniBtn, background: '#3A1A1B', color: C.out, borderColor: '#5A1E1E' }}>Reject</button>
                          </span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Section>

            {/* debug */}
            <Section
              title="Debug · recent reports"
              action={<button onClick={() => setShowDebug((s) => !s)} style={miniBtn}>{showDebug ? 'Hide' : 'Show'}</button>}
            >
              {!showDebug ? <Empty>Raw report stream (GPS coarsened ~1km at rest; rl_key truncated). Tap Show.</Empty> : !rpts ? <p style={{ color: C.dim }}>Loading…</p> : (
                <Table head={['Time', 'Type', 'Src', 'Zone', 'Note', 'GPS', 'rl_key', 'Flags']}>
                  {rpts.map((r) => (
                    <tr key={r.id} style={tr}>
                      <Td dim>{fmtClock(r.created)}</Td>
                      <Td><Pill ok={r.type === 'back'}>{r.type}</Pill></Td>
                      <Td dim>{r.source}</Td>
                      <Td>{r.where}</Td>
                      <Td>{r.note || <span style={{ color: C.dim }}>—</span>}</Td>
                      <Td dim>{r.lat && r.lng ? `${r.lat.toFixed(2)},${r.lng.toFixed(2)}` : '—'}</Td>
                      <Td dim><code>{r.rlKey8 || '—'}</code></Td>
                      <Td>{[r.flagged ? 'flag' : '', r.hidden ? 'hidden' : ''].filter(Boolean).join(' ') || '—'}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Section>

            <p style={{ color: C.dim, fontSize: 11, textAlign: 'center', margin: '24px 0' }}>
              Read-only · auto-refresh 15s · server {fmtClock(ov.now)} UTC · raw DB & logs at <code>/_/</code>
            </p>
          </>
        )}
      </main>
    </div>
  )
}

// ── small components ──────────────────────────────────────────────────────────
const grid = (n: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${n >= 4 ? 200 : 320}px, 1fr))`, gap: 12, marginBottom: 16 })
const tr: React.CSSProperties = { borderBottom: `1px solid ${C.line}` }
const miniBtn: React.CSSProperties = { background: C.panel2, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }

function Dot({ c }: { c: string }) { return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: c, marginRight: 4 }} /> }
function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: accent || C.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, margin: 0, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</h2>
        {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
      </div>
      {children}
    </section>
  )
}
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr>{head.map((h) => <th key={h} style={{ textAlign: 'left', color: C.dim, fontWeight: 500, padding: '6px 10px 6px 0', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
function Td({ children, bold, dim }: { children: React.ReactNode; bold?: boolean; dim?: boolean }) {
  return <td style={{ padding: '7px 10px 7px 0', color: dim ? C.dim : C.ink, fontWeight: bold ? 600 : 400, whiteSpace: 'nowrap' }}>{children}</td>
}
function KV({ k, v, warn }: { k: string; v: React.ReactNode; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', padding: '6px 0', borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
      <span style={{ color: C.dim }}>{k}</span>
      <span style={{ marginLeft: 'auto', fontWeight: 600, color: warn ? C.partial : C.ink }}>{v}</span>
    </div>
  )
}
function Pill({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return <span style={{ background: ok ? '#10341F' : '#3A2417', color: ok ? C.on : C.partial, border: `1px solid ${ok ? '#1E5A34' : '#5A3A1E'}`, borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{children}</span>
}
function Empty({ children }: { children: React.ReactNode }) { return <p style={{ color: C.dim, fontSize: 13, margin: 0 }}>{children}</p> }
function Banner({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#3A1A1B', border: `1px solid ${C.red}`, color: '#FFD9DA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{children}</div>
}
