// Toast.tsx — confirmation / error toast, ported 1:1 from shared-ui.jsx.
import type { ReactNode } from 'react'
import { GPT_T, GPT_FONT, type Status } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { IconBtn } from './IconBtn'
import { useT } from '@/i18n/useT'

export type ToastTone = Status | 'offline'

export function Toast({ children, tone = 'on', onClose }: { children: ReactNode; tone?: ToastTone; onClose?: () => void }) {
  const t = useT()
  const th = useTheme()
  const c = tone === 'offline' ? GPT_T.ink : th[tone]
  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 16,
        zIndex: 80,
        background: GPT_T.ink,
        color: '#fff',
        borderRadius: 16,
        padding: '13px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 16px 40px rgba(15,23,34,0.4)',
        animation: 'gptToastIn .35s cubic-bezier(.2,.8,.3,1)',
        fontFamily: GPT_FONT,
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 10, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <GPTIcon name={tone === 'offline' ? 'cloud-off' : 'check'} size={20} color="#fff" />
      </span>
      <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{children}</div>
      {onClose && <IconBtn icon="close" onClick={onClose} color={GPT_T.panelInk60} size={30} label={t.toast.dismiss} />}
    </div>
  )
}
