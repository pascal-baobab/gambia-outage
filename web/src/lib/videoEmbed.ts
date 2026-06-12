// videoEmbed.ts — detect a Facebook/YouTube VIDEO post and build a lazy in-app player URL. Mirrors
// the LIVE-embed approach (LiveStrip): the iframe mounts only on tap, and Data-saver users get a
// link-out instead. Nothing loads from facebook.com / youtube until the user taps. FB videos play via
// the plugin player; YouTube via the privacy-friendly nocookie embed. TikTok/Instagram → link-out.

/** Is this From-Facebook url a video post we can play in-app? */
export function isVideoUrl(url: string): boolean {
  const u = (url || '').toLowerCase()
  return (
    /\/(videos|reel|watch)\b/.test(u) ||
    u.includes('fb.watch') ||
    u.includes('youtube.com/watch') ||
    u.includes('youtu.be/')
  )
}

/** Embeddable player URL, or null (→ caller should link-out). */
export function videoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const id = host.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v') || ''
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : null
    }
    if (host.includes('facebook.com') || host.includes('fb.watch'))
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`
    return null
  } catch {
    return null
  }
}
