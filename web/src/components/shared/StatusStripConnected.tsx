// StatusStripConnected.tsx — self-fetching wrapper around StatusStrip so any page header can drop in
// the always-present 7-region status bar with one line and no prop plumbing. Shares the snapshot query
// cache (no extra fetch); renders nothing until data is available. Tap a region → that zone.
import { useSnapshot } from '@/hooks/useData'
import { navigate } from '@/hooks/useHashRoute'
import { StatusStrip } from './StatusStrip'

export function StatusStripConnected() {
  const { data } = useSnapshot()
  if (!data) return null
  return <StatusStrip macros={data.macros} onOpenZone={(id) => navigate({ name: 'zone', id })} />
}
