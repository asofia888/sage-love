export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

export interface ErrorDetails {
  message: string;
  stack?: string;
  name: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  component?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory = 
  | 'component_error'
  | 'network_error'
  | 'api_error'
  | 'rendering_error'
  | 'memory_error'
  | 'permission_error'
  | 'unknown_error';

export interface ErrorReport {
  id: string;
  error: ErrorDetails;
  errorInfo?: ErrorInfo;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: {
    route: string;
    feature: string;
    userAction?: string;
  };
  metadata: {
    buildVersion?: string;
    environment: 'development' | 'production';
    deviceInfo: {
      platform: string;
      browser: string;
      version: string;
      mobile: boolean;
    };
  };
}

export interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  onRetry: () => void;
  onReport?: (report: ErrorReport) => void;
  resetError: () => void;
  severity?: ErrorSeverity;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  maxRetries: number;
  retryDelay: number;
  includeStackTrace: boolean;
  includeBrowserInfo: boolean;
  includeUserInfo: boolean;
}