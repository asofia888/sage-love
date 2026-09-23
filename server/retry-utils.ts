/**
 * Retry Utilities with Exponential Backoff and Jitter
 */

import { APIError } from './errors';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // Base delay in ms
  maxDelay: number;       // Maximum delay in ms
  backoffFactor: number;  // Exponential backoff multiplier
  jitterFactor: number;   // Jitter randomization factor (0-1)
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,        // 1 second
  maxDelay: 10000,        // 10 seconds
  backoffFactor: 2,
  jitterFactor: 0.3,      // 30% jitter
};

/**
 * Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 *
 * Formula: min(baseDelay * (backoffFactor ^ attempt) + jitter, maxDelay)
 * Jitter: random value between -jitterFactor and +jitterFactor of the delay
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt);

  // Calculate jitter: random value between -jitterFactor and +jitterFactor
  const jitterRange = exponentialDelay * config.jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange

  const delayWithJitter = exponentialDelay + jitter;

  // Ensure delay is within bounds
  const finalDelay = Math.max(0, Math.min(delayWithJitter, config.maxDelay));

  return Math.round(finalDelay);
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    return error.isRetryable;
  }

  // Check common retryable errors
  const err = error as { message?: string; status?: number; code?: string };

  // Network errors
  if (err.message?.includes('ECONNRESET') ||
      err.message?.includes('ETIMEDOUT') ||
      err.message?.includes('ECONNREFUSED')) {
    return true;
  }

  // Timeout errors
  if (err.message?.includes('timeout') || err.message?.includes('TIMEOUT')) {
    return true;
  }

  // Service unavailable
  if (err.status === 503 || err.message?.includes('503')) {
    return true;
  }

  // Rate limiting (can retry after delay)
  if (err.status === 429 || err.message?.includes('rate limit')) {
    return true;
  }

  // Non-retryable errors
  if (err.status === 400 || err.status === 401 || err.status === 403) {
    return false;
  }

  // Default to not retryable for safety
  return false;
}

/**
 * Retry a function with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: unknown, delay: number) => void
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === retryConfig.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateBackoffDelay(attempt, retryConfig);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      console.log(
        `Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`,
        error instanceof Error ? error.message : String(error)
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
export function createTimeoutPromise(ms: number, errorMessage?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
  fn: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    fn,
    createTimeoutPromise(timeoutMs, errorMessage)
  ]);
}

/**
 * Batch retry statistics
 */
export interface RetryStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  totalRetries: number;
  averageRetries: number;
}

/**
 * Retry stats tracker
 */
export class RetryStatsTracker {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    totalRetries: 0,
    averageRetries: 0,
  };

  recordAttempt(retries: number, success: boolean): void {
    this.stats.totalAttempts++;
    this.stats.totalRetries += retries;

    if (success) {
      this.stats.successfulAttempts++;
    } else {
      this.stats.failedAttempts++;
    }

    this.stats.averageRetries = this.stats.totalRetries / this.stats.totalAttempts;
  }

  getStats(): RetryStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      totalRetries: 0,
      averageRetries: 0,
    };
  }
}
