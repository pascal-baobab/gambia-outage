// CalculatorScreen.tsx — Full-screen immediate-execution calculator.
// Faithful TypeScript port of design/calculator.jsx (implementation contract).
// Immediate-execution engine (5+3×2=16, CALC-01). Memory via calcStore (CALC-02).
// AR-Indic display only at render (CALC-03). Lazy-loaded chunk (CALC-04).
// Haptic: navigator.vibrate(10), no-op iOS (CALC-05). System theme (CALC-06).
// FORBIDDEN: dynamic code execution, persist middleware, localizeNum before parseFloat, AppHeader/ThumbDock.
import { useState, useEffect } from 'react'
import { GPT_T, GPT_FONT, THEMES } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import { GPTIcon } from '@/components/icons'
import { useCalcStore } from '@/app/calcStore'
import { localizeNum } from '@/lib/format'

// ── Arithmetic engine (ported verbatim from design/calculator.jsx lines 25–37) ──
/** Float formatting: kill dust, cap length, guard Infinity/NaN → 'Error'. */
export function fmt(n: number): string {
  if (!isFinite(n)) return 'Error'
  if (n === 0) return '0'
  // Kill float dust ONLY when scaling by 1e10 stays inside the safe-integer
  // range — otherwise the multiply itself injects dust into a clean value
  // (e.g. 123456789012 * 1e10 overflows 2^53 and corrupts the result, which
  // then trips the length cap into bogus scientific notation). Integers and
  // large magnitudes are stringified directly.
  let s =
    Number.isInteger(n) || Math.abs(n) >= 1e5
      ? n.toString()
      : (Math.round(n * 1e10) / 1e10).toString()
  if (s.replace('-', '').replace('.', '').length > 12) {
    // Genuinely large/small magnitudes switch to scientific notation; plain
    // integers up to 1e12 keep rendering as ordinary integer strings above.
    if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)) {
      s = n.toExponential(6)
    } else {
      s = n.toPrecision(10).replace(/\.?0+$/, '')
    }
  }
  return s
}

/** Immediate-execution arithmetic switch. Returns NaN for division by zero. */
export function compute(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b === 0 ? NaN : a / b
    default: return b
  }
}

/** Haptic feedback: navigator.vibrate(10), feature-guarded, no-op iOS (CALC-05 / D-07). */
export function haptic(): void {
  try {
    navigator.vibrate && navigator.vibrate(10)
  } catch {
    // iOS no-op — vibrate not supported
  }
}

// ── Operator display symbols ─────────────────────────────────────────────────
const OP_SYM: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }

// ── Key micro-interaction (module scope — stateless, no closure capture) ──────
const press = (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = 'scale(0.95)' }
const release = (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = 'scale(1)' }

// ── Key component (module scope — declaring it inside the render body created a
// new component identity each render, remounting all ~20 keypad buttons on every
// keystroke: dropped the press-scale interaction and keyboard focus, WR-02) ────
interface KeyProps {
  style: React.CSSProperties
  onClick: () => void
  label: string
  ariaLabel?: string
  span?: React.CSSProperties
}
function Key({ style, onClick, label, ariaLabel, span }: KeyProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      style={{ ...style, ...(span ?? {}) }}
    >
      {label}
    </button>
  )
}

// ── Calculator state (component-local, volatile — resets on unmount) ─────────
interface CalcState {
  display: string   // always ASCII; localizeNum() applied at render only (CALC-03 / D-04)
  acc: number | null
  pending: string | null   // '+' | '-' | '*' | '/'
  waiting: boolean  // true = next digit starts fresh input
}

// ── System theme hook (CALC-06) ───────────────────────────────────────────────
// matchMedia is feature-detected: in environments where it is absent (older
// WebViews, some SSR/test contexts) calling it unguarded would throw and blank
// this lazy route entirely. Default to light when unavailable (WR-04).
function usePrefersColorScheme(): 'dark' | 'light' {
  const getScheme = (): 'dark' | 'light' =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : 'light'
  const [scheme, setScheme] = useState<'dark' | 'light'>(getScheme)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return scheme
}

// ── Pure reducer — the SINGLE source of truth for component-local transitions ─
// Both the component handlers and the unit tests drive THIS function, so the
// tested code path is exactly the shipped one (WR-03). Memory ops live in
// calcStore (CALC-02: M survives unmount) and are therefore NOT part of this
// pure reducer — they are exercised against the store directly in the tests.
export type CalcAction =
  | { type: 'digit'; value: string }
  | { type: 'op'; value: string }
  | { type: 'equals' }
  | { type: 'backspace' }
  | { type: 'dot' }
  | { type: 'negate' }
  | { type: 'percent' }
  | { type: 'clear' }

/** Fresh, volatile calculator state (resets on unmount). */
export const initialCalcState = (): CalcState => ({ display: '0', acc: null, pending: null, waiting: false })

/** Pure immediate-execution state machine. Returns a NEW CalcState. */
export function reduce(st: CalcState, a: CalcAction): CalcState {
  switch (a.type) {
    case 'digit': {
      const d = a.value
      const base = st.display === 'Error' ? '0' : st.display
      if (st.waiting) return { ...st, display: d, waiting: false }
      return { ...st, display: base === '0' ? d : base + d }
    }
    case 'dot': {
      if (st.waiting) return { ...st, display: '0.', waiting: false }
      if (st.display.includes('.')) return st
      return { ...st, display: st.display + '.' }
    }
    case 'op': {
      const op = a.value
      const val = parseFloat(st.display)
      if (st.pending != null && !st.waiting) {
        const r = compute(st.acc!, val, st.pending)
        return { ...st, acc: r, display: fmt(r), pending: op, waiting: true }
      }
      return { ...st, acc: val, pending: op, waiting: true }
    }
    case 'equals': {
      if (st.pending == null) return st
      const val = parseFloat(st.display)
      const r = compute(st.acc!, val, st.pending)
      return { display: fmt(r), acc: null, pending: null, waiting: true }
    }
    case 'backspace': {
      if (st.waiting || st.display === 'Error') return st
      let newDisp = st.display.length > 1 ? st.display.slice(0, -1) : '0'
      if (newDisp === '-') newDisp = '0'
      return { ...st, display: newDisp }
    }
    case 'negate':
      return { ...st, display: fmt(-parseFloat(st.display)) }
    case 'percent':
      return { ...st, display: fmt(parseFloat(st.display) / 100), waiting: false }
    case 'clear':
      return initialCalcState()
    default:
      return st
  }
}

/**
 * Thin wrapper over reduce() retained for the canonical sequence assertions.
 * @deprecated drive reduce() directly — kept so existing tests stay expressive.
 */
export function simulateSequence(steps: CalcAction[]): string {
  return steps.reduce(reduce, initialCalcState()).display
}

// ── CalculatorScreen component ────────────────────────────────────────────────
export function CalculatorScreen({ onBack }: { onBack: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'
  const scheme = usePrefersColorScheme()
  const dark = scheme === 'dark'

  const { mem, memAdd, memSub, memRecall, memClear } = useCalcStore()

  const [st, setSt] = useState<CalcState>({ display: '0', acc: null, pending: null, waiting: false })

  // ── System theme colors (CALC-06) ─────────────────────────────────────────
  const outerBg = dark ? GPT_T.panel : GPT_T.wash
  const displayBg = dark ? GPT_T.panelLine : GPT_T.paper
  const displayBorder = dark ? GPT_T.panelLine : GPT_T.line
  const primaryText = dark ? GPT_T.panelInk : GPT_T.ink
  const secondaryText = dark ? GPT_T.panelInk60 : GPT_T.ink45
  const digitKeyBg = dark ? GPT_T.panelLine : GPT_T.keyDigit
  const opKeyBg = dark ? THEMES.standard.outDeep : GPT_T.keyOp
  const eqKeyBg = dark ? GPT_T.panelInk : GPT_T.ink
  const eqKeyColor = dark ? GPT_T.panel : '#fff'

  // ── Key base styles ────────────────────────────────────────────────────────
  const TH = THEMES.standard
  const keyBase: React.CSSProperties = {
    border: 'none', borderRadius: 16, fontFamily: GPT_FONT, fontWeight: 800,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', transition: 'transform .06s ease, background .12s ease',
    WebkitTapHighlightColor: 'transparent',
  }
  const digitKey: React.CSSProperties = { ...keyBase, background: digitKeyBg, color: primaryText, fontSize: 26 }
  const funcKey: React.CSSProperties = { ...keyBase, background: dark ? GPT_T.panelLine : GPT_T.wash, color: dark ? GPT_T.panelInk60 : GPT_T.ink70, fontSize: 21 }
  const memKey: React.CSSProperties = { ...keyBase, background: dark ? GPT_T.panelLine : GPT_T.wash, color: dark ? GPT_T.panelInk60 : GPT_T.ink70, fontSize: 15, letterSpacing: 0.2, borderRadius: 13 }
  const eqKey: React.CSSProperties = { ...keyBase, background: eqKeyBg, color: eqKeyColor, fontSize: 30 }

  const opKey = (active: boolean): React.CSSProperties => ({
    ...keyBase,
    background: active ? TH.on : opKeyBg,
    color: active ? '#fff' : (dark ? THEMES.standard.onLine : TH.onDeep),
    fontSize: 26,
  })

  const opActive = (op: string) => st.pending === op && st.waiting

  // ── Event handlers — all dispatch through the single pure reduce() so the
  // shipped logic IS the unit-tested logic (WR-03). ───────────────────────────
  const dispatch = (action: CalcAction) => () => {
    haptic()
    setSt((s) => reduce(s, action))
  }

  const inputDigit = (d: string) => dispatch({ type: 'digit', value: d })
  const inputDot = dispatch({ type: 'dot' })
  const setOperator = (op: string) => dispatch({ type: 'op', value: op })
  const equals = dispatch({ type: 'equals' })
  const clearAll = dispatch({ type: 'clear' })
  const backspace = dispatch({ type: 'backspace' })
  const percent = dispatch({ type: 'percent' })
  const negate = dispatch({ type: 'negate' })

  // Memory ops — drive calcStore (CALC-02 / D-03)
  const handleMemAdd = () => {
    haptic()
    memAdd(parseFloat(st.display))
    setSt((s) => ({ ...s, waiting: true }))
  }
  const handleMemSub = () => {
    haptic()
    memSub(parseFloat(st.display))
    setSt((s) => ({ ...s, waiting: true }))
  }
  const handleMemRecall = () => {
    haptic()
    const recalled = memRecall()
    if (recalled !== 0) setSt((s) => ({ ...s, display: fmt(recalled), waiting: true }))
  }
  const handleMemClear = () => {
    haptic()
    memClear()
  }

  // ── Display strings — localizeNum ONLY at render (D-04 / CALC-03) ─────────
  const secondary = st.pending != null
    ? `${localizeNum(fmt(st.acc!), lang)} ${OP_SYM[st.pending] ?? st.pending}`
    : ' '
  const shown = localizeNum(st.display, lang)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: outerBg, fontFamily: GPT_FONT,
      direction: rtl ? 'rtl' : 'ltr',
    }}>
      {/* Top bar — own back-button bar, no AppHeader (drill-down pattern from AboutScreen) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 10px',
        background: displayBg,
        borderBottom: `1px solid ${displayBorder}`,
        flexShrink: 0,
      }}>
        <button
          aria-label="Back"
          onClick={onBack}
          style={{
            width: 40, height: 40, border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderRadius: 12,
          }}
        >
          <GPTIcon name="back" size={24} color={dark ? GPT_T.panelInk60 : GPT_T.ink70} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: primaryText }}>
          {t.calculator.title}
        </div>
      </div>

      {/* Display — direction: ltr always (CALC-03) */}
      <div style={{
        background: displayBg, padding: '14px 22px 18px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        flexShrink: 0, position: 'relative',
        direction: 'ltr',
        borderBottom: `1px solid ${displayBorder}`,
      }}>
        {/* M label — visible only when mem ≠ 0 (CALC-02) */}
        <div style={{
          position: 'absolute', top: 12, insetInlineStart: 22,
          height: 18, display: 'flex', alignItems: 'center',
        }}>
          {mem !== 0 && (
            <span style={{
              fontSize: 12, fontWeight: 800,
              color: secondaryText, letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              {t.calculator.memory}
            </span>
          )}
        </div>

        {/* Backspace — display top-right (keeps keypad a clean 4-col grid) */}
        <button
          type="button"
          aria-label="Backspace"
          onClick={backspace}
          style={{
            position: 'absolute', top: 8, insetInlineEnd: 14,
            width: 38, height: 38, border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderRadius: 11,
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7 6-7Z"
              fill="none"
              stroke={secondaryText}
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M12 9.5l5 5M17 9.5l-5 5"
              stroke={secondaryText}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Secondary expression echo — "12 ×" when pending op active */}
        <div style={{
          minHeight: 20, fontSize: 17, fontWeight: 600,
          color: secondaryText, fontVariantNumeric: 'tabular-nums', marginTop: 18,
        }}>
          {secondary}
        </div>

        {/* Primary display — 48px, AR-Indic at render only (CALC-03 / D-04) */}
        <div style={{
          fontSize: 48, fontWeight: 800, letterSpacing: -2, lineHeight: 0.92,
          color: primaryText, fontVariantNumeric: 'tabular-nums',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {shown}
        </div>
      </div>

      {/* Keypad — direction: ltr ALWAYS (CALC-03), never mirrors */}
      <div style={{ flex: 1, minHeight: 0, padding: 12, background: outerBg, direction: 'ltr' }}>
        {/* Memory row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
          <Key style={memKey} onClick={handleMemAdd} label="M+" ariaLabel="Memory add" />
          <Key style={memKey} onClick={handleMemSub} label="M−" ariaLabel="Memory subtract" />
          <Key style={memKey} onClick={handleMemRecall} label="MR" ariaLabel="Memory recall" />
          <Key style={memKey} onClick={handleMemClear} label="MC" ariaLabel="Memory clear" />
        </div>

        {/* Main keypad: 4 cols × 5 rows */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)', gap: 8, height: 'calc(100% - 50px)',
        }}>
          <Key style={funcKey} onClick={clearAll} label="C" ariaLabel="All clear" />
          <Key style={funcKey} onClick={negate} label="±" ariaLabel="Plus minus" />
          <Key style={funcKey} onClick={percent} label="%" />
          <Key style={opKey(opActive('/'))} onClick={setOperator('/')} label="÷" ariaLabel="Divide" />

          <Key style={digitKey} onClick={inputDigit('7')} label="7" />
          <Key style={digitKey} onClick={inputDigit('8')} label="8" />
          <Key style={digitKey} onClick={inputDigit('9')} label="9" />
          <Key style={opKey(opActive('*'))} onClick={setOperator('*')} label="×" ariaLabel="Multiply" />

          <Key style={digitKey} onClick={inputDigit('4')} label="4" />
          <Key style={digitKey} onClick={inputDigit('5')} label="5" />
          <Key style={digitKey} onClick={inputDigit('6')} label="6" />
          <Key style={opKey(opActive('-'))} onClick={setOperator('-')} label="−" ariaLabel="Subtract" />

          <Key style={digitKey} onClick={inputDigit('1')} label="1" />
          <Key style={digitKey} onClick={inputDigit('2')} label="2" />
          <Key style={digitKey} onClick={inputDigit('3')} label="3" />
          {/* = spans column 4, rows 4–5 (tall key) */}
          <Key
            style={eqKey}
            onClick={equals}
            label="="
            span={{ gridColumn: '4', gridRow: '4 / 6' }}
          />

          <Key style={opKey(opActive('+'))} onClick={setOperator('+')} label="+" ariaLabel="Add" span={{ gridColumn: '1', gridRow: '5' }} />
          <Key style={digitKey} onClick={inputDigit('0')} label="0" span={{ gridColumn: '2', gridRow: '5' }} />
          <Key style={digitKey} onClick={inputDot} label="." ariaLabel="Decimal point" span={{ gridColumn: '3', gridRow: '5' }} />
        </div>
      </div>
    </div>
  )
}
