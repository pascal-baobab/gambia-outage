// ErrorBoundary — last-resort guard so a single component crash can't unmount the whole app and
// leave the user a blank white screen. Self-contained (inline styles, no theme/store/i18n deps) so
// it still renders even if a Provider is what threw. Copy stays neutral/evidence-based per brand.
// i18n: uses langStore.getState() directly (not a hook) so it's safe in a class component and
// survives even if a React context/provider threw.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLang } from '@/app/langStore'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry endpoint yet — log to the console so it surfaces in DevTools / remote debugging.
    console.error('[gambia-outage] render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    // getState() is synchronous — safe in class render; en is always the fallback.
    const eb = useLang.getState().dict.errorBoundary
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: '#0e1116',
          color: '#e6e8eb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700 }}>{eb.title}</div>
        <div style={{ fontSize: 14, maxWidth: 320, lineHeight: 1.5, opacity: 0.8 }}>
          {eb.description}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: '12px 24px',
            borderRadius: 10,
            border: 'none',
            background: '#c8102e',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {eb.reload}
        </button>
      </div>
    )
  }
}
