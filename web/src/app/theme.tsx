// theme.tsx — status-theme context (standard ↔ sunlight), ported from ds.jsx ThemeCtx/useTheme.
// Also injects the active theme as CSS variables (--c-out, …) so Tailwind's status colours
// re-theme at runtime without redesigning components.
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { THEMES, type StatusTheme, type ThemeName } from '@/lib/tokens'

const ThemeCtx = createContext<StatusTheme>(THEMES.standard)

/** `const th = useTheme()` → current status palette. Mirrors ds.jsx. */
export const useTheme = () => useContext(ThemeCtx)

const CSS_VARS: Array<[keyof StatusTheme, string]> = [
  ['out', '--c-out'], ['outDeep', '--c-out-deep'], ['outBg', '--c-out-bg'], ['outLine', '--c-out-line'],
  ['partial', '--c-partial'], ['partialDeep', '--c-partial-deep'], ['partialBg', '--c-partial-bg'], ['partialLine', '--c-partial-line'],
  ['on', '--c-on'], ['onDeep', '--c-on-deep'], ['onBg', '--c-on-bg'], ['onLine', '--c-on-line'],
]

export function ThemeProvider({ name = 'standard', children }: { name?: ThemeName; children: ReactNode }) {
  const theme = THEMES[name] ?? THEMES.standard
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', name)
    for (const [key, cssVar] of CSS_VARS) root.style.setProperty(cssVar, theme[key])
  }, [name, theme])
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>
}
