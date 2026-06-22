// IncidentForm.tsx — incident report form (INC-02, INC-03, D-10).
//
// Photo pipeline: <input type=file> → createImageBitmap(file) → square-crop centered →
// canvas re-encode 1024×1024 JPEG (EXIF stripped; mirrors tilePhotos.ts cropToBlob,
// output size changed 256→1024). The Blob that leaves the device has no GPS EXIF tags.
//
// GPS: captured via navigator.geolocation on mount (alive-flag cleanup). The user can
// correct the captured position using IncidentLocationPicker (D-10 draggable mini-map).
// The submitted lat/lng always reflects the (possibly adjusted) picker position, never
// unconditionally the raw GPS fix.
//
// Submit: validates photo + position + category; calls submitIncident from api.ts with
// the stripped Blob and the adjusted lat/lng. All strings from t.incidents.*.
// Token-only styling (GPT_T/FLAG/ACCENT — D-12). No raw hex except '#fff'.
import { useState, useRef, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT, FLAG, ACCENT, BUTTON_PRIMARY } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { submitIncident } from '@/lib/api'
import { IncidentLocationPicker } from './IncidentLocationPicker'

// ── Category slugs (closed set) ─────────────────────────────────────────────
const CATEGORY_SLUGS = ['flooding', 'road', 'water', 'electricity', 'waste', 'building', 'other'] as const
type CategorySlug = (typeof CATEGORY_SLUGS)[number]

// Category → token color for the picker swatches (mirrors GambiaMapLive + IncidentFeedCard).
const CATEGORY_COLOR: Record<string, string> = {
  flooding: FLAG.blue,
  road: ACCENT.amber,
  water: ACCENT.tile5,
  electricity: ACCENT.star,
  waste: GPT_T.ink45,
  building: FLAG.red,
  other: ACCENT.tile4,
}

// ── Canvas EXIF-strip (adapted from tilePhotos.ts cropToBlob, output 1024×1024) ──────────────
// Re-encoding to JPEG via OffscreenCanvas or <canvas> strips ALL EXIF tags regardless of size.
// The caller must call source.close() after this resolves (mirrors tilePhotos.ts guidance).
async function cropToBlob1024(source: ImageBitmap): Promise<Blob> {
  const { width, height } = source
  const cropSize = Math.min(width, height)
  const cropX = Math.floor((width - cropSize) / 2)
  const cropY = Math.floor((height - cropSize) / 2)
  const OUT = 1024 // incidents use 1024×1024; tiles use 256×256
  // OffscreenCanvas: Chrome 69+, Firefox 105+, Safari 16.4+
  if (typeof OffscreenCanvas !== 'undefined') {
    const oc = new OffscreenCanvas(OUT, OUT)
    oc.getContext('2d')!.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, OUT, OUT)
    return oc.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
  }
  // Fallback for iOS < 16.4 — regular <canvas> element with toBlob.
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = OUT
    canvas.getContext('2d')!.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, OUT, OUT)
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/jpeg',
      0.9,
    )
  })
}

export function IncidentForm({ onSuccess }: { onSuccess?: () => void }) {
  const t = useT()
  const queryClient = useQueryClient()

  // Form state
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [category, setCategory] = useState<CategorySlug | ''>('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Clean up object URL on unmount / photo change.
  const prevPreviewRef = useRef<string | null>(null)
  useEffect(() => {
    return () => {
      if (prevPreviewRef.current) URL.revokeObjectURL(prevPreviewRef.current)
    }
  }, [])

  // GPS capture on mount — alive flag for cleanup (mirrors useGeoGate.ts pattern).
  useEffect(() => {
    let alive = true
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive) return
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
      },
      () => {
        // GPS unavailable or denied — the user will see the locationRequired error on submit.
        // No state update needed; lat/lng stay null.
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
    return () => { alive = false }
  }, [])

  // Photo selection → EXIF-strip pipeline.
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const bitmap = await createImageBitmap(file)
      const stripped = await cropToBlob1024(bitmap)
      bitmap.close() // release GPU memory
      // Revoke the previous preview URL before creating a new one.
      if (prevPreviewRef.current) {
        URL.revokeObjectURL(prevPreviewRef.current)
      }
      const url = URL.createObjectURL(stripped)
      prevPreviewRef.current = url
      setBlob(stripped)
      setPreviewUrl(url)
    } catch {
      setError(t.incidents.errors.photoRequired)
    }
  }, [t])

  // Position picker callback — updates lat/lng from drag/tap (D-10).
  const handlePositionChange = useCallback((p: { lat: number; lng: number }) => {
    setLat(p.lat)
    setLng(p.lng)
  }, [])

  // Submit handler.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate: photo → position → category (priority order matches t.incidents.errors keys).
    if (!blob) { setError(t.incidents.errors.photoRequired); return }
    if (lat === null || lng === null) { setError(t.incidents.errors.locationRequired); return }
    if (!category) { setError(t.incidents.errors.categoryRequired); return }

    setSubmitting(true)
    try {
      await submitIncident({ category, text, lat, lng, photo: blob })
      // Refetch the feed so the new incident appears immediately. Invalidate the ['incidents']
      // PREFIX (not qk.incidents('')) so category-filtered feeds + the map view refresh too —
      // ['incidents',''] does not prefix-match ['incidents','flooding'].
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
      // Reset form.
      if (prevPreviewRef.current) { URL.revokeObjectURL(prevPreviewRef.current); prevPreviewRef.current = null }
      setBlob(null)
      setPreviewUrl(null)
      setCategory('')
      setText('')
      setError(null)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t.incidents.errors.photoRequired)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} style={{ fontFamily: GPT_FONT }}>
      {/* ── Photo input ── */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: GPT_T.ink70,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 6,
          }}
        >
          {t.incidents.form.photo}
        </div>
        <label
          style={{
            cursor: 'pointer',
            borderRadius: 12,
            border: `1.5px dashed ${previewUrl ? GPT_T.line : GPT_T.ink45}`,
            background: GPT_T.wash,
            overflow: 'hidden',
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t.incidents.form.photoHint}
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                padding: '16px 12px',
                textAlign: 'center',
                color: GPT_T.ink45,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t.incidents.form.photoHint}
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => { void handleFileChange(e) }}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* ── Location field + mini-map picker (D-10) ── */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: GPT_T.ink70,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 6,
          }}
        >
          {t.incidents.form.location}
        </div>
        {lat !== null && lng !== null ? (
          <IncidentLocationPicker lat={lat} lng={lng} onChange={handlePositionChange} />
        ) : (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: `1.5px solid ${GPT_T.line}`,
              background: GPT_T.wash,
              fontSize: 13,
              fontWeight: 600,
              color: GPT_T.ink45,
            }}
          >
            {t.incidents.errors.locationRequired}
          </div>
        )}
      </div>

      {/* ── Category picker ── */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: GPT_T.ink70,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          {t.incidents.form.category}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORY_SLUGS.map((slug) => {
            const on = category === slug
            const color = CATEGORY_COLOR[slug] ?? GPT_T.ink45
            const label = (t.incidents.categories as Record<string, string>)[slug] ?? slug
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setCategory(slug)}
                style={{
                  padding: '7px 13px',
                  borderRadius: 999,
                  border: `1.5px solid ${on ? color : GPT_T.line}`,
                  background: on ? color : GPT_T.paper,
                  color: on ? '#fff' : GPT_T.ink70,
                  fontFamily: GPT_FONT,
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Description text (optional) ── */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: GPT_T.ink70,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 6,
          }}
        >
          {t.incidents.form.text}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.incidents.form.textPlaceholder}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 12,
            border: `1.5px solid ${GPT_T.line}`,
            background: GPT_T.paper,
            fontFamily: GPT_FONT,
            fontSize: 14,
            fontWeight: 500,
            color: GPT_T.ink,
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {/* ── Error message ── */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: GPT_T.paper,
            border: `1px solid ${FLAG.red}`,
            fontSize: 13,
            fontWeight: 600,
            color: FLAG.red,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Submit button ── */}
      <button
        type="submit"
        disabled={submitting}
        style={{
          ...BUTTON_PRIMARY,
          width: '100%',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? t.incidents.form.submitting : t.incidents.form.submit}
      </button>
    </form>
  )
}
