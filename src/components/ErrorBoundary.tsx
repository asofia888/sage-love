import React, { Component, ReactNode } from 'react';
import { ErrorBoundaryState, ErrorInfo as CustomErrorInfo } from '../types/error';
import { errorReportingService } from '../services/errorReportingService';
import ErrorFallback from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<any>;
  onError?: (error: Error, errorInfo: CustomErrorInfo) => void;
  isolate?: boolean;
  feature?: string;
}

class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substring(2)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const customErrorInfo: CustomErrorInfo = {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      errorBoundaryStack: errorInfo.errorBoundaryStack
    };

    // エラー状態を更新
    this.setState(prevState => ({
      errorInfo: customErrorInfo,
      retryCount: prevState.retryCount
    }));

    // カスタムエラーハンドラーを実行
    if (this.props.onError) {
      this.props.onError(error, customErrorInfo);
    }

    // エラーレポートサービスに送信
    errorReportingService.reportError(error, customErrorInfo, {
      feature: this.props.feature,
      route: window.location.pathname,
      userAction: 'component_render'
    }).catch(reportError => {
      console.error('Failed to report error:', reportError);
    });

    // 開発環境では詳細ログを出力
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 ErrorBoundary Caught Error');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Boundary Stack:', errorInfo.errorBoundaryStack);
      console.groupEnd();
    }
  }

  componentWillUnmount() {
    // タイムアウトをクリア
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 指数バックオフ

    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    // 段階的リトライ戦略
    if (retryCount === 0) {
      // 即座にリトライ
      this.performRetry();
    } else {
      // 遅延リトライ
      const timeout = setTimeout(() => {
        this.performRetry();
      }, retryDelay);
      
      this.retryTimeouts.push(timeout);
    }
  };

  private performRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: prevState.retryCount + 1
    }));

    // メモリクリーンアップを試行
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
      } catch {
        // ガベージコレクションが利用できない場合は無視
      }
    }
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    // エラーレポートを再送信（ユーザー操作として）
    errorReportingService.reportError(error, errorInfo, {
      feature: this.props.feature,
      route: window.location.pathname,
      userAction: 'manual_report'
    }).catch(reportError => {
      console.error('Failed to report error manually:', reportError);
    });
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onReport={this.handleReportError}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          maxRetries={3}
        />
      );
    }

    return this.props.children;
  }
}

// 高次コンポーネント（HOC）版
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// フック版（関数コンポーネント用）
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: Partial<CustomErrorInfo>) => {
    // 手動エラー処理
    errorReportingService.reportError(error, errorInfo as CustomErrorInfo, {
      userAction: 'manual_error_handling'
    });
  }, []);
}

export default ErrorBoundary;