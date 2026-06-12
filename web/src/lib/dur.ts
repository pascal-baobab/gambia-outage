// dur.ts — duration formatting for the Community boards + Honor card. Dark-minutes → hours/minutes.
// Always "Xh Ym" with NO thousands separator: a locale-grouped "3,201h" reads as a decimal (3.201)
// in many European locales (e.g. Italian) and is meaningless for hours. A bare 4-digit hour count
// ("3201h 12m") is unambiguous and keeps the explicit H+min form across every value.
export function fmtDark(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}
