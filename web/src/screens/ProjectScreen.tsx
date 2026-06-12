// ProjectScreen.tsx — "About this project": open-source, independence & governance (#/project).
// Trust-first copy for everyone, technical depth (licence, contribute) below.
// Ported from design/screen-project.jsx; reuses the AboutScreen Block pattern + tokens.
import type { ReactNode, CSSProperties } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { GITHUB_URL } from '@/lib/constants'
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

const linkRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '11px 13px',
  marginTop: 12,
  borderRadius: 12,
  background: GPT_T.wash,
  border: 'none',
  color: GPT_T.ink,
  fontFamily: GPT_FONT,
  fontSize: 14.5,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
  width: '100%',
  textAlign: 'start',
}

function ExtLink({ children }: { children: ReactNode }) {
  return (
    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={linkRow}>
      <span>{children}</span>
      <GPTIcon name="github" size={17} color={GPT_T.ink45} />
    </a>
  )
}

export function ProjectScreen({ onBack }: { onBack: () => void }) {
  const t = useT()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      {/* Notch / Dynamic Island clearance — drill-down has no AppHeader above it. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 'var(--go-safe-top)', paddingInlineEnd: 10, paddingBottom: 6, paddingInlineStart: 10, background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label={t.project.backAria} />
        <LogoMark size={22} />
        <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.project.title}</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* hero — mission / stewardship, plain language */}
        <div style={{ background: GPT_T.panel, color: '#fff', padding: '22px 20px 24px', position: 'relative', overflow: 'hidden' }}>
          <FlagBg opacity={0.2} scrim="linear-gradient(180deg, rgba(15,23,34,0.6), rgba(15,23,34,0.9))" />
          <div style={{ position: 'relative' }}>
            <Logo size={19} mono variant="full" />
            <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginTop: 16, letterSpacing: -0.3 }}>{t.project.heroTitle}</div>
            <div style={{ fontSize: 15, color: GPT_T.panelInk, fontWeight: 500, lineHeight: 1.55, marginTop: 10 }}>{t.project.heroBody}</div>
          </div>
        </div>

        <Block icon="shield" title={t.project.trustTitle}>
          {t.project.trustBody}
          <ExtLink>{t.project.viewCode}</ExtLink>
        </Block>
        <Block icon="info" title={t.project.indepTitle}>{t.project.indepBody}</Block>
        <Block icon="lock" title={t.project.licenceTitle}>{t.project.licenceBody}</Block>
        <Block icon="list" title={t.project.helpTitle}>
          {t.project.helpBody}
          <ExtLink>{t.project.contribute}</ExtLink>
        </Block>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontFamily: GPT_FONT, fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600 }}>{t.project.footer}</div>
        </div>
      </div>
      <div style={{ padding: '11px 14px calc(11px + env(safe-area-inset-bottom))', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ width: '100%', minHeight: 54, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', textDecoration: 'none' }}
        >
          <GPTIcon name="github" size={19} color="#fff" /> {t.project.viewCode}
        </a>
      </div>
    </div>
  )
}
