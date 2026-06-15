// ToolsHubSection.tsx — Tools hub section for HomeScreen.
// Port of design/tools-hub.jsx ToolsHubSection (implementation contract).
// Calculator card: live, calls onOpen('calculator'). Photo Crush: live, calls onOpen('photoCrush').
// D-02: decoupled via onOpen(id) callback. D-06: Photo Crush opens #/photo-crush full-screen.
// Zero Italian. Zero 6-digit hex literals (all tokens from tokens.ts).
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'

// ── Inline SVG glyphs — GPTIcon has no 'calculator' or 'game' case (per design/tools-hub.jsx) ──

/** Calculator icon glyph — inline SVG, presentational only. */
function CalcGlyph({ size = 19, color = GPT_T.ink70 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="1.8" />
      <rect x="7" y="6" width="10" height="3.5" rx="1" fill={color} />
      <g fill={color}>
        <circle cx="8.5" cy="13" r="1.2" />
        <circle cx="12" cy="13" r="1.2" />
        <circle cx="15.5" cy="13" r="1.2" />
        <circle cx="8.5" cy="17" r="1.2" />
        <circle cx="12" cy="17" r="1.2" />
        <circle cx="15.5" cy="17" r="1.2" />
      </g>
    </svg>
  )
}

/** Board / Photo Crush glyph — inline SVG, four rounded squares, presentational only. */
function BoardGlyph({ size = 19, color = GPT_T.ink70 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g fill={color}>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </g>
    </svg>
  )
}

// ── ToolsHubSection ────────────────────────────────────────────────────────────

export function ToolsHubSection({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'

  // Shared card styles
  const cardBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    background: GPT_T.paper, border: `1px solid ${GPT_T.line}`,
    borderRadius: 13, padding: '11px 13px', minHeight: 44,
    fontFamily: GPT_FONT,
    flexDirection: rtl ? 'row-reverse' : 'row',
    textAlign: rtl ? 'right' : 'left',
  }

  const iconContainer: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, background: GPT_T.wash,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }

  const chevron = (
    <span style={{ display: 'inline-flex', transform: rtl ? 'scaleX(-1)' : 'none' }}>
      <GPTIcon name="chevron" size={18} color={GPT_T.ink45} />
    </span>
  )

  return (
    <section style={{
      background: GPT_T.wash, padding: '4px 16px 18px',
      direction: rtl ? 'rtl' : 'ltr',
    }}>
      {/* Section label — t('tools.title') */}
      <div style={{
        fontSize: 12, fontWeight: 800, letterSpacing: 0.6,
        textTransform: 'uppercase', color: GPT_T.ink45,
        margin: '6px 0 10px',
      }}>
        {t.tools.title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>

        {/* Calculator card — live, calls onOpen('calculator') */}
        <button
          aria-label={t.tools.calculator}
          onClick={() => onOpen('calculator')}
          style={{ ...cardBase, cursor: 'pointer', border: `1px solid ${GPT_T.line}` }}
        >
          <span style={iconContainer}>
            <CalcGlyph />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>
              {t.tools.calculator}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>
              {t.tools.calcSub}
            </span>
          </span>
          {chevron}
        </button>

        {/* Photo Crush card — live, calls onOpen('photoCrush') to open #/photo-crush (D-06) */}
        <button
          aria-label={t.tools.photoCrush}
          onClick={() => onOpen('photoCrush')}
          style={{ ...cardBase, cursor: 'pointer', border: `1px solid ${GPT_T.line}` }}
        >
          <span style={iconContainer}>
            <BoardGlyph />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>
              {t.tools.photoCrush}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>
              {t.tools.gameSub}
            </span>
          </span>
          {chevron}
        </button>

        {/* Scalability placeholder — div, NOT a button (dashed border, opacity 0.85) */}
        <div style={{
          ...cardBase,
          border: `1px dashed ${GPT_T.line}`, opacity: 0.85,
        }}>
          <span style={iconContainer}>
            <GPTIcon name="info" size={18} color={GPT_T.ink25} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink45 }}>
              {t.tools.soonSub}
            </span>
          </span>
        </div>

      </div>
    </section>
  )
}
