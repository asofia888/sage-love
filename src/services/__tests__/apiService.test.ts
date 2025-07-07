import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiService } from '@/services/apiService';
import { mockFetch } from '../../test/utils';

describe('ApiService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct base URL in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const sessionInfo = apiService.getSessionInfo();
      
      expect(sessionInfo.baseUrl).toBe('https://sage-love.vercel.app/api');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should initialize with local URL in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const sessionInfo = apiService.getSessionInfo();
      
      expect(sessionInfo.baseUrl).toBe('/api');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should generate session ID if not exists', () => {
      const sessionInfo = apiService.getSessionInfo();
      
      expect(sessionInfo.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(localStorage.getItem('sage-session-id')).toBe(sessionInfo.sessionId);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        message: 'テスト応答',
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'test-session'
      };
      
      global.fetch = mockFetch(mockResponse);
      
      const result = await apiService.sendMessage({
        message: 'テストメッセージ',
        systemInstruction: 'テストシステム',
        language: 'ja'
      });
      
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Session-ID': expect.stringMatching(/^session_/)
          }),
          body: expect.stringContaining('テストメッセージ')
        })
      );
    });

    it('should handle API errors correctly', async () => {
      const mockError = {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        retryAfter: 60
      };
      
      global.fetch = mockFetch(mockError, false);
      
      await expect(apiService.sendMessage({
        message: 'テスト'
      })).rejects.toThrow('API_ERROR:RATE_LIMIT_EXCEEDED');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
      
      await expect(apiService.sendMessage({
        message: 'テスト'
      })).rejects.toThrow('API_ERROR:NETWORK_ERROR');
    });

    it('should include conversation history', async () => {
      const mockResponse = {
        message: 'テスト応答',
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'test-session'
      };
      
      global.fetch = mockFetch(mockResponse);
      
      const conversationHistory = [
        {
          sender: 'user' as const,
          text: '前の質問',
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          sender: 'assistant' as const,
          text: '前の回答',
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];
      
      await apiService.sendMessage({
        message: 'テストメッセージ',
        conversationHistory
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('前の質問')
        })
      );
    });

    it('should use default language if not specified', async () => {
      const mockResponse = {
        message: 'テスト応答',
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'test-session'
      };
      
      global.fetch = mockFetch(mockResponse);
      
      await apiService.sendMessage({
        message: 'テストメッセージ'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('"language":"ja"')
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true for healthy service', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      });
      
      const result = await apiService.healthCheck();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return false for unhealthy service', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false
      });
      
      const result = await apiService.healthCheck();
      
      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await apiService.healthCheck();
      
      expect(result).toBe(false);
    });
  });

  describe('resetSession', () => {
    it('should reset session ID', () => {
      const originalSessionId = apiService.getSessionInfo().sessionId;
      
      apiService.resetSession();
      
      const newSessionId = apiService.getSessionInfo().sessionId;
      
      expect(newSessionId).not.toBe(originalSessionId);
      expect(localStorage.getItem('sage-session-id')).toBe(newSessionId);
    });
  });

  describe('getSessionInfo', () => {
    it('should return current session information', () => {
      const sessionInfo = apiService.getSessionInfo();
      
      expect(sessionInfo).toHaveProperty('sessionId');
      expect(sessionInfo).toHaveProperty('baseUrl');
      expect(sessionInfo.sessionId).toMatch(/^session_/);
    });
  });
});