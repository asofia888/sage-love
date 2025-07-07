import { describe, it, expect } from 'vitest';
import { ErrorService } from '@/services/errorService';

describe('ErrorService', () => {
  describe('normalizeError', () => {
    it('should handle standard Error objects', () => {
      const error = new Error('Test error message');
      const normalized = ErrorService.normalizeError(error);
      
      expect(normalized.code).toBe('errorMessageDefault');
      expect(normalized.details).toBe('Test error message');
      expect(normalized.timestamp).toBeDefined();
    });

    it('should handle quota errors', () => {
      const apiError = new Error('quota exceeded for this request');
      const normalized = ErrorService.normalizeError(apiError);
      
      expect(normalized.code).toBe('errorQuota');
      expect(normalized.details).toContain('quota');
    });

    it('should handle network errors', () => {
      const networkError = new Error('Failed to fetch');
      const normalized = ErrorService.normalizeError(networkError);
      
      expect(normalized.code).toBe('ERR_NETWORK');
      expect(normalized.message).toContain('ネットワーク');
    });

    it('should handle string errors', () => {
      const stringError = 'Something went wrong';
      const normalized = ErrorService.normalizeError(stringError);
      
      expect(normalized.code).toBe('ERR_GENERIC');
      expect(normalized.message).toBe('Something went wrong');
    });

    it('should handle undefined/null errors', () => {
      const nullError = null;
      const normalized = ErrorService.normalizeError(nullError);
      
      expect(normalized.code).toBe('ERR_GENERIC');
      expect(normalized.message).toBe('Unknown error occurred');
    });

    it('should handle quota errors', () => {
      const quotaError = new Error('Quota exceeded for this request');
      const normalized = ErrorService.normalizeError(quotaError);
      
      expect(normalized.code).toBe('ERR_QUOTA');
      expect(normalized.message).toContain('制限');
    });

    it('should handle authentication errors', () => {
      const authError = new Error('API key not valid');
      const normalized = ErrorService.normalizeError(authError);
      
      expect(normalized.code).toBe('ERR_AUTH');
      expect(normalized.message).toContain('認証');
    });
  });

  describe('logError', () => {
    it('should log error without throwing', () => {
      const error = {
        code: 'ERR_TEST',
        message: 'Test error',
        timestamp: new Date(),
      };
      
      // Should not throw
      expect(() => {
        ErrorService.logError(error, 'test-component');
      }).not.toThrow();
    });

    it('should handle errors with context', () => {
      const error = {
        code: 'ERR_CONTEXT_TEST',
        message: 'Context test error',
        timestamp: new Date(),
      };
      
      expect(() => {
        ErrorService.logError(error, 'context-test', { userId: '123', action: 'test' });
      }).not.toThrow();
    });
  });

  describe('getErrorMessage', () => {
    it('should return localized error messages', () => {
      const message = ErrorService.getErrorMessage('ERR_NETWORK', 'ja');
      expect(message).toContain('ネットワーク');
    });

    it('should return English messages', () => {
      const message = ErrorService.getErrorMessage('ERR_NETWORK', 'en');
      expect(message).toContain('network');
    });

    it('should fallback to default message for unknown codes', () => {
      const message = ErrorService.getErrorMessage('ERR_UNKNOWN_CODE', 'ja');
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle undefined language', () => {
      const message = ErrorService.getErrorMessage('ERR_GENERIC');
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(ErrorService.isRetryableError('ERR_NETWORK')).toBe(true);
      expect(ErrorService.isRetryableError('ERR_TIMEOUT')).toBe(true);
      expect(ErrorService.isRetryableError('ERR_RATE_LIMIT')).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(ErrorService.isRetryableError('ERR_AUTH')).toBe(false);
      expect(ErrorService.isRetryableError('ERR_CONTENT_SAFETY')).toBe(false);
      expect(ErrorService.isRetryableError('ERR_INVALID_INPUT')).toBe(false);
    });

    it('should handle unknown error codes', () => {
      expect(ErrorService.isRetryableError('ERR_UNKNOWN')).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return appropriate retry delays', () => {
      expect(ErrorService.getRetryDelay('ERR_RATE_LIMIT', 1)).toBeGreaterThan(0);
      expect(ErrorService.getRetryDelay('ERR_NETWORK', 1)).toBeGreaterThan(0);
      expect(ErrorService.getRetryDelay('ERR_TIMEOUT', 1)).toBeGreaterThan(0);
    });

    it('should increase delay with retry count', () => {
      const delay1 = ErrorService.getRetryDelay('ERR_NETWORK', 1);
      const delay2 = ErrorService.getRetryDelay('ERR_NETWORK', 2);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should return 0 for non-retryable errors', () => {
      expect(ErrorService.getRetryDelay('ERR_AUTH', 1)).toBe(0);
      expect(ErrorService.getRetryDelay('ERR_CONTENT_SAFETY', 1)).toBe(0);
    });

    it('should cap maximum delay', () => {
      const delay = ErrorService.getRetryDelay('ERR_NETWORK', 10);
      expect(delay).toBeLessThanOrEqual(30000); // 30 seconds max
    });
  });
});