import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryFallbackProps {
  error: Error | null;
  onReset: () => void;
  onReload: () => void;
}

export const ErrorBoundaryFallback: React.FC<
  ErrorBoundaryFallbackProps
> = ({ error, onReset, onReload }) => (
  <div className="error-boundary">
    <Card className="error-boundary__card">
      <div className="error-boundary__icon" aria-hidden="true">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold">Something went wrong</h2>
        <p className="error-boundary__description">
          A component error occurred while rendering this screen view.
        </p>
      </div>

      {error && (
        <div className="error-boundary__diagnostic">{error.toString()}</div>
      )}

      <div className="flex items-center justify-center gap-3 pt-2">
        <Button onClick={onReset} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </Button>

        <Button variant="secondary" onClick={onReload} className="text-xs">
          Reload Page
        </Button>
      </div>
    </Card>
  </div>
);

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          onReset={this.handleReset}
          onReload={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
