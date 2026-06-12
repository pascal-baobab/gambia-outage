import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('.', import.meta.url))

// Gambia Outage — Vite + React 18 + PWA (Workbox).
// Map-first ↔ aggressive-lite: Leaflet + tiles are lazy-loaded in Phase 2, never in the
// initial chunk. /api/* is network-first (fresh read-models), shell is precached.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    // Force Leaflet into its own async chunk so it can never ride the entry
    // bundle (a dynamic import() already splits it; this makes it explicit and
    // budget-checkable in the build output). ~39 KB gz JS the map-first user
    // only pays for once they open the map past the data-saver gate.
    rollupOptions: {
      // Two HTML entries: the public PWA (index.html) and the owner ops dashboard
      // (admin/index.html → served at /admin/). The admin code never rides the public bundle.
      input: {
        main: resolve(root, 'index.html'),
        admin: resolve(root, 'admin/index.html'),
      },
      output: {
        manualChunks: { leaflet: ['leaflet'] },
      },
    },
  },
  // Dev proxy so the SPA can hit a local Pocketbase on :8090 without CORS.
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8090', changeOrigin: true },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // injectManifest: custom SW (src/sw.ts) hosts the Web Push handlers AND re-implements
      // the API NetworkFirst cache + SPA navigation fallback (generateSW can't host push).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Gambia Outage — Report the Dark',
        short_name: 'Gambia Outage',
        description:
          'A public, anonymous, fact-based record of power outages across The Gambia.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F1722',
        theme_color: '#0F1722',
        lang: 'en',
        categories: ['utilities', 'news'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // The runtime caching + navigation fallback now live in src/sw.ts (injectManifest).
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Keep the admin dashboard out of the PWA precache entirely — it's a network-only
        // internal tool (the SW also skips /admin navigations + /api/go/admin, see src/sw.ts).
        globIgnores: ['admin/**', '**/admin/**'],
      },
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
})
