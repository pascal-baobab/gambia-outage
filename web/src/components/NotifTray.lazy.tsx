// NotifTray.lazy.tsx — code-split the notification tray so it never weighs on the entry bundle.
// Loaded on demand when the user first opens the tray (trayOpen=true in App.tsx).
import { lazy } from 'react'

export const NotificationTray = lazy(() =>
  import('./NotifTray').then((m) => ({ default: m.NotifTray })),
)
