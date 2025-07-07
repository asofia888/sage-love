import { describe, it, expect } from 'vitest';
import { ErrorService } from '@/services/errorService';

describe('ErrorService', () => {
  describe('normalizeError', () => {
    it('should handle standard Error objects', () => {
      const error = new Error('Test error message');
      const normalized = ErrorService.normalizeError(error);
      
      expect(normalized).toHaveProperty('code');
      expect(normalized).toHaveProperty('details');
      expect(normalized).toHaveProperty('timestamp');
      expect(normalized.details).toBe('Test error message');
    });

    it('should handle quota errors', () => {
      const quotaError = new Error('quota exceeded for this request');
      const normalized = ErrorService.normalizeError(quotaError);
      
      expect(normalized.code).toBe('errorQuota');
      expect(normalized.details).toContain('quota');
    });

    it('should handle network errors', () => {
      const networkError = new Error('Failed to fetch');
      const normalized = ErrorService.normalizeError(networkError);
      
      expect(normalized.code).toBe('errorNetwork');
      expect(normalized.details).toContain('fetch');
    });

    it('should handle authentication errors', () => {
      const authError = new Error('API key not valid');
      const normalized = ErrorService.normalizeError(authError);
      
      expect(normalized.code).toBe('errorAuth');
      expect(normalized.details).toContain('API key');
    });

    it('should handle string errors', () => {
      const stringError = 'Something went wrong';
      const normalized = ErrorService.normalizeError(stringError);
      
      expect(normalized.code).toBe('errorMessageDefault');
      expect(normalized.details).toBe('Something went wrong');
    });

    it('should handle null/undefined errors', () => {
      const nullError = null;
      const normalized = ErrorService.normalizeError(nullError);
      
      expect(normalized.code).toBe('errorMessageDefault');
      expect(normalized.details).toBe('null');
    });

    it('should handle API key configuration errors', () => {
      const configError = new Error('API key is not configured');
      const normalized = ErrorService.normalizeError(configError);
      
      expect(normalized.code).toBe('errorNoApiKeyConfig');
      expect(normalized.details).toContain('configured');
    });
  });

  describe('logError', () => {
    it('should log error without throwing', () => {
      const error = {
        code: 'errorTest' as any,
        details: 'Test error',
        timestamp: new Date(),
        severity: 'medium' as const
      };
      
      // Should not throw
      expect(() => {
        ErrorService.logError(error, 'test-component');
      }).not.toThrow();
    });

    it('should handle errors without context', () => {
      const error = {
        code: 'errorTest' as any,
        details: 'Test error without context',
        timestamp: new Date(),
        severity: 'low' as const
      };
      
      expect(() => {
        ErrorService.logError(error);
      }).not.toThrow();
    });
  });

  describe('getErrorSeverity', () => {
    it('should assign appropriate severity levels', () => {
      const authError = { code: 'errorAuth' } as any;
      const severity = ErrorService.getErrorSeverity(authError);
      
      expect(['low', 'medium', 'high', 'critical']).toContain(severity);
    });

    it('should handle unknown error codes', () => {
      const unknownError = { code: 'errorUnknown' } as any;
      const severity = ErrorService.getErrorSeverity(unknownError);
      
      expect(['low', 'medium', 'high', 'critical']).toContain(severity);
    });
  });
});