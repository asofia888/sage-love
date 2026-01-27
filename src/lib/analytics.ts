/**
 * Analytics abstraction layer for Google Analytics (gtag)
 * Provides consistent interface for tracking events
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const analytics = {
  /**
   * Track a custom event
   * @param name - Event name
   * @param params - Optional event parameters
   */
  trackEvent(name: string, params?: Record<string, unknown>): void {
    if (window.gtag) {
      window.gtag('event', name, params);
    }
  },

  /**
   * Track a performance metric
   * @param name - Metric name
   * @param value - Metric value (typically in milliseconds)
   * @param category - Event category (defaults to 'performance')
   */
  trackPerformance(name: string, value: number, category = 'performance'): void {
    if (window.gtag) {
      window.gtag('event', name, {
        event_category: category,
        value: Math.round(value),
      });
    }
  },

  /**
   * Track an error event
   * @param error - Error object or message
   * @param context - Optional context describing where the error occurred
   * @param category - Event category (defaults to 'performance')
   */
  trackError(error: Error | string, context?: string, category = 'performance'): void {
    if (window.gtag) {
      const errorMessage = error instanceof Error ? error.message : error;
      window.gtag('event', context ? `${context}_error` : 'error', {
        event_category: category,
        error_message: errorMessage,
      });
    }
  },
};
