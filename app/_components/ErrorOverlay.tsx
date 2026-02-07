'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorOverlay extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Scene error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg0)',
            color: 'var(--fg0)',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, sans-serif',
            zIndex: 100,
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--danger)',
                marginBottom: '1rem',
              }}
            >
              Failed to load scene
            </h2>
            <p style={{ color: 'var(--fg1)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              The 3D model could not be loaded. Please check your connection and try again.
            </p>
            <p
              style={{
                color: 'var(--fg1)',
                fontSize: '0.75rem',
                opacity: 0.7,
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1.5rem',
                background: 'var(--accent)',
                color: 'var(--bg0)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
