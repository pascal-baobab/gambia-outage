// honorCard.ts — render the weekly "Wall of Honor" board to a Canvas → PNG Blob (Phase 5). Zero deps.
// Square 1080×1080. Lists the worst-hit quarters (Hours in the Dark) + the national total for the week,
// so the card is an accountability artefact against NAWEC. Copy stays neutral/evidence-based. The
// illustrative seed week renders a visible "historical estimate" tag so it can never be passed off as live.
import { GPT_T, FLAG, THEMES } from '@/lib/tokens'
import { fmtDark } from '@/lib/dur'
import type { HoursRow } from '@/lib/types'

export interface HonorCardData {
  illustrative?: boolean
  national: { darkMinutes: number; activeQuarters: number }
  hours: HoursRow[]
}

const FONT_STACK =
  "'Inter','SF Pro Display','Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif"

const FLAG_BANDS: Array<[number, string]> = [
  [6, FLAG.red], [1, FLAG.white], [4, FLAG.blue], [1, FLAG.white], [6, FLAG.green],
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

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo-circle.png'
  })
}

export async function drawHonorCard(canvas: HTMLCanvasElement, data: HonorCardData): Promise<void> {
  const W = 1080
  const H = 1080
  const pad = 84
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const out = THEMES.standard.out
  const est = THEMES.standard.estimated
  const accent = data.illustrative ? est : out

  // background panel + faint flag wash + scrim
  ctx.fillStyle = GPT_T.panel
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.globalAlpha = 0.1
  drawFlagRule(ctx, W * 0.55, 0, W * 0.45, H)
  ctx.restore()
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, 'rgba(15,23,34,0.82)')
  grad.addColorStop(1, 'rgba(15,23,34,0.96)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  drawFlagRule(ctx, 0, 0, W, 14)

  // header: logo + wordmark
  const logo = await loadLogo()
  const headerY = pad + 6
  let textX = pad
  if (logo) {
    const ls = 60
    ctx.drawImage(logo, pad, headerY, ls, ls)
    textX = pad + ls + 18
  }
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'
  ctx.font = `900 32px ${FONT_STACK}`
  const brandY = headerY + 28
  ctx.fillText('GAMBIA ', textX, brandY)
  const gw = ctx.measureText('GAMBIA ').width
  ctx.fillStyle = GPT_T.panelInk60
  ctx.fillText('OUTAGE', textX + gw, brandY)
  ctx.font = `800 17px ${FONT_STACK}`
  ctx.fillStyle = accent
  ctx.fillText('WALL OF HONOR', textX, brandY + 24)

  // national hero — the COMBINED total hours in the dark across the documented neighbourhoods.
  // (The old per-quarter average read misleadingly low; the combined total is the honest
  // accountability figure and never undersells lived reality.)
  const heroTop = pad + 150
  ctx.fillStyle = GPT_T.panelInk60
  ctx.font = `800 26px ${FONT_STACK}`
  ctx.fillText('TOTAL HOURS IN THE DARK', pad, heroTop)
  ctx.fillStyle = '#fff'
  ctx.font = `800 132px ${FONT_STACK}`
  ctx.fillText(fmtDark(data.national.darkMinutes), pad - 4, heroTop + 118)
  ctx.fillStyle = GPT_T.panelInk60
  ctx.font = `600 24px ${FONT_STACK}`
  ctx.fillText(`across ${data.national.activeQuarters} ${data.national.activeQuarters === 1 ? 'neighbourhood' : 'neighbourhoods'}`, pad, heroTop + 158)

  // list — worst-hit quarters (cap at 7 so the footer always has room)
  const rows = data.hours.slice(0, 7)
  let y = heroTop + 220
  const rowH = 64
  ctx.font = `800 22px ${FONT_STACK}`
  rows.forEach((r) => {
    // rank chip (plain rect — roundRect isn't on older Android WebViews)
    const cs = 38
    ctx.fillStyle = r.rankDark === 1 ? accent : 'rgba(255,255,255,0.10)'
    ctx.fillRect(pad, y - cs + 8, cs, cs)
    ctx.fillStyle = r.rankDark === 1 ? '#fff' : GPT_T.panelInk60
    ctx.font = `800 20px ${FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.fillText(String(r.rankDark), pad + cs / 2, y + 1)
    ctx.textAlign = 'left'
    // name + region
    ctx.fillStyle = '#fff'
    ctx.font = `800 27px ${FONT_STACK}`
    ctx.fillText(r.name, pad + cs + 18, y - 4)
    ctx.fillStyle = GPT_T.panelInk60
    ctx.font = `600 18px ${FONT_STACK}`
    ctx.fillText(r.region, pad + cs + 18, y + 20)
    // hours, right-aligned
    ctx.fillStyle = accent
    ctx.font = `800 28px ${FONT_STACK}`
    ctx.textAlign = 'right'
    ctx.fillText(fmtDark(r.darkMinutes), W - pad, y + 6)
    ctx.textAlign = 'left'
    y += rowH
  })

  // footer
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

export async function renderHonorBlob(data: HonorCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  await drawHonorCard(canvas, data)
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}
