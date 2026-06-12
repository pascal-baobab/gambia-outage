// Confetti.tsx — a lightweight one-shot confetti burst on a successful report (Phase 5 — more
// active visibility at launch). No dependency, no global CSS: particles are animated with the Web
// Animations API and the whole thing unmounts after the burst. Gambian-flag colours. Kept small
// (~36 particles) for low-end Android. Render with a changing `key` to re-fire: <Confetti key={n} />.
import { useEffect, useRef } from 'react'

const COLORS = ['#CE1126', '#0E50A0', '#3A7728', '#F2C200', '#FFFFFF']
const COUNT = 36
const DURATION = 1700

export function Confetti({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return
    if (typeof host.animate !== 'function') { onDone?.(); return } // very old WebView → no-op
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { onDone?.(); return }

    const nodes: HTMLSpanElement[] = []
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('span')
      const size = 6 + (i % 4) * 2
      const color = COLORS[i % COLORS.length]
      const left = 50 + (((i * 53) % 100) - 50) * 0.9 // spread across, deterministic
      Object.assign(p.style, {
        position: 'absolute',
        top: '38%',
        left: `${left}%`,
        width: `${size}px`,
        height: `${size * 1.4}px`,
        borderRadius: '1px',
        background: color,
        boxShadow: color === '#FFFFFF' ? '0 0 0 0.5px rgba(0,0,0,0.08)' : 'none',
        willChange: 'transform, opacity',
        opacity: '0',
      })
      host.appendChild(p)
      nodes.push(p)
      const dx = (((i * 71) % 200) - 100) // -100..100 px
      const dy = 120 + ((i * 37) % 220) // fall distance
      const rot = (((i * 97) % 720) - 360)
      const delay = (i % 6) * 28
      p.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx * 0.5}px, ${-30 - (i % 30)}px) rotate(${rot * 0.4}deg)`, opacity: 1, offset: 0.25 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
        ],
        { duration: DURATION, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
      )
    }
    const t = window.setTimeout(() => { nodes.forEach((n) => n.remove()); onDone?.() }, DURATION + 200)
    return () => { window.clearTimeout(t); nodes.forEach((n) => n.remove()) }
  }, [onDone])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 200 }}
    />
  )
}
