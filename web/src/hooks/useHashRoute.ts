// useHashRoute.ts — hand-rolled hash routing (no react-router). Ported from the
// prototype's view state into URL hashes: #/ , #/list , #/zone/:id , #/about.
import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'zone'; id: string }
  | { name: 'about' }
  | { name: 'project' }
  | { name: 'community' }
  | { name: 'talk' }
  | { name: 'honors' }
  | { name: 'profile' }
  | { name: 'map' }
  | { name: 'news' }
  | { name: 'su'; slug?: string } // hidden superadmin login at #/su/<secret-slug>
  | { name: 'ambassador'; token: string }

function parse(hash: string): Route {
  const h = hash.replace(/^#/, '')
  const parts = h.split('/').filter(Boolean) // strip leading slash
  const head = parts[0] ?? 'home'
  if (head === 'list') return { name: 'list' }
  if (head === 'about') return { name: 'about' }
  if (head === 'project') return { name: 'project' }
  if (head === 'community') return { name: 'community' }
  if (head === 'talk') return { name: 'talk' }
  if (head === 'honors') return { name: 'honors' }
  if (head === 'profile') return { name: 'profile' }
  if (head === 'map') return { name: 'map' }
  if (head === 'news') return { name: 'news' }
  if (head === 'su') return { name: 'su', slug: parts[1] ? decodeURIComponent(parts[1]) : undefined }
  if (head === 'zone' && parts[1]) return { name: 'zone', id: decodeURIComponent(parts[1]) }
  if (head === 'ambassador' && parts[1]) return { name: 'ambassador', token: decodeURIComponent(parts[1]) }
  return { name: 'home' }
}

export function navigate(route: Route): void {
  switch (route.name) {
    case 'home':
      window.location.hash = '#/'
      break
    case 'list':
      window.location.hash = '#/list'
      break
    case 'about':
      window.location.hash = '#/about'
      break
    case 'project':
      window.location.hash = '#/project'
      break
    case 'community':
      window.location.hash = '#/community'
      break
    case 'talk':
      window.location.hash = '#/talk'
      break
    case 'profile':
      window.location.hash = '#/profile'
      break
    case 'map':
      window.location.hash = '#/map'
      break
    case 'news':
      window.location.hash = '#/news'
      break
    case 'su':
      window.location.hash = '#/su'
      break
    case 'ambassador':
      window.location.hash = `#/ambassador/${encodeURIComponent(route.token)}`
      break
    case 'zone':
      window.location.hash = `#/zone/${encodeURIComponent(route.id)}`
      break
  }
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
