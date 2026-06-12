// share.ts — native share (Web Share API Level 2) + download fallback. Zero deps.
// Pitfall handled: navigator.share({files}) must be called synchronously inside the tap
// handler and feature-detected via navigator.canShare({files}) (many Android in-app WebViews
// expose navigator.share but NOT file share). Pre-build the blob, then share the ready blob.
// AbortError = user cancelled = success (not an error).

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed'

function canShareFiles(files: File[]): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files })
    )
  } catch {
    return false
  }
}

/** Try native file-share; resolves 'shared' | 'cancelled' | 'failed'(no support). */
export async function shareImage(blob: Blob, filename: string, text: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (!canShareFiles([file])) return 'failed'
  try {
    await navigator.share({ files: [file], text, title: 'Gambia Outage' })
    return 'shared'
  } catch (err) {
    if (err && (err as Error).name === 'AbortError') return 'cancelled'
    return 'failed'
  }
}

/** Download the blob as a file (fallback when native share is unavailable). */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // revoke after the click has a chance to start the download
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
