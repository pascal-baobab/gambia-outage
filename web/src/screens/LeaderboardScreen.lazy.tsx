// LeaderboardScreen.lazy.tsx — code-split the Zone Leaderboard route so it never weighs on the entry
// bundle. Loaded on demand when the user navigates to #/leaderboard.
import { lazy } from 'react'

export const LeaderboardScreen = lazy(() =>
  import('./LeaderboardScreen').then((m) => ({ default: m.LeaderboardScreen })),
)
