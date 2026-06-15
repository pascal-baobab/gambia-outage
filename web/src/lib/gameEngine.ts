// gameEngine.ts — pure match-3 engine. No React, no DOM, no side effects.
// Ported verbatim in behavior from design/photo-crush.jsx lines 23-69.
// Exported for unit tests (PhotoCrushScreen.test.ts) and the game screen.

export const N = 7

/** Returns a random tile type in 1..5 */
export const rndType = (): number => 1 + Math.floor(Math.random() * 5)

/** Convert (row, col) to flat board index */
export const ix = (r: number, c: number): number => r * N + c

/**
 * Build a fresh 7×7 board with no starting 3-in-a-row.
 * Ported verbatim from photo-crush.jsx lines 27-35.
 */
export function makeBoard(): number[] {
  const b = new Array<number>(N * N)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let t: number
      let guard = 0
      do {
        t = rndType()
        guard++
      } while (
        guard < 20 &&
        ((c >= 2 && b[ix(r, c - 1)] === t && b[ix(r, c - 2)] === t) ||
          (r >= 2 && b[ix(r - 1, c)] === t && b[ix(r - 2, c)] === t))
      )
      b[ix(r, c)] = t
    }
  }
  return b
}

/**
 * Find all indices that are part of a horizontal or vertical run of ≥3.
 * Ported verbatim from photo-crush.jsx lines 36-47.
 */
export function findMatches(b: number[]): Set<number> {
  const m = new Set<number>()
  // Horizontal runs
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 2; c++) {
      const t = b[ix(r, c)]
      if (t == null) continue
      if (b[ix(r, c + 1)] === t && b[ix(r, c + 2)] === t) {
        let k = c
        while (k < N && b[ix(r, k)] === t) {
          m.add(ix(r, k))
          k++
        }
      }
    }
  }
  // Vertical runs
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N - 2; r++) {
      const t = b[ix(r, c)]
      if (t == null) continue
      if (b[ix(r + 1, c)] === t && b[ix(r + 2, c)] === t) {
        let k = r
        while (k < N && b[ix(k, c)] === t) {
          m.add(ix(k, c))
          k++
        }
      }
    }
  }
  return m
}

/**
 * Remove matched tiles, apply gravity (tiles fall down), and refill from the top.
 * Returns a new board array with no null cells.
 * Ported verbatim from photo-crush.jsx lines 48-56.
 */
export function collapse(b: number[], matched: Set<number>): number[] {
  // Working board admits null during the gravity pass; every cell is refilled before
  // return, so the final narrow to number[] is sound (no null survives).
  const nb: (number | null)[] = b.slice()
  matched.forEach((i) => {
    nb[i] = null
  })
  for (let c = 0; c < N; c++) {
    let write = N - 1
    for (let r = N - 1; r >= 0; r--) {
      if (nb[ix(r, c)] != null) {
        nb[ix(write, c)] = nb[ix(r, c)]
        if (write !== r) nb[ix(r, c)] = null
        write--
      }
    }
    for (let r = write; r >= 0; r--) nb[ix(r, c)] = rndType()
  }
  return nb as number[]
}

/**
 * True if indices a and b are orthogonally adjacent (Manhattan distance === 1).
 * Ported verbatim from photo-crush.jsx line 58.
 */
export const adj = (a: number, b: number): boolean => {
  const ar = (a / N) | 0
  const ac = a % N
  const br = (b / N) | 0
  const bc = b % N
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1
}

/**
 * True if any legal swap (adjacent pair) produces a match.
 * Returns false when no move exists (game over).
 * Ported verbatim from photo-crush.jsx lines 59-69.
 */
export function hasMoves(b: number[]): boolean {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const i = ix(r, c)
      // Swap with right neighbor
      if (c < N - 1) {
        const j = ix(r, c + 1)
        const t = b.slice()
        ;[t[i], t[j]] = [t[j], t[i]]
        if (findMatches(t).size) return true
      }
      // Swap with bottom neighbor
      if (r < N - 1) {
        const j = ix(r + 1, c)
        const t = b.slice()
        ;[t[i], t[j]] = [t[j], t[i]]
        if (findMatches(t).size) return true
      }
    }
  }
  return false
}
