// LanguageSwitcher.tsx — segmented EN · FR · العربية control. Writes through langStore.setLang,
// which persists `go_lang` and flips <html dir> for Arabic. Used in About and Profile.
import { useLang } from '@/app/langStore'
import { LANGS, LANG_LABEL } from '@/i18n'
import { GPT_T, GPT_FONT } from '@/lib/tokens'

export function LanguageSwitcher() {
  const lang = useLang((s) => s.lang)
  const setLang = useLang((s) => s.setLang)

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: 'flex',
        gap: 6,
        padding: '4px',
        background: GPT_T.wash,
        borderRadius: 12,
      }}
    >
      {LANGS.map((l) => {
        const active = l === lang
        return (
          <button
            key={l}
            onClick={() => void setLang(l)}
            aria-pressed={active}
            style={{
              flex: 1,
              padding: '9px 10px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontFamily: GPT_FONT,
              fontSize: 14,
              fontWeight: 800,
              color: active ? GPT_T.paper : GPT_T.ink70,
              background: active ? GPT_T.ink : 'transparent',
            }}
          >
            {LANG_LABEL[l]}
          </button>
        )
      })}
    </div>
  )
}
