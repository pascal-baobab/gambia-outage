import { useEffect, useState } from 'react'
import { getProfile, subscribeProfile } from '@/lib/profileStore'
import type { Profile } from '@/lib/xp'

export function useProfile(): Profile | null {
  const [p, setP] = useState<Profile | null>(getProfile())
  useEffect(() => subscribeProfile(setP), [])
  return p
}
