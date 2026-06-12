// netGate.ts — decide whether the map (Leaflet JS + CSS + raster tiles) may load.
//
// The store (app/store.ts) already auto-detects saveData / 2g / slow-2g into its
// `dataSaver` flag and exposes a manual toggle, so the canonical gate is simply
// `!dataSaver`. This helper keeps the rule named + self-contained at the call
// site and re-checks `navigator.connection` defensively in case the network
// dropped to 2G after the store initialised.
type NetInfo = { saveData?: boolean; effectiveType?: string }

/** True when it is acceptable to load Leaflet + tiles. */
export function shouldLoadMap(dataSaver: boolean): boolean {
  if (dataSaver) return false // explicit toggle / store auto-detect wins
  if (typeof navigator !== 'undefined') {
    const c = (navigator as Navigator & { connection?: NetInfo }).connection
    if (c) {
      if (c.saveData) return false
      if (c.effectiveType === '2g' || c.effectiveType === 'slow-2g') return false
    }
  }
  return true
}
