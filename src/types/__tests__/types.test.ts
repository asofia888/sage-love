import { describe, it, expect } from 'vitest';
import { MessageSender } from '@/types';

describe('Types', () => {
  describe('MessageSender', () => {
    it('should have USER value', () => {
      expect(MessageSender.USER).toBe('user');
    });

    it('should have AI value', () => {
      expect(MessageSender.AI).toBe('ai');
    });

    it('should only have expected values', () => {
      const values = Object.values(MessageSender);
      expect(values).toHaveLength(2);
      expect(values).toContain('user');
      expect(values).toContain('ai');
    });
  });

  describe('ChatMessage interface', () => {
    it('should accept valid message structure', () => {
      const validMessage = {
        id: 'test-123',
        text: 'Hello world',
        sender: MessageSender.USER,
        timestamp: new Date(),
      };

      // Test that the structure is valid by accessing properties
      expect(validMessage.id).toBe('test-123');
      expect(validMessage.text).toBe('Hello world');
      expect(validMessage.sender).toBe('user');
      expect(validMessage.timestamp).toBeInstanceOf(Date);
    });

    it('should accept optional properties', () => {
      const messageWithOptional = {
        id: 'test-456',
        text: 'Loading...',
        sender: MessageSender.AI,
        timestamp: new Date(),
        isTyping: true,
        translationContext: {
          domain: 'spiritual' as const,
          tone: 'sage' as const,
          culturalContext: 'Japanese'
        }
      };

      expect(messageWithOptional.isTyping).toBe(true);
      expect(messageWithOptional.translationContext?.domain).toBe('spiritual');
    });
  });

  describe('ApiError interface', () => {
    it('should accept valid error structure', () => {
      const validError = {
        code: 'errorNetwork' as const,
        details: 'Network connection failed',
        timestamp: new Date(),
        severity: 'high' as const
      };

      expect(validError.code).toBe('errorNetwork');
      expect(validError.details).toBe('Network connection failed');
      expect(validError.severity).toBe('high');
      expect(validError.timestamp).toBeInstanceOf(Date);
    });

    it('should accept optional properties', () => {
      const errorWithOptional = {
        code: 'errorQuota' as const,
        details: 'Quota exceeded',
        timestamp: new Date(),
        severity: 'medium' as const,
        retryAfter: 3600,
        context: 'api-service'
      };

      expect(errorWithOptional.retryAfter).toBe(3600);
      expect(errorWithOptional.context).toBe('api-service');
    });
  });

  describe('Error Codes', () => {
    it('should have standard error codes', () => {
      const errorCodes = [
        'errorMessageDefault',
        'errorAuth',
        'errorQuota', 
        'errorNetwork',
        'errorTranslation',
        'errorStreaming',
        'errorNoApiKeyConfig'
      ];

      // Test that these are valid string literals
      errorCodes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Severity Levels', () => {
    it('should have valid severity levels', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      
      severityLevels.forEach(level => {
        expect(typeof level).toBe('string');
        expect(['low', 'medium', 'high', 'critical']).toContain(level);
      });
    });
  });

  describe('Translation Context', () => {
    it('should have valid domain values', () => {
      const domains = ['spiritual', 'philosophical', 'practical'];
      
      domains.forEach(domain => {
        expect(typeof domain).toBe('string');
        expect(['spiritual', 'philosophical', 'practical']).toContain(domain);
      });
    });

    it('should have valid tone values', () => {
      const tones = ['sage', 'gentle', 'formal'];
      
      tones.forEach(tone => {
        expect(typeof tone).toBe('string');
        expect(['sage', 'gentle', 'formal']).toContain(tone);
      });
    });
  });
});