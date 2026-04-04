'use client';
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 12, padding: 24,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, textAlign: 'center', maxWidth: 320 }}>
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              marginTop: 8, padding: '8px 20px', background: '#0f2744', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
