// Logo.tsx — wordmark + circular C∞O badge, ported from ds.jsx (Logo, LogoMark).
// Mark source: design/assets/logo-circle.png → copied to web/public/logo-circle.png.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { FlagRule } from './Flag'

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <img
      src="/logo-circle.png"
      alt="Gambia Outage"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%', flexShrink: 0, objectFit: 'cover', width: size, height: size }}
    />
  )
}

export function Logo({
  size = 18,
  mono = false,
  variant = 'full',
  markScale = 1,
  spinMark = false,
}: {
  size?: number
  mono?: boolean
  variant?: 'full' | 'compact' | 'mark'
  /** Enlarge ONLY the circular mark relative to the wordmark (text stays at `size`). */
  markScale?: number
  /** Continuously rotate the circular mark (the C∞O ring only — never the wordmark). Honours
      prefers-reduced-motion via the global index.css rule. */
  spinMark?: boolean
}) {
  const ink = mono ? '#fff' : GPT_T.ink
  const sub = mono ? GPT_T.panelInk60 : GPT_T.ink45
  const spin = spinMark ? { animation: 'goLogoSpin 9s linear infinite', display: 'inline-flex', lineHeight: 0 } : { display: 'inline-flex', lineHeight: 0 }
  if (variant === 'mark') return <span style={spin}><LogoMark size={size * markScale} /></span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.46, fontFamily: GPT_FONT }}>
      <span style={spin}><LogoMark size={size * 1.7 * markScale} /></span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: size, fontWeight: 900, color: ink, letterSpacing: size > 20 ? -0.4 : 0.2, textTransform: 'uppercase' }}>
          Gambia <span style={{ color: ink, opacity: 0.6 }}>Outage</span>
        </span>
        {variant === 'full' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: size * 0.34, marginTop: size * 0.2 }}>
            <FlagRule height={Math.max(3, size * 0.18)} radius={1} style={{ width: size * 1.5 }} />
            <span style={{ fontSize: size * 0.5, fontWeight: 800, color: sub, letterSpacing: 1.6, textTransform: 'uppercase' }}>
              Report the Dark
            </span>
          </span>
        )}
      </span>
    </span>
  )
}
