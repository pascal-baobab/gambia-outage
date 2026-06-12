// screen-regionmaps.jsx — RegionMaps macro component (Surface 11)
// React-over-Babel prototype. No imports, no TypeScript, no ES modules.
// Port of web/src/components/RegionMaps.tsx — shapes are a hardcoded SVG stub
// (no external JSON load, no network calls). Shown ONLY on macro ZoneScreen.
// Exported: RegionMaps

function RegionMaps({ zone, data }) {
  const th = useTheme();

  // Derive quarters for this zone from data (safe fallback to empty array)
  const quarters = (data && data.quarters && data.quarters[zone.id]) || [];

  // Count dark vs lit using sevToStatus (nodata = neither dark nor lit)
  var darkCount = 0;
  var litCount = 0;
  quarters.forEach(function(q) {
    var ds = sevToStatus(q.sev);
    if (q.reports > 0 && ds !== 'on') darkCount++;
    else if (q.reports > 0 && ds === 'on') litCount++;
  });

  // Region display name — prefer zone.region, fall back to zone.name
  var regionName = (zone && zone.region) || (zone && zone.name) || 'Region';

  return (
    <div style={{ background: GPT_T.paper2, borderBottom: '8px solid ' + GPT_T.wash, fontFamily: GPT_FONT }}>

      {/* (1) Identity hero: region name + simplified SVG silhouette stub */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid ' + GPT_T.line }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, color: GPT_T.ink45, textTransform: 'uppercase', marginBottom: 4 }}>
          Administrative region
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.5, lineHeight: 1 }}>
          {regionName}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 4 }}>
          Administrative region · The Gambia
        </div>
        {/* Simplified SVG silhouette stub — hardcoded shape, no external data */}
        <svg viewBox="0 0 200 80" style={{ width: '100%', marginTop: 12, borderRadius: 8, display: 'block' }} aria-hidden="true">
          <rect x="2" y="20" width="196" height="56" rx="6" fill={GPT_T.wash} stroke={GPT_T.line} strokeWidth="1.5" />
          <text x="100" y="52" textAnchor="middle" fontSize="11" fill={GPT_T.ink45} fontWeight="600">
            {regionName} region outline
          </text>
        </svg>
      </div>

      {/* (2) Locator strip — minimal placeholder (no JSON fetch) */}
      <div style={{ margin: '12px 18px 0', padding: '12px 14px 10px', background: GPT_T.paper, border: '1px solid ' + GPT_T.line, borderRadius: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: GPT_T.ink45, textTransform: 'uppercase', marginBottom: 8 }}>
          Location in The Gambia
        </div>
        <svg viewBox="0 0 300 60" style={{ width: '100%', height: 60, display: 'block' }} aria-hidden="true">
          {/* Country outline placeholder — elongated rect (The Gambia is narrow east-west) */}
          <rect x="4" y="18" width="292" height="26" rx="4" fill={GPT_T.wash} stroke={GPT_T.line} strokeWidth="1.2" />
          {/* Region pin placeholder */}
          <circle cx="150" cy="31" r="6" fill={THEMES.standard.on} opacity="0.85" />
          <text x="150" y="55" textAnchor="middle" fontSize="9" fill={GPT_T.ink45} fontWeight="600">{regionName}</text>
        </svg>
      </div>

      {/* (3) Territory zoom — minimal placeholder (no JSON fetch) */}
      <div style={{ margin: '12px 18px 0', padding: '12px 14px 12px', background: GPT_T.paper, border: '1px solid ' + GPT_T.line, borderRadius: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: GPT_T.ink45, textTransform: 'uppercase', marginBottom: 8 }}>
          Quarters
        </div>
        <div style={{ width: '100%', height: 80, borderRadius: 11, overflow: 'hidden', border: '1px solid rgba(17,22,28,0.10)', background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45 }}>
            {quarters.length > 0 ? quarters.length + ' quarters tracked' : 'Quarter map — live view'}
          </span>
        </div>
      </div>

      {/* (4) Summary stats: quarters tracked / currently dark / lit */}
      <div style={{ display: 'flex', gap: 0, margin: '14px 18px 14px', padding: '14px 16px', background: GPT_T.paper, border: '1px solid ' + GPT_T.line, borderRadius: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: GPT_T.ink, fontVariantNumeric: 'tabular-nums' }}>{quarters.length}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, textTransform: 'uppercase', letterSpacing: 0.3 }}>quarters tracked</div>
        </div>
        <div style={{ width: 1, minHeight: 40, background: GPT_T.line, margin: '2px 8px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: th.out, fontVariantNumeric: 'tabular-nums' }}>{darkCount}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, textTransform: 'uppercase', letterSpacing: 0.3 }}>currently dark</div>
        </div>
        <div style={{ width: 1, minHeight: 40, background: GPT_T.line, margin: '2px 8px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: th.on, fontVariantNumeric: 'tabular-nums' }}>{litCount}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, textTransform: 'uppercase', letterSpacing: 0.3 }}>lit</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RegionMaps });
