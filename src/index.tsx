import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './lib/i18n'; // Initialize i18next
import { initSentry } from './lib/sentry';
import { setupGlobalErrorHandlers } from './lib/error-logger';

// Initialize Sentry first (before any errors can occur)
initSentry();

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
