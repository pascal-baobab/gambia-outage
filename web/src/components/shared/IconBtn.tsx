// IconBtn.tsx — square icon button, ported 1:1 from shared-ui.jsx.
import { GPT_T } from '@/lib/tokens'
import { GPTIcon, type IconName } from '@/components/icons'

export function IconBtn({
  icon,
  onClick,
  color,
  label,
  size = 40,
}: {
  icon: IconName
  onClick?: () => void
  color?: string
  label: string
  size?: number
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: 12,
        border: 'none',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <GPTIcon name={icon} size={24} color={color || GPT_T.ink70} />
    </button>
  )
}
