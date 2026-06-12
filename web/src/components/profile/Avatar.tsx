import { AVATARS } from '@/lib/avatars.generated'

// Avatar — renders a pre-generated, static, build-time DiceBear SVG (see web/scripts/gen-avatars.ts).
// The svg strings are TRUSTED static content baked into the bundle — they are NEVER user input, so
// dangerouslySetInnerHTML is safe here. Dependency-free at runtime (no DiceBear in the bundle).

// Force the root <svg> to fill the circular wrapper (the generated svg carries fixed width/height;
// its viewBox keeps it crisp). Only touches the FIRST <svg ...> tag (the root).
function fill(svg: string): string {
  return svg.replace(
    /<svg\b([^>]*)>/,
    (_m, attrs: string) => {
      const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, '')
      return `<svg${cleaned} width="100%" height="100%" style="display:block">`
    },
  )
}

export function Avatar({ avatarId, size = 40 }: { avatarId: string; size?: number }) {
  const preset = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0]
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-block',
        flexShrink: 0,
      }}
      dangerouslySetInnerHTML={{ __html: fill(preset.svg) }}
    />
  )
}
