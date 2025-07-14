import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorInfo } from '../types/error';

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  onRetry: () => void;
  onReport?: () => void;
  resetError: () => void;
  retryCount?: number;
  maxRetries?: number;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReport,
  resetError,
  retryCount = 0,
  maxRetries = 3
}) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const handleRetry = async () => {
    try {
      onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    }
  };

  const handleReport = async () => {
    if (!onReport) return;
    
    setIsReporting(true);
    try {
      await onReport();
      // レポート送信成功のフィードバック
      setTimeout(() => setIsReporting(false), 2000);
    } catch (reportError) {
      console.error('Report failed:', reportError);
      setIsReporting(false);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  const getErrorTitle = () => {
    if (error?.message.includes('Loading chunk')) {
      return t('errorBoundary.chunkLoadError');
    }
    if (error?.message.includes('out of memory')) {
      return t('errorBoundary.memoryError');
    }
    if (error?.message.includes('network') || error?.message.includes('fetch')) {
      return t('errorBoundary.networkError');
    }
    return t('errorBoundary.genericError');
  };

  const getErrorDescription = () => {
    if (error?.message.includes('Loading chunk')) {
      return t('errorBoundary.chunkLoadDescription');
    }
    if (error?.message.includes('out of memory')) {
      return t('errorBoundary.memoryDescription');
    }
    if (error?.message.includes('network') || error?.message.includes('fetch')) {
      return t('errorBoundary.networkDescription');
    }
    return t('errorBoundary.genericDescription');
  };

  const canRetry = retryCount < maxRetries;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* エラーアイコン */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* エラータイトル */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {getErrorTitle()}
          </h1>
          <p className="text-gray-600 text-sm">
            {getErrorDescription()}
          </p>
        </div>

        {/* リトライ情報 */}
        {retryCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              {t('errorBoundary.retryInfo', { current: retryCount, max: maxRetries })}
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="space-y-3">
          {canRetry && (
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              {t('errorBoundary.retryButton')}
            </button>
          )}

          <button
            onClick={handleReload}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {t('errorBoundary.reloadButton')}
          </button>

          {onReport && (
            <button
              onClick={handleReport}
              disabled={isReporting}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isReporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('errorBoundary.reportingButton')}
                </>
              ) : (
                t('errorBoundary.reportButton')
              )}
            </button>
          )}
        </div>

        {/* エラー詳細表示 */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <svg
              className={`w-4 h-4 mr-1 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {t('errorBoundary.showDetails')}
          </button>

          {showDetails && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono space-y-2">
              {error && (
                <div>
                  <div className="font-semibold text-gray-700">{t('errorBoundary.errorMessage')}:</div>
                  <div className="text-gray-600">{error.message}</div>
                </div>
              )}
              
              {error?.name && (
                <div>
                  <div className="font-semibold text-gray-700">{t('errorBoundary.errorType')}:</div>
                  <div className="text-gray-600">{error.name}</div>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && error?.stack && (
                <div>
                  <div className="font-semibold text-gray-700">{t('errorBoundary.stackTrace')}:</div>
                  <div className="text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {error.stack}
                  </div>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && errorInfo?.componentStack && (
                <div>
                  <div className="font-semibold text-gray-700">{t('errorBoundary.componentStack')}:</div>
                  <div className="text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フィードバックリンク */}
        <div className="text-center text-xs text-gray-400">
          <p>{t('errorBoundary.feedbackText')}</p>
          <a
            href="https://github.com/asofia888/sage-love/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
          >
            {t('errorBoundary.feedbackLink')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;