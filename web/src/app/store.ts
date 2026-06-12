// store.ts — tiny global UI state (Zustand). Map-first ↔ aggressive-lite: data-saver
// auto-enables for navigator.connection.saveData or 2g/slow-2g (§6).
import { create } from 'zustand'
import type { ThemeName } from '@/lib/tokens'

type NetInfo = { saveData?: boolean; effectiveType?: string }

function detectSaver(): boolean {
  if (typeof navigator === 'undefined') return false
  const c = (navigator as Navigator & { connection?: NetInfo }).connection
  if (!c) return false
  return Boolean(c.saveData) || c.effectiveType === '2g' || c.effectiveType === 'slow-2g'
}

const FIRST_RUN_KEY = 'go_first_run_done'

function readFirstRunDone(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_KEY) === '1'
  } catch {
    return false
  }
}

interface AppState {
  themeName: ThemeName
  dataSaver: boolean
  firstRunDone: boolean
  setTheme: (name: ThemeName) => void
  setDataSaver: (value: boolean) => void
  dismissFirstRun: () => void
}

export const useAppStore = create<AppState>((set) => ({
  themeName: 'standard',
  dataSaver: detectSaver(),
  firstRunDone: readFirstRunDone(),
  setTheme: (themeName) => set({ themeName }),
  setDataSaver: (dataSaver) => set({ dataSaver }),
  dismissFirstRun: () => {
    try {
      localStorage.setItem(FIRST_RUN_KEY, '1')
    } catch {
      /* storage unavailable */
    }
    set({ firstRunDone: true })
  },
}))
