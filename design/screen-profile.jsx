// screen-profile.jsx — the "You" tab: DEVICE-LOCAL anonymous profile + visible gamification.
// Mirrors web/src/screens/ProfileScreen.tsx + components/profile/*: identity header (avatar +
// nickname + bio — device-local, published only as the community pseudonym, NEVER linked to
// reports), rank + XP bar, badges, streak, the device-local "My reports" tracker, the self-declared
// home neighbourhood (HomeZonePicker) and community social proof (ContributorsBadge).
// Exports: ProfileScreen, MyReportsCard, HomeZonePicker

// Self-declared home neighbourhood — search the 54-quarter seed, pick one, stored device-local.
function HomeZonePicker({ data }) {
  const [home, setHome] = useLocal('gpt_homezone', null);
  const [q, setQ] = React.useState('');
  const all = React.useMemo(() => {
    const out = [];
    Object.keys(data.quarters || {}).forEach(rid => {
      const region = (data.zones.find(z => z.id === rid) || {}).region || rid;
      (data.quarters[rid] || []).forEach(x => out.push({ id: x.id, name: x.name, region }));
    });
    return out;
  }, [data]);
  const ql = q.trim().toLowerCase();
  const matches = ql ? all.filter(x => x.name.toLowerCase().includes(ql)).slice(0, 6) : [];
  return (
    <div style={{ fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: GPT_T.ink70, marginBottom: 7 }}>Your neighbourhood</div>
      {home ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GPTIcon name="pin" size={16} color={GPT_T.ink45} />
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: GPT_T.ink }}>{home.name} · <span style={{ color: GPT_T.ink45, fontWeight: 600 }}>{home.region}</span></span>
          <button onClick={() => setHome(null)} style={{ border: 'none', background: 'transparent', color: GPT_T.ink45, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Clear</button>
        </div>
      ) : (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: GPT_T.wash, borderRadius: 11, padding: '0 11px', height: 40, border: `1px solid ${GPT_T.line}` }}>
            <GPTIcon name="search" size={16} color={GPT_T.ink45} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your area…"
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: GPT_FONT, fontSize: 14, color: GPT_T.ink }} />
          </div>
          {matches.length > 0 && (
            <div style={{ marginTop: 6, border: `1px solid ${GPT_T.line}`, borderRadius: 11, overflow: 'hidden' }}>
              {matches.map(m => (
                <button key={m.id} onClick={() => { setHome(m); setQ(''); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderBottom: `1px solid ${GPT_T.line2}`, background: GPT_T.paper, cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, color: GPT_T.ink }}>
                  {m.name} <span style={{ color: GPT_T.ink45, fontWeight: 600 }}>· {m.region}</span>
                </button>
              ))}
            </div>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

// Device-local "my reports" tracker with live zone status + resolve actions. The list is
// localStorage-only in prod (NEVER sent to the server); status comes from the public snapshot.
function MyReportsCard({ data, onReport }) {
  const th = useTheme();
  const [items, setItems] = React.useState(data.myReports || []);
  const findQuarter = (zoneId) => {
    const rid = String(zoneId).split('-')[0];
    return ((data.quarters || {})[rid] || []).find(x => x.id === zoneId) || null;
  };
  return (
    <div style={{ marginTop: 22, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: GPT_T.ink45, marginBottom: 8 }}>Your reports</div>
      {!items.length ? (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: GPT_T.ink70 }}>Areas you report will appear here.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(r => {
            const q = findQuarter(r.zoneId);
            const st = q ? displayStatus(q) : 'on';
            const open = r.type === 'out' && st !== 'on';
            return (
              <div key={r.zoneId} style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>
                      {r.type === 'out' ? `you reported a cut · ${r.ago}` : `you reported power back · ${r.ago}`}
                    </div>
                  </div>
                  {open ? <StatusPill status={st} size="sm" /> : <span style={{ fontSize: 12.5, fontWeight: 800, color: th.onDeep }}>Resolved ✓</span>}
                </div>
                {open && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                    <button onClick={() => { onReport && onReport('on', { id: r.zoneId, name: r.name, region: r.region }); setItems(s => s.map(x => x.zoneId === r.zoneId ? { ...x, type: 'back', ago: 'just now' } : x)); }}
                      style={{ flex: 1, minHeight: 38, borderRadius: 10, border: `1.5px solid ${th.onLine}`, background: th.onBg, color: th.onDeep, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <GPTIcon name="on" size={15} color={th.on} /> Power's back
                    </button>
                    <button onClick={() => setItems(s => s.filter(x => x.zoneId !== r.zoneId))}
                      style={{ minHeight: 38, padding: '0 13px', borderRadius: 10, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink45, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      I've moved on
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline identity editor — nickname + bio + the 16-preset avatar grid + home neighbourhood.
// Persists immediately (device-local); the pseudonym is published to the community ONLY when the
// user writes something — never linked to reports.
function IdentityEditor({ identity, onIdentity, data }) {
  const [nick, setNick] = React.useState(identity.nickname || '');
  const [bio, setBio] = React.useState(identity.bio || '');
  const field = { width: '100%', boxSizing: 'border-box', border: `1.5px solid ${GPT_T.line}`, borderRadius: 9, padding: '9px 11px', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, background: GPT_T.wash, outline: 'none' };
  const label = { display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: GPT_T.ink70, margin: '0 0 7px' };
  return (
    <div style={{ marginTop: 14, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 12, padding: 14, fontFamily: GPT_FONT }}>
      <label style={label}>Nickname</label>
      <input value={nick} maxLength={24} placeholder="Add a nickname (optional)" onChange={e => setNick(e.target.value)}
        onBlur={() => onIdentity({ ...identity, nickname: nick.trim() })} style={field} />
      <label style={{ ...label, marginTop: 16 }}>About you</label>
      <textarea value={bio} maxLength={160} rows={2} placeholder="Introduce yourself to the community (optional)" onChange={e => setBio(e.target.value)}
        onBlur={() => onIdentity({ ...identity, bio: bio.trim() })} style={{ ...field, resize: 'none', lineHeight: 1.45 }} />
      <div style={{ ...label, marginTop: 16, marginBottom: 9 }}>Avatar</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 9 }}>
        {AVATAR_PRESETS.map(a => {
          const selected = a.id === identity.avatarId;
          return (
            <button key={a.id} onClick={() => onIdentity({ ...identity, avatarId: a.id })} aria-pressed={selected} aria-label="Choose avatar"
              style={{ padding: 2, borderRadius: '50%', border: `2.5px solid ${selected ? FLAG.green : 'transparent'}`, background: 'transparent', cursor: 'pointer', lineHeight: 0, justifySelf: 'center' }}>
              <PseudoAvatar id={a.id} name={a.name} size={44} />
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <HomeZonePicker data={data} />
      </div>
      <p style={{ fontSize: 12, color: GPT_T.ink70, lineHeight: 1.5, margin: '13px 0 0' }}>
        Your pseudonym is public only on what you publish. It is never linked to your anonymous power reports.
      </p>
    </div>
  );
}

// AccountSecurity — recovery password + log out section at the bottom of ProfileScreen.
// Mirrors web/src/components/profile/AccountSecurity.tsx. Mock: useState for password state.
function AccountSecurity({ accountId }) {
  const [hasPassword, setHasPassword] = React.useState(!!(window.TWEAK && window.TWEAK.hasPassword));
  const [open, setOpen] = React.useState(false);
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const handleSet = () => {
    if (pw.trim().length < 6) { alert('Password must be at least 6 characters.'); return; }
    setHasPassword(true); setOpen(false); setPw(''); alert('Recovery password saved (mock).');
  };
  return (
    <div style={{ marginTop: 18, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 12, padding: 14, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase' }}>Account security</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>Recovery password</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: hasPassword ? THEMES.standard.on : GPT_T.ink45, marginTop: 2 }}>
            {hasPassword ? 'Password set — account recoverable on a new phone' : 'Not set — account lives on this device only'}
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ border: `1px solid ${GPT_T.line}`, background: GPT_T.wash, borderRadius: 9, padding: '7px 12px', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 700, color: GPT_T.ink, cursor: 'pointer' }}>
          {hasPassword ? 'Change' : 'Set'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 11 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input type={showPw ? 'text' : 'password'} value={pw} maxLength={64} placeholder="Enter a recovery password"
              onChange={e => setPw(e.target.value)}
              style={{ flex: 1, boxSizing: 'border-box', border: `1.5px solid ${GPT_T.line}`, borderRadius: 9, padding: '9px 40px 9px 11px', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, background: GPT_T.wash, outline: 'none' }} />
            {/* Eye toggle */}
            <button type="button" onClick={() => setShowPw(s => !s)}
              style={{ position: 'absolute', right: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: GPT_T.ink45, padding: 0, lineHeight: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showPw
                  ? <React.Fragment><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></React.Fragment>
                  : <React.Fragment><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></React.Fragment>}
              </svg>
            </button>
          </div>
          <button onClick={handleSet} style={{ marginTop: 9, width: '100%', minHeight: 40, borderRadius: 9, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Save password</button>
        </div>
      )}
      {/* Log out row */}
      <button onClick={() => window.confirm('Log out / switch account? Your reports and XP will be preserved if you have set a recovery password first.') && alert('Logged out (mock)')}
        style={{ marginTop: 14, width: '100%', padding: '10px 0', border: 'none', background: 'transparent', fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, color: THEMES.standard.out, cursor: 'pointer', textAlign: 'center' }}>
        Log out / switch account
      </button>
    </div>
  );
}

// CommunityPrivacyCard — opt-in discovery + accept-requests toggles.
// Mirrors web/src/components/profile/CommunityPrivacyCard.tsx.
function CommunityPrivacyCard() {
  const [discoverable, setDiscoverable] = React.useState(!!(window.TWEAK && window.TWEAK.discoverable));
  const [acceptRequests, setAcceptRequests] = React.useState(discoverable);
  const Toggle = ({ active, onToggle, label, sub }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${GPT_T.line2}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 2 }}>{sub}</div>}
      </div>
      <button type="button" onClick={onToggle} aria-pressed={active}
        style={{ width: 44, height: 26, borderRadius: 13, background: active ? FLAG.green : GPT_T.line, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: active ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(15,23,34,0.18)' }} />
      </button>
    </div>
  );
  return (
    <div style={{ marginTop: 18, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 12, padding: 14, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase', marginBottom: 2 }}>Community privacy</div>
      <Toggle active={discoverable} label="Show up in People" sub="Appear in the neighbour directory — still anonymous on the map"
        onToggle={() => { const next = !discoverable; setDiscoverable(next); if (!next) setAcceptRequests(false); }} />
      <Toggle active={acceptRequests && discoverable} label="Accept wave requests" sub="Let neighbours send you a wave"
        onToggle={() => discoverable && setAcceptRequests(r => !r)} />
    </div>
  );
}

function ProfileScreen({ data, identity, onIdentity, profile, onReport }) {
  const th = useTheme();
  const [editing, setEditing] = React.useState(false);
  const xp = profile.xp || 0;
  const rank = rankFor(xp);
  const next = rankNext(xp);
  const home = (() => { try { const s = localStorage.getItem('gpt_homezone'); return s ? JSON.parse(s) : null; } catch (e) { return null; } })();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      {/* Primary tab — header matches Map/News (title-leading + WhatsApp icon, NO back arrow). */}
      <div style={{ padding: '11px 16px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>Your watch</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>Device-local · no account, no PII</div>
        </div>
        <WhatsAppButton size={20} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 16px 32px' }}>
        {/* identity header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <PseudoAvatar id={identity.avatarId} name={identity.nickname || 'Anonymous neighbour'} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {identity.nickname || 'Anonymous neighbour'}
            </div>
            <div style={{ fontSize: 13, color: GPT_T.ink70, marginTop: 2 }}>{rank.label}</div>
            {home && <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 3 }}>📍 {home.name} · {home.region}</div>}
            {identity.bio && <div style={{ fontSize: 13, color: GPT_T.ink70, marginTop: 5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{identity.bio}</div>}
          </div>
          <button onClick={() => setEditing(e => !e)}
            style={{ border: `1.5px solid ${GPT_T.line}`, background: editing ? GPT_T.wash : GPT_T.paper, color: GPT_T.ink70, borderRadius: 999, padding: '6px 14px', fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        {editing && <IdentityEditor identity={identity} onIdentity={onIdentity} data={data} />}

        {/* progress / empty state */}
        {xp === 0 ? (
          <p style={{ opacity: 0.78, fontSize: 14.5, lineHeight: 1.55, color: GPT_T.ink70, marginTop: 18 }}>
            Report outages to earn XP and ranks — your watch starts with your first report. XP is never linked to which reports you made.
          </p>
        ) : (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 20, color: th.partialDeep }}>{rank.label}</div>
            <p style={{ opacity: 0.7, margin: '4px 0 12px', fontSize: 13, color: GPT_T.ink70 }}>{xp} XP</p>
            <XpBar xp={xp} toNext={next ? next.min - xp : 0} nextLabel={next ? next.label : null} />
            {profile.streakWeeks >= 1 && (
              <p style={{ marginTop: 12, fontSize: 14, color: GPT_T.ink }}>🔥 {profile.streakWeeks}-week streak{profile.streakWeeks >= 2 ? ' — keep it alive!' : ''}</p>
            )}
            {(profile.badges || []).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {profile.badges.map(b => <BadgeChip key={b} k={b} />)}
              </div>
            )}
          </div>
        )}

        <MyReportsCard data={data} onReport={onReport} />
        <ContributorsBadge stats={data.stats} variant="profile" />
        <CommunityPrivacyCard />
        <AccountSecurity accountId={GPT_DATA && GPT_DATA.profile && GPT_DATA.profile.accountId} />
      </div>
    </div>
  );
}

Object.assign(window, { ProfileScreen, MyReportsCard, HomeZonePicker, IdentityEditor, AccountSecurity, CommunityPrivacyCard });
