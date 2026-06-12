// seed.ts — idempotent seed of zones (regions + settlements) into Pocketbase.
// Keyed by slug id → re-running is a no-op (upsert). Run: `pnpm -C data seed`.
// Requires PB running + superuser creds in env (see .env.example).
import { config } from 'dotenv'
import PocketBase from 'pocketbase'
// load the repo-root .env regardless of CWD
config({ path: new URL('../.env', import.meta.url).pathname })
import { SEED, REGION_COUNT, SETTLEMENT_COUNT, type SeedZone } from './seed-data'

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const EMAIL = process.env.PB_ADMIN_EMAIL || ''
const PASSWORD = process.env.PB_ADMIN_PASSWORD || ''

async function upsertZone(pb: PocketBase, z: SeedZone): Promise<'created' | 'updated'> {
  const body: Record<string, unknown> = {
    id: z.id,
    level: z.level,
    name: z.name,
    display_region: z.display_region,
    parent: z.parent ?? '',
    lat: z.lat,
    lng: z.lng,
  }
  // regions carry the real boundary polygon (point-in-polygon snap fallback) + bbox
  if (z.geojson !== undefined) body.geojson = z.geojson
  if (z.bbox !== undefined) body.bbox = z.bbox
  try {
    await pb.collection('zones').getOne(z.id)
    await pb.collection('zones').update(z.id, body)
    return 'updated'
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 404) {
      await pb.collection('zones').create(body)
      return 'created'
    }
    throw err
  }
}

async function main() {
  const pb = new PocketBase(PB_URL)
  pb.autoCancellation(false)

  if (!EMAIL || !PASSWORD) {
    throw new Error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (see .env.example).')
  }
  await pb.collection('_superusers').authWithPassword(EMAIL, PASSWORD)

  let created = 0
  let updated = 0
  // regions first (parents), then settlements (children) — preserves the FK order
  for (const z of SEED) {
    const r = await upsertZone(pb, z)
    if (r === 'created') created++
    else updated++
  }

  const regions = await pb.collection('zones').getList(1, 1, { filter: "level='region'" })
  const settlements = await pb.collection('zones').getList(1, 1, { filter: "level='settlement'" })

  console.log(`✓ seed complete — created ${created}, updated ${updated}`)
  console.log(`  regions=${regions.totalItems} (expected ${REGION_COUNT}), settlements=${settlements.totalItems} (expected ${SETTLEMENT_COUNT})`)

  if (regions.totalItems !== REGION_COUNT || settlements.totalItems !== SETTLEMENT_COUNT) {
    throw new Error('Seed count mismatch — expected 7 regions + 54 settlements.')
  }
}

main().catch((e) => {
  console.error('✗ seed failed:', e?.message || e)
  process.exit(1)
})
