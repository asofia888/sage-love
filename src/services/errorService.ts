import { ApiError, ErrorCode } from '../types';
import { errorLogger, ErrorSeverity } from '../lib/error-logger';

/**
 * Enhanced Error Service with better typing and logging
 */
export class ErrorService {
  /**
   * エラーを標準化されたApiError形式に変換
   */
  static normalizeError(error: unknown): ApiError {
    // Already normalized error
    if (this.isApiError(error)) {
      return {
        ...error,
        timestamp: error.timestamp || new Date(),
        severity: error.severity || this.getErrorSeverity(error)
      };
    }

    // Parse API_ERROR format from backend
    if (error instanceof Error && error.message.startsWith('API_ERROR:')) {
      return this.parseApiErrorFormat(error.message);
    }

    // エラーメッセージに基づいて適切なエラーコードを決定
    const errorMessage = this.getErrorMessage(error);
    const code = this.determineErrorCode(errorMessage);

    const apiError: ApiError = {
      code,
      details: errorMessage,
      timestamp: new Date(),
      severity: this.getErrorSeverity({ code } as ApiError)
    };

    return apiError;
  }

  /**
   * Check if error is already ApiError
   */
  private static isApiError(error: unknown): error is ApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as ApiError).code === 'string'
    );
  }

  /**
   * Get error message from unknown error type
   */
  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Unknown error occurred';
  }

  /**
   * Parse API_ERROR format: API_ERROR:CODE:MESSAGE:RETRY_AFTER
   * Public method for external use
   */
  static parseApiErrorFormat(message: string): ApiError {
    const parts = message.split(':');
    if (parts.length >= 3) {
      const code = parts[1] as ErrorCode;
      const details = parts[2];
      const retryAfter = parts[3] ? parseInt(parts[3], 10) : undefined;

      return {
        code,
        details,
        timestamp: new Date(),
        severity: this.getErrorSeverity({ code } as ApiError),
        retryAfter,
      };
    }

    return {
      code: 'errorMessageDefault',
      details: message,
      timestamp: new Date(),
      severity: 'medium',
    };
  }

  /**
   * Determine error code from message
   */
  private static determineErrorCode(errorMessage: string): ErrorCode {
    if (errorMessage.includes('API key not valid')) {
      return 'errorAuth';
    }
    if (errorMessage.toLowerCase().includes('quota')) {
      return 'errorQuota';
    }
    if (errorMessage.includes('API key is not configured')) {
      return 'errorNoApiKeyConfig';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'errorNetwork';
    }
    if (errorMessage.includes('translation')) {
      return 'errorTranslation';
    }
    if (errorMessage.includes('stream')) {
      return 'errorStreaming';
    }
    return 'errorMessageDefault';
  }

  /**
   * エラーをログに記録 (enhanced with error logger)
   */
  static logError(error: ApiError, context?: string, component?: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      errorDetails: error.details,
      context: context || 'unknown',
      component: component || 'unknown',
    };

    console.error('Application Error:', logData);

    // Use centralized error logger
    const severity = this.mapSeverityToLoggerSeverity(error.severity || 'medium');
    errorLogger.log(
      error.details || 'Unknown error',
      severity,
      error.code,
      {
        component,
        action: context,
        metadata: {
          timestamp: error.timestamp,
          retryAfter: (error as ApiError & { retryAfter?: number }).retryAfter,
        },
      }
    );
  }

  /**
   * Map ApiError severity to ErrorLogger severity
   */
  private static mapSeverityToLoggerSeverity(
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): ErrorSeverity {
    switch (severity) {
      case 'low':
        return ErrorSeverity.LOW;
      case 'medium':
        return ErrorSeverity.MEDIUM;
      case 'high':
        return ErrorSeverity.HIGH;
      case 'critical':
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * エラーの重要度を判定
   */
  static getErrorSeverity(error: ApiError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.code) {
      case 'errorAuth':
      case 'errorNoApiKeyConfig':
        return 'critical';
      case 'errorQuota':
        return 'high';
      case 'errorNetwork':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * ユーザー向けエラーメッセージを生成
   */
  static getUserFriendlyMessage(error: ApiError, t: (key: string) => string): string {
    // 翻訳キーが存在する場合はそれを使用
    try {
      return t(`errors.${error.code}`);
    } catch {
      // フォールバック
      return t('errors.errorMessageDefault');
    }
  }
}