// CommunityScreen.lazy.tsx — code-split the Community tab (boards + Canvas honor-card renderer) so it
// never weighs on the entry bundle / first paint. Loaded on demand when the user opens #/community.
import { lazy } from 'react'

export const CommunityScreen = lazy(() =>
  import('./CommunityScreen').then((m) => ({ default: m.CommunityScreen })),
)
