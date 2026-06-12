// NameStars.tsx — renders a name (e.g. the user's nickname in the Home header) with three small gold
// stars that orbit around it and twinkle. Decorative; the stars sit BEHIND the text (zIndex) so the
// name stays legible. Animation/keyframes live in index.css (.go-name-star / goNameOrbit / goNameTwinkle);
// the global prefers-reduced-motion rule there freezes them. The three stars share one orbit but are
// phase-offset (animation-delay) so they're evenly spaced around the loop.
const STAR_PATH = 'M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z'

function StarGlyph({ color, delay }: { color: string; delay: string }) {
  return (
    <svg
      className="go-name-star"
      width="9"
      height="9"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ color, animationDelay: delay }}
    >
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  )
}

export function NameStars({ name, color = '#E8A100' }: { name: string; color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', padding: '0 5px' }}>
      <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>{name}</span>
      {/* delays: orbit (6s) phase-thirds → evenly spaced; twinkle (1.8s) lightly offset */}
      <StarGlyph color={color} delay="0s, 0s" />
      <StarGlyph color={color} delay="-2s, -0.6s" />
      <StarGlyph color={color} delay="-4s, -1.2s" />
    </span>
  )
}
