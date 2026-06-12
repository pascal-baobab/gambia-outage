// StatusPill.tsx — icon + label + colour (never colour alone). Ported 1:1 from ds.jsx.
// Accepts DisplayStatus so the evidence-gate 'nodata' (zero reports) renders neutral grey.
import { GPT_FONT, DISPLAY_STATUS_LABEL } from '@/lib/tokens'
import type { DisplayStatus } from '@/lib/status'
import { useTheme } from '@/app/theme'
import { GPTIcon } from './icons'

export function StatusPill({
  status,
  size = 'md',
  solid = false,
  label,
}: {
  status: DisplayStatus
  size?: 'sm' | 'md' | 'lg'
  solid?: boolean
  label?: string
}) {
  const th = useTheme()
  const c = th[status]
  const deep = th[`${status}Deep`]
  const bg = th[`${status}Bg`]
  const line = th[`${status}Line`]
  const pad = size === 'sm' ? '4px 9px 4px 7px' : size === 'lg' ? '8px 15px 8px 12px' : '5px 11px 5px 8px'
  const fs = size === 'sm' ? 11.5 : size === 'lg' ? 15 : 13
  const ic = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? 5 : 7,
        padding: pad,
        borderRadius: 999,
        background: solid ? c : bg,
        border: `1.5px solid ${solid ? c : line}`,
        color: solid ? '#fff' : deep,
        fontFamily: GPT_FONT,
        fontWeight: 800,
        fontSize: fs,
        letterSpacing: 0.3,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <GPTIcon name={status} size={ic} color={solid ? '#fff' : c} strokeColor={solid ? c : '#fff'} />
      {label || DISPLAY_STATUS_LABEL[status]}
    </span>
  )
}
