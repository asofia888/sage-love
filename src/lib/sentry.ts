/**
 * Sentry Configuration
 * Error monitoring and performance tracking
 */

import * as Sentry from '@sentry/react';

// Configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Check if Sentry is configured
export const isSentryEnabled = (): boolean => {
  return !!SENTRY_DSN && ENVIRONMENT === 'production';
};

/**
 * Initialize Sentry
 * Call this in main.tsx before rendering the app
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.log('📊 Sentry: DSN not configured, skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      release: `sages-love-ai@${RELEASE}`,

      // Performance Monitoring
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

      // Session Replay (optional, for debugging)
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,

      // Only send errors in production
      enabled: ENVIRONMENT === 'production',

      // Filter out non-critical errors
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Don't send network errors from user connectivity issues
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          return null;
        }

        // Don't send rate limit errors (expected behavior)
        if (error instanceof Error && error.message.includes('RATE_LIMIT')) {
          return null;
        }

        // Add custom tags
        event.tags = {
          ...event.tags,
          app: 'sages-love-ai',
        };

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'http://tt.telekomsel.com/',
        "Can't find variable: ZiteReader",
        'jigsaw is not defined',
        'ComboSearch is not defined',
        'http://loading.retry.widdit.com/',
        'atomicFindClose',
        // Facebook errors
        'fb_xd_fragment',
        // Chrome extensions
        /chrome-extension/,
        /extensions\//i,
        // Network errors
        'Network Error',
        'NetworkError',
        'Failed to fetch',
        'Load failed',
        // Rate limit (expected)
        'ERR_RATE_LIMIT',
        'ERR_SESSION_LIMIT',
      ],

      // Performance integrations
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });

    console.log('✅ Sentry initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | string,
  context?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id?: string; email?: string };
  }
): string | undefined {
  if (!isSentryEnabled()) {
    console.error('Error (Sentry disabled):', error);
    return undefined;
  }

  const exception = typeof error === 'string' ? new Error(error) : error;

  return Sentry.captureException(exception, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
  });
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): string | undefined {
  if (!isSentryEnabled()) {
    console.log('Message (Sentry disabled):', message);
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id?: string; sessionId?: string } | null): void {
  if (!isSentryEnabled()) return;

  if (user) {
    Sentry.setUser({
      id: user.id || user.sessionId,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void {
  if (!isSentryEnabled()) return;

  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set custom tag
 */
export function setTag(key: string, value: string): void {
  if (!isSentryEnabled()) return;
  Sentry.setTag(key, value);
}

/**
 * Set extra context
 */
export function setExtra(key: string, value: unknown): void {
  if (!isSentryEnabled()) return;
  Sentry.setExtra(key, value);
}

/**
 * Create a custom scope for error context
 */
export function withScope(callback: (scope: Sentry.Scope) => void): void {
  if (!isSentryEnabled()) return;
  Sentry.withScope(callback);
}

// Re-export Sentry for direct access when needed
export { Sentry };
