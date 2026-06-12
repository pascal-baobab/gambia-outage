// screens-main.jsx — HomeScreen (map) + ListScreen + NewsScreen + CommunityScreen.
// Exports: HomeScreen, MapScreen, NewsScreen, CommunityScreen, ListScreen, MacroHeader, QuarterRow,
//          MapLegend, EmptyState, WallOfHonorTeaser, PeopleSection, PersonCard

function MapLegend({ floating = true }) {
  const th = useTheme();
  return (
    <div style={{ ...(floating ? { position: 'absolute', left: 12, bottom: 12 } : {}), display: 'flex', gap: 13,
      background: 'rgba(255,255,255,0.96)', padding: '7px 12px', borderRadius: 11, border: `1px solid ${GPT_T.line}`, boxShadow: '0 2px 8px rgba(15,23,34,0.08)' }}>
      {[['out', 'Out'], ['partial', 'Partial'], ['on', 'On']].map(([s, l]) => (
        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: GPT_FONT, fontSize: 12, fontWeight: 700, color: GPT_T.ink70 }}>
          <GPTIcon name={s} size={14} color={th[s]} strokeColor="#fff" /> {l}
        </span>
      ))}
    </div>
  );
}

function EmptyState() {
  const th = useTheme();
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, gap: 14 }}>
      <div style={{ width: 76, height: 76, borderRadius: 22, background: th.onBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GPTIcon name="on" size={40} color={th.on} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.4 }}>Power is on everywhere</div>
      <div style={{ fontSize: 14.5, color: GPT_T.ink70, fontWeight: 500, maxWidth: 260, lineHeight: 1.45 }}>No active outages reported across all 7 regions right now. If your power goes out, you'll be the first to log it.</div>
    </div>
  );
}

// WallOfHonorTeaser — compact leaderboard entry below region rows on HomeScreen.
// Returns null when no hours data. Consumes window.MOCK_HOURS (from app-data.jsx via Plan 01).
function WallOfHonorTeaser({ hours, onHonors }) {
  const th = useTheme();
  if (!hours || hours.length === 0) return null;
  const top = hours[0]; // worst-first
  const others = hours.length - 1;
  return (
    <button onClick={onHonors || (() => {})}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: 'calc(100% - 24px)', margin: '10px 12px 0', textAlign: 'start', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 16, padding: '12px 14px', cursor: 'pointer', fontFamily: GPT_FONT }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: th.outBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GPTIcon name="out" size={22} color={th.out} strokeColor={th.outBg} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: GPT_T.ink45 }}>Wall of Honor</span>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {top.name} · {fmtHM(top.darkMinutes)} dark
        </span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GPT_T.ink45 }}>
          {others > 0 ? `+ ${others} more neighbourhoods` : "This week's most documented outages"}
        </span>
      </span>
      <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
    </button>
  );
}

// PersonCard — 2-column card in the People grid.
function PersonCard({ person }) {
  const th = useTheme();
  return (
    <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '12px 11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', fontFamily: GPT_FONT }}>
      <PseudoAvatar id={person.avatarId} name={person.nickname} size={44} />
      <div style={{ width: '100%', minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.nickname}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.zone}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: th.partialDeep, marginTop: 1 }}>{person.rank}</div>
      </div>
    </div>
  );
}

// PeopleSection — opt-in neighbour directory inside CommunityScreen.
// Consumes window.MOCK_PEOPLE (from app-data.jsx via Plan 01). discoverable from TWEAK.
function PeopleSection({ people, discoverable, onBecomeVisible }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink, fontFamily: GPT_FONT }}>People</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>opt-in · neighbours near you</div>
      </div>
      {!discoverable && (
        <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: '13px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>Show up in People</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 2, lineHeight: 1.4 }}>Let neighbours find and wave at you. You stay anonymous on the map.</div>
          </div>
          <button onClick={onBecomeVisible || (() => {})} style={{ flexShrink: 0, border: 'none', background: FLAG.green, color: '#fff', borderRadius: 999, padding: '9px 14px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
            Show me
          </button>
        </div>
      )}
      {/* 2-column card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(people || []).map(p => <PersonCard key={p.id} person={p} />)}
      </div>
    </section>
  );
}

function MapSkeleton() {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
        <Skeleton w={90} h={38} r={11} /><Skeleton w={120} h={38} r={11} />
      </div>
      <Skeleton w="100%" h="62%" r={14} style={{ marginTop: 20 }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><Skeleton w={120} h={26} r={8} /></div>
    </div>
  );
}

function SaverList({ zones, onOpenZone }) {
  const sorted = [...zones].sort((a, b) => b.sev - a.sev);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: GPT_T.wash }}>
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 700, color: GPT_T.ink70, background: '#EAF1EC', borderBottom: `1px solid ${GPT_T.line}` }}>
        <GPTIcon name="saver" size={15} color={GPT_T.on} /> Data-saver on · text only, no map tiles
      </div>
      {sorted.map((z, i) => <ListRow key={z.id} zone={z} rank={i + 1} onClick={() => onOpenZone(z)} />)}
    </div>
  );
}

// HomeScreen — single scroll container under the RightNowHero: My-area card → XP RankChip → a
// FIXED-HEIGHT live-map card (Leaflet, quarter dots; data-saver swaps it for a banner) → the 7
// region rows → the 3-card "From Facebook" teaser ("See all N in News") → contributors line.
// The global ThumbDock + BottomNav are rendered by the app SHELL (not here) — they are app-wide.
const HOME_MAP_HEIGHT = 190;
function HomeScreen({ data, offline, saver, onSaver, onList, onOpenZone, onReport, onAbout, onNews, onProfile, onHonors, identity, profile, loading, empty, t, myArea, myAreaAlert, onOpenMyArea, onToggleMyAreaAlert, onClearMyArea }) {
  const th = useTheme();
  const sorted = [...data.zones].sort((a, b) => b.sev - a.sev);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      <RightNowHero data={data} offline={offline} onAbout={onAbout} onOpenZone={onOpenZone}
        identity={identity} profile={profile} onProfile={onProfile} />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
        {myArea && !loading && (
          <MyAreaCard st={myArea} alertOn={myAreaAlert} onOpen={onOpenMyArea} onReport={onReport} onToggleAlert={onToggleMyAreaAlert} onClear={onClearMyArea} />
        )}
        {/* XP progress card — only once the device has earned XP (rank-up celebration lives in the shell). */}
        <RankChip profile={profile} />
        {loading ? <MapSkeleton /> : empty ? <EmptyState /> : (
          <React.Fragment>
            {/* Live map card (or the data-saver banner) */}
            <div style={{ margin: '10px 12px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontFamily: GPT_FONT, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase' }}>Live map</div>
                <button onClick={onSaver} aria-pressed={saver}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', borderRadius: 9, flexShrink: 0, cursor: 'pointer',
                    background: saver ? GPT_T.ink : GPT_T.paper, color: saver ? '#fff' : GPT_T.ink70, border: `1px solid ${saver ? GPT_T.ink : GPT_T.line}`,
                    fontFamily: GPT_FONT, fontSize: 12, fontWeight: 700 }}>
                  <GPTIcon name="saver" size={14} color={saver ? '#fff' : GPT_T.ink70} /> Data-saver
                </button>
              </div>
              {saver ? (
                <div style={{ borderRadius: 14, border: `1px dashed ${GPT_T.line}`, background: GPT_T.paper, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, fontFamily: GPT_FONT }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GPTIcon name="map" size={20} color={GPT_T.ink45} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink }}>Map off — saving data</div>
                    <div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>No tiles load. The list below is live.</div>
                  </div>
                </div>
              ) : (
                <div style={{ height: HOME_MAP_HEIGHT, borderRadius: 14, overflow: 'hidden', border: `1px solid ${GPT_T.line}`, background: GPT_T.wash, position: 'relative' }}>
                  <GambiaMapLive data={data} onZone={onOpenZone}
                    onQuarter={(z, q) => onOpenZone({ ...data.zones.find(zz => zz.id === z.id), id: q.id, name: q.name, region: z.region, sev: q.sev, todayMin: q.mins, reports: q.reports })} />
                </div>
              )}
            </div>
            {/* Region rows, worst first */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 6px' }}>
              <div style={{ fontFamily: GPT_FONT, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase' }}>Tap an area</div>
              <button onClick={onList}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 700, color: GPT_T.ink70, padding: 0 }}>
                <GPTIcon name="list" size={15} color={GPT_T.ink70} /> All quarters
              </button>
            </div>
            {sorted.map((z, i) => <ListRow key={z.id} zone={z} rank={i + 1} onClick={() => onOpenZone(z)} />)}
            {/* Wall of Honor teaser — links to the HonorsScreen (wired by Plan 04). */}
            <WallOfHonorTeaser hours={window.MOCK_HOURS} onHonors={onHonors} />
          </React.Fragment>
        )}
        {/* "From Facebook" teaser — the full feed lives ONLY in the News tab. */}
        <div style={{ padding: '12px 12px 4px' }}>
          <SocialLinksSection links={data.social || []} limit={3} onSeeAll={onNews} />
        </div>
        <ContributorsBadge stats={data.stats} variant="home" />
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

// MapScreen — the "Map" tab: the live outage map FULL-SCREEN (7 region pins + ~54 quarter dots at
// real settlement centroids). Mirrors web/src/screens/MapScreen.tsx.
function MapScreen({ data, onOpenZone }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      <div style={{ padding: '11px 16px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontFamily: GPT_FONT, fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>Live map</div>
        <WhatsAppButton size={20} />
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <GambiaMapLive data={data} onZone={onOpenZone}
          onQuarter={(z, q) => onOpenZone({ ...data.zones.find(zz => zz.id === z.id), id: q.id, name: q.name, region: z.region, sev: q.sev, todayMin: q.mins, reports: q.reports })} />
        <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, pointerEvents: 'none' }}><MapLegend floating={false} /></div>
      </div>
    </div>
  );
}

// NewsScreen — the "News" tab: newspaper masthead + NationalStatusBanner + the full From-Facebook feed.
// The full feed lives ONLY here; Home and Community show a 3-card teaser.
// Mirrors web/src/screens/NewsScreen.tsx.
function NewsScreen({ data }) {
  const th = useTheme();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      {/* Newspaper masthead */}
      <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>News</div>
            <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600 }}>Official updates &amp; From Facebook</div>
          </div>
          <WhatsAppButton size={20} />
        </div>
        {/* NationalStatusBanner stub — one-line national power summary */}
        <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 9, background: th.outBg, borderTop: `1px solid ${th.outLine}` }}>
          <GPTIcon name="out" size={15} color={th.out} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: th.outDeep, lineHeight: 1.3 }}>
            National outage status · updated live
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 12px 20px' }}>
        <SocialLinksSection links={data.social || []} />
      </div>
    </div>
  );
}

// CommunityScreen — the "Community" tab: shipped Community side.
// "From the community" citizen links + ShareLinkComposer stub + PeopleSection + Talk door.
// The "From Facebook" full feed has MOVED to NewsScreen. A "Latest news →" door leads there.
// Mirrors web/src/screens/CommunityScreen.tsx.
function CommunityScreen({ data, onOpenZone, onNews, onTalk, t }) {
  const th = useTheme();
  const discoverable = !!(window.TWEAK && window.TWEAK.discoverable);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      <div style={{ padding: '11px 16px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>Community</div>
          <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600 }}>Neighbours keeping the record honest</div>
        </div>
        <WhatsAppButton size={20} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* "From the community" citizen links section */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: GPT_T.ink45, marginBottom: 10 }}>From the community</div>
          {(data.communityLinks || []).length === 0 ? (
            <div style={{ background: GPT_T.paper, border: `1px dashed ${GPT_T.line}`, borderRadius: 13, padding: '16px 14px', textAlign: 'center', fontSize: 13, color: GPT_T.ink45, fontWeight: 600 }}>
              No community links yet — be the first to share.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {(data.communityLinks || []).map((lnk, i) => (
                <div key={i} style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lnk.title}</div>
                    <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>{lnk.source}</div>
                  </div>
                  <GPTIcon name="chevron" size={16} color={GPT_T.ink25} />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ShareLinkComposer stub */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => alert('Share a link (mock)')}>
            <GPTIcon name="info" size={18} color={GPT_T.ink45} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: GPT_T.ink45 }}>Share a link with the community…</span>
          </div>
        </div>
        {/* Latest news → door to NewsScreen */}
        <div style={{ padding: '12px 16px 0' }}>
          <button onClick={onNews}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', fontFamily: GPT_FONT }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: th.partialBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GPTIcon name="list" size={19} color={th.partialDeep} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>Latest news</span>
              <span style={{ display: 'block', fontSize: 12, color: GPT_T.ink45, fontWeight: 600 }}>From Facebook &amp; official updates →</span>
            </span>
            <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
          </button>
        </div>
        {/* People section — opt-in neighbour directory */}
        <div style={{ padding: '16px 16px 0' }}>
          <PeopleSection
            people={window.MOCK_PEOPLE}
            discoverable={discoverable}
            onBecomeVisible={() => alert('Become visible (mock)')}
          />
        </div>
        {/* Live strip */}
        <div style={{ padding: '12px 12px 0' }}>
          <LiveStrip lives={data.live || []} />
        </div>
        {/* Talk / Q&A door */}
        <div style={{ padding: '12px 12px 0' }}>
          <button onClick={onTalk}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', fontFamily: GPT_FONT }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: th.onBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GPTIcon name="info" size={19} color={th.onDeep} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>Talk — ask the community</span>
              <span style={{ display: 'block', fontSize: 12, color: GPT_T.ink45, fontWeight: 600 }}>{(data.questions || []).length} open questions · public pseudonym</span>
            </span>
            <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <StoriesSection stories={data.stories || []} />
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

function QuarterRow({ q, onOpen }) {
  const th = useTheme();
  return (
    <button onClick={onOpen} style={{ width: '100%', textAlign: 'left', background: GPT_T.paper, border: 'none', borderBottom: `1px solid ${GPT_T.line2}`,
      padding: '11px 14px 11px 18px', display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', minHeight: 54, fontFamily: GPT_FONT }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: th[q.status], flexShrink: 0, boxShadow: `0 0 0 3px ${th[q.status + 'Bg']}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
        <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>{q.reports} reports</div>
      </div>
      <StatusPill status={q.status} size="sm" />
      <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'right' }}>{fmtHM(q.mins)}</span>
      <GPTIcon name="chevron" size={16} color={GPT_T.ink25} />
    </button>
  );
}

function MacroHeader({ zone, sum, expanded, onToggle }) {
  const th = useTheme();
  return (
    <button onClick={onToggle} style={{ width: '100%', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2,
      background: GPT_T.wash, border: 'none', borderTop: `1px solid ${GPT_T.line}`, borderBottom: `1px solid ${GPT_T.line}`,
      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minHeight: 56, fontFamily: GPT_FONT }}>
      <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'flex', flexShrink: 0 }}><GPTIcon name="chevron" size={18} color={GPT_T.ink45} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>{zone.region}</div>
        <div style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>
          {sum.total} quarters · {sum.affected ? <span style={{ color: th[sum.worst === 'on' ? 'partial' : sum.worst], fontWeight: 700 }}>{sum.affected} affected</span> : 'all on'}
        </div>
      </div>
      <StatusPill status={sum.worst} size="sm" />
    </button>
  );
}

function ListScreen({ data, offline, onBack, onMap, onOpenZone, onReport, t }) {
  const th = useTheme();
  const [q, setQ] = React.useState('');
  const [region, setRegion] = React.useState('All');
  const [collapsed, setCollapsed] = React.useState({});
  const ql = data.quarters || {};
  const query = q.trim().toLowerCase();
  const regions = ['All', ...data.zones.map(z => z.region)];
  const order = [...data.zones].sort((a, b) => b.sev - a.sev);
  const sections = order
    .filter(z => region === 'All' || z.region === region)
    .map(z => {
      let items = (ql[z.id] || []).slice().sort((a, b) => b.sev - a.sev);
      if (query) items = items.filter(it => it.name.toLowerCase().includes(query) || z.region.toLowerCase().includes(query));
      return { zone: z, items };
    })
    .filter(s => s.items.length > 0);
  const totalQ = Object.values(ql).reduce((n, a) => n + a.length, 0);
  const summarize = (list) => {
    const out = list.filter(x => x.status === 'out').length;
    const partial = list.filter(x => x.status === 'partial').length;
    return { total: list.length, out, partial, affected: out + partial, worst: out ? 'out' : partial ? 'partial' : 'on' };
  };
  const openQuarter = (z, it) => {
    const parent = data.zones.find(zz => zz.id === z.id) || z;
    onOpenZone({ ...parent, id: it.id, name: it.name, region: parent.region, sev: it.sev, todayMin: it.mins, reports: it.reports });
  };
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.paper }}>
      <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
          <IconBtn icon="back" onClick={onBack} label="Back to map" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1 }}>Quarters</div>
            <div style={{ fontSize: 11.5, color: GPT_T.ink45, fontWeight: 600 }}>{totalQ} quarters · {data.zones.length} macro areas</div>
          </div>
          <SegToggle value="list" onChange={(v) => v === 'map' && onMap()} options={[{ v: 'map', icon: 'map', label: 'Map' }, { v: 'list', icon: 'list', label: 'List' }]} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: GPT_T.wash, margin: '0 14px 12px', borderRadius: 12, padding: '0 12px', height: 44, border: `1px solid ${GPT_T.line}` }}>
          <GPTIcon name="search" size={18} color={GPT_T.ink45} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a quarter or area"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: GPT_FONT, fontSize: 15, color: GPT_T.ink }} />
          {q && <IconBtn icon="close" onClick={() => setQ('')} size={28} label="Clear" />}
        </div>
        <div style={{ display: 'flex', gap: 7, padding: '0 14px 11px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {regions.map(r => (
            <button key={r} onClick={() => setRegion(r)} style={{ flexShrink: 0, height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer',
              border: `1.5px solid ${region === r ? GPT_T.ink : GPT_T.line}`, background: region === r ? GPT_T.ink : GPT_T.paper, color: region === r ? '#fff' : GPT_T.ink70,
              fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{r}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {sections.length ? sections.map(s => {
          const expanded = query ? true : !collapsed[s.zone.id];
          return (
            <div key={s.zone.id}>
              <MacroHeader zone={s.zone} sum={summarize(ql[s.zone.id] || [])} expanded={expanded} onToggle={() => setCollapsed(c => ({ ...c, [s.zone.id]: !c[s.zone.id] }))} />
              {expanded && s.items.map(it => <QuarterRow key={it.id} q={it} onOpen={() => openQuarter(s.zone, it)} />)}
            </div>
          );
        }) : <div style={{ padding: 40, textAlign: 'center', color: GPT_T.ink45, fontFamily: GPT_FONT, fontSize: 14 }}>No quarters match “{q}”.</div>}
        <div style={{ height: 8 }} />
      </div>
      <ThumbDock onReport={onReport} />
    </div>
  );
}

Object.assign(window, { HomeScreen, MapScreen, NewsScreen, CommunityScreen, ListScreen, MacroHeader, QuarterRow, MapLegend, EmptyState, WallOfHonorTeaser, PeopleSection, PersonCard });
