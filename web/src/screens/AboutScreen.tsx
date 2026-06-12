// AboutScreen.tsx — About / Methodology. Ported 1:1 from design/screen-about.jsx.
// (FirstRunOverlay lives in FirstRunOverlay.tsx.)
import type { ReactNode } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'
import { APP_VERSION, APP_VERSION_DATE } from '@/lib/constants'
import { FlagBg } from '@/components/Flag'
import { Logo, LogoMark } from '@/components/Logo'
import { GPTIcon, type IconName } from '@/components/icons'
import { IconBtn } from '@/components/shared/IconBtn'

function Block({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}`, background: GPT_T.paper }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GPTIcon name={icon} size={19} color={GPT_T.ink70} />
        </span>
        <span style={{ fontSize: 16.5, fontWeight: 800, color: GPT_T.ink }}>{title}</span>
      </div>
      <div style={{ fontSize: 14.5, color: GPT_T.ink70, lineHeight: 1.55, fontWeight: 500 }}>{children}</div>
    </div>
  )
}

export function AboutScreen({
  onBack,
  onReport,
  onInstall,
  onProfile,
  onProject,
  installed,
}: {
  onBack: () => void
  onReport: (action: 'out' | 'back') => void
  onInstall: () => void
  onProfile?: () => void
  onProject?: () => void
  installed: boolean
}) {
  const t = useT()
  const th = useTheme()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      {/* Notch / Dynamic Island clearance up top (shared var) — drill-down has no AppHeader above it. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 'var(--go-safe-top)', paddingInlineEnd: 10, paddingBottom: 6, paddingInlineStart: 10, background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label={t.about.backAria} />
        <LogoMark size={22} />
        <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.about.title}</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <div style={{ background: GPT_T.panel, color: '#fff', padding: '22px 20px 24px', position: 'relative', overflow: 'hidden' }}>
          <FlagBg opacity={0.2} scrim="linear-gradient(180deg, rgba(15,23,34,0.6), rgba(15,23,34,0.9))" />
          <div style={{ position: 'relative' }}>
            <Logo size={19} mono variant="full" />
            <div style={{ fontSize: 16, color: GPT_T.panelInk, fontWeight: 500, lineHeight: 1.55, marginTop: 16 }}>
              {t.about.hero}
            </div>
          </div>
        </div>

        <Block icon="list" title={t.about.dataTitle}>{t.about.dataBody}</Block>
        <Block icon="clock" title={t.about.statsTitle}>{t.about.statsBody}</Block>
        <Block icon="lock" title={t.about.anonTitle}>{t.about.anonBody}</Block>
        <Block icon="info" title={t.about.neutralTitle}>{t.about.neutralBody}</Block>
        <Block icon="shield" title={t.about.osTitle}>
          {t.about.osBody}
          {onProject && (
            <button
              onClick={onProject}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 13px', marginTop: 12, borderRadius: 12, background: GPT_T.wash, border: 'none', color: GPT_T.ink, fontFamily: GPT_FONT, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', width: '100%', textAlign: 'start' }}
            >
              <span>{t.about.osLink}</span>
              <GPTIcon name="chevron" size={16} color={GPT_T.ink45} />
            </button>
          )}
        </Block>

        <button
          onClick={() => { if (!installed) onInstall() }}
          disabled={installed}
          style={{
            width: '100%',
            textAlign: 'start',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '16px 18px',
            borderBottom: `8px solid ${GPT_T.wash}`,
            background: GPT_T.paper,
            border: 'none',
            cursor: installed ? 'default' : 'pointer',
            fontFamily: GPT_FONT,
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 10, background: installed ? th.onBg : GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GPTIcon name={installed ? 'check' : 'download'} size={19} color={installed ? th.on : GPT_T.ink70} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 16.5, fontWeight: 800, color: GPT_T.ink }}>{installed ? t.install.installed : t.install.aboutRow}</span>
            {!installed && <span style={{ display: 'block', fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>{t.install.aboutRowSub}</span>}
          </span>
          {!installed && <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />}
        </button>

        {onProfile && (
          <button
            onClick={onProfile}
            style={{
              width: '100%',
              textAlign: 'start',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '16px 18px',
              borderBottom: `8px solid ${GPT_T.wash}`,
              background: GPT_T.paper,
              border: 'none',
              cursor: 'pointer',
              fontFamily: GPT_FONT,
            }}
          >
            <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GPTIcon name="shield" size={19} color={GPT_T.ink70} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 16.5, fontWeight: 800, color: GPT_T.ink }}>{t.about.watchTitle}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 1 }}>{t.about.watchSub}</span>
            </span>
            <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
          </button>
        )}

        <div style={{ padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}` }}>
          <div style={{ fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 800, color: GPT_T.ink45, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.about.langLabel}</div>
          <LanguageSwitcher />
        </div>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontFamily: GPT_FONT, fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600 }}>gambiaoutage.com · independent &amp; community-run</div>
          <div style={{ fontFamily: GPT_FONT, fontSize: 12, color: GPT_T.ink25, fontWeight: 700, marginTop: 6 }}>
            Version {APP_VERSION} · {APP_VERSION_DATE}
          </div>
        </div>
      </div>
      <div style={{ padding: '11px 14px calc(11px + env(safe-area-inset-bottom))', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <button
          onClick={() => onReport('out')}
          style={{
            width: '100%',
            minHeight: 54,
            borderRadius: 15,
            border: 'none',
            background: th.out,
            color: '#fff',
            fontFamily: GPT_FONT,
            fontWeight: 800,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            cursor: 'pointer',
          }}
        >
          <GPTIcon name="out" size={22} color="#fff" strokeColor={th.out} /> {t.about.reportBtn}
        </button>
      </div>
    </div>
  )
}
