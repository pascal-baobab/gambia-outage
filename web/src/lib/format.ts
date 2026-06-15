// format.ts — display formatters. Ported 1:1 from shared-ui.jsx `fmtHM`.

/** Minutes → "7h 05m" (floor hours, rounded zero-padded minutes). Identical to design/shared-ui.jsx. */
export function fmtHM(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** Display-layer numeral localization — DISPLAY ONLY, NEVER applied before parseFloat().
 *  Maps ASCII digits 0-9 → Arabic-Indic ٠-٩ when lang === 'ar'. All other input chars pass through.
 *  Internal calculator state always remains ASCII (CALC-03 / D-04). */
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const

export function localizeNum(s: string, lang: string): string {
  if (lang !== 'ar') return s   // NOTE: lowercase 'ar' — app's Lang type uses 'en'|'fr'|'ar'
  return s.replace(/[0-9]/g, (d) => AR_DIGITS[+d] ?? d)
}
