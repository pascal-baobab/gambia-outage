// DesktopFrame.tsx — Gambia Outage is a phone-only product, so on a desktop (wide + pointer-fine)
// screen we present the live app inside a standard phone mockup: an animated canvas starfield backdrop
// (stars + lightning bolts + green flashes), a bezel, a notch/island and a live iPhone-style status
// bar (real time + date beside the notch). On phones (or any touch/narrow viewport) this renders
// NOTHING — the app fills the screen exactly as before. The screen container's `transform` makes it
// the containing block for the app's position:fixed overlays, so splash / sheets / modals stay inside.
import { useEffect, useRef, useState, type ReactNode } from 'react'

const DESKTOP_QUERY = '(min-width: 760px) and (pointer: fine)'

// Canvas-based animated starfield: 340 stars (pulsing + rare twinkle) + lightning bolts every 6-14s
// + occasional subtle green radial flash every 22-50s. Frame-rate normalised via dt capping.
function useStarfield(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')!

    function resize() {
      if (!cvs) return
      cvs.width = cvs.offsetWidth
      cvs.height = cvs.offsetHeight
    }
    const ro = new ResizeObserver(resize)
    ro.observe(cvs)
    resize()

    // Stars — fractional coordinates so they scale with resize
    interface StarData { x: number; y: number; r: number; base: number; pulse: boolean; phase: number; freq: number; hue: number; sat: number; twinkle: boolean }
    const STAR_N = 340
    const stars: StarData[] = []
    for (let i = 0; i < STAR_N; i++) {
      const rnd = Math.random()
      // 68% tiny, 24% small, 7% medium, 1% large
      const r = rnd < 0.68 ? 0.28 + Math.random() * 0.42
              : rnd < 0.92 ? 0.65 + Math.random() * 0.85
              : rnd < 0.99 ? 1.4  + Math.random() * 0.9
              :               2.5  + Math.random() * 0.7
      const hue = Math.random() < 0.12 ? 44 : Math.random() < 0.25 ? 215 : 200
      stars.push({
        x: Math.random(), y: Math.random(), r,
        base: 0.12 + Math.random() * 0.72,
        pulse: Math.random() < 0.38,
        phase: Math.random() * Math.PI * 2,
        freq: 0.12 + Math.random() * 0.38,
        hue, sat: 30 + Math.random() * 40,
        twinkle: r > 1.5 && Math.random() < 0.6,
      })
    }

    // Lightning — recursive midpoint displacement for jagged bolt paths
    interface Pt { x: number; y: number }
    function displace(pts: Pt[], rough: number, depth: number): Pt[] {
      if (depth === 0) return pts
      const out: Pt[] = []
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1]
        out.push(a)
        out.push({
          x: (a.x + b.x) / 2 + (Math.random() - 0.5) * rough,
          y: (a.y + b.y) / 2 + (Math.random() - 0.5) * rough * 0.25,
        })
      }
      out.push(pts[pts.length - 1])
      return displace(out, rough * 0.52, depth - 1)
    }

    interface Bolt { pts: Pt[]; alpha: number; decay: number; flash: number }
    const bolts: Bolt[] = []
    let nextBoltMs = 3500 + Math.random() * 6000

    function spawnBolt() {
      if (!cvs) return
      const W = cvs.width, H = cvs.height
      const sx = W * (0.15 + Math.random() * 0.7)
      const ex = sx + (Math.random() - 0.5) * W * 0.28
      const ey = H * (0.12 + Math.random() * 0.38)
      bolts.push({
        pts: displace([{ x: sx, y: 0 }, { x: ex, y: ey }], 90, 4),
        alpha: 1.0, decay: 0.048 + Math.random() * 0.028, flash: 1.0,
      })
    }

    // Green flash — subtle radial glow from a random point
    interface GFlash { x: number; y: number; r: number; alpha: number; peak: number; phase: 'in' | 'out'; inSpeed: number; outSpeed: number }
    let gflash: GFlash | null = null
    let nextGreenMs = 12000 + Math.random() * 18000

    function spawnGreen() {
      if (!cvs) return
      const W = cvs.width, H = cvs.height
      gflash = {
        x: W * (0.1 + Math.random() * 0.8), y: H * (0.05 + Math.random() * 0.55),
        r: Math.max(W, H) * (0.38 + Math.random() * 0.42),
        alpha: 0, peak: 0.045 + Math.random() * 0.04, phase: 'in',
        inSpeed: 0.0018 + Math.random() * 0.0012,
        outSpeed: 0.0008 + Math.random() * 0.0006,
      }
    }

    let lastTs: number | null = null
    let rafId: number

    function draw(ts: number) {
      if (!cvs) return
      if (lastTs === null) lastTs = ts
      const dt = Math.min(ts - lastTs, 80)
      lastTs = ts
      const W = cvs.width, H = cvs.height

      ctx.clearRect(0, 0, W, H)

      // Deep-space gradient background
      const grad = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85)
      grad.addColorStop(0,   'rgba(20,30,48,1)')
      grad.addColorStop(0.5, 'rgba(8,12,20,1)')
      grad.addColorStop(1,   'rgba(3,5,9,1)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Stars
      for (const s of stars) {
        let a = s.base
        if (s.pulse) a = s.base * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ts * 0.001 * s.freq * Math.PI * 2 + s.phase)))
        if (s.twinkle && Math.random() < 0.0004 * dt) a = Math.min(1, a * 2.8)
        a = Math.min(a, 1)
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue},${s.sat}%,93%,${a})`
        if (s.r > 1.4) { ctx.shadowBlur = s.r * 4; ctx.shadowColor = `hsla(${s.hue},${s.sat}%,95%,${a * 0.55})` }
        ctx.fill()
        if (s.r > 1.4) ctx.shadowBlur = 0
      }

      // Lightning timing
      nextBoltMs -= dt
      if (nextBoltMs <= 0) {
        spawnBolt()
        if (Math.random() < 0.28) setTimeout(spawnBolt, 180 + Math.random() * 220)
        nextBoltMs = 6000 + Math.random() * 10000
      }

      // Draw bolts
      for (let bi = bolts.length - 1; bi >= 0; bi--) {
        const b = bolts[bi]
        if (b.flash > 0) {
          ctx.fillStyle = `rgba(210,225,255,${b.flash * 0.035})`
          ctx.fillRect(0, 0, W, H)
          b.flash = Math.max(0, b.flash - dt * 0.012)
        }
        ctx.save()
        ctx.globalAlpha = b.alpha
        ctx.lineCap = 'round'
        // Glow pass
        ctx.beginPath(); ctx.moveTo(b.pts[0].x, b.pts[0].y)
        for (let pi = 1; pi < b.pts.length; pi++) ctx.lineTo(b.pts[pi].x, b.pts[pi].y)
        ctx.strokeStyle = 'rgba(190,210,255,1)'; ctx.lineWidth = 5
        ctx.shadowBlur = 22; ctx.shadowColor = 'rgba(170,195,255,0.85)'; ctx.stroke()
        // Core pass
        ctx.beginPath(); ctx.moveTo(b.pts[0].x, b.pts[0].y)
        for (let pi = 1; pi < b.pts.length; pi++) ctx.lineTo(b.pts[pi].x, b.pts[pi].y)
        ctx.strokeStyle = 'rgba(240,246,255,1)'; ctx.lineWidth = 1.1
        ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(255,255,255,1)'; ctx.stroke()
        ctx.restore()
        b.alpha = Math.max(0, b.alpha - b.decay * (dt / 16.67))
        if (b.alpha <= 0) bolts.splice(bi, 1)
      }

      // Green flash timing
      nextGreenMs -= dt
      if (nextGreenMs <= 0 && !gflash) { spawnGreen(); nextGreenMs = 22000 + Math.random() * 28000 }

      // Draw green flash
      if (gflash) {
        if (gflash.phase === 'in') {
          gflash.alpha = Math.min(gflash.alpha + gflash.inSpeed * dt, gflash.peak)
          if (gflash.alpha >= gflash.peak) gflash.phase = 'out'
        } else {
          gflash.alpha -= gflash.outSpeed * dt
          if (gflash.alpha <= 0) { gflash = null }
        }
        if (gflash) {
          const grd = ctx.createRadialGradient(gflash.x, gflash.y, 0, gflash.x, gflash.y, gflash.r)
          grd.addColorStop(0,    `rgba(34,197,94,${gflash.alpha})`)
          grd.addColorStop(0.35, `rgba(22,163,74,${gflash.alpha * 0.32})`)
          grd.addColorStop(1,    'rgba(16,120,56,0)')
          ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)
        }
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, [active, canvasRef])
}

// iOS status-bar formatting (real device clock + date). 24h "HH:MM" + "Mon 9 Jun".
function fmtClock(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function DesktopFrame({ children }: { children: ReactNode }) {
  const [framed, setFramed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useStarfield(canvasRef, framed)

  // Live clock — re-render every 30s so the status-bar time stays exact without busy-looping.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!framed) return
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [framed])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(DESKTOP_QUERY)
    const original = document.documentElement.style.getPropertyValue('--go-sim-floor')
    const apply = () => {
      setFramed(mq.matches)
      try {
        if (mq.matches) document.documentElement.style.setProperty('--go-sim-floor', '34px')
        else if (original) document.documentElement.style.setProperty('--go-sim-floor', original)
        else document.documentElement.style.removeProperty('--go-sim-floor')
      } catch { /* */ }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  if (!framed) return <>{children}</>
  return (
    <div className="go-desk">
      <canvas ref={canvasRef} className="go-desk-canvas" aria-hidden="true" />
      <div className="go-desk-phone">
        <div className="go-desk-screen">
          <span className="go-desk-island" aria-hidden="true" />
          <div className="go-desk-statusbar" aria-hidden="true">
            <span className="go-desk-time">{fmtClock(now)}</span>
            <span className="go-desk-meta">
              <span className="go-desk-date">{fmtDate(now)}</span>
              <svg width="22" height="11" viewBox="0 0 24 12" className="go-desk-batt">
                <rect x="0.5" y="0.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" />
                <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
                <rect x="21.5" y="3.5" width="2" height="5" rx="1" fill="currentColor" />
              </svg>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
