// useIncidents.ts — TanStack Query hook for the public incident feed.
// Mirrors useLeaderboard (useData.ts lines 135-141): useQuery with staleTime.
// The feed is chronological and updates as new incidents land; 30s staleTime
// matches the leaderboard live-board posture.
import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/queryKeys'
import { fetchIncidents } from '@/lib/api'

/** Subscribe to the public incident feed, optionally filtered by category.
 *  Pass category='' (default) to receive all categories. */
export function useIncidentFeed(category = '') {
  return useQuery({
    queryKey: qk.incidents(category),
    queryFn: () => fetchIncidents(category),
    staleTime: 30_000,
  })
}
