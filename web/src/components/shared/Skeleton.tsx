// Skeleton.tsx — shimmer placeholder, ported 1:1 from shared-ui.jsx.
import type { CSSProperties } from 'react'

export function Skeleton({ w = '100%', h = 16, r = 8, style = {} }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: 'linear-gradient(90deg,#EDF0F3 25%,#E2E7EC 37%,#EDF0F3 63%)',
        backgroundSize: '400% 100%',
        animation: 'gptShimmer 1.4s ease infinite',
        ...style,
      }}
    />
  )
}
