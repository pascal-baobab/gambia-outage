import { useTheme } from '@/app/theme'

export function RankBadge({ label }: { label: string }) {
  const th = useTheme()
  return <div style={{ fontWeight: 700, fontSize: 20, color: th.partialDeep }}>{label}</div>
}
