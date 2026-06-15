// PhotoCrushScreen.tsx — Full-screen Photo-Crush match-3 game.
// Faithful TypeScript port of design/photo-crush.jsx (approved bundle — design-led gate SATISFIED).
// DOM-grid board (D-01): 49 <button> elements, CSS transitions, no Canvas, no requestAnimationFrame.
// Personal best (D-02): localStorage key 'go_pc_best' (app go_ prefix, NOT bundle's gpt_pb_photocrush).
// Photo personalization (D-03): real gallery picker → OffscreenCanvas crop → go-tiles IDB.
// Radio (D-04): MiniRadio drives existing radioStore singleton — no new Audio(), no game SFX.
// Colors (D-05): tokens only; sole permitted raw hex is '#fff' on ink CTAs.
// Shell (D-06): no AppHeader, no ThumbDock, no BottomNav, no global RadioPlayer on this route.
// Lazy-loaded chunk wired in plan 05-04.

import { useState, useEffect, useRef } from 'react'
import { GPT_T, GPT_FONT, FLAG, ACCENT, THEMES } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import { GPTIcon } from '@/components/icons'
import { useRadio } from '@/app/radioStore'
import { RADIO_STATIONS } from '@/lib/constants'
import { makeBoard, findMatches, collapse, adj, hasMoves } from '@/lib/gameEngine'
import { loadAllTilePhotos, saveTilePhoto, deleteTilePhoto, cropToBlob } from '@/lib/tilePhotos'
import { submitScore } from '@/lib/api'
import { hasClaimedName } from '@/lib/username'
import { openNameGate } from '@/app/nameGateStore'
import { NameGateSheet } from '@/components/shared/NameGateSheet'
import { getAccountId } from '@/lib/account'
import { getIdentity, getHomeZone } from '@/lib/identity'
import { navigate } from '@/hooks/useHashRoute'

const TH = THEMES.standard

// ── prefers-reduced-motion: read once at module scope (same as bundle line 7) ──
// Guard matchMedia itself (not just window) — a webview without matchMedia would otherwise throw
// at chunk-eval time and fail the whole lazy import (cf. calculator WR-04).
const reduce =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── CSS animation keyframes: inject once with guard (bundle lines 9-13) ──
if (typeof document !== 'undefined' && !document.getElementById('pc-kf')) {
  const s = document.createElement('style')
  s.id = 'pc-kf'
  s.textContent =
    '@keyframes pcPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}' +
    '@keyframes pcShake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(3px)}50%{transform:translateX(-3px)}}' +
    '@keyframes pcOverIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}' +
    '@keyframes pcDim{from{opacity:1}to{opacity:.22}}'
  document.head.appendChild(s)
}

// ── Personal best localStorage key (D-02) ──
const PB_KEY = 'go_pc_best'

// ── Tile accent map (bundle line 24) ──
const TILE_ACCENT: Record<number, string> = {
  1: FLAG.red,
  2: FLAG.blue,
  3: FLAG.green,
  4: ACCENT.tile4,
  5: ACCENT.tile5,
}

/** Hex color → CSS rgba(r,g,b,a) (bundle line 80) */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// ── TileFace: SVG default or personalized photo face ──
function TileFace({ type, photoUrl }: { type: number; photoUrl?: string }) {
  if (photoUrl) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: '180% 180%',
          backgroundPosition: '50% 50%',
          boxShadow: `inset 0 0 0 2px ${rgba(TILE_ACCENT[type], 0.4)}`,
        }}
      />
    )
  }
  // Public path is /tiles/tile-N.svg — NOT bundle's assets/tile-N.svg (D-03)
  return (
    <img
      src={`/tiles/tile-${type}.svg`}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
    />
  )
}

// ── ScoreBar (bundle lines 151-169) ──
function ScoreBar({
  score,
  best,
  rtl,
  onPause,
  pauseLabel,
  scoreLabel,
  bestLabel,
}: {
  score: number
  best: number
  rtl: boolean
  onPause: () => void
  pauseLabel: string
  scoreLabel: string
  bestLabel: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 16px',
        background: GPT_T.paper,
        borderBottom: `1px solid ${GPT_T.line}`,
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: GPT_T.ink45,
          }}
        >
          {scoreLabel}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: GPT_T.ink,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score.toLocaleString()}
        </div>
      </div>
      <div style={{ textAlign: rtl ? 'left' : 'right' }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: GPT_T.ink45,
          }}
        >
          {bestLabel}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: GPT_T.ink70,
            lineHeight: 1,
            marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {best.toLocaleString()}
        </div>
      </div>
      <button
        onClick={onPause}
        aria-label={pauseLabel}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: `1px solid ${GPT_T.line}`,
          background: GPT_T.wash,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1.4" fill={GPT_T.ink70} />
          <rect x="14" y="5" width="4" height="14" rx="1.4" fill={GPT_T.ink70} />
        </svg>
      </button>
    </div>
  )
}

// ── GameOverArt: lightbulb going dark (bundle lines 173-193) ──
function GameOverArt() {
  return (
    <svg viewBox="0 0 160 150" width="170" height="160" aria-hidden="true">
      <circle cx="80" cy="66" r="52" fill={GPT_T.wash} />
      <circle cx="80" cy="66" r="52" stroke={GPT_T.line2} strokeWidth="2" />
      {/* faded rays (afterglow) */}
      <g stroke={TH.on} strokeWidth="3" strokeLinecap="round" opacity="0.3">
        <path d="M80 14v8M44 30l5 5M116 30l-5 5M28 66h8M124 66h8" />
      </g>
      {/* unlit bulb — pale slate fill */}
      <g>
        <path
          d="M80 34a20 20 0 0 0-12 36c1.8 1.3 3 3.4 3.2 5.7l.1 2h17.4l.1-2c.2-2.3 1.4-4.4 3.2-5.7A20 20 0 0 0 80 34Z"
          fill={TH.outBg}
          stroke={TH.out}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <rect x="71" y="84" width="18" height="4.6" rx="2" fill={TH.out} />
        <rect x="72.5" y="90" width="15" height="4.6" rx="2" fill={TH.out} />
        <path d="M74 96h12c-1 2.8-2.8 4.2-6 4.2S75 98.8 74 96Z" fill={TH.out} />
        {/* dark filament */}
        <path
          d="M74 70c0-4-4-6-4-11a10 10 0 0 1 20 0c0 5-4 7-4 11"
          fill="none"
          stroke={TH.out}
          strokeWidth="2"
          opacity="0.5"
        />
      </g>
    </svg>
  )
}

// ── MiniRadio: drives the real radioStore singleton (D-04, GAME-04) ──
// NEVER creates a new Audio() — the radioStore module singleton is the only audio element.
function MiniRadio({ pausedLabel }: { pausedLabel: string }) {
  const t = useT()
  const status = useRadio((s) => s.status)
  const toggle = useRadio((s) => s.toggle)
  const stationIndex = useRadio((s) => s.stationIndex)
  const nextStation = useRadio((s) => s.nextStation)
  const setStation = useRadio((s) => s.setStation)

  const station = RADIO_STATIONS[stationIndex] ?? RADIO_STATIONS[0]
  const active = status === 'playing' || status === 'loading'

  const prevStation = () =>
    setStation((stationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length)

  const btnBase: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 9,
    border: 'none',
    background: GPT_T.wash,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  }

  return (
    <div
      style={{
        background: GPT_T.paper,
        borderTop: `1px solid ${GPT_T.line}`,
        padding: '7px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        minHeight: 46,
      }}
    >
      <button
        onClick={toggle}
        aria-label={active ? t.radio.pauseAria : t.radio.playAria}
        style={{
          ...btnBase,
          width: 36,
          height: 36,
          background: active ? FLAG.green : GPT_T.wash,
        }}
      >
        {active ? (
          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" fill="#fff" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="#fff" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5l12 7-12 7Z" fill={GPT_T.ink70} />
          </svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: GPT_T.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {station.name}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: GPT_T.ink45,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {active ? station.tag : pausedLabel}
        </div>
      </div>
      <button onClick={prevStation} aria-label={t.radio.prevStationAria} style={btnBase}>
        <GPTIcon name="back" size={16} color={GPT_T.ink70} />
      </button>
      <button onClick={nextStation} aria-label={t.radio.nextStationAria} style={btnBase}>
        <GPTIcon name="chevron" size={16} color={GPT_T.ink70} />
      </button>
    </div>
  )
}

// ── CropOverlay: gallery picker → drag-crop → 256x256 IDB Blob (D-03, GAME-02) ──
function CropOverlay({
  tileType,
  rtl,
  t,
  tilePhotos,
  onCancel,
  onSaved,
  onClear,
}: {
  tileType: number
  rtl: boolean
  t: ReturnType<typeof useT>
  tilePhotos: Map<number, string>
  onCancel: () => void
  onSaved: (type: number, url: string) => void
  onClear: (type: number) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  // Stable objectURL for the picked bitmap (revoked when bitmap changes or overlay closes)
  const [pickedUrl, setPickedUrl] = useState<string | null>(null)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [imgError, setImgError] = useState<string | null>(null)

  // Revoke picked objectURL on unmount or when bitmap changes
  useEffect(() => {
    return () => {
      if (pickedUrl) URL.revokeObjectURL(pickedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedUrl])

  // If there's already a personalized photo for this tile, show it in the crop area
  const existingUrl = tilePhotos.get(tileType)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgError(null)
    try {
      const bm = await createImageBitmap(file)
      // Revoke previous picked URL if any
      setPickedUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
      setBitmap(bm)
      setPos({ x: 50, y: 50 })
    } catch {
      setImgError(t.game.imgError)
    }
    // Reset file input so the same file can be re-selected
    e.target.value = ''
  }

  const onDown = (e: React.PointerEvent) => {
    dragRef.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = (e.clientX - dragRef.current.px) / 2.4
    const dy = (e.clientY - dragRef.current.py) / 2.4
    setPos({
      x: Math.max(0, Math.min(100, dragRef.current.x - dx)),
      y: Math.max(0, Math.min(100, dragRef.current.y - dy)),
    })
  }
  const onUp = () => {
    dragRef.current = null
  }

  const onUsePhoto = async () => {
    if (!bitmap) return
    try {
      const cropSize = Math.min(bitmap.width, bitmap.height)
      const cropX = ((bitmap.width - cropSize) * pos.x) / 100
      const cropY = ((bitmap.height - cropSize) * pos.y) / 100
      const blob = await cropToBlob(bitmap, cropX, cropY, cropSize)
      await saveTilePhoto(tileType, blob)
      // Revoke any existing objectURL for this tile type before creating a new one
      const existingUrlForType = tilePhotos.get(tileType)
      if (existingUrlForType) URL.revokeObjectURL(existingUrlForType)
      const newUrl = URL.createObjectURL(blob)
      bitmap.close()
      setBitmap(null)
      onSaved(tileType, newUrl)
    } catch {
      // Silent failure: game continues without personalization
    }
  }

  const onRemove = async () => {
    try {
      await deleteTilePhoto(tileType)
      const urlToRevoke = tilePhotos.get(tileType)
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke)
      onClear(tileType)
    } catch {
      // Silent failure
    }
  }

  // Only a freshly-picked bitmap can be re-cropped & saved (onUsePhoto needs `bitmap`);
  // dragging an already-saved photo would silently discard the new position, so gate
  // the pointer interaction on `bitmap` rather than on the mere presence of a photo.
  const canDrag = bitmap !== null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 95,
        background: 'rgba(15,23,34,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* hidden file input — triggered programmatically (real gallery picker) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onPick}
      />
      <div
        style={{
          background: GPT_T.paper,
          borderRadius: 22,
          padding: 18,
          width: '100%',
          maxWidth: 320,
          fontFamily: GPT_FONT,
        }}
      >
        {/* Tile identity row */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: rgba(TILE_ACCENT[tileType], 0.14),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src={`/tiles/tile-${tileType}.svg`} width="22" height="22" alt="" />
          </span>
          <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>{t.game.cropPhoto}</div>
        </div>

        {/* Crop canvas area */}
        <div
          style={{
            width: 256,
            maxWidth: '100%',
            aspectRatio: '1 / 1',
            margin: '0 auto',
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
            touchAction: 'none',
            cursor: canDrag ? 'grab' : 'default',
            background: GPT_T.wash,
          }}
          onPointerDown={canDrag ? onDown : undefined}
          onPointerMove={canDrag ? onMove : undefined}
          onPointerUp={canDrag ? onUp : undefined}
          onPointerCancel={canDrag ? onUp : undefined}
        >
          {bitmap && pickedUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${pickedUrl})`,
                backgroundSize: '180% 180%',
                backgroundPosition: `${pos.x}% ${pos.y}%`,
              }}
            />
          )}
          {!bitmap && existingUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${existingUrl})`,
                backgroundSize: '180% 180%',
                backgroundPosition: `${pos.x}% ${pos.y}%`,
              }}
            />
          )}
          {!bitmap && !existingUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={`/tiles/tile-${tileType}.svg`}
                width="80"
                height="80"
                alt=""
                style={{ opacity: 0.4 }}
              />
            </div>
          )}
          {/* Crop guides overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.85)',
              borderRadius: 16,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px)',
              backgroundSize: '33.33% 33.33%',
            }}
          />
        </div>

        {imgError && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: TH.out,
              textAlign: 'center',
            }}
          >
            {imgError}
          </div>
        )}

        {/* Pick / Remove photo controls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: 10,
              border: `1.5px solid ${GPT_T.line}`,
              background: GPT_T.wash,
              color: GPT_T.ink70,
              fontFamily: GPT_FONT,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {existingUrl && !bitmap ? t.game.change : t.game.pickPhoto}
          </button>
          {existingUrl && (
            <button
              onClick={onRemove}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: 10,
                border: `1.5px solid ${GPT_T.line}`,
                background: GPT_T.wash,
                color: TH.out,
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t.game.removePhoto}
            </button>
          )}
        </div>

        {/* CTA buttons row */}
        <div
          style={{
            display: 'flex',
            gap: 9,
            marginTop: 14,
            flexDirection: rtl ? 'row-reverse' : 'row',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 13,
              border: `1.5px solid ${GPT_T.line}`,
              background: GPT_T.paper,
              color: GPT_T.ink70,
              fontFamily: GPT_FONT,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {t.game.cancel}
          </button>
          <button
            onClick={onUsePhoto}
            disabled={!bitmap}
            style={{
              flex: 1.4,
              minHeight: 46,
              borderRadius: 13,
              border: 'none',
              background: bitmap ? GPT_T.ink : GPT_T.wash,
              color: bitmap ? '#fff' : GPT_T.ink45,
              fontFamily: GPT_FONT,
              fontWeight: 800,
              fontSize: 14,
              cursor: bitmap ? 'pointer' : 'default',
            }}
          >
            {t.game.usePhoto}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main PhotoCrushScreen ──────────────────────────────────────────────────────
export function PhotoCrushScreen({ onBack }: { onBack: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'

  // ── game state (bundle lines 200-209) ──
  const [phase, setPhase] = useState<'idle' | 'playing' | 'paused' | 'over'>('idle')
  const [board, setBoard] = useState<number[]>(makeBoard)
  const [sel, setSel] = useState<number | null>(null)
  const [clearing, setClearing] = useState<Set<number>>(() => new Set())
  const [bad, setBad] = useState<[number, number] | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => {
    try {
      const raw = localStorage.getItem(PB_KEY)
      return raw ? Number(raw) || 0 : 0
    } catch {
      return 0
    }
  })
  const [cropType, setCropType] = useState<number | null>(null)
  const [tilePhotos, setTilePhotos] = useState<Map<number, string>>(new Map())
  const busy = useRef(false)

  // ── Leaderboard submit (06-04) — game-over only; submitting needs a pseudonym, PLAYING never does. ──
  const [nameRequired, setNameRequired] = useState(false) // drives the NameGateSheet (TalkScreen.ask idiom)
  const [submitState, setSubmitState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const submitBusy = useRef(false)
  // Reset the submit affordance whenever a NEW game-over panel appears (so each run can submit afresh).
  useEffect(() => { if (phase === 'over') { setSubmitState('idle'); submitBusy.current = false } }, [phase])

  async function submitToLeaderboard() {
    if (submitBusy.current) return
    // Gate (never blocks playing — this only runs on an explicit Submit tap on the game-over card).
    if (!hasClaimedName()) { setNameRequired(true); return }
    const home = getHomeZone()
    if (!home?.id) { openNameGate(); return } // no home zone yet → reuse the identity sheet to set one
    submitBusy.current = true
    setSubmitState('busy')
    try {
      const id = await getAccountId()
      const ident = getIdentity(id)
      await submitScore({
        account_id: id,
        nickname: ident.nickname ?? '',
        avatar_id: ident.avatarId,
        zone: home.id,
        score,
      })
      setSubmitState('done')
    } catch {
      setSubmitState('error')
    } finally {
      submitBusy.current = false
    }
  }

  // ── timer bookkeeping (WR-01): track every pending cascade/animation timeout so we
  // can cancel them on unmount — otherwise tapping Back mid-cascade fires setState on an
  // unmounted component and keeps step() recursing on a detached board. phaseRef lets the
  // (deferred) callbacks re-check the live phase before mutating the board. ──
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    },
    [],
  )
  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current = timers.current.filter((tid) => tid !== id)
      fn()
    }, ms)
    timers.current.push(id)
  }

  // ── load personalized tile photos on mount; revoke all objectURLs on unmount ──
  useEffect(() => {
    let cancelled = false
    loadAllTilePhotos().then((map) => {
      if (!cancelled) setTilePhotos(map)
    })
    return () => {
      cancelled = true
      // Revoke all objectURLs to avoid memory leaks
      setTilePhotos((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url))
        return new Map()
      })
    }
  }, [])

  // ── personal best: save when game over if score > best (bundle line 227) ──
  useEffect(() => {
    if (phase === 'over' && score > best) {
      setBest(score)
      try {
        localStorage.setItem(PB_KEY, String(score))
      } catch {
        // storage unavailable
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── cascade step (bundle lines 215-225) ──
  const step = (cur: number[]) => {
    // Bail if the game is no longer in progress (e.g. End game pressed, or restarted).
    // 'paused' is allowed to settle so the board is consistent on resume.
    if (phaseRef.current === 'over' || phaseRef.current === 'idle') {
      busy.current = false
      return
    }
    const m = findMatches(cur)
    if (!m.size) {
      busy.current = false
      if (!hasMoves(cur)) setPhase('over')
      return
    }
    setScore((s) => s + m.size * 12)
    setClearing(m)
    schedule(() => {
      const nb = collapse(cur, m)
      setBoard(nb)
      setClearing(new Set())
      schedule(() => step(nb), reduce ? 0 : 150)
    }, reduce ? 0 : 200)
  }

  // ── tap cell (bundle lines 229-237) ──
  const tapCell = (i: number) => {
    if (busy.current || phase !== 'playing') return
    if (sel == null) {
      setSel(i)
      return
    }
    if (sel === i) {
      setSel(null)
      return
    }
    if (!adj(sel, i)) {
      setSel(i)
      return
    }
    const nb = board.slice()
    ;[nb[sel], nb[i]] = [nb[i], nb[sel]]
    if (findMatches(nb).size) {
      busy.current = true
      setBoard(nb)
      setSel(null)
      schedule(() => step(nb), reduce ? 0 : 150)
    } else {
      setBad([sel, i])
      schedule(() => setBad(null), 320)
      setSel(null)
    }
  }

  // ── start / restart game ──
  const startGame = () => {
    setBoard(makeBoard())
    setScore(0)
    setSel(null)
    setClearing(new Set())
    setBad(null)
    busy.current = false
    setPhase('playing')
  }

  // ── board DOM grid (bundle lines 242-261) ──
  const boardEl = (preview: boolean) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        padding: 12,
        background: GPT_T.tileAnchor,
        borderRadius: 18,
        direction: rtl ? 'rtl' : 'ltr',
        boxShadow: `inset 0 0 0 1px ${rgba(GPT_T.ink, 0.04)}`,
      }}
    >
      {board.map((type, i) => {
        const isSel = sel === i
        const isClear = clearing.has(i)
        const isBad = bad && (bad[0] === i || bad[1] === i)
        return (
          <button
            key={i}
            onClick={() => !preview && tapCell(i)}
            disabled={preview}
            aria-label={t.game.tile}
            aria-pressed={isSel}
            style={{
              aspectRatio: '1 / 1',
              border: 'none',
              padding: 0,
              background: 'transparent',
              cursor: preview ? 'default' : 'pointer',
              position: 'relative',
              borderRadius: 12,
              outline: isSel ? `3px solid ${FLAG.blue}` : 'none',
              outlineOffset: -1,
              transform: isSel ? 'scale(1.08)' : 'scale(1)',
              transition: reduce ? 'none' : 'transform .12s ease, opacity .2s ease',
              opacity: isClear ? 0 : 1,
              animation: isBad && !reduce ? 'pcShake .32s ease' : 'none',
              zIndex: isSel ? 2 : 1,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                transform: isClear ? 'scale(.4)' : 'scale(1)',
                transition: reduce ? 'none' : 'transform .2s ease',
              }}
            >
              <TileFace type={type} photoUrl={tilePhotos.get(type)} />
            </div>
          </button>
        )
      })}
    </div>
  )

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: GPT_T.wash,
        fontFamily: GPT_FONT,
        direction: rtl ? 'rtl' : 'ltr',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── TopBar (bundle lines 267-274) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: GPT_T.paper,
          borderBottom: `1px solid ${GPT_T.line}`,
          flexShrink: 0,
        }}
      >
        <button
          aria-label={t.nav.back}
          onClick={onBack}
          style={{
            width: 38,
            height: 38,
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: 11,
          }}
        >
          <GPTIcon name="back" size={23} color={GPT_T.ink70} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, flex: 1 }}>
          {t.game.title}
        </div>
        <span style={{ display: 'inline-flex', gap: 3 }} aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <img key={n} src={`/tiles/tile-${n}.svg`} width="18" height="18" alt="" />
          ))}
        </span>
      </div>

      {/* ── ScoreBar (playing only) ── */}
      {phase === 'playing' && (
        <ScoreBar
          score={score}
          best={best}
          rtl={rtl}
          onPause={() => setPhase('paused')}
          pauseLabel={t.game.paused}
          scoreLabel={t.game.score}
          bestLabel={t.game.personalBest}
        />
      )}

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: phase === 'playing' ? 'flex-start' : 'center',
        }}
      >
        {/* idle phase (bundle lines 280-292) */}
        {phase === 'idle' && (
          <div
            style={{
              width: '100%',
              maxWidth: 340,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{ width: '100%', filter: 'saturate(1)', pointerEvents: 'none', opacity: 0.96 }}
            >
              {boardEl(true)}
            </div>
            <div
              style={{ marginTop: 18, fontSize: 13, fontWeight: 700, color: GPT_T.ink45 }}
            >
              {t.game.personalBest}:{' '}
              <span style={{ color: GPT_T.ink, fontWeight: 800 }}>
                {best.toLocaleString()}
              </span>
            </div>
            <button
              onClick={startGame}
              style={{
                marginTop: 14,
                minHeight: 54,
                width: '100%',
                borderRadius: 16,
                border: 'none',
                background: GPT_T.ink,
                color: '#fff',
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 10px 26px rgba(15,23,34,0.22)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5l12 7-12 7Z" fill="#fff" />
              </svg>
              {t.game.play}
            </button>
            <button
              onClick={() => setCropType(1)}
              style={{
                marginTop: 12,
                fontSize: 13.5,
                fontWeight: 800,
                color: FLAG.blue,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <GPTIcon name="pin" size={16} color={FLAG.blue} />
              {t.game.personalize}
            </button>
            {/* How-to-play instructions below the game (localized EN/FR/AR) */}
            <p
              style={{
                marginTop: 16,
                marginBottom: 0,
                fontSize: 12.5,
                fontWeight: 600,
                color: GPT_T.ink45,
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              {t.game.howTo}
            </p>
          </div>
        )}

        {/* playing / paused phases (bundle lines 294-306) */}
        {(phase === 'playing' || phase === 'paused') && (
          <div style={{ width: '100%', maxWidth: 340, position: 'relative' }}>
            {boardEl(false)}
            {phase === 'paused' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 18,
                  background: 'rgba(246,248,250,0.92)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: GPT_T.ink }}>
                  {t.game.paused}
                </div>
                <button
                  onClick={() => setPhase('playing')}
                  style={{
                    minHeight: 48,
                    padding: '0 28px',
                    borderRadius: 14,
                    border: 'none',
                    background: GPT_T.ink,
                    color: '#fff',
                    fontFamily: GPT_FONT,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  {t.game.resume}
                </button>
                <button
                  onClick={() => setPhase('over')}
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: TH.out,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t.game.endGame}
                </button>
              </div>
            )}
            {/* How-to-play instructions below the board (localized EN/FR/AR) */}
            <p
              style={{
                marginTop: 14,
                marginBottom: 0,
                fontSize: 12.5,
                fontWeight: 600,
                color: GPT_T.ink45,
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              {t.game.howTo}
            </p>
          </div>
        )}

        {/* game over phase (bundle lines 308-329) */}
        {phase === 'over' && (
          <div
            style={{
              width: '100%',
              maxWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <GameOverArt />
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: GPT_T.ink,
                letterSpacing: -0.4,
                marginTop: 4,
              }}
            >
              {t.game.gameOver}
            </div>
            <div
              style={{ fontSize: 13.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 4 }}
            >
              {t.game.noMoves}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, width: '100%' }}>
              <div
                style={{
                  flex: 1,
                  background: GPT_T.paper,
                  border: `1px solid ${GPT_T.line}`,
                  borderRadius: 14,
                  padding: '12px 10px',
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: GPT_T.ink45,
                  }}
                >
                  {t.game.score}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: GPT_T.ink,
                    marginTop: 3,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {score.toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: GPT_T.paper,
                  border: `1px solid ${GPT_T.line}`,
                  borderRadius: 14,
                  padding: '12px 10px',
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: GPT_T.ink45,
                  }}
                >
                  {t.game.personalBest}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: score >= best ? TH.onDeep : GPT_T.ink70,
                    marginTop: 3,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {best.toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={startGame}
              style={{
                marginTop: 16,
                minHeight: 54,
                width: '100%',
                borderRadius: 16,
                border: 'none',
                background: GPT_T.ink,
                color: '#fff',
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 17,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
              }}
            >
              <GPTIcon name="on" size={20} color="#fff" />
              {t.game.playAgain}
            </button>

            {/* ── Leaderboard affordance (06-04) — Submit CTA + View link, BELOW "Play again". ── */}
            {!hasClaimedName() && (
              <div style={{ fontSize: 13, fontWeight: 600, color: GPT_T.ink45, marginTop: 12, lineHeight: 1.5 }}>
                {t.leaderboard.playing}
              </div>
            )}
            {submitState === 'done' ? (
              <div style={{ marginTop: 12, fontSize: 15, fontWeight: 800, color: TH.on, minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.leaderboard.submitted}
              </div>
            ) : (
              <button
                onClick={submitToLeaderboard}
                disabled={submitState === 'busy'}
                style={{
                  marginTop: 12,
                  minHeight: 46,
                  width: '100%',
                  borderRadius: 13,
                  border: 'none',
                  background: FLAG.blue,
                  color: '#fff',
                  fontFamily: GPT_FONT,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: submitState === 'busy' ? 'default' : 'pointer',
                  opacity: submitState === 'busy' ? 0.6 : 1,
                }}
              >
                {hasClaimedName() ? t.leaderboard.submit : t.leaderboard.namePrompt}
              </button>
            )}
            {submitState === 'error' && (
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: ACCENT.danger, lineHeight: 1.5 }}>
                {t.leaderboard.submitError}
              </div>
            )}
            <button
              onClick={() => navigate({ name: 'leaderboard' })}
              style={{
                marginTop: 10,
                background: 'transparent',
                border: 'none',
                color: FLAG.blue,
                fontFamily: GPT_FONT,
                fontWeight: 800,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              {t.leaderboard.view}
            </button>
          </div>
        )}
      </div>

      {nameRequired && (
        <NameGateSheet
          onClose={() => setNameRequired(false)}
          onOpenNameGate={() => { setNameRequired(false); openNameGate() }}
        />
      )}

      {/* ── MiniRadio strip — always at bottom (bundle line 332) ── */}
      <MiniRadio pausedLabel={t.game.paused} />

      {/* ── CropOverlay (bundle lines 334-336) ── */}
      {cropType != null && (
        <CropOverlay
          tileType={cropType}
          rtl={rtl}
          t={t}
          tilePhotos={tilePhotos}
          onCancel={() => setCropType(null)}
          onSaved={(type, url) => {
            setTilePhotos((prev) => new Map(prev).set(type, url))
            setCropType(null)
          }}
          onClear={(type) => {
            setTilePhotos((prev) => {
              const next = new Map(prev)
              next.delete(type)
              return next
            })
            setCropType(null)
          }}
        />
      )}
    </div>
  )
}
