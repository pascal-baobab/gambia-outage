import type { Config } from 'tailwindcss'
import { GPT_T, FLAG, THEMES, GPT_FONT } from './src/lib/tokens'

// ds.jsx tokens → Tailwind theme. Neutrals (GPT_T) are theme-constant.
// Status colours default to THEMES.standard here; the live values are also injected as
// CSS variables by ThemeProvider so a [data-theme] swap (standard ↔ sunlight) re-themes
// status colours at runtime without redesigning components.
const std = THEMES.standard

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: GPT_T.ink,
        'ink-70': GPT_T.ink70,
        'ink-45': GPT_T.ink45,
        'ink-25': GPT_T.ink25,
        line: GPT_T.line,
        line2: GPT_T.line2,
        paper: GPT_T.paper,
        paper2: GPT_T.paper2,
        wash: GPT_T.wash,
        panel: GPT_T.panel,
        'panel-line': GPT_T.panelLine,
        'panel-ink': GPT_T.panelInk,
        'panel-ink-60': GPT_T.panelInk60,
        // status (defaults; runtime via var(--*) too)
        out: 'var(--c-out, ' + std.out + ')',
        'out-deep': 'var(--c-out-deep, ' + std.outDeep + ')',
        'out-bg': 'var(--c-out-bg, ' + std.outBg + ')',
        'out-line': 'var(--c-out-line, ' + std.outLine + ')',
        partial: 'var(--c-partial, ' + std.partial + ')',
        'partial-deep': 'var(--c-partial-deep, ' + std.partialDeep + ')',
        'partial-bg': 'var(--c-partial-bg, ' + std.partialBg + ')',
        'partial-line': 'var(--c-partial-line, ' + std.partialLine + ')',
        on: 'var(--c-on, ' + std.on + ')',
        'on-deep': 'var(--c-on-deep, ' + std.onDeep + ')',
        'on-bg': 'var(--c-on-bg, ' + std.onBg + ')',
        'on-line': 'var(--c-on-line, ' + std.onLine + ')',
        // Gambian flag
        'flag-red': FLAG.red,
        'flag-white': FLAG.white,
        'flag-blue': FLAG.blue,
        'flag-blue-deep': FLAG.blueDeep,
        'flag-green': FLAG.green,
        'flag-green-deep': FLAG.greenDeep,
      },
      fontFamily: {
        sans: GPT_FONT.split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
      },
    },
  },
  plugins: [],
} satisfies Config
