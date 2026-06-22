/// <reference path="../pb_data/types.d.ts" />
// go_incidents.pb.js — Phase 7 anonymous incident reports (INC-01, INC-02, INC-06).
//
// Handler 1: onRecordCreateRequest('incident_reports')
//   geo-gate, rl_key/ip_key derivation, inc_rl per-IP quota, category validation,
//   mandatory photo check (D-06), text sanitise, GPS coarsen, force server fields.
//   Do NOT call bodyTooLarge — multipart goes through /api/collections/incident_reports/records,
//   NOT /api/go/* (the 16 KB cap guard exempts this route by design).
//   Do NOT attempt EXIF strip here — the file is not yet in storage before e.next().
//
// Handler 2: onRecordAfterCreateSuccess('incident_reports')
//   Server-side EXIF strip (D-04 contract — INC-02): createThumb re-encodes via
//   disintegration/imaging (strips ALL EXIF incl. GPS), replaces the original file via
//   record.set('photo-'/'+') + e.app.save. The GPS-bearing original is deleted from disk.
//   On failure: hide the record + log; do NOT throw (post-commit hook cannot roll back).
//
// GET /api/go/incidents: public feed, newest-first, category-filterable.
//
// PB JSVM isolation: require lib/go.js INSIDE each handler; inline all constants.

onRecordCreateRequest((e) => {
  const go = require(`${__hooks}/lib/go.js`)
  const r = e.record
  const info = e.requestInfo()

  // 1) Geo-gate — same pattern as reports_create.pb.js lines 31-37
  const country = go.geoCountryFromHeaders(info.headers)
  if (!go.geoAllowed(country)) {
    throw new BadRequestError('reporting is only available from inside The Gambia')
  }

  // 2) Real IP + identity derivation (anonymous, daily-rotating, never returned)
  let realIP = 'dev-local'
  try { realIP = e.realIP() || realIP } catch (_) {}
  let ua = ''
  try { ua = (info.headers && (info.headers.user_agent || info.headers['user-agent'])) || '' } catch (_) {}
  const rlk = go.rlKey(e.app, realIP, ua)
  const ipk = go.ipKey(e.app, realIP)

  // 3) Per-IP photo upload quota (before e.next() — quota check must precede file persist)
  if (!go.incRlCheck(e.app, ipk)) {
    throw new BadRequestError('hourly limit reached — try again later')
  }

  // 4) Category validation (closed enum — MUST be defined inside handler, not file scope)
  const CATEGORIES = ['flooding', 'road', 'water', 'electricity', 'waste', 'building', 'other']
  const cat = String(r.get('category') || '')
  if (!CATEGORIES.includes(cat)) throw new BadRequestError('invalid category')

  // 5) Mandatory photo (D-06): collection has required:false so PB accepts the multipart;
  //    the hook enforces presence with a clean 400 after the quota check runs.
  if (!r.get('photo')) throw new BadRequestError('photo is required')

  // 6) Text sanitise + cap (INC_TEXT_MAX default 280)
  r.set('text', go.sanitiseText(String(r.get('text') || ''), parseInt($os.getenv('INC_TEXT_MAX') || '280', 10)))

  // 7) GPS coarsen to 2 dp — incident always has GPS (no manual-pick mode)
  const lat = Number(r.get('lat'))
  const lng = Number(r.get('lng'))
  if (!isFinite(lat) || !isFinite(lng)) {
    throw new BadRequestError('valid lat/lng required')
  }
  r.set('lat', Math.round(lat * 100) / 100)
  r.set('lng', Math.round(lng * 100) / 100)

  // 8) Force server-owned fields (do NOT set account_id/report_id/event_id — P0 invariant #1/#4)
  r.set('rl_key', rlk)
  r.set('ip_key', ipk)
  r.set('hidden', false)

  e.next()
  // EXIF strip happens in onRecordAfterCreateSuccess below.
  // The original (potentially EXIF-bearing) file is stored transiently; the post-create
  // hook re-encodes and replaces it in milliseconds; it is never accessible via public API.
}, 'incident_reports')

// D-04 / INC-02: server-side EXIF strip. Fires after the transaction commits.
// Uses PB JSVM createThumb (disintegration/imaging Go library — strips ALL EXIF including GPS
// on JPEG re-encode), then replaces the stored original with the EXIF-free re-encode.
// On failure: hide the record so the potentially EXIF-bearing photo never reaches the public
// feed; do NOT throw (onRecordAfterCreateSuccess is post-commit; throwing cannot roll back).
onRecordAfterCreateSuccess((e) => {
  const r = e.record
  const photoName = r.get('photo')
  if (!photoName) return // no photo — nothing to strip (should not happen; create hook enforces)

  // Build PB storage key: {collectionId}/{recordId}/{filename}
  const collId = r.collection().id
  const originalKey = collId + '/' + r.id + '/' + photoName
  const thumbKey = collId + '/' + r.id + '/_stripped_' + photoName // temp key; deleted after read

  let fsys
  try {
    fsys = e.app.newFilesystem()

    // 1) Re-encode via PB's disintegration/imaging (strips ALL EXIF including GPS).
    //    '1200x0' = max 1200 px wide, height proportional. Tunable via INC_PHOTO_WIDTH.
    const width = $os.getenv('INC_PHOTO_WIDTH') || '1200'
    fsys.createThumb(originalKey, thumbKey, width + 'x0')

    // 2) Read the re-encoded bytes
    const reader = fsys.getReader(thumbKey)
    let bytes
    try { bytes = toBytes(reader) } finally { try { reader.close() } catch (_) {} }

    // 3) Wrap as a new filesystem.File
    const newFile = $filesystem.fileFromBytes(bytes, 'photo.jpg')

    // 4) Mark EXIF-bearing original for deletion; attach EXIF-free re-encode.
    //    On app.save(), PB deletes the marked file and writes the new one.
    //    NOTE: set('photo-'/set('photo+' are PB file-replace modifiers — NOT forbidden identifiers.
    r.set('photo-', [photoName])
    r.set('photo+', newFile)
    e.app.save(r)

    // 5) Clean up the temporary thumb key
    try { fsys.delete(thumbKey) } catch (_) {}

  } catch (err) {
    e.app.logger().error('incident EXIF strip failed', 'id', r.id, 'err', String(err))
    // Fallback: DELETE the record (cascades the stored file) so the EXIF/GPS-bearing original
    // never persists — hiding alone left the raw original reachable via the un-?thumb'd
    // /api/files/... URL until TTL, defeating the "server strip is authoritative" guarantee.
    // Do NOT throw — the record is already committed; throwing here does not roll it back.
    try { e.app.delete(r) } catch (_) {
      try { r.set('hidden', true); e.app.save(r) } catch (_) {} // last-resort: at least keep it off the feed
    }
  } finally {
    try { if (fsys) fsys.close() } catch (_) {}
  }
}, 'incident_reports')

// GET /api/go/incidents?category=&limit=&offset= — public incident feed (newest-first).
// Mirrors go_qa.pb.js GET /api/go/questions pattern exactly.
routerAdd('GET', '/api/go/incidents', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    let category = '', limit = '', offset = ''
    try {
      const q = e.requestInfo().query || {}
      category = q.category || ''
      limit = q.limit || ''
      offset = q.offset || ''
    } catch (_) {}
    return e.json(200, go.buildIncidentFeed($app, category, limit, offset))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('incidents feed failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})
