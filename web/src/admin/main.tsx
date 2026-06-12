// main.tsx (admin) — standalone entry for the owner ops dashboard at /admin. Deliberately NOT the
// public app: no PWA registration, no map/Leaflet, no shared screens. Ships as its own Vite input
// (see vite.config.ts) so none of this rides the public bundle. The service worker is told to
// leave /admin and /api/go/admin alone (src/sw.ts), so this page is always live, never cached.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminApp } from './AdminApp'

createRoot(document.getElementById('admin-root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
