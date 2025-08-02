import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorFallback from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Get previous error count from session storage
    const errorCount =
      parseInt(sessionStorage.getItem('errorCount') || '0') + 1;
    sessionStorage.setItem('errorCount', errorCount.toString());

    return { hasError: true, error, errorCount };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary: Uncaught error:', error, errorInfo);

    // Log error details for debugging
    console.error('ErrorBoundary: Component Stack:', errorInfo.componentStack);
    console.error('ErrorBoundary: Error message:', error.message);
    console.error('ErrorBoundary: Error stack:', error.stack);

    // Check if this is a Supabase configuration error
    if (error.message?.includes('Missing Supabase environment variables')) {
      console.warn('ErrorBoundary: Supabase not configured. Running in offline mode.');
    }
  }

  private resetError = () => {
    sessionStorage.setItem('errorCount', '0');
    this.setState({ hasError: false, error: null, errorCount: 0 });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // If there's a custom fallback, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // If we've had too many errors, show a simple fallback
      if (this.state.errorCount > 3) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                申し訳ございません
              </h1>
              <p className="text-gray-600 mb-6">
                アプリケーションで問題が発生しています。
                ブラウザのキャッシュをクリアしてから再度お試しください。
              </p>
              <button
                onClick={() => {
                  sessionStorage.clear();
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                キャッシュをクリアして再読み込み
              </button>
            </div>
          </div>
        );
      }

      // Otherwise show the detailed error fallback
      return (
        <ErrorFallback
          error={this.state.error || undefined}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
