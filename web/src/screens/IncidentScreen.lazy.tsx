// IncidentScreen.lazy.tsx — code-split the incident reporting route so it never weighs on the entry
// bundle. Loaded on demand when the user navigates to #/incidents.
import { lazy } from 'react'

export const IncidentScreen = lazy(() =>
  import('./IncidentScreen').then((m) => ({ default: m.IncidentScreen })),
)
