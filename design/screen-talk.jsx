// screen-talk.jsx — "Talk" community Q&A (#/talk, reached from the Community tab — a drill-down:
// back-arrow header; the bottom nav stays visible but highlights nothing). Ask a question under the
// device pseudonym, browse questions, open a thread to read/post answers (answers are polymorphic
// comments with target_type='question'). NEVER linked to reports. Mirrors web/src/screens/TalkScreen.tsx.
// Exports: TalkScreen

function _QuestionCard({ q, onOpen }) {
  return (
    <button onClick={onOpen} style={{ display: 'block', width: '100%', textAlign: 'left', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: 13, cursor: 'pointer', fontFamily: GPT_FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PseudoAvatar id={q.avatarId} name={q.nickname} size={26} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink }}>{q.nickname || 'Neighbour'}</span>
        {q.zoneName && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, color: GPT_T.ink45, background: GPT_T.wash, borderRadius: 999, padding: '2px 8px' }}>
            <GPTIcon name="pin" size={10} color={GPT_T.ink45} /> {q.zoneName}
          </span>
        )}
        <span style={{ fontSize: 11, color: GPT_T.ink25, marginLeft: 'auto' }}>{q.ago}</span>
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 800, color: GPT_T.ink, marginTop: 8, lineHeight: 1.3 }}>{q.title}</div>
      {q.body && <div style={{ fontSize: 13.5, color: GPT_T.ink70, marginTop: 4, lineHeight: 1.45 }}>{q.body}</div>}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink45, marginTop: 9 }}>💬 {q.answers.length} answer{q.answers.length === 1 ? '' : 's'}</div>
    </button>
  );
}

// A single question thread: the question + an answer composer + the answers.
function _Thread({ q, onBack, onAnswer }) {
  const [draft, setDraft] = React.useState('');
  const submit = () => {
    const v = draft.trim(); if (!v) return;
    onAnswer(q.id, { id: 'local-a-' + v.length, nickname: 'You', avatarId: 'you', body: v, ago: 'just now' });
    setDraft('');
  };
  return (
    <div style={{ height: '100%', overflow: 'auto', fontFamily: GPT_FONT, background: GPT_T.wash }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, position: 'sticky', top: 0, zIndex: 1 }}>
        <IconBtn icon="back" onClick={onBack} label="Back" />
        <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink }}>Talk</div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: 13, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PseudoAvatar id={q.avatarId} name={q.nickname} size={26} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink }}>{q.nickname || 'Neighbour'}</span>
            {q.zoneName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, color: GPT_T.ink45, background: GPT_T.wash, borderRadius: 999, padding: '2px 8px' }}>
                <GPTIcon name="pin" size={10} color={GPT_T.ink45} /> {q.zoneName}
              </span>
            )}
            <span style={{ fontSize: 11, color: GPT_T.ink25, marginLeft: 'auto' }}>{q.ago}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, marginTop: 8, lineHeight: 1.3 }}>{q.title}</div>
          {q.body && <div style={{ fontSize: 13.5, color: GPT_T.ink70, marginTop: 4, lineHeight: 1.45 }}>{q.body}</div>}
        </div>
        <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: 11, marginBottom: 12 }}>
          <textarea value={draft} maxLength={240} rows={2} placeholder="Write an answer…" onChange={e => setDraft(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, background: 'transparent', lineHeight: 1.45 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{draft.length}/240</span>
            <button onClick={submit} disabled={!draft.trim()}
              style={{ minHeight: 36, padding: '0 15px', borderRadius: 10, border: 'none', background: draft.trim() ? GPT_T.ink : GPT_T.line, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13.5, cursor: draft.trim() ? 'pointer' : 'default' }}>Answer</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {q.answers.length
            ? q.answers.map(a => <StoryCard key={a.id} item={a} />)
            : <div style={{ padding: '14px 0', textAlign: 'center', color: GPT_T.ink45, fontSize: 13.5 }}>No answers yet — be the first.</div>}
        </div>
      </div>
    </div>
  );
}

function TalkScreen({ data, onBack }) {
  const [questions, setQuestions] = React.useState(data.questions || []);
  const [openId, setOpenId] = React.useState(null);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const ask = () => {
    const v = title.trim(); if (!v) return;
    setQuestions(s => [{ id: 'local-q-' + s.length, nickname: 'You', avatarId: 'you', zoneName: null, ago: 'just now', title: v, body: body.trim(), answers: [] }, ...s]);
    setTitle(''); setBody('');
  };
  const addAnswer = (qid, a) => setQuestions(s => s.map(q => q.id === qid ? { ...q, answers: [a, ...q.answers] } : q));
  const open = openId && questions.find(q => q.id === openId);
  if (open) return <_Thread q={open} onBack={() => setOpenId(null)} onAnswer={addAnswer} />;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      {/* Drill-down → back-arrow header (the bottom nav stays, nothing highlighted). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label="Back to Community" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>Talk</div>
          <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600 }}>Ask the community — public pseudonym, never linked to your reports.</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 12px 20px' }}>
        {/* ask composer */}
        <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: 12, marginBottom: 12 }}>
          <input value={title} maxLength={120} placeholder="Ask the community…" onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', fontFamily: GPT_FONT, fontSize: 15, fontWeight: 700, color: GPT_T.ink, background: 'transparent' }} />
          <textarea value={body} maxLength={280} rows={2} placeholder="Add details (optional)" onChange={e => setBody(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: GPT_FONT, fontSize: 13.5, color: GPT_T.ink70, background: 'transparent', marginTop: 6, lineHeight: 1.45 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button onClick={ask} disabled={!title.trim()}
              style={{ minHeight: 38, padding: '0 18px', borderRadius: 11, border: 'none', background: title.trim() ? GPT_T.ink : GPT_T.line, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13.5, cursor: title.trim() ? 'pointer' : 'default' }}>Ask</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.length
            ? questions.map(q => <_QuestionCard key={q.id} q={q} onOpen={() => setOpenId(q.id)} />)
            : <div style={{ padding: '20px 0', textAlign: 'center', color: GPT_T.ink45, fontSize: 13.5 }}>No questions yet — be the first to ask.</div>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TalkScreen });
