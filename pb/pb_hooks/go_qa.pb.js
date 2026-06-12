/// <reference path="../pb_data/types.d.ts" />
// go_qa.pb.js — Q&A board ("Talk" tab). Pseudonymous questions; answers are comments
// (target_type='question'). Non-public collection — served only via these routes. Auto-moderation
// (sanitise + per-account cap in lib/go.js). Generic {message}; bad input → 400, transient → 500.
//
// ⚠ PB JSVM: handlers can't see file scope — require lib/go.js INSIDE each handler; use global $app.

function qaErr(e, err) {
  const code = err instanceof BadRequestError ? 400 : 500
  if (code === 500) $app.logger().error('qa route failed', 'err', String(err))
  return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
}

// Public create (createRule="") so the client can multipart-upload the optional Talk photo via the
// records API. Validate + sanitise + force the server-owned fields + per-device cap. PB binds the
// uploaded `image` file natively; we never trust the client for nickname/avatar/hidden. Mirrors
// go_community_links.pb.js. (The legacy JSON POST /api/go/questions route still works via app.save,
// which does not trigger this request hook.)
onRecordCreateRequest((e) => {
  const go = require(`${__hooks}/lib/go.js`)
  const r = e.record

  const account = String(r.get('account_id') || '')
  if (!go.ACCT_RE.test(account)) throw new BadRequestError('bad request')

  const title = go.sanitiseText(r.get('title'), 120)
  if (!title) throw new BadRequestError('A question or title is required.')

  const blocked = go.socialRateLimited(e.app, 'questions', account, go.CFG.QUESTION_HOURLY)
  if (blocked) throw new BadRequestError(blocked)

  r.set('title', title)
  r.set('body', go.sanitiseText(r.get('body'), 280))
  r.set('zone', go.sanitiseText(r.get('zone'), 60))
  r.set('nickname', go.cleanNick(r.get('nickname')))
  r.set('avatar_id', go.cleanAvatar(r.get('avatar_id')))
  r.set('hidden', false)

  e.next()
}, 'questions')

routerAdd('POST', '/api/go/questions', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.createQuestion($app, body))
  } catch (err) { return qaErr(e, err) }
})

routerAdd('GET', '/api/go/questions', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    let limit = ''
    try { limit = (e.requestInfo().query && e.requestInfo().query.limit) || '' } catch (_) {}
    return e.json(200, go.buildQuestions($app, limit))
  } catch (err) { return qaErr(e, err) }
})

routerAdd('GET', '/api/go/questions/{id}', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    return e.json(200, go.buildQuestionThread($app, e.request.pathValue('id')))
  } catch (err) { return qaErr(e, err) }
})

// Author-only edit/delete of a Talk question (account_id must match the row's). Error handling is
// INLINED (the file-scope qaErr isn't visible inside a handler at request time — PB JSVM gotcha).
routerAdd('POST', '/api/go/questions/update', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.updateQuestion($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('qa update failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})

routerAdd('POST', '/api/go/questions/delete', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.deleteQuestion($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('qa delete failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})
