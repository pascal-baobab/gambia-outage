// seed-data.ts — the launch seed, keyed by slug. 7 macro areas (level=region) + 54 quarters
// (level=settlement). Names are real; all counters start at 0 in prod.
//
// GEO (2026-06-01 fix): quarter centroids are now REAL coordinates, not a decorative scatter.
//   • town/village/city quarters  → OSM HOTOSM "Gambia populated places" (HDX export)
//   • suburb/neighbourhood quarters (Bakau, Fajara, Kololi, Kotu, Bijilo, the Serrekunda wards…)
//     → OSM via Nominatim (the HOTOSM export omits place=suburb)
//   • Banjul island micro-quarters → hand-set intra-island coordinates (not mapped as place nodes)
//   Every centroid was validated by point-in-polygon against the real geoBoundaries ADM2 district
//   boundaries (53/54 fall inside their expected macro; Kololi is administratively Kombo North but
//   kept under the Kanifing tourism cluster by design — snapping is nearest-real-centroid, so a GPS
//   at Kololi still resolves to the Kololi quarter regardless of macro grouping).
//   Region zones additionally carry a real MultiPolygon (`geojson`, dissolved from the same ADM2
//   districts, simplified ~90 m) + `bbox`, used by the server snap hook for point-in-polygon
//   region fallback when a GPS point is far from every seeded settlement centroid.
import { readFileSync } from 'node:fs'

export type SeedLevel = 'region' | 'district' | 'settlement'

export interface SeedZone {
  id: string
  level: SeedLevel
  name: string
  display_region: string
  parent: string | null
  lat: number
  lng: number
  geojson?: unknown
  bbox?: number[]
}

// Real macro-area coordinates [lat, lng] — design/map-zoom.jsx GMZ_MACRO
const GMZ_MACRO: Record<string, [number, number]> = {
  banjul: [13.4549, -16.579],
  kanifing: [13.4383, -16.6781],
  brikama: [13.2714, -16.6494],
  kerewan: [13.4894, -16.0858],
  mansakonko: [13.452, -15.546],
  janjanbureh: [13.5366, -14.766],
  basse: [13.3082, -14.2151],
}

// Macro display labels (LGA/region name shown in UI) + town name
const MACRO: Array<{ id: string; name: string; display_region: string }> = [
  { id: 'banjul', name: 'Banjul', display_region: 'Banjul' },
  { id: 'kanifing', name: 'Kanifing', display_region: 'Kanifing' },
  { id: 'brikama', name: 'Brikama', display_region: 'West Coast' },
  { id: 'kerewan', name: 'Kerewan', display_region: 'North Bank' },
  { id: 'mansakonko', name: 'Mansa Konko', display_region: 'Lower River' },
  { id: 'janjanbureh', name: 'Janjanbureh', display_region: 'Central River' },
  { id: 'basse', name: 'Basse', display_region: 'Upper River' },
]

// 54 principal quarters grouped under each macro — design/quarters.jsx GPT_QUARTERS (names only)
const QUARTERS: Record<string, string[]> = {
  banjul: ['Half Die', 'Soldier Town', 'Portuguese Town', 'Box Bar', 'Crab Island', 'Tobacco Road', 'Jollof Town', 'Banjul New Town'],
  kanifing: ['Serrekunda', 'Bundung', 'Tallinding', 'Latrikunda Sabiji', 'Dippa Kunda', 'Latrikunda German', 'Manjai Kunda', 'Bakoteh', 'New Jeshwang', 'Ebo Town', 'Kololi', 'Bakau', 'Fajara', 'Kotu'],
  brikama: ['Brikama', 'Sukuta', 'Old Yundum', 'Tanji', 'Lamin', 'Gunjur', 'Bijilo', 'Brufut', 'Busumbala', 'Sanyang', 'Tujereng', 'Farato', 'Ghana Town'],
  kerewan: ['Farafenni', 'Essau', 'Barra', 'Illiasa', 'Kerewan', 'Ngeyen Sanjal'],
  mansakonko: ['Soma', 'Mansa Konko', 'Pakali Ba', 'Toniataba'],
  janjanbureh: ['Janjanbureh', 'Bansang', 'Brikama Ba', 'Kuntaur', 'Wassu'],
  basse: ['Basse Santa Su', 'Sabi', 'Gambissara', 'Fatoto', 'Diabugu'],
}

// Real quarter centroids [lat, lng], keyed `${macro}-${i}` (index matches QUARTERS order). See header.
const REAL: Record<string, [number, number]> = {
  'banjul-0': [13.4486, -16.5762], // Half Die
  'banjul-1': [13.4523, -16.5794], // Soldier Town
  'banjul-2': [13.4509, -16.5781], // Portuguese Town
  'banjul-3': [13.4552, -16.5806], // Box Bar
  'banjul-4': [13.4541, -16.5836], // Crab Island
  'banjul-5': [13.4501, -16.5752], // Tobacco Road
  'banjul-6': [13.4533, -16.5818], // Jollof Town
  'banjul-7': [13.4559, -16.5829], // Banjul New Town
  'kanifing-0': [13.438762, -16.674807], // Serrekunda
  'kanifing-1': [13.424118, -16.685054], // Bundung
  'kanifing-2': [13.425937, -16.672221], // Tallinding
  'kanifing-3': [13.411142, -16.673386], // Latrikunda Sabiji
  'kanifing-4': [13.438313, -16.688438], // Dippa Kunda
  'kanifing-5': [13.4156, -16.6792], // Latrikunda German
  'kanifing-6': [13.442236, -16.698137], // Manjai Kunda
  'kanifing-7': [13.4527, -16.6993], // Bakoteh
  'kanifing-8': [13.442885, -16.670608], // New Jeshwang
  'kanifing-9': [13.436587, -16.668014], // Ebo Town
  'kanifing-10': [13.440429, -16.715566], // Kololi (admin Kombo North; kept under Kanifing cluster)
  'kanifing-11': [13.477453, -16.677909], // Bakau
  'kanifing-12': [13.46898, -16.691404], // Fajara
  'kanifing-13': [13.455273, -16.703428], // Kotu
  'brikama-0': [13.274391, -16.645443], // Brikama
  'brikama-1': [13.414761, -16.707618], // Sukuta
  'brikama-2': [13.367589, -16.684172], // Old Yundum
  'brikama-3': [13.35856, -16.797509], // Tanji
  'brikama-4': [13.387352, -16.643892], // Lamin
  'brikama-5': [13.17602, -16.759896], // Gunjur
  'brikama-6': [13.421922, -16.732758], // Bijilo
  'brikama-7': [13.381344, -16.751729], // Brufut
  'brikama-8': [13.333378, -16.66672], // Busumbala
  'brikama-9': [13.267559, -16.758371], // Sanyang
  'brikama-10': [13.317927, -16.788919], // Tujereng
  'brikama-11': [13.3436, -16.665], // Farato (near Yundum/Lamin; Kombo Central)
  'brikama-12': [13.3848204, -16.7678123], // Ghana Town (Kombo North; OSM/Nominatim place=village)
  'kerewan-0': [13.572124, -15.597947], // Farafenni
  'kerewan-1': [13.485769, -16.526196], // Essau
  'kerewan-2': [13.485578, -16.543455], // Barra
  'kerewan-3': [13.519996, -15.7032], // Illiasa
  'kerewan-4': [13.493636, -16.089092], // Kerewan
  'kerewan-5': [13.599024, -15.450983], // Ngeyen Sanjal
  'mansakonko-0': [13.444642, -15.535526], // Soma
  'mansakonko-1': [13.458544, -15.53404], // Mansa Konko
  'mansakonko-2': [13.520159, -15.243563], // Pakali Ba
  'mansakonko-3': [13.438909, -15.577446], // Toniataba
  'janjanbureh-0': [13.539083, -14.761229], // Janjanbureh
  'janjanbureh-1': [13.435774, -14.658788], // Bansang
  'janjanbureh-2': [13.537606, -14.927528], // Brikama Ba
  'janjanbureh-3': [13.670615, -14.889486], // Kuntaur
  'janjanbureh-4': [13.692398, -14.878805], // Wassu
  'basse-0': [13.31004, -14.215003], // Basse Santa Su
  'basse-1': [13.238928, -14.194213], // Sabi
  'basse-2': [13.238248, -14.310814], // Gambissara
  'basse-3': [13.399247, -13.891031], // Fatoto
  'basse-4': [13.331221, -13.950149], // Diabugu
}

// Region MultiPolygons + bbox, dissolved from geoBoundaries ADM2 districts (CC-BY), simplified ~90 m.
type RegionGeo = { type: 'MultiPolygon'; coordinates: number[][][][]; bbox: number[] }
const REGION_GEO = JSON.parse(
  readFileSync(new URL('./geo/region-polygons.json', import.meta.url), 'utf8'),
) as Record<string, RegionGeo>

/** Build the full ordered seed list: 7 regions (with real boundary geojson) then their 54 settlements. */
export function buildSeed(): SeedZone[] {
  const out: SeedZone[] = []
  for (const m of MACRO) {
    const [lat, lng] = GMZ_MACRO[m.id]
    const rg = REGION_GEO[m.id]
    out.push({
      id: m.id,
      level: 'region',
      name: m.name,
      display_region: m.display_region,
      parent: null,
      lat,
      lng,
      geojson: rg ? { type: rg.type, coordinates: rg.coordinates } : null,
      bbox: rg ? rg.bbox : undefined,
    })
  }
  for (const m of MACRO) {
    const names = QUARTERS[m.id]
    names.forEach((name, i) => {
      const key = `${m.id}-${i}`
      const c = REAL[key]
      if (!c) throw new Error(`seed-data: missing real centroid for ${key} (${name})`)
      out.push({
        id: key,
        level: 'settlement',
        name,
        display_region: m.display_region,
        parent: m.id,
        lat: c[0],
        lng: c[1],
      })
    })
  }
  return out
}

export const SEED = buildSeed()
export const REGION_COUNT = SEED.filter((z) => z.level === 'region').length
export const SETTLEMENT_COUNT = SEED.filter((z) => z.level === 'settlement').length
