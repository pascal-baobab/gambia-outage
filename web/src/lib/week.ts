// week.ts — client-side ISO-8601 week id for Africa/Banjul (UTC+0, no DST → plain UTC date math).
// Mirrors `isoWeekId` in pb/pb_hooks/lib/go.js so the device-local contribution counter resets on the
// exact Monday boundary the server freezes weeks on. Format: "YYYY-Www" (e.g. "2026-W23").
export function isoWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // shift to the Thursday of this ISO week (defines the year)
  const isoYear = d.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4)) // Jan 4 is always in ISO week 1
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}
