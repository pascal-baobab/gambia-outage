// InstallSheet.tsx — discreet, platform-aware "install the app" bottom sheet (Phase 6).
// Android/Chromium (a native prompt is captured) → an Install button that fires the real dialog.
// iOS Safari → illustrated Share → Add to Home Screen steps. iOS Chrome/Firefox → open-in-Safari
// hint. Android without a prompt yet / unknown → concise browser-menu instructions.
import { useState, type ReactNode } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { GPTIcon } from '@/components/icons'
import { LogoMark } from '@/components/Logo'
import { IconBtn } from '@/components/shared/IconBtn'
import type { PwaPlatform } from '@/lib/pwa'

export function InstallSheet({
  platform,
  canPrompt,
  onInstall,
  onClose,
}: {
  platform: PwaPlatform
  canPrompt: boolean
  onInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  onClose: () => void
}) {
  const T = useT().install
  const [busy, setBusy] = useState(false)

  const doInstall = async () => {
    setBusy(true)
    const outcome = await onInstall()
    setBusy(false)
    // Accepted → appinstalled hides everything; dismissed/unavailable → close (snooze).
    onClose()
    return outcome
  }

  const sheet = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    background: GPT_T.paper,
    borderRadius: '22px 22px 0 0',
    boxShadow: '0 -16px 50px rgba(15,23,34,0.28)',
    zIndex: 95,
    display: 'flex',
    flexDirection: 'column',
    animation: 'gptSheetIn .34s cubic-bezier(.2,.8,.25,1)',
    fontFamily: GPT_FONT,
    paddingBottom: 'env(safe-area-inset-bottom)',
  } as const

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 92 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,34,0.45)', animation: 'gptFade .3s ease' }} />
      <div style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: GPT_T.line }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px 4px' }}>
          <span style={{ width: 44, height: 44, borderRadius: 13, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogoMark size={44} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2 }}>{T.title}</div>
            <div style={{ fontSize: 13, color: GPT_T.ink70, fontWeight: 500, lineHeight: 1.45, marginTop: 3 }}>{T.body}</div>
          </div>
          <IconBtn icon="close" onClick={onClose} label="Close" />
        </div>

        <div style={{ padding: '8px 16px 18px' }}>
          {canPrompt ? (
            <AndroidBody busy={busy} onInstall={doInstall} onClose={onClose} />
          ) : platform === 'ios-safari' ? (
            <IosSafariBody onClose={onClose} />
          ) : platform === 'ios-other' ? (
            <HintBody text={T.iosOther} onClose={onClose} />
          ) : (
            <HintBody text={T.androidManual} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        minHeight: 52,
        borderRadius: 14,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: GPT_T.ink,
        color: '#fff',
        fontFamily: GPT_FONT,
        fontWeight: 800,
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  )
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 44,
        marginTop: 8,
        borderRadius: 12,
        border: 'none',
        background: 'transparent',
        color: GPT_T.ink45,
        fontFamily: GPT_FONT,
        fontWeight: 700,
        fontSize: 13.5,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function AndroidBody({ busy, onInstall, onClose }: { busy: boolean; onInstall: () => void; onClose: () => void }) {
  const T = useT().install
  return (
    <>
      <PrimaryButton onClick={onInstall} disabled={busy}>
        <GPTIcon name="download" size={20} color="#fff" /> {busy ? '…' : T.install}
      </PrimaryButton>
      <GhostButton onClick={onClose}>{T.notNow}</GhostButton>
    </>
  )
}

function Step({ n, icon, text }: { n: number; icon: 'ios-share' | 'plus-square'; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', background: GPT_T.wash, borderRadius: 12, border: `1px solid ${GPT_T.line}` }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: GPT_T.ink, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: GPT_T.ink, lineHeight: 1.35 }}>{text}</span>
      <GPTIcon name={icon} size={22} color={GPT_T.ink70} />
    </div>
  )
}

function IosSafariBody({ onClose }: { onClose: () => void }) {
  const T = useT().install
  return (
    <>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink45, marginBottom: 8 }}>{T.iosSafariLead}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Step n={1} icon="ios-share" text={T.iosShareStep} />
        <Step n={2} icon="plus-square" text={T.iosAddStep} />
      </div>
      <PrimaryButtonWrap onClose={onClose} />
    </>
  )
}

function HintBody({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 13px', background: GPT_T.wash, borderRadius: 12, border: `1px solid ${GPT_T.line}` }}>
        <GPTIcon name="info" size={18} color={GPT_T.ink45} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: GPT_T.ink, lineHeight: 1.4 }}>{text}</span>
      </div>
      <PrimaryButtonWrap onClose={onClose} />
    </>
  )
}

/** The instructional bodies close with a single confirm button ("Got it"). */
function PrimaryButtonWrap({ onClose }: { onClose: () => void }) {
  const T = useT().install
  return (
    <div style={{ marginTop: 12 }}>
      <PrimaryButton onClick={onClose}>{T.gotIt}</PrimaryButton>
    </div>
  )
}
