// Lazy wrapper for the Talk (Q&A) tab — keeps it out of the entry bundle.
import { lazy } from 'react'
export const TalkScreen = lazy(() => import('./TalkScreen').then((m) => ({ default: m.TalkScreen })))
