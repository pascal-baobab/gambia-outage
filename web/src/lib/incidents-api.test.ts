// incidents-api.test.ts — structural source-scan tests for the submitIncident + fetchIncidents
// additions to api.ts. Verifies the contract:
//   1. IncidentRow and IncidentFeedResp types are exported
//   2. submitIncident POSTs to the PB native records route (NOT /api/go/* — no 16 KB cap)
//   3. submitIncident NEVER manually sets a Content-Type header (FormData sets the multipart boundary)
//   4. fetchIncidents GETs /api/go/incidents (the custom feed route)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const apiSrc = readFileSync(resolve(ROOT, 'web/src/lib/api.ts'), 'utf8')

describe('incidents api.ts contract (INC-02, INC-03)', () => {
  it('exports IncidentRow type', () => {
    expect(apiSrc).toContain('export type IncidentRow')
  })

  it('exports IncidentFeedResp type', () => {
    expect(apiSrc).toContain('export type IncidentFeedResp')
  })

  it('exports submitIncident function', () => {
    expect(apiSrc).toContain('export async function submitIncident')
  })

  it('exports fetchIncidents function', () => {
    expect(apiSrc).toContain('export const fetchIncidents')
  })

  it('submitIncident POSTs to /api/collections/incident_reports/records (PB native route)', () => {
    expect(apiSrc).toContain('/api/collections/incident_reports/records')
  })

  it('submitIncident does NOT manually set Content-Type (FormData sets multipart boundary)', () => {
    // Extract only the submitIncident function block (from its declaration to the next export)
    const startIdx = apiSrc.indexOf('export async function submitIncident')
    expect(startIdx).toBeGreaterThan(-1)
    const endIdx = apiSrc.indexOf('\nexport ', startIdx + 1)
    const fn = endIdx > startIdx ? apiSrc.slice(startIdx, endIdx) : apiSrc.slice(startIdx)
    // Must NOT set Content-Type manually in the submitIncident body
    expect(fn).not.toContain("'Content-Type'")
    expect(fn).not.toContain('"Content-Type"')
  })

  it('fetchIncidents GETs /incidents route via getJSON', () => {
    expect(apiSrc).toContain('/incidents?')
  })

  // Guards the server↔client feed-key contract. A prior bug had the server emit `{ items }`
  // while the client typed `{ rows }` and read `data.rows` — typecheck stayed green (generic
  // cast) and the feed silently rendered empty. This asserts all three sites agree on `rows`.
  it('feed response key agrees across server build, client type, and screen read (rows)', () => {
    const goSrc = readFileSync(resolve(ROOT, 'pb/pb_hooks/lib/go.js'), 'utf8')
    const screenSrc = readFileSync(resolve(ROOT, 'web/src/screens/IncidentScreen.tsx'), 'utf8')

    // Server: buildIncidentFeed must return { rows: ... }, never { items: ... }
    const bStart = goSrc.indexOf('function buildIncidentFeed')
    expect(bStart).toBeGreaterThan(-1)
    const bBlock = goSrc.slice(bStart, bStart + 1200)
    expect(bBlock).toContain('rows:')
    expect(bBlock).not.toContain('items:')

    // Client type + screen read must use the same key
    expect(apiSrc).toContain('IncidentFeedResp = { rows: IncidentRow[] }')
    expect(screenSrc).toContain('.data?.rows')
  })

  // Guards against re-introducing the stored-XSS sink (CR-01): the map popup must build
  // reporter text via DOM textContent, never string-concatenated HTML. The server tag-strip
  // is a content cleaner, not an HTML-context encoder, so the sink must escape structurally.
  it('map incident popup never interpolates inc.text into HTML (XSS sink guard)', () => {
    const mapSrc = readFileSync(resolve(ROOT, 'web/src/components/map/GambiaMapLive.tsx'), 'utf8')
    expect(mapSrc).not.toMatch(/\$\{inc\.text\}/)
    expect(mapSrc).toContain('.textContent = inc.text')
  })

  it('IncidentRow shape includes all required fields', () => {
    // The type must include the 7 fields from the backend contract
    const typeStart = apiSrc.indexOf('export type IncidentRow')
    expect(typeStart).toBeGreaterThan(-1)
    const typeBlock = apiSrc.slice(typeStart, typeStart + 300)
    expect(typeBlock).toContain('id:')
    expect(typeBlock).toContain('category:')
    expect(typeBlock).toContain('text:')
    expect(typeBlock).toContain('lat:')
    expect(typeBlock).toContain('lng:')
    expect(typeBlock).toContain('photoUrl:')
    expect(typeBlock).toContain('createdAt:')
    expect(typeBlock).toContain('ago:')
  })
})
