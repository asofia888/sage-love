import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './lib/i18n'; // Initialize i18next
import { initSentry, shutdownSentry } from './lib/sentry';
import { setupGlobalErrorHandlers } from './lib/error-logger';
import { readCookieConsent, onCookieConsentChange } from './hooks/useCookieConsent';

/**
 * エラー監視は functional Cookie に同意した利用者に限る。
 *
 * Why: Sentry は例外ログだけでなくセッションリプレイ
 * （replaysOnErrorSampleRate）とパフォーマンストレースも送る。
 * 同意前にこれを走らせるのは、プライバシーポリシーの
 * 「Cookie同意に基づく」という記載と食い違う。
 * 同意はバナーで後から付け外しできるので、変更にも追従する。
 */
function syncSentryWithConsent(): void {
  if (readCookieConsent()?.functional) {
    initSentry();
  } else {
    shutdownSentry();
  }
}

syncSentryWithConsent();
onCookieConsentChange(syncSentryWithConsent);

// Setup global error handlers
setupGlobalErrorHandlers();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense fallback="Loading...">
        <App />
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
