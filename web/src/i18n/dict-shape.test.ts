// dict-shape.test.ts — runtime backstop beyond the `: Strings` type-check: every language must have
// the EXACT same key tree and the same function arity as `en`, so no surface is silently left blank.
import { describe, it, expect } from 'vitest'
import { en } from './en'
import { fr } from './fr'
import { ar } from './ar'

type AnyObj = Record<string, unknown>

// Returns a sorted list of "a.b.c" leaf paths; functions are tagged with their arity as "a.b#2".
function shape(obj: AnyObj, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'function') out.push(`${path}#${v.length}`)
    else if (v && typeof v === 'object') out.push(...shape(v as AnyObj, path))
    else out.push(path)
  }
  return out.sort()
}

describe('dictionary shape parity', () => {
  const enShape = shape(en as unknown as AnyObj)

  it('fr matches en key tree and function arity', () => {
    expect(shape(fr as unknown as AnyObj)).toEqual(enShape)
  })

  it('ar matches en key tree and function arity', () => {
    expect(shape(ar as unknown as AnyObj)).toEqual(enShape)
  })
})
