// useT.ts — components read UI strings via `const t = useT()`. Returns the active dictionary (typed
// `Strings`); subscribing to langStore re-renders the component when the language changes.
import { useLang } from '@/app/langStore'
import type { Strings } from './en'

export function useT(): Strings {
  return useLang((s) => s.dict)
}
