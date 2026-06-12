// useLocal.ts — localStorage-backed state, ported 1:1 from design/features.jsx `useLocal`.
import { useState } from 'react'

export function useLocal<T>(key: string, def: T): [T, (next: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key)
      return s ? (JSON.parse(s) as T) : def
    } catch {
      return def
    }
  })
  const set = (next: T) => {
    setV(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* storage unavailable (private mode) */
    }
  }
  return [v, set]
}
