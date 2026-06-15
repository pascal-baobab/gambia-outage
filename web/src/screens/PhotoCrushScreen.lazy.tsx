// PhotoCrushScreen.lazy.tsx — code-split the Photo Crush route so it never weighs on the entry bundle.
// Loaded on demand when the user navigates to #/photo-crush.
import { lazy } from 'react'

export const PhotoCrushScreen = lazy(() =>
  import('./PhotoCrushScreen').then((m) => ({ default: m.PhotoCrushScreen })),
)
