// calcStore.ts — M-register session store (Zustand, in-memory only — D-03).
// M register survives React unmount (navigation) but resets on full page reload (CALC-02).
// All display/accumulator state stays in component useState (volatile).
// Uses bare create() with NO storage middleware — intentional (session-volatile by design).
import { create } from 'zustand'

interface CalcStore {
  mem: number
  memAdd: (val: number) => void
  memSub: (val: number) => void
  memRecall: () => number
  memClear: () => void
}

export const useCalcStore = create<CalcStore>((set, get) => ({
  mem: 0,
  memAdd: (val) => set((s) => ({ mem: s.mem + val })),
  memSub: (val) => set((s) => ({ mem: s.mem - val })),
  memRecall: () => get().mem,
  memClear: () => set({ mem: 0 }),
}))
