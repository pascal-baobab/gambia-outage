import { create } from 'zustand'

type NameGateMode = 'create' | 'recover'

// `open` is a one-shot signal consumed in App.tsx; `mode` tells the gate whether to land on the
// claim-a-name form (default) or the recover-by-name+password form (e.g. from the Profile "Already
// have an account?" entry).
export const useNameGateStore = create<{ open: boolean; mode: NameGateMode }>(() => ({ open: false, mode: 'create' }))
export const openNameGate = (mode: NameGateMode = 'create') => useNameGateStore.setState({ open: true, mode })
export const closeNameGate = () => useNameGateStore.setState({ open: false })
