// GambiaMap.lazy.ts — React.lazy boundary for the Leaflet map. Importing this
// module costs nothing: React only pulls the GambiaMapLive chunk (and, inside
// it, the Leaflet JS+CSS chunk) when the component actually renders — i.e. only
// on Home and only past the data-saver gate. Render under <Suspense>.
import { lazy } from 'react'

export const GambiaMapLive = lazy(() => import('./GambiaMapLive'))
