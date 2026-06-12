// SegToggle.tsx — segmented toggle (map / list), ported 1:1 from shared-ui.jsx.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { GPTIcon, type IconName } from '@/components/icons'

export interface SegOption {
  v: string
  icon: IconName
  label: string
}

export function SegToggle({ value, options, onChange }: { value: string; options: SegOption[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: GPT_T.line2, borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: '0 14px',
            borderRadius: 9,
            border: 'none',
            cursor: 'pointer',
            background: value === o.v ? GPT_T.paper : 'transparent',
            color: value === o.v ? GPT_T.ink : GPT_T.ink45,
            fontFamily: GPT_FONT,
            fontSize: 13.5,
            fontWeight: 700,
            boxShadow: value === o.v ? '0 1px 4px rgba(15,23,34,0.12)' : 'none',
          }}
        >
          <GPTIcon name={o.icon} size={16} color={value === o.v ? GPT_T.ink : GPT_T.ink45} /> {o.label}
        </button>
      ))}
    </div>
  )
}
