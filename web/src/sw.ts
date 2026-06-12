/// <reference lib="webworker" />
// sw.ts — custom service worker (vite-plugin-pwa injectManifest). Carries the Web Push
// `push` + `notificationclick` handlers (which generateSW can't host) AND re-implements the
// exact caching that the previous generateSW config provided, so offline read-models + SPA
// navigation keep working:
//   - precache the build manifest (self.__WB_MANIFEST)
//   - SPA navigation fallback → index.html
//   - /api/* → NetworkFirst (cacheName 'go-api', 4s timeout, 32 entries / 1h)
// Keep this in parity with the pre-existing workbox.runtimeCaching block.
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// take over promptly (registerType: autoUpdate)
self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

// precache the built assets
precacheAndRoute(self.__WB_MANIFEST)

// SPA navigation fallback → index.html (parity with navigateFallback: 'index.html').
// Denylist /admin/* so the owner ops dashboard (its own HTML entry) is always served from the
// network, never shadowed by the public app shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/admin(\/|$)/] }))

// read-models / API → network-first with a short timeout, fall back to last good copy offline.
// /api/go/admin/* is EXCLUDED: superuser-gated ops data must never be cached/served stale by the SW.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/go/admin'),
  new NetworkFirst({
    cacheName: 'go-api',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 }),
    ],
  }),
)

// ── Web Push ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Gambia Outage', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Gambia Outage'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  const url = target.startsWith('#') || target.startsWith('/') ? `/#${target.replace(/^#/, '')}` : target
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          ;(client as WindowClient).navigate(url)
          return (client as WindowClient).focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
