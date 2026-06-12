// Flag.tsx — Gambian-flag accents, ported 1:1 from ds.jsx (FlagBg, FlagRule).
import type { CSSProperties } from 'react'
import { FLAG } from '@/lib/tokens'

/** Shaded tricolour wash for dark surfaces (subtle, scrim on top). */
export function FlagBg({
  opacity = 0.16,
  scrim = 'rgba(15,23,34,0.74)',
  angle = 0,
}: {
  opacity?: number
  scrim?: string
  angle?: number
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          inset: '-20%',
          display: 'flex',
          flexDirection: 'column',
          opacity,
          transform: angle ? `rotate(${angle}deg) scale(1.4)` : 'none',
        }}
      >
        <div style={{ flex: 6, background: FLAG.red }} />
        <div style={{ flex: 1, background: FLAG.white }} />
        <div style={{ flex: 4, background: FLAG.blue }} />
        <div style={{ flex: 1, background: FLAG.white }} />
        <div style={{ flex: 6, background: FLAG.green }} />
      </div>
      {scrim && <div style={{ position: 'absolute', inset: 0, background: scrim }} />}
    </div>
  )
}

/** Thin horizontal tricolour rule (red·blue·green with white hairlines). */
export function FlagRule({
  height = 4,
  radius = 0,
  style = {},
}: {
  height?: number
  radius?: number
  style?: CSSProperties
}) {
  return (
    // dir=ltr: a national flag's band order never mirrors, even in the Arabic RTL build.
    <div dir="ltr" style={{ display: 'flex', height, borderRadius: radius, overflow: 'hidden', ...style }} aria-hidden="true">
      <div style={{ flex: 6, background: FLAG.red }} />
      <div style={{ flex: 0.5, background: FLAG.white }} />
      <div style={{ flex: 4, background: FLAG.blue }} />
      <div style={{ flex: 0.5, background: FLAG.white }} />
      <div style={{ flex: 6, background: FLAG.green }} />
    </div>
  )
}
