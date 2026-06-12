// TalkScreen.tsx — the "Talk" Q&A board tab. Ask a question (pseudonymous), browse questions, open
// a thread to read/post answers (answers are comments with target_type='question'). Never linked to
// reports. Auto-moderated server-side. UI English.
import { useEffect, useRef, useState } from 'react'
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { getAccountId } from '@/lib/account'
import { getIdentity } from '@/lib/identity'
import { createQuestion, fetchQuestions, fetchQuestionThread, createComment, updateQuestion, deleteQuestion } from '@/lib/api'
import { markMyQuestion, unmarkMyQuestion, isMyQuestion } from '@/lib/myQuestions'
import type { Question, ZoneComment } from '@/lib/types'
import { Avatar } from '@/components/profile/Avatar'
import { StoryCard } from '@/components/community/StoryCard'
import { useAdminDelete } from '@/hooks/useAdminDelete'
import { useIsAdmin, adminHide } from '@/lib/admin'
import { IconBtn } from '@/components/shared/IconBtn'
import { GPTIcon } from '@/components/icons'
import { downscaleImage } from '@/lib/image'
import { useMyArea } from '@/hooks/useMyArea'
import { useT } from '@/i18n/useT'
import { hasClaimedName } from '@/lib/username'
import { openNameGate } from '@/app/nameGateStore'
import { NameGateSheet } from '@/components/shared/NameGateSheet'
import { FlagRule } from '@/components/Flag'
import { StatusStripConnected } from '@/components/shared/StatusStripConnected'

type Acct = { id: string; nickname: string; avatarId: string }

function EditGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GPT_T.ink45} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
function TrashGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}

function useAccount() {
  const acct = useRef<Acct | null>(null)
  useEffect(() => {
    getAccountId().then((id) => { const i = getIdentity(id); acct.current = { id, nickname: i.nickname ?? '', avatarId: i.avatarId } }).catch(() => {})
  }, [])
  return acct
}

/** A single question thread: the question + its answers + an answer composer. */
function Thread({ id, acct, onBack }: { id: string; acct: React.MutableRefObject<Acct | null>; onBack: () => void }) {
  const t = useT()
  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<ZoneComment[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)
  // Superadmin: long-press the question card to delete the whole thread (returns to the list).
  const qmod = useAdminDelete('question', question?.id, onBack, 'domanda')
  useEffect(() => {
    let live = true
    fetchQuestionThread(id).then((d) => { if (live) { setQuestion(d.question); setAnswers(d.answers) } }).catch(() => {})
    return () => { live = false }
  }, [id])
  async function submit() {
    const body = draft.trim()
    if (!body || busy || !acct.current) return
    if (!hasClaimedName()) { setNameRequired(true); return }
    setBusy(true)
    try {
      const c = await createComment({ account_id: acct.current.id, nickname: acct.current.nickname, avatar_id: acct.current.avatarId, target_type: 'question', target_id: id, body })
      setAnswers((prev) => [c, ...prev]); setDraft('')
    } catch { /* */ } finally { setBusy(false) }
  }
  return (
    <div style={{ height: '100%', overflow: 'auto', fontFamily: GPT_FONT, background: GPT_T.wash }}>
      {nameRequired && <NameGateSheet onClose={() => setNameRequired(false)} onOpenNameGate={() => { setNameRequired(false); openNameGate() }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, position: 'sticky', top: 0, zIndex: 1 }}>
        <IconBtn icon="back" onClick={onBack} label={t.talk.back} />
        <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>{t.talk.title}</div>
      </div>
      <div style={{ padding: 14 }}>
        {question && (
          <div {...qmod.bind} style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, overflow: 'hidden', marginBottom: 12, ...qmod.ring }}>
            {question.image && (
              <img src={question.image} alt="" decoding="async"
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block', borderBottom: `1px solid ${GPT_T.line}` }} />
            )}
            <div style={{ padding: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar avatarId={question.avatarId} size={26} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink }}>{question.nickname || 'Neighbour'}</span>
                {question.zone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, color: GPT_T.ink45, background: GPT_T.wash, borderRadius: 999, padding: '2px 8px' }}>
                    <GPTIcon name="pin" size={10} color={GPT_T.ink45} />{question.zone}
                  </span>
                )}
                <span style={{ fontSize: 11, color: GPT_T.ink25, marginInlineStart: 'auto' }}>{question.ago}</span>
              </div>
              {/* dir=auto: user-generated text keeps its own direction inside the AR (RTL) build —
                  without it, Latin posts with leading/trailing punctuation render bidi-mangled. */}
              <div dir="auto" style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, marginTop: 8, lineHeight: 1.3 }}>{question.title}</div>
              {question.body && <div dir="auto" style={{ fontSize: 13.5, color: GPT_T.ink70, marginTop: 4, lineHeight: 1.45 }}>{question.body}</div>}
            </div>
          </div>
        )}
        <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: 11, marginBottom: 12 }}>
          <textarea value={draft} maxLength={240} rows={2} placeholder={t.talk.answerPlaceholder} onChange={(e) => setDraft(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, background: 'transparent', lineHeight: 1.45 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{draft.length}/240</span>
            <button onClick={submit} disabled={!draft.trim() || busy}
              style={{ height: 34, padding: '0 16px', borderRadius: 9, border: 0, background: draft.trim() && !busy ? FLAG.green : GPT_T.line, color: '#fff', fontWeight: 800, fontSize: 13, cursor: draft.trim() && !busy ? 'pointer' : 'default' }}>
              {busy ? '…' : t.talk.answer}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, margin: '4px 2px 10px' }}>{t.talk.answers(String(answers.length))}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {answers.map((a) => <StoryCard key={a.id} nickname={a.nickname} avatarId={a.avatarId} body={a.body} ago={a.ago} modType="comment" modId={a.id} onModDeleted={() => setAnswers((prev) => prev.filter((x) => x.id !== a.id))} />)}
        </div>
      </div>
    </div>
  )
}

export function TalkScreen(_props: { onBack?: () => void } = {}) {
  const t = useT()
  const acct = useAccount()
  const { myArea } = useMyArea()
  const homeZone = myArea?.kind === 'quarter' ? myArea.name : ''
  const [qs, setQs] = useState<Question[] | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetchQuestions(50).then((q) => { if (live) setQs(q) }).catch(() => { if (live) setQs([]) })
    return () => { live = false }
  }, [])

  function pickPhoto(f: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    if (!f) { setPhoto(null); setPreview(''); return }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return
    setPhoto(f); setPreview(URL.createObjectURL(f))
  }

  async function ask() {
    const t = title.trim()
    if (!t || busy || !acct.current) return
    if (!hasClaimedName()) { setNameRequired(true); return }
    setBusy(true)
    try {
      const image = photo ? await downscaleImage(photo, 'talk.jpg') : null
      const q = await createQuestion({ account_id: acct.current.id, nickname: acct.current.nickname, avatar_id: acct.current.avatarId, title: t, body: body.trim(), zone: homeZone, image })
      markMyQuestion(q.id) // so this device can later edit/delete it
      setQs((c) => [q, ...(c ?? [])]); setTitle(''); setBody(''); pickPhoto(null)
    } catch { /* */ } finally { setBusy(false) }
  }

  // ── Author-only edit/delete of your own questions (ownership tracked locally; server re-checks) ──
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [rowBusy, setRowBusy] = useState(false)
  function startEdit(q: Question) { setEditId(q.id); setEditTitle(q.title); setEditBody(q.body || '') }
  function cancelEdit() { setEditId(null); setEditTitle(''); setEditBody('') }
  async function saveEdit(id: string) {
    const t = editTitle.trim()
    if (!t || rowBusy || !acct.current) return
    setRowBusy(true)
    try {
      const updated = await updateQuestion({ account_id: acct.current.id, id, title: t, body: editBody.trim() })
      setQs((c) => (c ?? []).map((x) => (x.id === id ? updated : x)))
      cancelEdit()
    } catch { /* keep editor open to retry */ } finally { setRowBusy(false) }
  }
  async function del(id: string) {
    if (!acct.current || rowBusy) return
    if (typeof window !== 'undefined' && !window.confirm('Delete this question?')) return
    setRowBusy(true)
    try {
      await deleteQuestion({ account_id: acct.current.id, id })
      unmarkMyQuestion(id)
      setQs((c) => (c ?? []).filter((x) => x.id !== id))
    } catch { /* */ } finally { setRowBusy(false) }
  }
  // Superadmin: delete ANY question straight from the list (not just one you authored on this device).
  const admin = useIsAdmin()
  async function adminDel(id: string) {
    if (rowBusy) return
    if (typeof window !== 'undefined' && !window.confirm('Delete this question? (admin — hides it for everyone)')) return
    setRowBusy(true)
    try {
      await adminHide('question', id)
      setQs((c) => (c ?? []).filter((x) => x.id !== id))
    } catch (err) {
      if (typeof window !== 'undefined') window.alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setRowBusy(false)
    }
  }

  if (openId) return <Thread id={openId} acct={acct} onBack={() => setOpenId(null)} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: GPT_FONT, background: GPT_T.wash }}>
      {nameRequired && <NameGateSheet onClose={() => setNameRequired(false)} onOpenNameGate={() => { setNameRequired(false); openNameGate() }} />}
      {/* Slim section header (the global AppHeader owns the brand bar + notch clearance). */}
      <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <div style={{ padding: '12px 14px 10px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>{t.talk.title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.talk.sub}</div>
        </div>
        <FlagRule height={3} radius={0} style={{ width: '100%' }} />
      </div>
      {/* 7-region status strip, under the header (present on every primary tab). */}
      <StatusStripConnected />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14 }}>
        <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <input value={title} maxLength={120} placeholder={t.talk.askPlaceholder} onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${GPT_T.line}`, borderRadius: 10, padding: 9, fontFamily: GPT_FONT, fontSize: 14.5, fontWeight: 600, color: GPT_T.ink, outline: 'none' }} />
          <textarea value={body} maxLength={280} rows={2} placeholder={t.talk.detailsPlaceholder} onChange={(e) => setBody(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, border: `1px solid ${GPT_T.line}`, borderRadius: 10, padding: 9, resize: 'none', fontFamily: GPT_FONT, fontSize: 13.5, color: GPT_T.ink, outline: 'none' }} />
          {/* Photo preview (optimised on-device before upload) */}
          {preview && (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <img src={preview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, display: 'block', border: `1px solid ${GPT_T.line}` }} />
              <button onClick={() => pickPhoto(null)} aria-label="Remove photo"
                style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 9, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
              <GPTIcon name="camera" size={15} color={GPT_T.ink45} /> {preview ? 'Change photo' : 'Add photo'}
            </label>
            {homeZone && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: GPT_T.ink45 }}>
                <GPTIcon name="pin" size={12} color={GPT_T.ink45} />{homeZone}
              </span>
            )}
            <button onClick={ask} disabled={!title.trim() || busy}
              style={{ marginInlineStart: 'auto', height: 36, padding: '0 18px', borderRadius: 9, border: 0, background: title.trim() && !busy ? FLAG.green : GPT_T.line, color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: title.trim() && !busy ? 'pointer' : 'default' }}>
              {busy ? '…' : t.talk.ask}
            </button>
          </div>
        </div>
        {qs === null ? (
          <div style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600 }}>Loading…</div>
        ) : qs.length === 0 ? (
          <div style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600, lineHeight: 1.5 }}>{t.talk.empty}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {qs.map((q) => {
              const mine = isMyQuestion(q.id)
              if (editId === q.id) {
                return (
                  <div key={q.id} style={{ background: GPT_T.paper, border: `1.5px solid ${FLAG.green}`, borderRadius: 14, padding: 12, fontFamily: GPT_FONT }}>
                    <input value={editTitle} maxLength={120} onChange={(e) => setEditTitle(e.target.value)} autoFocus
                      style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${GPT_T.line}`, borderRadius: 10, padding: 9, fontFamily: GPT_FONT, fontSize: 14.5, fontWeight: 600, color: GPT_T.ink, outline: 'none' }} />
                    <textarea value={editBody} maxLength={280} rows={2} onChange={(e) => setEditBody(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, border: `1px solid ${GPT_T.line}`, borderRadius: 10, padding: 9, resize: 'none', fontFamily: GPT_FONT, fontSize: 13.5, color: GPT_T.ink, outline: 'none' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button onClick={cancelEdit} style={{ height: 34, padding: '0 14px', borderRadius: 9, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: GPT_FONT }}>Cancel</button>
                      <button onClick={() => saveEdit(q.id)} disabled={!editTitle.trim() || rowBusy}
                        style={{ height: 34, padding: '0 16px', borderRadius: 9, border: 0, background: editTitle.trim() && !rowBusy ? FLAG.green : GPT_T.line, color: '#fff', fontWeight: 800, fontSize: 13, cursor: editTitle.trim() && !rowBusy ? 'pointer' : 'default', fontFamily: GPT_FONT }}>{rowBusy ? '…' : 'Save'}</button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={q.id} style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, overflow: 'hidden', fontFamily: GPT_FONT }}>
                  <div role="button" tabIndex={0} onClick={() => setOpenId(q.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(q.id) }} style={{ cursor: 'pointer' }}>
                    {q.image && (
                      <img src={q.image} alt="" loading="lazy" decoding="async"
                        style={{ width: '100%', maxHeight: 190, objectFit: 'cover', display: 'block', borderBottom: `1px solid ${GPT_T.line}` }} />
                    )}
                    <div style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar avatarId={q.avatarId} size={24} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink }}>{q.nickname || 'Neighbour'}</span>
                        {q.zone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, color: GPT_T.ink45, background: GPT_T.wash, borderRadius: 999, padding: '2px 8px' }}>
                            <GPTIcon name="pin" size={10} color={GPT_T.ink45} />{q.zone}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: GPT_T.ink25, marginInlineStart: 'auto' }}>{q.ago}</span>
                      </div>
                      <div dir="auto" style={{ fontSize: 15, fontWeight: 700, color: GPT_T.ink, marginTop: 6, lineHeight: 1.3 }}>{q.title}</div>
                      {q.body && <div dir="auto" style={{ fontSize: 13, color: GPT_T.ink70, marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.body}</div>}
                    </div>
                  </div>
                  {/* Author-only controls — only on questions this device posted. */}
                  {mine && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, padding: '0 8px 8px' }}>
                      <button onClick={() => startEdit(q)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 11px', borderRadius: 8, border: 'none', background: 'transparent', color: GPT_T.ink70, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: GPT_FONT }}>
                        <EditGlyph /> Edit
                      </button>
                      <button onClick={() => del(q.id)} disabled={rowBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 11px', borderRadius: 8, border: 'none', background: 'transparent', color: ACCENT.danger, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: GPT_FONT }}>
                        <TrashGlyph /> Delete
                      </button>
                    </div>
                  )}
                  {/* Superadmin control — delete any question (shown only in admin mode, when not your own). */}
                  {admin && !mine && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 8px 8px' }}>
                      <button onClick={() => adminDel(q.id)} disabled={rowBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 11px', borderRadius: 8, border: 'none', background: 'transparent', color: ACCENT.danger, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: GPT_FONT }}>
                        <TrashGlyph /> Delete (admin)
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
