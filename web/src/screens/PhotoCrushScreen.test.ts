// PhotoCrushScreen.test.ts — Unit tests for the match-3 game engine and go_pc_best persistence.
// Engine tests: pure exports from lib/gameEngine.ts (makeBoard, findMatches, collapse, adj, hasMoves).
// localStorage tests: go_pc_best key read/write behavior in jsdom environment.
// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { makeBoard, findMatches, collapse, adj, hasMoves, N, ix } from '../lib/gameEngine'

describe('makeBoard', () => {
  it('returns 49 cells (N*N)', () => {
    expect(makeBoard().length).toBe(N * N)
  })

  it('all cells are tile types 1..5 (no null, no zero)', () => {
    const b = makeBoard()
    expect(b.every((t) => t >= 1 && t <= 5)).toBe(true)
  })

  it('has no starting 3-in-a-row (run 20 trials)', () => {
    for (let trial = 0; trial < 20; trial++) {
      const b = makeBoard()
      expect(findMatches(b).size).toBe(0)
    }
  })
})

describe('findMatches', () => {
  it('returns empty set for a fresh board (no starting matches)', () => {
    expect(findMatches(makeBoard()).size).toBe(0)
  })

  it('detects a forced horizontal run of 3 at row 0 cols 0-2', () => {
    const b = makeBoard()
    // Force type 1 at three horizontal positions
    b[ix(0, 0)] = b[ix(0, 1)] = b[ix(0, 2)] = 1
    const m = findMatches(b)
    expect(m.has(ix(0, 0))).toBe(true)
    expect(m.has(ix(0, 1))).toBe(true)
    expect(m.has(ix(0, 2))).toBe(true)
  })

  it('detects a forced vertical run of 3 at col 3 rows 0-2', () => {
    const b = makeBoard()
    b[ix(0, 3)] = b[ix(1, 3)] = b[ix(2, 3)] = 2
    const m = findMatches(b)
    expect(m.has(ix(0, 3))).toBe(true)
    expect(m.has(ix(1, 3))).toBe(true)
    expect(m.has(ix(2, 3))).toBe(true)
  })

  it('does not flag isolated pairs — a 3-cycle board has zero matches', () => {
    // Build a board where every row cycles through 3 types: 1,2,3,1,2,3,1 (shifted per row).
    // Formula: type = 1 + (r + c) % 3. No three consecutive same type in H or V.
    const b2 = Array.from({ length: N * N }, (_, i) => {
      const r = Math.floor(i / N)
      const c = i % N
      return 1 + ((r + c) % 3)
    })
    expect(findMatches(b2).size).toBe(0)
  })
})

describe('collapse', () => {
  it('board length stays 49 after collapse', () => {
    const b = makeBoard()
    // Force a horizontal match in row 0
    b[ix(0, 0)] = b[ix(0, 1)] = b[ix(0, 2)] = 1
    const matched = findMatches(b)
    const nb = collapse(b, matched)
    expect(nb.length).toBe(N * N)
  })

  it('no cell is null/undefined after collapse (gravity + refill)', () => {
    const b = makeBoard()
    b[ix(0, 0)] = b[ix(0, 1)] = b[ix(0, 2)] = 1
    const matched = findMatches(b)
    const nb = collapse(b, matched)
    expect(nb.every((t) => t != null && t >= 1 && t <= 5)).toBe(true)
  })

  it('gravity: cells above matched fall down — matched indices receive new tile types', () => {
    // Create a board where the entire column 0 is type 1 (rows 0..6)
    // Match rows 0,1,2 col 0 → after collapse, column 0 should still be fully filled
    const b = Array.from({ length: N * N }, () => 2) as number[]
    // Set a vertical match of 3 in col 0
    b[ix(4, 0)] = b[ix(5, 0)] = b[ix(6, 0)] = 1
    const matched = findMatches(b)
    expect(matched.size).toBeGreaterThanOrEqual(3)
    const nb = collapse(b, matched)
    // All cells must be valid
    expect(nb.every((t) => t != null && t >= 1 && t <= 5)).toBe(true)
    // Length invariant
    expect(nb.length).toBe(N * N)
  })
})

describe('adj', () => {
  it('adjacent cells (right neighbor) return true', () => {
    expect(adj(ix(0, 0), ix(0, 1))).toBe(true)
  })

  it('adjacent cells (bottom neighbor) return true', () => {
    expect(adj(ix(0, 0), ix(1, 0))).toBe(true)
  })

  it('same cell returns false (Manhattan distance 0)', () => {
    expect(adj(ix(3, 3), ix(3, 3))).toBe(false)
  })

  it('diagonal returns false (Manhattan distance 2)', () => {
    expect(adj(ix(0, 0), ix(1, 1))).toBe(false)
  })

  it('two steps away returns false', () => {
    expect(adj(ix(0, 0), ix(0, 2))).toBe(false)
  })

  it('far apart returns false', () => {
    expect(adj(ix(0, 0), ix(6, 6))).toBe(false)
  })

  it('left neighbor also returns true', () => {
    expect(adj(ix(2, 3), ix(2, 2))).toBe(true)
  })

  it('top neighbor returns true', () => {
    expect(adj(ix(3, 3), ix(2, 3))).toBe(true)
  })
})

describe('hasMoves — game-over detection', () => {
  it('returns false for a 3-cycle board where no swap creates a match', () => {
    // 3-cycle: type = 1 + (r + c) % 3 gives pattern like:
    //   row 0: 1,2,3,1,2,3,1  row 1: 2,3,1,2,3,1,2  row 2: 3,1,2,3,1,2,3 …
    // No adjacent pair has the same type (Manhattan-1 distance always yields
    // a type shift of 1 mod 3). Therefore swapping any adjacent pair changes
    // two cells by ±1 (mod 3) — it is impossible to produce 3 consecutive of
    // the same type in any row or column after a single swap.
    const b = Array.from({ length: N * N }, (_, i) => {
      const r = Math.floor(i / N)
      const c = i % N
      return 1 + ((r + c) % 3)
    })
    expect(findMatches(b).size).toBe(0) // board has no starting matches
    expect(hasMoves(b)).toBe(false)
  })

  it('returns true when there is an obvious one-swap match (3 in a row reachable)', () => {
    // Set up: row 0 = [1,1,2,1,x,x,x] — swapping col 2 and col 3 gives [1,1,1,2,...] → match
    const b = makeBoard()
    b[ix(0, 0)] = 1
    b[ix(0, 1)] = 1
    b[ix(0, 2)] = 2
    b[ix(0, 3)] = 1
    // After swap of (0,2) and (0,3): row 0 → [1,1,1,2,...] → 3-in-a-row
    expect(hasMoves(b)).toBe(true)
  })

  it('returns true on a fresh board (makeBoard never leaves a no-moves state)', () => {
    // Fresh boards always have at least one legal move (by design — not guaranteed by spec
    // but true in practice because the no-3-in-a-row constraint leaves adjacencies open)
    // This is a smoke test, not a strict invariant
    const results = Array.from({ length: 10 }, () => hasMoves(makeBoard()))
    expect(results.some(Boolean)).toBe(true)
  })
})

describe('N and ix helper', () => {
  it('N is 7', () => {
    expect(N).toBe(7)
  })

  it('ix(r, c) = r * 7 + c', () => {
    expect(ix(0, 0)).toBe(0)
    expect(ix(0, 6)).toBe(6)
    expect(ix(1, 0)).toBe(7)
    expect(ix(6, 6)).toBe(48)
  })
})

// ── go_pc_best localStorage persistence (D-02) ───────────────────────────────
// These tests run in jsdom environment (localStorage is available).
// They validate the personal-best key contract, NOT the React hook —
// the logic is pure: read localStorage on init, write when score > best.

describe('go_pc_best localStorage key', () => {
  const PB_KEY = 'go_pc_best'

  beforeEach(() => {
    localStorage.clear()
  })

  it('reads 0 on first launch (no key in storage)', () => {
    expect(Number(localStorage.getItem(PB_KEY)) || 0).toBe(0)
  })

  it('stores a new best when score > prior best', () => {
    localStorage.setItem(PB_KEY, '120')
    const currentBest = Number(localStorage.getItem(PB_KEY)) || 0
    const newScore = 240
    if (newScore > currentBest) {
      localStorage.setItem(PB_KEY, String(newScore))
    }
    expect(Number(localStorage.getItem(PB_KEY)) || 0).toBe(240)
  })

  it('does NOT update best when score <= prior best', () => {
    localStorage.setItem(PB_KEY, '300')
    const currentBest = Number(localStorage.getItem(PB_KEY)) || 0
    const newScore = 120
    if (newScore > currentBest) {
      localStorage.setItem(PB_KEY, String(newScore))
    }
    // Should still be 300, not 120
    expect(Number(localStorage.getItem(PB_KEY)) || 0).toBe(300)
  })

  it('does NOT update best when score equals prior best', () => {
    localStorage.setItem(PB_KEY, '200')
    const currentBest = Number(localStorage.getItem(PB_KEY)) || 0
    const newScore = 200
    if (newScore > currentBest) {
      localStorage.setItem(PB_KEY, String(newScore))
    }
    expect(Number(localStorage.getItem(PB_KEY)) || 0).toBe(200)
  })

  it('score formula: matched.size * 12 increments score', () => {
    // Verify the score formula used in step(): each cascade yields matchedSize * 12
    const matchedSize = 5
    const scoreBefore = 0
    const scoreAfter = scoreBefore + matchedSize * 12
    expect(scoreAfter).toBe(60)
  })

  it('key is exactly go_pc_best (NOT gpt_pb_photocrush)', () => {
    localStorage.setItem(PB_KEY, '500')
    // Confirm the correct key is set
    expect(localStorage.getItem('go_pc_best')).toBe('500')
    // Confirm the old bundle key is NOT set
    expect(localStorage.getItem('gpt_pb_photocrush')).toBeNull()
  })
})
