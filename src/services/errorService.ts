import { ApiError, ErrorCode, ERROR_CODES } from '../types';
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
   * サーバー側ワイヤーコード → 表示用エラーコードの対応表。
   * ERROR_CODES に含まれるコード（errorAuth / MESSAGE_TOO_LONG 等）はそのまま通す。
   */
  private static readonly WIRE_CODE_MAP: Record<string, ErrorCode> = {
    RATE_LIMIT_EXCEEDED: 'errorRateLimit',
    IP_RATE_LIMIT: 'errorRateLimit',
    BURST_LIMIT_EXCEEDED: 'errorBurstLimit',
    SESSION_HOURLY_LIMIT: 'errorSessionLimit',
    SESSION_DAILY_LIMIT: 'errorSessionLimit',
    SESSION_LIMIT_EXCEEDED: 'errorSessionLimit',
    DAILY_COST_LIMIT: 'errorDailyCostLimit',
    HOURLY_COST_LIMIT: 'errorHourlyCostLimit',
    EMERGENCY_COST_LIMIT: 'errorEmergencyCostLimit',
    PROJECTED_COST_LIMIT: 'errorEmergencyCostLimit',
    QUOTA_EXCEEDED: 'errorQuota',
    CONTENT_SAFETY: 'errorContentSafety',
    NETWORK_ERROR: 'errorNetwork',
    TIMEOUT: 'errorTimeout',
    COST_CHECK_UNAVAILABLE: 'errorServiceUnavailable',
    errorCircuitBreaker: 'errorServiceUnavailable',
  };

  /**
   * Parse API_ERROR format: API_ERROR:CODE:MESSAGE:RETRY_AFTER
   * Public method for external use
   */
  static parseApiErrorFormat(message: string): ApiError {
    const parts = message.split(':');
    if (parts.length >= 3) {
      const wireCode = parts[1];
      const code: ErrorCode = (ERROR_CODES as readonly string[]).includes(wireCode)
        ? (wireCode as ErrorCode)
        : this.WIRE_CODE_MAP[wireCode] ?? 'errorMessageDefault';

      // MESSAGE 自体に ':' が含まれ得るため、末尾が数値の場合のみ RETRY_AFTER として切り出す
      const last = parts[parts.length - 1];
      const hasRetry = parts.length >= 4 && /^\d+$/.test(last);
      const retrySeconds = hasRetry ? parseInt(last, 10) : 0;
      const details = parts.slice(2, hasRetry ? parts.length - 1 : undefined).join(':');

      return {
        code,
        details,
        timestamp: new Date(),
        severity: this.getErrorSeverity({ code } as ApiError),
        retryAfter: retrySeconds > 0 ? retrySeconds : undefined,
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
      case 'errorTimeout':
      case 'errorServiceUnavailable':
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