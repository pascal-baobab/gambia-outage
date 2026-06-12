// app-data.jsx — mock data for Power Watch Gambia. Exports: GPT_DATA

const _zones = [
  { id: 'banjul', name: 'Banjul', region: 'Banjul', sev: 0.95, todayMin: 692, reports: 214,
    week: [9.5, 11, 8, 12.5, 10, 13, 11.3], confirms: 18,
    events: [
      { from: '04:10', to: 'now', dur: '7h 10m', open: true },
      { from: 'Yesterday 18:40', to: '23:55', dur: '5h 15m' },
      { from: 'Yesterday 06:00', to: '12:20', dur: '6h 20m' },
    ],
    notes: [
      { t: '12m ago', text: 'Still no power in Half Die since dawn.' },
      { t: '40m ago', text: 'Transformer hum stopped near Albert Market.' },
    ] },
  { id: 'kanifing', name: 'Kanifing', region: 'Kanifing', sev: 0.90, todayMin: 640, reports: 388,
    week: [10, 9, 11.5, 12, 9.5, 11, 10.6], confirms: 31,
    events: [ { from: '05:30', to: 'now', dur: '5h 40m', open: true }, { from: 'Yesterday 19:10', to: '23:30', dur: '4h 20m' } ],
    notes: [ { t: '8m ago', text: 'Serrekunda market generators all running.' }, { t: '1h ago', text: 'Out since morning prayers in Latrikunda.' } ] },
  { id: 'brikama', name: 'Brikama', region: 'West Coast', sev: 0.50, todayMin: 300, reports: 296,
    week: [7, 9.5, 8, 10, 6.5, 9, 8.6], confirms: 22,
    events: [ { from: '07:00', to: 'now', dur: '4h 10m', open: true }, { from: 'Yesterday 20:00', to: '22:45', dur: '2h 45m' } ],
    notes: [ { t: '25m ago', text: 'Brikama town centre dark, clinic on backup.' } ] },
  { id: 'kerewan', name: 'Kerewan', region: 'North Bank', sev: 0.16, todayMin: 0, reports: 84,
    week: [4, 6, 3.5, 7, 5, 4.5, 5], confirms: 9,
    events: [ { from: '08:20', to: '10:05', dur: '1h 45m' }, { from: 'Yesterday 21:00', to: '23:10', dur: '2h 10m' } ],
    notes: [ { t: '2h ago', text: 'Power flickering on and off in Kerewan.' } ] },
  { id: 'mansakonko', name: 'Mansa Konko', region: 'Lower River', sev: 0.40, todayMin: 240, reports: 58,
    week: [3, 5, 4, 4.5, 3.5, 4, 4], confirms: 6,
    events: [ { from: '09:00', to: '11:00', dur: '2h 00m' } ],
    notes: [] },
  { id: 'janjanbureh', name: 'Janjanbureh', region: 'Central River', sev: 0.80, todayMin: 560, reports: 142,
    week: [8, 10, 9, 11, 7.5, 10.5, 9.3], confirms: 14,
    events: [ { from: '06:15', to: 'now', dur: '5h 05m', open: true }, { from: 'Yesterday 17:30', to: '22:00', dur: '4h 30m' } ],
    notes: [ { t: '35m ago', text: 'Island side completely dark since 6am.' } ] },
  { id: 'basse', name: 'Basse', region: 'Upper River', sev: 0.62, todayMin: 410, reports: 0,
    week: [6, 7.5, 6.5, 8, 5.5, 7, 6.6], confirms: 11,
    events: [ { from: '07:45', to: 'now', dur: '3h 25m', open: true } ],
    notes: [ { t: '50m ago', text: 'Basse market traders running on petrol gennies.' } ] },
];

// Cascading Region → District → Settlement (subset, realistic Gambian names)
const _places = {
  'Banjul': { 'Banjul': ['Half Die', 'Portuguese Town', 'Soldier Town', 'Jollof Town'] },
  'Kanifing': { 'Serrekunda': ['Serrekunda Central', 'Latrikunda Sabiji', 'Dippa Kunda', 'Bundung'], 'Bakau': ['Bakau Newtown', 'Cape Point', 'Fajara'] },
  'West Coast': { 'Brikama': ['Brikama Town', 'Nyambai', 'Mandinaba'], 'Kombo North': ['Old Yundum', 'Lamin', 'Sukuta'], 'Foni Brefet': ['Bwiam', 'Kalagi'] },
  'North Bank': { 'Kerewan': ['Kerewan Town', 'Farafenni', 'Illiassa'], 'Lower Niumi': ['Barra', 'Essau'] },
  'Lower River': { 'Mansa Konko': ['Soma', 'Pakali Ba'], 'Jarra West': ['Kani Kunda', 'Toniataba'] },
  'Central River': { 'Janjanbureh': ['Janjanbureh Town', 'Bansang', 'Brikama Ba'], 'Niamina East': ['Dankunku'] },
  'Upper River': { 'Basse': ['Basse Santa Su', 'Manneh Kunda'], 'Kantora': ['Sutukoba', 'Koina'] },
};

// Hourly nationwide darkness today: 24 buckets (00→24), each = fraction of the 7 regions in the
// dark that hour (0..1). Future hours = -1 (sentinel → rendered as a neutral "not yet" ghost bar).
// In prod this is derived server-side in buildSnapshot→buildHourly from events.started_at/ended_at;
// here it's a static illustrative curve (quiet night, evening peak), "now" ≈ 15:00.
const _hourly = [
  0.14, 0.14, 0.14, 0.14, 0.29, 0.29, // 00–05 night
  0.43, 0.43, 0.57, 0.57, 0.43, 0.43, // 06–11 morning
  0.57, 0.71, 0.71, 0.86,             // 12–15 (15 = now)
  -1, -1, -1, -1, -1, -1, -1, -1,     // 16–23 not yet
];

// Persistent-pseudonym social content (Stories feed + per-zone comments). Attributed to a device
// pseudonym (nickname + avatar) that is PUBLIC only once the user publishes — NEVER linked to the
// anonymous power-cut reports. Illustrative mock only.
const _stories = [
  { id: 's1', nickname: 'Fatou', avatarId: 'a1', zoneId: 'kanifing', zoneName: 'Serrekunda', body: 'Third night this week with no light. The kids can’t study after sunset — please keep reporting so it’s on the record.', ago: '18m ago' },
  { id: 's2', nickname: 'Lamin', avatarId: 'a2', zoneId: null, zoneName: null, body: 'Generators everywhere in the market today. Diesel is getting too expensive for small traders.', ago: '1h ago' },
  { id: 's3', nickname: 'Awa', avatarId: 'a3', zoneId: 'banjul', zoneName: 'Half Die', body: 'Power came back for 20 minutes then went again. Logged both — let’s keep the timeline honest.', ago: '2h ago' },
];
const _comments = {
  banjul: [
    { id: 'c1', nickname: 'Modou', avatarId: 'a4', body: 'Still completely dark on my street near Albert Market.', ago: '9m ago' },
    { id: 'c2', nickname: 'Isatou', avatarId: 'a5', body: 'Confirmed out here too since dawn.', ago: '34m ago' },
  ],
};

// Owner-curated external posts ("From Facebook"), ingested via the Telegram bot → lightweight
// link-out cards (no FB SDK/iframe). `author` = page name (monogram avatar), `stamp` = absolute
// date+time, `likes` = anonymous ❤ count, `comments` = pseudonymous thread, `image` → in-app
// Lightbox. The FULL feed lives only in the News tab; Home/Community show a 3-card teaser.
const _socialImg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#0F1722"/>' +
  '<circle cx="320" cy="150" r="46" fill="none" stroke="#E08A00" stroke-width="6"/>' +
  '<path d="M330 118 304 158h14l-8 36 30-46h-15z" fill="#E08A00"/>' +
  '<text x="320" y="250" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="#9DAAB8">NAWEC maintenance notice</text></svg>');
const _social = [
  { id: 'f1', url: 'https://facebook.com/gambiaoutage/posts/1', source: 'facebook', pinned: true,
    author: 'NAWEC', title: 'NAWEC statement on Kanifing maintenance',
    snippet: 'Crews working overnight; power expected back by 6am in affected wards.',
    stamp: '9 Jun · 08:12', ago: '1h ago', likes: 12, image: _socialImg,
    comments: [{ id: 'fc1', nickname: 'Binta', avatarId: 'a6', body: 'Hope it really comes back by 6am this time.', ago: '40m ago' }] },
  { id: 'f2', url: 'https://facebook.com/gambiaoutage/posts/2', source: 'facebook', pinned: false,
    author: 'Gambia Outage', title: 'Thank you to everyone reporting',
    snippet: 'Over 1,800 reports today kept the map honest. Keep tapping Power out / Power back.',
    stamp: '9 Jun · 04:05', ago: '5h ago', likes: 31, comments: [] },
  { id: 'f3', url: 'https://facebook.com/gambianews/posts/3', source: 'facebook', pinned: false,
    author: 'Gambia News', title: 'Traders count losses after a third night of cuts',
    snippet: 'Cold stores in Serrekunda market report spoiled stock as outages stretch past midnight.',
    stamp: '8 Jun · 22:48', ago: '11h ago', likes: 7, comments: [] },
  { id: 'f4', url: 'https://facebook.com/gambiaoutage/posts/4', source: 'facebook', pinned: false,
    author: 'Gambia Outage', title: 'How confirmations work',
    snippet: 'One report marks an area dark. More neighbours reporting strengthens the record — never inflates it.',
    stamp: '8 Jun · 18:30', ago: '15h ago', likes: 18, comments: [] },
];

// Owner-curated LIVE streams (LiveStrip — Home + Community; embed for FB/YouTube, link-out others).
const _live = [
  { id: 'l1', title: 'NAWEC press briefing — load-shedding schedule', source: 'youtube', url: 'https://youtube.com/watch?v=live1' },
];

// Talk / Q&A board (#/talk, reached from Community): pseudonymous questions + threaded answers.
const _questions = [
  { id: 'q1', nickname: 'Ousman', avatarId: 'a7', zoneName: 'Bakau', ago: '25m ago',
    title: 'Best affordable inverter for a small shop?',
    body: 'Fridge + lights for ~5 hours. What are neighbours using?',
    answers: [
      { id: 'q1a1', nickname: 'Fatou', avatarId: 'a1', body: 'A 1.2kVA inverter with two gel batteries works for mine — ask at the Serrekunda market electronics row.', ago: '12m ago' },
      { id: 'q1a2', nickname: 'Lamin', avatarId: 'a2', body: 'Skip the no-name ones, they die in months.', ago: '6m ago' },
    ] },
  { id: 'q2', nickname: 'Awa', avatarId: 'a3', zoneName: 'Half Die', ago: '2h ago',
    title: 'Does anyone know the NAWEC fault line number that actually answers?',
    body: '',
    answers: [
      { id: 'q2a1', nickname: 'Modou', avatarId: 'a4', body: 'The 1666 short code worked for me last week, mornings only.', ago: '1h ago' },
    ] },
  { id: 'q3', nickname: 'Isatou', avatarId: 'a5', zoneName: null, ago: 'Yesterday',
    title: 'Is it normal for the voltage to drop before a cut?',
    body: 'Lights dim for a minute or two, then everything goes.',
    answers: [] },
];

// Device-local gamification mock (decoupled from reports — claim_nonce + xp_grants in prod).
// Ranks: Observer 0 · Watcher 10 · Sentinel 30 · Guardian of the Quarter 50.
const _profile = { xp: 34, badges: ['first_witness', 'light_spotter'], streakWeeks: 2 };

// Device-local "my reports" tracker (localStorage-only in prod; NEVER sent to the server).
const _myReports = [
  { zoneId: 'kanifing-0', name: 'Serrekunda', region: 'Kanifing', type: 'out', ago: '38m ago' },
  { zoneId: 'banjul-0', name: 'Half Die', region: 'Banjul', type: 'back', ago: 'Yesterday' },
];

// Community stats (ContributorsBadge): distinct contributing devices + total reports.
const _stats = { contributors: 412, reports: 5310 };

// Leaderboard mock data: worst-first by darkMinutes
const MOCK_HOURS = [
  { zoneId: '3-01', name: 'Bakau', region: 'Kanifing', darkMinutes: 720 },
  { zoneId: '1-04', name: 'Serekunda Central', region: 'Kanifing', darkMinutes: 480 },
  { zoneId: '5-02', name: 'Brikama', region: 'West Coast', darkMinutes: 360 },
  { zoneId: '2-01', name: 'Banjul Centre', region: 'Banjul', darkMinutes: 240 },
  { zoneId: '6-03', name: 'Farafenni', region: 'North Bank', darkMinutes: 180 },
];

// People directory mock data (opt-in — pseudonym only, never linked to reports)
const MOCK_PEOPLE = [
  { id: 'p1', nickname: 'SunuGambia', avatarId: 'av3', zone: 'Bakau', rank: 'Chronicler' },
  { id: 'p2', nickname: 'DarkHours99', avatarId: 'av7', zone: 'Serekunda', rank: 'Observer' },
  { id: 'p3', nickname: 'LightWatch', avatarId: 'av2', zone: 'Brikama', rank: 'Witness' },
  { id: 'p4', nickname: 'GridAlert', avatarId: 'av5', zone: 'Banjul', rank: 'Chronicler' },
];

Object.assign(window, { MOCK_HOURS, MOCK_PEOPLE });

const GPT_DATA = {
  national: { hours: 11, mins: 20, regionsOut: 6, regionsTotal: 7, reports: 1840, updated: 'just now', hourly: _hourly },
  zones: _zones,
  places: _places,
  stories: _stories,
  comments: _comments,
  social: _social,
  live: _live,
  questions: _questions,
  profile: _profile,
  myReports: _myReports,
  stats: _stats,
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
};
window.GPT_DATA = GPT_DATA;
