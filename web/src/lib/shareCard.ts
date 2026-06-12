// shareCard.ts — render the national outage "share card" to a Canvas → PNG Blob.
// Zero deps (built-in Canvas 2D). Mirrors design/screen-share.jsx ShareCard layout/copy.
// Two sizes: square 1080×1080 (stories/posts) · wide 1200×630 (link previews).
// The decorative mini-map blob from the prototype is intentionally omitted in the export v1
// (a rasteriser just for a decorative blob isn't worth the weight) — replaced by a flag-tinted
// panel. Numbers + brand carry the share. Copy stays neutral/evidence-based (project rule).

import { GPT_T, FLAG, THEMES } from '@/lib/tokens'
import type { National } from '@/lib/types'

export type ShareSize = 'square' | 'wide'

const FONT_STACK =
  "'Inter','SF Pro Display','Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif"

// Gambian flag stripes red:white:blue:white:green = 6:1:4:1:6
const FLAG_BANDS: Array<[number, string]> = [
  [6, FLAG.red],
  [1, FLAG.white],
  [4, FLAG.blue],
  [1, FLAG.white],
  [6, FLAG.green],
]

function drawFlagRule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const total = FLAG_BANDS.reduce((a, [n]) => a + n, 0)
  let cx = x
  for (const [n, color] of FLAG_BANDS) {
    const bw = (n / total) * w
    ctx.fillStyle = color
    ctx.fillRect(cx, y, Math.ceil(bw), h)
    cx += bw
  }
}

// load /logo-circle.png (same-origin → no canvas taint). Resolves null if it fails.
function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo-circle.png'
  })
}

const SHARE_DATE = (): string => {
  // Africa/Banjul = UTC+0, no DST → format the UTC date plainly. (Date.now is fine at click time.)
  const d = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Draw the card onto an existing canvas at full pixel size. */
export async function drawShareCard(canvas: HTMLCanvasElement, national: National, size: ShareSize): Promise<void> {
  const W = size === 'square' ? 1080 : 1200
  const H = size === 'square' ? 1080 : 630
  const pad = size === 'square' ? 84 : 64
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const out = THEMES.standard.out

  // background panel + dark scrim
  ctx.fillStyle = GPT_T.panel
  ctx.fillRect(0, 0, W, H)
  // subtle flag wash bottom-right corner (decorative, low opacity)
  ctx.save()
  ctx.globalAlpha = 0.1
  drawFlagRule(ctx, W * 0.55, 0, W * 0.45, H)
  ctx.restore()
  // gradient scrim over it
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, 'rgba(15,23,34,0.82)')
  grad.addColorStop(1, 'rgba(15,23,34,0.96)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // top tricolour rule
  drawFlagRule(ctx, 0, 0, W, 14)

  // logo + wordmark
  const logo = await loadLogo()
  const headerY = pad + 14
  let textX = pad
  if (logo) {
    const ls = 64
    ctx.drawImage(logo, pad, headerY, ls, ls)
    textX = pad + ls + 18
  }
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'
  ctx.font = `900 34px ${FONT_STACK}`
  const brandY = headerY + 30
  ctx.fillText('GAMBIA ', textX, brandY)
  const gw = ctx.measureText('GAMBIA ').width
  ctx.fillStyle = GPT_T.panelInk60
  ctx.fillText('OUTAGE', textX + gw, brandY)
  ctx.fillStyle = GPT_T.panelInk60
  ctx.font = `700 18px ${FONT_STACK}`
  ctx.fillText('REPORT THE DARK', textX, brandY + 26)

  // hero block — anchored toward the lower-left
  const heroBlockTop = size === 'square' ? H - pad - 430 : pad + 150
  ctx.fillStyle = GPT_T.panelInk60
  ctx.font = `800 30px ${FONT_STACK}`
  ctx.fillText('WITHOUT POWER TODAY', pad, heroBlockTop)

  // big hours:mins
  ctx.fillStyle = '#fff'
  const heroSize = size === 'square' ? 220 : 168
  ctx.font = `800 ${heroSize}px ${FONT_STACK}`
  const heroStr = `${national.hours}h ${String(national.mins).padStart(2, '0')}m`
  ctx.fillText(heroStr, pad - 4, heroBlockTop + heroSize * 0.86)

  // regions line — "N of 7 regions" tinted, "reporting outages" white
  const regY = heroBlockTop + heroSize * 0.86 + 56
  ctx.font = `900 34px ${FONT_STACK}`
  ctx.fillStyle = out
  const regStr = `${national.regionsOut} of ${national.regionsTotal} regions`
  ctx.fillText(regStr, pad, regY)
  const rw = ctx.measureText(regStr).width
  ctx.fillStyle = '#fff'
  ctx.font = `700 34px ${FONT_STACK}`
  ctx.fillText(' reporting outages', pad + rw, regY)

  // date · reports
  ctx.fillStyle = GPT_T.panelInk60
  ctx.font = `600 26px ${FONT_STACK}`
  ctx.fillText(`${SHARE_DATE()} · ${national.reports.toLocaleString()} reports`, pad, regY + 40)

  // footer rule + line
  const footY = H - pad
  ctx.strokeStyle = GPT_T.panelLine
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, footY - 30)
  ctx.lineTo(W - pad, footY - 30)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = `800 28px ${FONT_STACK}`
  ctx.fillText('gambiaoutage.com', pad, footY)
  ctx.fillStyle = GPT_T.panelInk60
  ctx.font = `600 22px ${FONT_STACK}`
  const tail = 'Crowd-reported · anonymous'
  const tw = ctx.measureText(tail).width
  ctx.fillText(tail, W - pad - tw, footY)
}

/** Render the card to a PNG Blob (off-screen canvas). */
export async function renderShareBlob(national: National, size: ShareSize): Promise<Blob> {
  const canvas = document.createElement('canvas')
  await drawShareCard(canvas, national, size)
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}
