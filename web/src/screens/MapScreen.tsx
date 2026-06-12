// MapScreen.tsx — the "Map" tab: the live outage map full-screen (region pins + quarter dots).
// Reuses the lazy GambiaMapLive (Leaflet loads on demand). Tap a pin → that region.
import { Suspense } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { GambiaMapLive } from '@/components/map/GambiaMap.lazy'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Skeleton } from '@/components/shared/Skeleton'
import type { Snapshot } from '@/lib/types'
import { useT } from '@/i18n/useT'

export function MapScreen({ snapshot, onOpenZone }: { snapshot?: Snapshot; onOpenZone: (id: string) => void }) {
  const t = useT()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      {/* notch=false: the global AppHeader already clears the notch above this tab — without it the
          safe-top band makes this header look detached from the brand bar. */}
      <ScreenHeader title={t.map.screenTitle} notch={false} />
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* GambiaMapLive is React.lazy — it MUST render under a Suspense boundary, or navigating to the
            Map tab suspends on synchronous input and trips the root ErrorBoundary (React #426). */}
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0 }}><Skeleton w="100%" h="100%" r={0} /></div>}>
          {snapshot && <GambiaMapLive snapshot={snapshot} onPin={onOpenZone} />}
        </Suspense>
      </div>
    </div>
  )
}
