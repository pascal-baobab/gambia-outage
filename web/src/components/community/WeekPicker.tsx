// WeekPicker.tsx — switch the Community boards between the live current week and frozen historical
// weeks (at launch: "This week" + the illustrative 25–31 May seed week). Pill toggle, keyboard-free.
import { GPT_T, GPT_FONT } from '@/lib/tokens'

export interface WeekOption {
  id: string // 'live' for the current week, else an ISO week id ("2026-W22")
  label: string
}

export function WeekPicker({ value, options, onChange }: { value: string; options: WeekOption[]; onChange: (id: string) => void }) {
  return (
    <div
      role="tablist"
      style={{ display: 'inline-flex', background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 11, padding: 3, gap: 3, fontFamily: GPT_FONT }}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '7px 13px',
              borderRadius: 8,
              fontFamily: GPT_FONT,
              fontSize: 12.5,
              fontWeight: 800,
              background: active ? GPT_T.ink : 'transparent',
              color: active ? '#fff' : GPT_T.ink70,
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
