import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

/**
 * Top-level UI error boundary (PROJECT_CORE §15). A render failure in one
 * component shows a recoverable fallback instead of a blank page; the saved
 * project and any autosaved recovery data are untouched.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Obsipix UI error:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <div role="alert" style={FALLBACK_STYLE}>
        <div style={CARD_STYLE}>
          <h1 style={{ margin: '0 0 8px', fontSize: 16 }}>Something went wrong</h1>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#9aa' }}>
            The editor hit an unexpected error. Your last autosave is still safe — reload to
            continue.
          </p>
          <pre style={PRE_STYLE}>{error.message}</pre>
          <button
            type="button"
            style={BUTTON_STYLE}
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

const FALLBACK_STYLE = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1a1a1e',
  color: '#e8e8ea',
} as const;

const CARD_STYLE = {
  width: 'min(460px, calc(100vw - 32px))',
  padding: 20,
  background: '#26262c',
  border: '1px solid #3a3a42',
  borderRadius: 8,
} as const;

const PRE_STYLE = {
  margin: '0 0 16px',
  padding: 10,
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  background: '#1a1a1e',
  borderRadius: 4,
} as const;

const BUTTON_STYLE = {
  padding: '6px 14px',
  font: 'inherit',
  fontSize: 13,
  color: '#1a1a1e',
  background: '#6ea8fe',
  border: 0,
  borderRadius: 4,
  cursor: 'pointer',
} as const;
