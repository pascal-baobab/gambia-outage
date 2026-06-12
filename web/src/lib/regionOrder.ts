// regionOrder.ts — the 7 macro regions in geographic West→East order, with a full label and a
// 3-letter abbreviation. Shared by the Home "right now" bars (RightNowHero) and the global status
// strip (StatusStrip) so both read the country in the same order.
export const REGION_ORDER: { id: string; label: string; abbr: string }[] = [
  { id: 'banjul', label: 'Banjul', abbr: 'BJL' },
  { id: 'kanifing', label: 'Kanifing', abbr: 'KAN' },
  { id: 'brikama', label: 'W.Coast', abbr: 'W.C' },
  { id: 'kerewan', label: 'N.Bank', abbr: 'N.B' },
  { id: 'mansakonko', label: 'L.River', abbr: 'L.R' },
  { id: 'janjanbureh', label: 'C.River', abbr: 'C.R' },
  { id: 'basse', label: 'U.River', abbr: 'U.R' },
]
