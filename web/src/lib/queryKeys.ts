// queryKeys.ts — single source of truth for TanStack Query keys. Shared by the
// data hooks (useData.ts) and the realtime bridge (realtime-query.ts) so that
// SSE-driven invalidations hit exactly the caches the hooks populate.
export const qk = {
  snapshot: ['snapshot'] as const,
  national: ['national'] as const,
  macro: (id: string) => ['macro', id] as const,
  community: ['community'] as const,
  communityWeek: (weekId: string) => ['community', 'week', weekId] as const,
  // Shared across every "From Facebook" / LIVE surface (Home + Community + News). One cached query
  // instead of 5 independent self-fetchers → instant render on navigation + far fewer origin hits.
  social: ['social'] as const,
  feed: ['feed'] as const,
  stats: ['stats'] as const,
  communityLinks: ['community-links'] as const,
  // People directory (per-account: the list + the viewer's wave status are viewer-specific).
  people: (account: string) => ['people', account] as const,
  // Zone leaderboard — keyed by zone ('' = All zones) + current week id.
  leaderboard: (zone: string, week: string) => ['leaderboard', zone, week] as const,
  contactRequests: (account: string) => ['contact-requests', account] as const,
  ambassadors: ['ambassadors'] as const,
  // Incident feed — keyed by category ('' = all categories). 30s staleTime in useIncidentFeed.
  incidents: (category: string) => ['incidents', category] as const,
}
