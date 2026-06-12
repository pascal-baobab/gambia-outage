import { useStats } from '@/hooks/useData'
import { useT } from '@/i18n/useT'

// Real social proof: distinct contributing devices + total reports. Renders nothing until loaded /
// when nothing has been logged yet (no fabricated numbers — brand is evidence-based). The
// "neighbours" clause only shows once at least one person has earned a rank, so we never print the
// awkward "0 neighbours" (reports predating this feature have no contributor yet).
export function ContributorsBadge({ variant = 'home' }: { variant?: 'home' | 'profile' }) {
  const t = useT()
  const { data: s } = useStats() // shared cache → Home + Profile read one query
  if (!s || s.reports === 0) return null
  const people = s.contributors
  const reports = s.reports
  const hasPeople = s.contributors > 0
  if (variant === 'profile') {
    return (
      <p style={{ opacity: 0.75, marginTop: 12 }}>
        {hasPeople
          ? t.contributorsBadge.profileWithPeople(people, reports)
          : t.contributorsBadge.profileNoPeople(reports)}
      </p>
    )
  }
  return (
    <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.75, padding: '8px 0' }}>
      {hasPeople
        ? t.contributorsBadge.homeWithPeople(people, reports)
        : t.contributorsBadge.homeNoPeople(reports)}
    </div>
  )
}
