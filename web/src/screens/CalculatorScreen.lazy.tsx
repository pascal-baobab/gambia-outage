// CalculatorScreen.lazy.tsx — code-split the Calculator route so it never weighs on the entry bundle.
// Loaded on demand when the user navigates to #/calculator.
import { lazy } from 'react'

export const CalculatorScreen = lazy(() =>
  import('./CalculatorScreen').then((m) => ({ default: m.CalculatorScreen })),
)
