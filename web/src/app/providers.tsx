// providers.tsx — TanStack Query + status-theme providers.
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './theme'
import { useAppStore } from './store'

export function Providers({ children }: { children: ReactNode }) {
  const themeName = useAppStore((s) => s.themeName)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider name={themeName}>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}
