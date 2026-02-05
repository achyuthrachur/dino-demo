'use client';

// =============================================================================
// ErrorBoundary.tsx - Graceful Error Handling Component
// =============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Component name for error reporting */
  componentName?: string;
  /** Whether to show full error details (dev only) */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// -----------------------------------------------------------------------------
// Error Boundary Component
// -----------------------------------------------------------------------------

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, componentName, showDetails } = this.props;

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[300px] p-6 bg-background/50 backdrop-blur-sm rounded-xl border border-border">
          <div className="flex flex-col items-center text-center max-w-md">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-laser/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-laser" />
            </div>

            {/* Title */}
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Something went wrong
            </h2>

            {/* Description */}
            <p className="font-body text-sm text-muted-foreground mb-4">
              {componentName
                ? `An error occurred in the ${componentName} component.`
                : 'An unexpected error occurred while rendering this section.'}
            </p>

            {/* Error details (dev only) */}
            {showDetails && error && (
              <div className="w-full mb-4 p-3 bg-muted/30 rounded-lg text-left">
                <p className="font-mono text-xs text-laser mb-2">
                  {error.name}: {error.message}
                </p>
                {errorInfo && (
                  <pre className="font-mono text-xs text-muted-foreground overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleReload}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// -----------------------------------------------------------------------------
// Scene Error Boundary (specialized for 3D canvas)
// -----------------------------------------------------------------------------

interface SceneErrorFallbackProps {
  onRetry: () => void;
}

function SceneErrorFallback({ onRetry }: SceneErrorFallbackProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background to-stone-900">
      <div className="flex flex-col items-center text-center max-w-md p-6">
        {/* Animated error icon */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-2 border-laser/30 rounded-full animate-ping" />
          <div className="absolute inset-4 border-2 border-laser rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-laser" />
          </div>
        </div>

        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          3D Scene Failed to Load
        </h2>
        <p className="font-body text-muted-foreground mb-6">
          The interactive exhibit couldn&apos;t be rendered. This might be due to
          WebGL compatibility issues or a network problem.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={onRetry} className="w-full gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry Loading
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full gap-2"
          >
            Reload Page
          </Button>
        </div>

        {/* Troubleshooting tips */}
        <div className="mt-6 p-4 bg-muted/20 rounded-lg text-left w-full">
          <h3 className="font-mono text-xs text-muted-foreground uppercase mb-2">
            Troubleshooting
          </h3>
          <ul className="font-body text-xs text-muted-foreground space-y-1">
            <li>• Check that WebGL is enabled in your browser</li>
            <li>• Try refreshing the page</li>
            <li>• Disable browser extensions that might block 3D content</li>
            <li>• Try a different browser (Chrome, Firefox, Edge)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SceneErrorBoundary] 3D scene error:', error);
      console.error('[SceneErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <SceneErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// HOC for functional components
// -----------------------------------------------------------------------------

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary
      componentName={componentName}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundary;
}
