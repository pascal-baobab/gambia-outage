// icons.tsx — GPTIcon, ported 1:1 from ds.jsx. Distinct SHAPES per status (colour-blind safe).
import type { CSSProperties } from 'react'

export type IconName =
  | 'out' | 'partial' | 'on' | 'nodata' | 'list' | 'map' | 'saver' | 'pin' | 'share'
  | 'chevron' | 'back' | 'check' | 'close' | 'search' | 'cloud-off'
  | 'info' | 'clock' | 'lock' | 'shield' | 'bell' | 'bell-off'
  | 'ios-share' | 'download' | 'plus-square' | 'estimated' | 'camera' | 'refresh'

interface GPTIconProps {
  name: IconName
  size?: number
  color?: string
  strokeColor?: string
}

// `strokeColor` stays in GPTIconProps for call-site compatibility but the bulb glyphs draw with
// `color` only (the lit/unlit reading comes from fill vs outline, not a second stroke colour).
export function GPTIcon({ name, size = 22, color = 'currentColor' }: GPTIconProps) {
  const sw: CSSProperties = { width: size, height: size, display: 'block', flexShrink: 0 }
  switch (name) {
    case 'refresh': // circular-arrows reload glyph (header ⓘ panel "Update & reload")
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M19.2 12a7.2 7.2 0 1 1-2.1-5.1" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
          <path d="M19.6 3.6v3.9h-3.9" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'out': // unlit bulb = DARK (power out)
    case 'partial': // unlit bulb = DARK (under-confirmed open outage = still off this phase)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M10.1 14.1c0-1.5-1.3-2.2-1.3-3.7a3.2 3.2 0 0 1 6.4 0c0 1.5-1.3 2.2-1.3 3.7" fill="none" stroke={color} strokeWidth="1.1" opacity=".5" />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} />
          <path d="M10.4 21.6h3.2c-.3.85-.85 1.3-1.6 1.3s-1.3-.45-1.6-1.3Z" fill={color} />
        </svg>
      )
    case 'on': // lit bulb = LIGHT (power on)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill={color} />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} />
          <path d="M10.4 21.6h3.2c-.3.85-.85 1.3-1.6 1.3s-1.3-.45-1.6-1.3Z" fill={color} />
          <g stroke={color} strokeWidth="1.3" strokeLinecap="round">
            <path d="M12 .8v1M3.7 4.3l.7.7M20.3 4.3l-.7.7M.9 12h1.1M21.9 12H23" />
          </g>
        </svg>
      )
    case 'estimated': // unlit bulb + crescent = estimated dark (load-shedding baseline)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill="none" stroke={color} strokeWidth="1.6" />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} />
          <path d="M10.4 21.6h3.2c-.3.85-.85 1.3-1.6 1.3s-1.3-.45-1.6-1.3Z" fill={color} />
          <path d="M17.6 4.8a2.5 2.5 0 1 0 1.8 3.1 3.1 3.1 0 0 1-1.8-3.1Z" fill={color} />
        </svg>
      )
    case 'nodata': // dashed bulb = AWAITING reports (NO power claim)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2.4 2.2" />
          <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill={color} opacity=".7" />
          <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill={color} opacity=".7" />
        </svg>
      )
    case 'list':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="3.5" cy="6" r="1.5" fill={color} /><circle cx="3.5" cy="12" r="1.5" fill={color} /><circle cx="3.5" cy="18" r="1.5" fill={color} />
        </svg>
      )
    case 'map':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 4v13M15 6.5v13" stroke={color} strokeWidth="2" />
        </svg>
      )
    case 'saver': // data-saver / leaf-bolt
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M13 2 4 13.6h6.2L9 22l9.4-11.2H12L13 2Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )
    case 'pin':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z" fill={color} />
          <circle cx="12" cy="10" r="2.6" fill="#fff" />
        </svg>
      )
    case 'share':
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <circle cx="6" cy="12" r="2.6" fill={color} /><circle cx="18" cy="5.5" r="2.6" fill={color} /><circle cx="18" cy="18.5" r="2.6" fill={color} />
          <path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" stroke={color} strokeWidth="1.8" />
        </svg>
      )
    case 'chevron':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'back':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="m15 5-7 7 7 7" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'check':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="m4 12.5 5 5 11-12" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'close':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" /></svg>
    case 'search':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke={color} strokeWidth="2" /><path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    case 'cloud-off':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.5 8.2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 4l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    case 'info':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" /><rect x="11" y="10.5" width="2" height="6.5" rx="1" fill={color} /><circle cx="12" cy="7.5" r="1.3" fill={color} /></svg>
    case 'clock':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" /><path d="M12 7v5.3l3.4 2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'lock':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill={color} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke={color} strokeWidth="2" /></svg>
    case 'shield':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M12 3 5 5.6v5.2c0 4.3 2.9 7.6 7 9.2 4.1-1.6 7-4.9 7-9.2V5.6L12 3Z" fill={color} /><path d="m8.6 12 2.4 2.4 4.4-4.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'bell':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" fill={color} /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    case 'bell-off':
      return <svg viewBox="0 0 24 24" style={sw} aria-hidden="true"><path d="M6 9a6 6 0 0 1 9.6-4.8M18 12c0 3 2 4 2 4H7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M3 3l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    case 'ios-share': // iOS Share — box with up-arrow (the icon to tap on iOS Safari)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 3v11" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="m8.5 6.5 3.5-3.5 3.5 3.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 10H6a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-1.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'download': // install — arrow into a tray
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M12 3v10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="m8 9.5 4 4 4-4" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'plus-square': // "Add to Home Screen" step glyph
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke={color} strokeWidth="2" />
          <path d="M12 8.5v7M8.5 12h7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'camera': // add a photo (Talk composer)
      return (
        <svg viewBox="0 0 24 24" style={sw} aria-hidden="true">
          <path d="M4 8.5h3l1.3-2h7.4L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 4 8.5Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="13.5" r="3.3" fill="none" stroke={color} strokeWidth="2" />
        </svg>
      )
    default:
      return null
  }
}
