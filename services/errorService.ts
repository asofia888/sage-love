import { ApiError, ErrorCode } from '../types';

/**
 * エラー処理を統一するサービス
 */
export class ErrorService {
  /**
   * エラーを標準化されたApiError形式に変換
   */
  static normalizeError(error: any): ApiError {
    if (error && typeof error === 'object' && error.code) {
      return {
        ...error,
        timestamp: error.timestamp || new Date(),
        severity: error.severity || this.getErrorSeverity(error)
      } as ApiError;
    }

    // エラーメッセージに基づいて適切なエラーコードを決定
    const errorMessage = error?.message || String(error);
    let code: ErrorCode = 'errorMessageDefault';
    
    if (errorMessage.includes('API key not valid')) {
      code = 'errorAuth';
    } else if (errorMessage.toLowerCase().includes('quota')) {
      code = 'errorQuota';
    } else if (errorMessage.includes('API key is not configured')) {
      code = 'errorNoApiKeyConfig';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      code = 'errorNetwork';
    } else if (errorMessage.includes('translation')) {
      code = 'errorTranslation';
    } else if (errorMessage.includes('stream')) {
      code = 'errorStreaming';
    }

    const apiError: ApiError = {
      code,
      details: errorMessage,
      timestamp: new Date(),
      severity: this.getErrorSeverity({ code } as ApiError)
    };

    return apiError;
  }

  /**
   * エラーをログに記録
   */
  static logError(error: ApiError, context?: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      errorDetails: error.details,
      context: context || 'unknown'
    };
    
    console.error('Application Error:', logData);
    
    // 本番環境では外部ログサービスに送信することもできる
    // if (process.env.NODE_ENV === 'production') {
    //   // 外部ログサービスへの送信ロジック
    // }
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