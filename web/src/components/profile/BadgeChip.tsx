import { BADGE_LABEL } from '@/lib/xp'
import { GPT_T } from '@/lib/tokens'

export function BadgeChip({ k }: { k: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, border: `1px solid ${GPT_T.line}`, fontSize: 13, color: GPT_T.ink70 }}>
      {BADGE_LABEL[k] ?? k}
    </span>
  )
}
