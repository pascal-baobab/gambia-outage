// langStore.ts — the active UI language (Zustand). Mirrors radioStore's module pattern: persists a
// device-local choice (`go_lang`, PII-free) and reflects it onto <html lang/dir> so Arabic flips to
// RTL. `en` is eager so the dict is never empty; `fr`/`ar` lazy-load on first switch.
import { create } from 'zustand'
import { en, type Strings } from '@/i18n/en'
import { EAGER, LOADERS, RTL_LANGS, isLang, type Lang } from '@/i18n'

const LANG_KEY = 'go_lang'

function applyHtml(lang: Lang): void {
  try {
    document.documentElement.lang = lang
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  } catch {
    /* SSR/non-DOM env — ignore */
  }
}

/** First-run language: stored choice if valid, else the browser's preferred supported language, else en. */
export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored && isLang(stored)) return stored
    const nav = (navigator.languages?.[0] || navigator.language || 'en').slice(0, 2).toLowerCase()
    if (isLang(nav)) return nav
  } catch {
    /* storage/navigator unavailable */
  }
  return 'en'
}

interface LangState {
  lang: Lang
  dict: Strings
  /** Switch language: lazy-loads the dict, persists, and applies <html lang/dir>. */
  setLang: (lang: Lang) => Promise<void>
}

export const useLang = create<LangState>((set, get) => ({
  lang: 'en',
  dict: en,

  async setLang(lang) {
    if (lang === get().lang && get().dict) return
    let dict: Strings
    try {
      dict = lang === 'en' ? EAGER.en : await LOADERS[lang]()
    } catch {
      applyHtml(get().lang)
      return
    }
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* storage unavailable */ }
    applyHtml(lang)
    set({ lang, dict })
  },
}))

/** Call ONCE at startup (main.tsx), before first paint, so <html dir> is correct immediately and the
 *  detected non-default dict is fetched. Synchronously sets lang/dir; the dict resolves shortly after. */
export function initLang(): void {
  const lang = detectLang()
  applyHtml(lang)
  if (lang !== 'en') void useLang.getState().setLang(lang)
  else useLang.setState({ lang: 'en', dict: en })
}
