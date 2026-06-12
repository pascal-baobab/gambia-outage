// gen-avatars.ts — build-time generator for the curated, diverse avatar set.
//
// Why pre-generate: DiceBear (@dicebear/core + @dicebear/collection) is a DEV-ONLY dependency.
// We render a small, curated set of human-person avatars at build time and emit them as static
// SVG strings into web/src/lib/avatars.generated.ts, so the RUNTIME bundle ships only ~40 small
// SVG strings — no DiceBear code, critical for bandwidth in The Gambia.
//
// Run: pnpm -C web gen:avatars
//
// Demographic curation (reflects Gambian demographics, see CLAUDE.md profile spec):
//   28 African (70%), 6 Indian (15%), 6 Caucasian (15%); mix of women and men.
//   Arab-origin Gambians counted in the african group (hijab/turban via top param).
// Stable seeds → deterministic output (re-running yields identical SVGs).

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

type Group = 'african' | 'indian' | 'caucasian'

interface Spec {
  id: string
  group: Group
  skin: string // hex, no '#'
  sex: 'w' | 'm'
}

// Hair tops: women → longer/afro/braided/headwear; men → short, neat, headwear.
const WOMEN_TOPS = ['curly', 'curvy', 'fro', 'longButNotTooLong', 'straight01', 'bob'] as const
const WOMEN_TOPS_EXT = ['bun', 'dreads', 'froBand', 'bigHair', 'straight02', 'miaWallace'] as const
const WOMEN_TOPS_HEADWEAR = ['hijab', 'turban'] as const
const MEN_TOPS = ['shortFlat', 'shortRound', 'shortCurly', 'shortWaved', 'theCaesar', 'shavedSides'] as const
const MEN_TOPS_EXT = ['sides', 'dreads01', 'shaggy', 'theCaesarAndSidePart'] as const
const MEN_TOPS_HEADWEAR = ['hat', 'turban'] as const
const MEN_FACIAL = ['beardLight', 'beardMedium', 'moustacheFancy'] as const

// Constrain face expressions to neutral/friendly options.
// Excludes: hearts, winkWacky, dizzy, eyeRoll, xDizzy, cry, roll (scary/cartoonish on dark skin),
// screamOpen, vomit, grimace, eating, tongue (inappropriate for a civic app).
// Only default/side: clearly visible at 80px on ALL skin tones.
// happy/squint/squintHappy render as thin lines at small sizes → look like no eyes.
const EYES_ALL       = ['default', 'side'] as const
// For very dark skins (3b2219, 5c3b28, 7a4b32, 8d5524): include 'surprised' — wide-open eyes
// expose more white sclera so the dark iris reads against the dark face.
const EYES_DARK_SKIN = ['default', 'side', 'surprised'] as const
// Only positive/friendly moods — smile, twinkle, default.
const MOUTH_NEUTRAL  = ['smile', 'twinkle', 'default'] as const

// Medium-to-dark skin hex values — get lighter hairColor so eyebrows read against the face.
// 3b2219 = near-black · 5c3b28 = deep brown · 7a4b32 = medium-dark brown · 8d5524 = warm dark
const DARK_SKINS = new Set(['3b2219', '5c3b28', '7a4b32', '8d5524'])

// 16 Classic — 12 African (75%), 2 Indian (12.5%), 2 Caucasian (12.5%)
// 24 New — 16 African + 4 Indian + 4 Caucasian → total 40: 28 African (70%), 6 Indian (15%), 6 Caucasian (15%)
// Arab-origin Gambians counted in african group; hijab/turban via top param (not new group strings).
const SPECS: Spec[] = [
  // ── CLASSIC (16 legacy IDs — must never be removed or renamed) ──
  // African women
  { id: 'african-w-1', group: 'african', skin: '3b2219', sex: 'w' },
  { id: 'african-w-2', group: 'african', skin: '5c3b28', sex: 'w' },
  { id: 'african-w-3', group: 'african', skin: '7a4b32', sex: 'w' },
  { id: 'african-w-4', group: 'african', skin: '8d5524', sex: 'w' },
  { id: 'african-w-5', group: 'african', skin: '5c3b28', sex: 'w' },
  { id: 'african-w-6', group: 'african', skin: '3b2219', sex: 'w' },
  // African men
  { id: 'african-m-1', group: 'african', skin: '3b2219', sex: 'm' },
  { id: 'african-m-2', group: 'african', skin: '5c3b28', sex: 'm' },
  { id: 'african-m-3', group: 'african', skin: '7a4b32', sex: 'm' },
  { id: 'african-m-4', group: 'african', skin: '8d5524', sex: 'm' },
  { id: 'african-m-5', group: 'african', skin: '7a4b32', sex: 'm' },
  { id: 'african-m-6', group: 'african', skin: '8d5524', sex: 'm' },
  // Indian
  { id: 'indian-w-1', group: 'indian', skin: 'c08552', sex: 'w' },
  { id: 'indian-m-1', group: 'indian', skin: 'a5683f', sex: 'm' },
  // Caucasian
  { id: 'caucasian-w-1', group: 'caucasian', skin: 'f8d4c0', sex: 'w' },
  { id: 'caucasian-m-1', group: 'caucasian', skin: 'edb98a', sex: 'm' },

  // ── NEW (24 entries — all genuinely new IDs) ──
  // African women — 6 new (total african women: 12)
  { id: 'african-w-7',  group: 'african', skin: '3b2219', sex: 'w' },  // hijab via WOMEN_TOPS_HEADWEAR
  { id: 'african-w-8',  group: 'african', skin: '7a4b32', sex: 'w' },  // bun via WOMEN_TOPS_EXT
  { id: 'african-w-9',  group: 'african', skin: '8d5524', sex: 'w' },  // dreads via WOMEN_TOPS_EXT
  { id: 'african-w-10', group: 'african', skin: '5c3b28', sex: 'w' },  // froBand via WOMEN_TOPS_EXT
  { id: 'african-w-11', group: 'african', skin: '5c3b28', sex: 'w' },  // turban via WOMEN_TOPS_HEADWEAR
  { id: 'african-w-12', group: 'african', skin: '7a4b32', sex: 'w' },  // bigHair via WOMEN_TOPS_EXT
  // African men — 6 new (total african men: 12)
  { id: 'african-m-7',  group: 'african', skin: '3b2219', sex: 'm' },  // hat via MEN_TOPS_HEADWEAR
  { id: 'african-m-8',  group: 'african', skin: '5c3b28', sex: 'm' },  // sides via MEN_TOPS_EXT
  { id: 'african-m-9',  group: 'african', skin: '7a4b32', sex: 'm' },  // dreads01 via MEN_TOPS_EXT
  { id: 'african-m-10', group: 'african', skin: '8d5524', sex: 'm' },  // shaggy via MEN_TOPS_EXT
  { id: 'african-m-11', group: 'african', skin: '5c3b28', sex: 'm' },  // turban via MEN_TOPS_HEADWEAR
  { id: 'african-m-12', group: 'african', skin: '5c3b28', sex: 'm' },  // theCaesarAndSidePart
  // Arab-origin Gambian (counted in african group; hijab/turban mandatory for Spec)
  { id: 'arab-w-1', group: 'african', skin: 'ae5d29', sex: 'w' },  // hijab
  { id: 'arab-m-1', group: 'african', skin: 'ae5d29', sex: 'm' },  // turban
  { id: 'arab-w-2', group: 'african', skin: 'd08b5b', sex: 'w' },  // hijab
  { id: 'arab-m-2', group: 'african', skin: 'd08b5b', sex: 'm' },  // hat
  // Indian — 4 new (total: 6)
  { id: 'indian-w-2',  group: 'indian', skin: 'c08552', sex: 'w' },
  { id: 'indian-w-3',  group: 'indian', skin: 'a5683f', sex: 'w' },
  { id: 'indian-m-2',  group: 'indian', skin: 'c08552', sex: 'm' },
  { id: 'indian-m-3',  group: 'indian', skin: 'a5683f', sex: 'm' },
  // Caucasian — 4 new (total: 6)
  { id: 'caucasian-w-2', group: 'caucasian', skin: 'f8d4c0', sex: 'w' },
  { id: 'caucasian-w-3', group: 'caucasian', skin: 'edb98a', sex: 'w' },
  { id: 'caucasian-m-2', group: 'caucasian', skin: 'edb98a', sex: 'm' },
  { id: 'caucasian-m-3', group: 'caucasian', skin: 'f8d4c0', sex: 'm' },
]

// Stable, seed-derived pick from a list (deterministic per seed → reproducible builds).
function pick<T>(seed: string, salt: string, list: readonly T[]): T {
  let h = 0
  const s = seed + salt
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return list[h % list.length]
}

function minifySvg(svg: string): string {
  return svg
    .replace(/<\?xml[^>]*\?>/g, '') // strip XML decl
    .replace(/<!--[\s\S]*?-->/g, '') // strip comments
    .replace(/>\s+</g, '><') // whitespace between tags
    .replace(/\s{2,}/g, ' ') // collapse runs of whitespace
    .trim()
}

function build(spec: Spec): string {
  const isW = spec.sex === 'w'
  const id = spec.id

  // Determine top style. Arab-ID specs get deterministic headwear.
  // New IDs (w-7..12, m-7..12) draw from extended top lists; classic IDs stay with original lists.
  let top: string
  if (id.startsWith('arab-w-')) {
    top = pick(id, 'top', WOMEN_TOPS_HEADWEAR)
  } else if (id.startsWith('arab-m-')) {
    top = pick(id, 'top', MEN_TOPS_HEADWEAR)
  } else if (isW && /african-w-(7|8|9|10|11|12)/.test(id)) {
    // New african women: alternate between extended and headwear tops
    const useHeadwear = pick(id, 'hw', [false, false, true])
    top = useHeadwear ? pick(id, 'top', WOMEN_TOPS_HEADWEAR) : pick(id, 'top', WOMEN_TOPS_EXT)
  } else if (!isW && /african-m-(7|8|9|10|11|12)/.test(id)) {
    // New african men: alternate between extended and headwear tops
    const useHeadwear = pick(id, 'hw', [false, false, true])
    top = useHeadwear ? pick(id, 'top', MEN_TOPS_HEADWEAR) : pick(id, 'top', MEN_TOPS_EXT)
  } else if (isW) {
    top = pick(id, 'top', WOMEN_TOPS)
  } else {
    top = pick(id, 'top', MEN_TOPS)
  }

  // Give roughly half the men facial hair; women none.
  const wantsFacial = !isW && pick(id, 'fh', [true, false, true])

  // For very dark skins: use high-sclera eye styles + medium-brown hair so
  // eyebrows read against the dark face. For lighter skins: full neutral palette.
  const isDarkSkin = DARK_SKINS.has(spec.skin)
  // Dark skins: allow 'surprised' for wider sclera exposure; others: default/side only.
  const eyeStyle   = pick(id, 'eyes', isDarkSkin ? EYES_DARK_SKIN : EYES_ALL)
  const mouthStyle = pick(id, 'mouth', MOUTH_NEUTRAL)
  // Warm light-brown eyebrows on dark skin — high contrast against the dark face.
  const hairCol    = isDarkSkin ? ['bf8c60'] : undefined

  return createAvatar(avataaars, {
    seed: id,
    size: 80,
    skinColor: [spec.skin],
    top: [top],
    topProbability: 100,
    eyes: [eyeStyle],
    mouth: [mouthStyle],
    facialHair: wantsFacial ? [pick(id, 'fhk', MEN_FACIAL)] : [],
    facialHairProbability: wantsFacial ? 100 : 0,
    ...(hairCol ? { hairColor: hairCol } : {}),
    accessoriesProbability: 0,
    backgroundColor: ['FFFFFF'],
  }).toString()
}

const entries = SPECS.map((s) => ({ id: s.id, group: s.group, svg: minifySvg(build(s)) }))

// sanity
const counts = entries.reduce<Record<string, number>>((a, e) => ((a[e.group] = (a[e.group] ?? 0) + 1), a), {})
if (entries.length !== 40) throw new Error(`expected 40 avatars, got ${entries.length}`)
for (const e of entries) if (!e.svg.startsWith('<svg')) throw new Error(`avatar ${e.id} svg does not start with <svg`)

const header = `// AUTO-GENERATED by web/scripts/gen-avatars.ts — do not edit. Run: pnpm -C web gen:avatars
export interface AvatarPreset { id: string; group: 'african' | 'indian' | 'caucasian'; svg: string }
export const AVATARS: AvatarPreset[] = [
`
const body = entries
  .map((e) => `  { id: ${JSON.stringify(e.id)}, group: ${JSON.stringify(e.group)}, svg: ${JSON.stringify(e.svg)} },`)
  .join('\n')
const out = `${header}${body}\n]\n`

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '../src/lib/avatars.generated.ts')
writeFileSync(target, out, 'utf8')
console.log(`Wrote ${entries.length} avatars → ${target}`)
console.log('Group counts:', counts)
