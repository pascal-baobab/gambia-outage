// useData.ts — TanStack Query hooks over the read-model API. Reads refetch on a
// 30s interval so Home/List/Zone stay fresh without SSE (SSE lands in Phase 2).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSnapshot, getMacro, getNational, getCommunity, getCommunityWeek, fetchSocial, fetchFeed, fetchStats, fetchCommunityLinks, fetchPeople, fetchContactRequests, fetchAmbassadors, fetchLeaderboard } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { quickReport, type QuickZone, type QuickResult } from '@/lib/quickReport'

const REFETCH_MS = 30_000

/** One-tap "Still dark · Ankum si" reconfirm. Posts the report (no sheet) and invalidates the affected
 *  caches so Home/zone refresh. Returns the QuickResult so the caller can toast the right message. */
export function useQuickReport() {
  const qc = useQueryClient()
  return async (action: 'out' | 'back', zone: QuickZone): Promise<QuickResult> => {
    const res = await quickReport(action, zone)
    if (res.status !== 'error') {
      qc.invalidateQueries({ queryKey: qk.snapshot })
      qc.invalidateQueries({ queryKey: qk.national })
      const regionId = zone.regionId || (zone.id.includes('-') ? zone.id.split('-')[0] : zone.id)
      if (regionId) qc.invalidateQueries({ queryKey: qk.macro(regionId) })
    }
    return res
  }
}

export function useSnapshot() {
  return useQuery({
    queryKey: qk.snapshot,
    queryFn: getSnapshot,
    refetchInterval: REFETCH_MS,
  })
}

export function useMacro(id: string | null) {
  return useQuery({
    queryKey: qk.macro(id as string),
    queryFn: () => getMacro(id as string),
    enabled: !!id,
    refetchInterval: REFETCH_MS,
  })
}

export function useNational() {
  return useQuery({
    queryKey: qk.national,
    queryFn: getNational,
    refetchInterval: REFETCH_MS,
  })
}

/** Community boards (live current week). Refetches on the standard interval so ranks stay fresh. */
export function useCommunity() {
  return useQuery({
    queryKey: qk.community,
    queryFn: getCommunity,
    refetchInterval: REFETCH_MS,
  })
}

/** A frozen weekly board. Historical weeks never change → cached for an hour, no polling. */
export function useCommunityWeek(weekId: string | null) {
  return useQuery({
    queryKey: qk.communityWeek(weekId as string),
    queryFn: () => getCommunityWeek(weekId as string),
    enabled: !!weekId,
    staleTime: 60 * 60 * 1000,
  })
}

/** The "From Facebook" / LIVE payload (`{lives, links}`), shared by every surface that shows it
 * (Home teaser + LiveStrip, Community teaser + LiveStrip, News full feed). A SINGLE cached query
 * means navigating between those tabs renders instantly from cache instead of blanking + refetching,
 * and the origin sees ~one request per interval instead of one per mounted consumer. Lives can start/
 * stop, so it refreshes on the standard 30s interval. */
export function useSocial() {
  return useQuery({
    queryKey: qk.social,
    queryFn: () => fetchSocial(30),
    refetchInterval: REFETCH_MS,
  })
}

/** Community "stories" feed (posts). Shared cache so the Community tab renders it instantly on return. */
export function useFeed() {
  return useQuery({
    queryKey: qk.feed,
    queryFn: () => fetchFeed(50),
    refetchInterval: 60_000,
  })
}

/** Community social-proof counters (distinct contributors + total reports). Shown on Home + Profile;
 * one cached query feeds both. Changes slowly → a gentle 60s refresh. */
export function useStats() {
  return useQuery({
    queryKey: qk.stats,
    queryFn: fetchStats,
    refetchInterval: 60_000,
  })
}

/** User-submitted "From the community" links. Shared cache so News + Community render instantly. */
export function useCommunityLinks() {
  return useQuery({
    queryKey: qk.communityLinks,
    queryFn: () => fetchCommunityLinks(30),
    refetchInterval: REFETCH_MS,
  })
}

/** Discoverable neighbours for the Community "People nearby" grid (viewer-specific: carries my wave
 *  status per person). Enabled only once the device account id is known. */
export function usePeople(accountId: string | null) {
  return useQuery({
    queryKey: qk.people(accountId as string),
    queryFn: () => fetchPeople(accountId as string),
    enabled: !!accountId,
    refetchInterval: REFETCH_MS,
  })
}

/** The viewer's incoming "wave" requests + a badge count (drives the You-tab dot). */
export function useContactRequests(accountId: string | null) {
  return useQuery({
    queryKey: qk.contactRequests(accountId as string),
    queryFn: () => fetchContactRequests(accountId as string),
    enabled: !!accountId,
    refetchInterval: REFETCH_MS,
  })
}

/** Zone leaderboard — the live current-week ranked board, keyed by zone ('' = All zones) + week id.
 *  The current week's board changes as scores land, so it refetches on the standard 30s interval
 *  (NOT the 1h staleTime used for frozen historical weeks). */
export function useLeaderboard(zone: string, week: string) {
  return useQuery({
    queryKey: qk.leaderboard(zone, week),
    queryFn: () => fetchLeaderboard(zone, week),
    refetchInterval: REFETCH_MS,
  })
}

/** Public list of ambassadors. Refetches every 5 min (stable data). */
export function useAmbassadors() {
  return useQuery({
    queryKey: qk.ambassadors,
    queryFn: fetchAmbassadors,
    refetchInterval: 5 * 60_000,
  })
}
