import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI Component
 */
interface ErrorFallbackProps {
  error?: Error;
  onReset: () => void;
  onReload: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset, onReload }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-md rounded-lg shadow-2xl p-8 border border-slate-700">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-center text-slate-100 mb-4">
          {t('errorBoundaryTitle', '予期しないエラーが発生しました')}
        </h1>

        {/* Error Message */}
        <p className="text-slate-300 text-center mb-6">
          {t('errorBoundaryMessage', '申し訳ございません。アプリケーションにエラーが発生しました。')}
        </p>

        {/* Error Details (Development only) */}
        {import.meta.env.DEV && error && (
          <details className="mb-6 bg-slate-900/50 rounded p-4 border border-slate-700">
            <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 mb-2">
              {t('errorBoundaryDetailsToggle', '技術的な詳細を表示')}
            </summary>
            <div className="mt-2 text-xs text-red-400 font-mono overflow-auto max-h-40">
              <p className="font-semibold mb-2">{error.name}: {error.message}</p>
              <pre className="whitespace-pre-wrap break-words">{error.stack}</pre>
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            aria-label={t('errorBoundaryResetButton', '再試行')}
          >
            {t('errorBoundaryResetButton', '再試行')}
          </button>
          <button
            onClick={onReload}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            aria-label={t('errorBoundaryReloadButton', 'ページをリロード')}
          >
            {t('errorBoundaryReloadButton', 'ページをリロード')}
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-xs text-center text-slate-400">
          {t('errorBoundaryHelpText', '問題が解決しない場合は、ブラウザのキャッシュをクリアしてお試しください。')}
        </p>
      </div>
    </div>
  );
};

export default ErrorBoundary;
