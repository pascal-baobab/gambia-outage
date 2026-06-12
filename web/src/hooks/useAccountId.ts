// useAccountId.ts — resolve the device's anonymous account id (sha256 of a local secret) once and
// expose it reactively. Returns null until the async lookup settles. Pure capability id; no PII.
import { useEffect, useState } from 'react'
import { getAccountId } from '@/lib/account'

export function useAccountId(): string | null {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    getAccountId().then((a) => { if (live) setId(a) }).catch(() => {})
    return () => { live = false }
  }, [])
  return id
}
