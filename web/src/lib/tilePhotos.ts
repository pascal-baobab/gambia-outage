// tilePhotos.ts — on-device IndexedDB store for personalized tile photos.
// Key = tile type (1..5). Value = Blob (JPEG, 256×256, EXIF stripped by canvas re-encode).
// Photos NEVER leave the device. Zero network calls. GAME-02.
//
// Anonymity invariant (CLAUDE.md #4): this store holds ONLY image Blobs keyed
// by integer 1..5. Report / session identifiers are never stored here.
// Isolated from go-outbox by using a SEPARATE database ('go-tiles').
//
// Raw IDB Promise-wrapper pattern mirrors lib/outbox.ts exactly.

const DB_NAME = 'go-tiles' // distinct from go-outbox — never cross-contaminate
const STORE = 'photos'
const DB_VERSION = 1

function openTileDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        // Implicit numeric key (tileType 1..5) — no keyPath
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openTileDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}

/**
 * Store a Blob for the given tile type (1..5).
 * The blob must be a 256×256 JPEG produced by cropToBlob (EXIF already stripped).
 */
export async function saveTilePhoto(tileType: number, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, tileType))
}

/**
 * Remove the stored photo for a tile type (clear to default SVG).
 */
export async function deleteTilePhoto(tileType: number): Promise<void> {
  await tx('readwrite', (s) => s.delete(tileType))
}

/**
 * Load all stored tile photos as a Map of tileType → objectURL.
 * Callers MUST call URL.revokeObjectURL on each value when resetting or unmounting.
 * Returns an empty Map on any IDB error (same silent-failure style as outbox.ts listOutbox).
 */
export async function loadAllTilePhotos(): Promise<Map<number, string>> {
  try {
    const db = await openTileDB()
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly')
      const store = t.objectStore(STORE)
      const keysReq = store.getAllKeys()
      const valsReq = store.getAll()
      let keys: IDBValidKey[] | null = null
      let vals: Blob[] | null = null
      keysReq.onsuccess = () => {
        keys = keysReq.result
        if (vals !== null) done()
      }
      valsReq.onsuccess = () => {
        vals = valsReq.result as Blob[]
        if (keys !== null) done()
      }
      keysReq.onerror = () => reject(new Error('IDB getAllKeys failed'))
      valsReq.onerror = () => reject(new Error('IDB getAll failed'))
      t.oncomplete = () => db.close()
      function done() {
        const map = new Map<number, string>()
        keys!.forEach((k, idx) => {
          map.set(k as number, URL.createObjectURL(vals![idx]))
        })
        resolve(map)
      }
    })
  } catch {
    return new Map() // same silent-failure pattern as outbox.ts listOutbox
  }
}

/**
 * Crop an ImageBitmap to a square region (cropX, cropY, cropSize) and downscale
 * to 256×256 via OffscreenCanvas (or a fallback <canvas> for iOS < 16.4).
 * Re-encoding to JPEG strips all EXIF metadata from the original file.
 *
 * The returned Blob is a 256×256 JPEG at quality 0.9.
 * The original ImageBitmap should be closed by the caller after this resolves.
 */
export async function cropToBlob(
  source: ImageBitmap,
  cropX: number,
  cropY: number,
  cropSize: number,
): Promise<Blob> {
  // OffscreenCanvas is available in Chrome 69+, Firefox 105+, Safari 16.4+
  if (typeof OffscreenCanvas !== 'undefined') {
    const oc = new OffscreenCanvas(256, 256)
    oc.getContext('2d')!.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, 256, 256)
    return oc.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
  }
  // Fallback for iOS < 16.4 — regular <canvas> element with toBlob
  // (not available in a Worker/node environment; callers should only call from browser code)
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    canvas.getContext('2d')!.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, 256, 256)
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/jpeg',
      0.9,
    )
  })
}
