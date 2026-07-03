import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateBackoffDelay,
  isRetryableError,
  retryWithBackoff,
  withTimeout,
  RetryStatsTracker,
  DEFAULT_RETRY_CONFIG,
} from '@/api/retry-utils';
import { RateLimitError, AuthenticationError } from '@/api/errors';

describe('retry-utils', () => {
  describe('calculateBackoffDelay', () => {
    it('grows exponentially within jitter bounds and never exceeds maxDelay', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0.3 };

      for (let attempt = 0; attempt < 3; attempt++) {
        const expected = config.baseDelay * Math.pow(config.backoffFactor, attempt);
        const delay = calculateBackoffDelay(attempt, config);
        expect(delay).toBeGreaterThanOrEqual(Math.floor(expected * 0.7));
        expect(delay).toBeLessThanOrEqual(Math.ceil(expected * 1.3));
      }

      // 大きなattemptでもmaxDelayでキャップされる（ジッタ込みでも超えない）
      expect(calculateBackoffDelay(20, config)).toBeLessThanOrEqual(config.maxDelay);
    });
  });

  describe('isRetryableError', () => {
    it('respects APIError.isRetryable', () => {
      expect(isRetryableError(new RateLimitError('slow down'))).toBe(true);
      expect(isRetryableError(new AuthenticationError('bad key'))).toBe(false);
    });

    it('classifies common transport errors', () => {
      expect(isRetryableError(new Error('socket hang up ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 401 })).toBe(false);
      // 不明なエラーは安全側（リトライしない）
      expect(isRetryableError(new Error('something else'))).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const config = { maxRetries: 2, baseDelay: 10, maxDelay: 100, backoffFactor: 2, jitterFactor: 0 };

    it('retries retryable failures and returns the first success', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('ok');
      const onRetry = vi.fn();

      const promise = retryWithBackoff(fn, config, onRetry);
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
      // onRetry(attempt, error, delay)
      expect(onRetry.mock.calls[0][0]).toBe(1);
      expect(onRetry.mock.calls[1][0]).toBe(2);
    });

    it('throws immediately for non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new AuthenticationError('bad key'));

      const promise = retryWithBackoff(fn, config);
      const assertion = expect(promise).rejects.toThrow('bad key');
      await vi.runAllTimersAsync();
      await assertion;

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('gives up after maxRetries and rethrows the last error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('timeout'));

      const promise = retryWithBackoff(fn, config);
      const assertion = expect(promise).rejects.toThrow('timeout');
      await vi.runAllTimersAsync();
      await assertion;

      // 初回 + maxRetries回
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('resolves when the wrapped promise settles first', async () => {
      const promise = withTimeout(Promise.resolve('fast'), 1000);
      await expect(promise).resolves.toBe('fast');
    });

    it('rejects with the custom message when the timeout fires first', async () => {
      const never = new Promise<string>(() => {});
      const promise = withTimeout(never, 500, 'AIサービスの応答がありません');
      const assertion = expect(promise).rejects.toThrow('AIサービスの応答がありません');
      await vi.advanceTimersByTimeAsync(500);
      await assertion;
    });
  });

  describe('RetryStatsTracker', () => {
    it('aggregates attempts and computes the average retry count', () => {
      const tracker = new RetryStatsTracker();
      tracker.recordAttempt(0, true);
      tracker.recordAttempt(2, true);
      tracker.recordAttempt(4, false);

      expect(tracker.getStats()).toEqual({
        totalAttempts: 3,
        successfulAttempts: 2,
        failedAttempts: 1,
        totalRetries: 6,
        averageRetries: 2,
      });

      tracker.reset();
      expect(tracker.getStats().totalAttempts).toBe(0);
    });
  });
});
