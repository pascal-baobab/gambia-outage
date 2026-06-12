// useGeoGate — whether outage reporting should be blocked for this visitor (outside the allowed
// countries). Returns blocked=false whenever the gate flag is off OR the country can't be determined,
// mirroring the backend's fail-open stance (never block on uncertainty). UX only — the server is the
// real enforcement (CF-IPCountry in reports_create.pb.js).
import { useEffect, useState } from 'react'
import { GEO_GATE, GEO_ALLOW } from '@/lib/flags'
import { visitorCountry } from '@/lib/geo'

export function useGeoGate(): { blocked: boolean; country: string | null } {
  const [country, setCountry] = useState<string | null>(null)
  useEffect(() => {
    if (!GEO_GATE) return
    let alive = true
    visitorCountry().then((c) => { if (alive) setCountry(c) })
    return () => { alive = false }
  }, [])
  const blocked = GEO_GATE && country != null && !GEO_ALLOW.includes(country)
  return { blocked, country }
}
