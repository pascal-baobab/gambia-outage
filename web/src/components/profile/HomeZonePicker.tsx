// HomeZonePicker.tsx — pick your "home neighbourhood" from the quarter list (GPS-optional to detect).
// SELF-DECLARED, never derived from your reports → the anonymous report stream stays decoupled.
// Stored device-local (go_home_zone) and published to the pseudonym profile via saveIntro.
import { useEffect, useMemo, useState } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { getQuarters, nearestQuarter, saveIntro } from '@/lib/api'
import type { QuarterDir } from '@/lib/types'
import { getAccountId } from '@/lib/account'
import { getIdentity, getHomeZone, setHomeZone, type HomeZone } from '@/lib/identity'
import { useT } from '@/i18n/useT'

export function HomeZonePicker() {
  const t = useT()
  const [quarters, setQuarters] = useState<QuarterDir[]>([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<HomeZone | null>(() => getHomeZone())
  const [locating, setLocating] = useState(false)

  useEffect(() => { getQuarters().then(setQuarters).catch(() => {}) }, [])

  const list = useMemo(
    () => (q.trim() ? quarters.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30) : []),
    [quarters, q],
  )

  async function choose(x: HomeZone) {
    setSel(x)
    setHomeZone(x)
    setQ('')
    try {
      const id = await getAccountId()
      const i = getIdentity(id)
      await saveIntro({ account_id: id, nickname: i.nickname ?? '', avatar_id: i.avatarId, bio: i.bio ?? '', home_zone: x.id })
    } catch { /* device-local set already succeeded; publish is best-effort */ }
  }

  function useGps() {
    if (!navigator.geolocation || !quarters.length) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        const n = nearestQuarter(quarters, p.coords.latitude, p.coords.longitude)
        if (n) setQ(n.name) // surface the detected quarter for the user to confirm with a tap
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div style={{ fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, margin: '4px 0 6px' }}>{t.profile.homeArea}</div>
      {sel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: GPT_T.ink }}>📍 {sel.name} · {sel.region}</span>
          <button onClick={() => { setSel(null); void choose({ id: '', name: '', region: '' }) }}
            style={{ marginInlineStart: 'auto', border: 0, background: 'transparent', color: GPT_T.ink45, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {t.profile.clear}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.profile.searchArea}
          style={{ flex: 1, boxSizing: 'border-box', border: `1px solid ${GPT_T.line}`, borderRadius: 10, padding: 9, fontFamily: GPT_FONT, fontSize: 13.5, color: GPT_T.ink, outline: 'none' }}
        />
        <button onClick={useGps} disabled={locating}
          style={{ border: `1px solid ${GPT_T.line}`, borderRadius: 10, background: GPT_T.wash, color: GPT_T.ink70, fontWeight: 700, fontSize: 12.5, padding: '0 12px', cursor: locating ? 'default' : 'pointer' }}>
          {locating ? '…' : t.profile.useGps}
        </button>
      </div>
      {list.length > 0 && (
        <div style={{ marginTop: 6, maxHeight: 200, overflow: 'auto', border: `1px solid ${GPT_T.line2}`, borderRadius: 10 }}>
          {list.map((x) => (
            <button key={x.id} onClick={() => choose({ id: x.id, name: x.name, region: x.region })}
              style={{ display: 'block', width: '100%', textAlign: 'start', border: 0, borderBottom: `1px solid ${GPT_T.line2}`, background: 'transparent', padding: '9px 11px', fontFamily: GPT_FONT, fontSize: 13.5, color: GPT_T.ink, cursor: 'pointer' }}>
              {x.name} <span style={{ color: GPT_T.ink25 }}>· {x.region}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
