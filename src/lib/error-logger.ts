/**
 * Error Logging Service
 * Centralized error logging and monitoring with Sentry integration
 */

import {
  captureException,
  addBreadcrumb,
  isSentryEnabled,
  Sentry,
} from './sentry';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Map our severity levels to Sentry severity levels
const severityToSentry: Record<ErrorSeverity, Sentry.SeverityLevel> = {
  [ErrorSeverity.LOW]: 'info',
  [ErrorSeverity.MEDIUM]: 'warning',
  [ErrorSeverity.HIGH]: 'error',
  [ErrorSeverity.CRITICAL]: 'fatal',
};

export interface ErrorContext {
  timestamp: Date;
  userAgent?: string;
  url?: string;
  sessionId?: string;
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface LoggedError {
  id: string;
  message: string;
  severity: ErrorSeverity;
  category: string;
  stack?: string;
  context: ErrorContext;
}

class ErrorLogger {
  private errors: LoggedError[] = [];
  private maxStoredErrors = 100;
  private listeners: Array<(error: LoggedError) => void> = [];

  /**
   * Log an error
   */
  log(
    error: Error | string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: string = 'GENERAL',
    context?: Partial<ErrorContext>
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const loggedError: LoggedError = {
      id: this.generateErrorId(),
      message: errorMessage,
      severity,
      category,
      stack,
      context: {
        timestamp: new Date(),
        userAgent: navigator?.userAgent,
        url: window?.location?.href,
        ...context,
      },
    };

    // Store error
    this.errors.push(loggedError);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift(); // Remove oldest error
    }

    // Console logging based on severity
    this.consoleLog(loggedError);

    // Notify listeners
    this.notifyListeners(loggedError);

    // Send to external service (if configured)
    this.sendToExternalService(loggedError);
  }

  /**
   * Log to console based on severity
   */
  private consoleLog(error: LoggedError): void {
    const logMessage = `[${error.severity.toUpperCase()}] ${error.category}: ${error.message}`;

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(logMessage, error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, error);
        break;
      case ErrorSeverity.LOW:
        console.info(logMessage, error);
        break;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send error to external monitoring service (Sentry)
   */
  private sendToExternalService(error: LoggedError): void {
    // Add breadcrumb for all errors
    addBreadcrumb(
      error.category,
      error.message,
      severityToSentry[error.severity],
      {
        errorId: error.id,
        ...error.context.metadata,
      }
    );

    // Only send critical and high severity errors to Sentry
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      const sentryEventId = captureException(new Error(error.message), {
        level: severityToSentry[error.severity],
        tags: {
          category: error.category,
          component: error.context.component || 'unknown',
          action: error.context.action || 'unknown',
        },
        extra: {
          errorId: error.id,
          stack: error.stack,
          context: error.context,
        },
      });

      if (sentryEventId) {
        console.log(`📤 Error sent to Sentry: ${sentryEventId}`);
      }
    }
  }

  /**
   * Subscribe to error events
   */
  subscribe(listener: (error: LoggedError) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(error: LoggedError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * Get all logged errors
   */
  getErrors(filter?: { severity?: ErrorSeverity; category?: string }): LoggedError[] {
    let filtered = [...this.errors];

    if (filter?.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }

    if (filter?.category) {
      filtered = filtered.filter(e => e.category === filter.category);
    }

    return filtered;
  }

  /**
   * Clear all logged errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getStats() {
    const stats = {
      total: this.errors.length,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      byCategory: {} as Record<string, number>,
    };

    this.errors.forEach(error => {
      stats.bySeverity[error.severity]++;
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
    });

    return stats;
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandlers(): void {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    errorLogger.log(
      event.error || event.message,
      ErrorSeverity.HIGH,
      'UNHANDLED_ERROR',
      {
        component: 'window',
        action: 'global_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      }
    );
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log(
      event.reason instanceof Error ? event.reason : String(event.reason),
      ErrorSeverity.HIGH,
      'UNHANDLED_REJECTION',
      {
        component: 'window',
        action: 'promise_rejection',
      }
    );
  });

  const sentryStatus = isSentryEnabled() ? 'enabled' : 'disabled (no DSN)';
  console.log(`✅ Global error handlers initialized (Sentry: ${sentryStatus})`);
}

/**
 * Export Sentry utilities for direct use
 */
export { captureException, addBreadcrumb, isSentryEnabled } from './sentry';
