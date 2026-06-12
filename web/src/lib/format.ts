// format.ts — display formatters. Ported 1:1 from shared-ui.jsx `fmtHM`.

/** Minutes → "7h 05m" (floor hours, rounded zero-padded minutes). Identical to design/shared-ui.jsx. */
export function fmtHM(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}
