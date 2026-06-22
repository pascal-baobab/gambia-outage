// BottomNav.tsx — persistent 6-section navigation so the app is explorable: Home · Incidents · News ·
// Community · Talk · You. Sits below the screen content (and, on Home, below the report dock). Active
// tab in ink, others muted. On the design tokens; line-style SVG glyphs (no emoji).
// The global Map screen (route 'map') stays reachable via Home's embedded GambiaMapLive + List's Map
// toggle — it was swapped out of the nav for the rain-incident reports tab (Phase 07 follow-up).
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { useAccountId } from '@/hooks/useAccountId'
import { useContactRequests } from '@/hooks/useData'
import { useT } from '@/i18n/useT'
import { useTheme } from '@/app/theme'

export type Tab = 'home' | 'incidents' | 'news' | 'community' | 'talk' | 'profile'

function Icon({ name, color }: { name: Tab; color: string }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { display: 'block' } }
  switch (name) {
    case 'home':
      return (<svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>)
    case 'incidents':
      return (<svg {...common}><path d="M10.3 4.8 1.7 18.9a2 2 0 0 0 1.7 3.1h17.2a2 2 0 0 0 1.7-3.1L13.7 4.8a2 2 0 0 0-3.4 0z" /><path d="M12 9.5v4" /><path d="M12 17h.01" /></svg>)
    case 'news':
      return (<svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h7M7 12h10M7 16h10" /></svg>)
    case 'community':
      return (<svg {...common}><circle cx="9" cy="8" r="3" /><path d="M15.5 6.2a3 3 0 0 1 0 5.6" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M17 15c2.5.4 4 2.2 4 5" /></svg>)
    case 'talk':
      return (<svg {...common}><path d="M21 14a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9.5h8M8 12.5h5" /></svg>)
    case 'profile':
      return (<svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></svg>)
  }
}

// `active` is the current route name (a string). It highlights a tab only when it matches one of the
// five tab ids — on drill-down routes (zone/list/talk/about) nothing is highlighted, which is correct.
export function BottomNav({ active, onNav, nameClaimed }: { active: string; onNav: (t: Tab) => void; nameClaimed: boolean }) {
  // Incoming "wave" requests drive a red dot on the You tab (badge-in-app, always — see People setup).
  const accountId = useAccountId()
  const { data: reqData } = useContactRequests(accountId)
  const pending = reqData?.count ?? 0
  const t = useT()
  const th = useTheme()
  const nameDot = !nameClaimed
  const TABS: { id: Tab; label: string }[] = [
    { id: 'home', label: t.nav.home },
    { id: 'incidents', label: t.nav.incidents },
    { id: 'news', label: t.nav.news },
    { id: 'community', label: t.nav.community },
    { id: 'talk', label: t.nav.talk },
    { id: 'profile', label: t.nav.you },
  ]
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, padding: '6px 2px calc(6px + env(safe-area-inset-bottom))', flexShrink: 0, boxShadow: '0 -4px 16px rgba(15,23,34,0.04)' }}>
      {/* Full-width bar/border, but the icon row itself is centred within a capped width so the tabs
          sit slightly closer together instead of stretching edge-to-edge. */}
      <div style={{ display: 'flex', width: '100%', maxWidth: 340 }}>
      {TABS.map((t) => {
        const on = t.id === active
        const color = on ? GPT_T.ink : GPT_T.ink45
        const badge = t.id === 'profile' && pending > 0
        return (
          <button
            key={t.id}
            onClick={() => onNav(t.id)}
            aria-label={badge ? `${t.label} (${pending} new)` : t.label}
            aria-current={on ? 'page' : undefined}
            style={{ flex: 1, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '3px 0', fontFamily: GPT_FONT }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon name={t.id} color={color} />
              {badge && (
                <span style={{ position: 'absolute', top: -3, right: -5, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 999, background: FLAG.red, color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${GPT_T.paper}` }}>
                  {pending > 9 ? '9+' : pending}
                </span>
              )}
              {!badge && t.id === 'profile' && nameDot && (
                <span style={{ position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 999, background: th.on, border: `1.5px solid ${GPT_T.paper}` }} />
              )}
            </span>
            <span style={{ fontSize: 9, fontWeight: on ? 800 : 600, color, letterSpacing: 0, whiteSpace: 'nowrap' }}>{t.label}</span>
          </button>
        )
      })}
      </div>
    </nav>
  )
}
