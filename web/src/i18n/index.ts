// index.ts — language registry. `en` is eager (bundled, always available at first paint); `fr`/`ar`
// load on demand via dynamic import() so non-default locales never weigh down the entry bundle.
import { en, type Strings } from './en'

export type Lang = 'en' | 'fr' | 'ar'
export const LANGS: Lang[] = ['en', 'fr', 'ar']
export const RTL_LANGS: Lang[] = ['ar']

/** Human label for the switcher (each in its own script). */
export const LANG_LABEL: Record<Lang, string> = { en: 'EN', fr: 'FR', ar: 'العربية' }

/** Eager dictionary for the default language — guarantees a dict at first paint. */
export const EAGER: Record<'en', Strings> = { en }

/** Lazy loaders for non-default languages. */
export const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<Strings>> = {
  fr: () => import('./fr').then((m) => m.fr),
  ar: () => import('./ar').then((m) => m.ar),
}

export function isLang(v: string): v is Lang {
  return (LANGS as string[]).includes(v)
}
