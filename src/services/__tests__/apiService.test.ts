import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiService } from '@/services/apiService';
import { mockFetch } from '../../test/utils';

describe('ApiService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should expose the configured API base URL', () => {
      const sessionInfo = apiService.getSessionInfo();
      expect(sessionInfo.baseUrl).toBe('/api');
    });

    it('should not store any client-side session identifier', () => {
      // Session identity is managed exclusively by the server-issued HMAC cookie.
      expect(localStorage.getItem('sage-session-id')).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should send message with credentials so the session cookie is forwarded', async () => {
      const mockResponse = {
        message: 'テスト応答',
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'server-issued'
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
          credentials: 'same-origin',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('テストメッセージ')
        })
      );
    });

    it('should not send the legacy X-Session-ID header', async () => {
      global.fetch = mockFetch({
        message: 'ok',
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'server-issued'
      });

      await apiService.sendMessage({ message: 'テスト' });

      const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(init.headers).not.toHaveProperty('X-Session-ID');
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
      global.fetch = mockFetch({
        message: 'テスト応答',
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'server-issued'
      });

      const conversationHistory = [
        { sender: 'user' as const, text: '前の質問', timestamp: '2023-01-01T00:00:00Z' },
        { sender: 'assistant' as const, text: '前の回答', timestamp: '2023-01-01T00:00:00Z' }
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
      global.fetch = mockFetch({
        message: 'テスト応答',
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'server-issued'
      });

      await apiService.sendMessage({ message: 'テストメッセージ' });

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
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await apiService.healthCheck();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'same-origin',
        })
      );
    });

    it('should return false for unhealthy service', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      const result = await apiService.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await apiService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('getSessionInfo', () => {
    it('should return current service info without any session identifier', () => {
      const sessionInfo = apiService.getSessionInfo();

      expect(sessionInfo).toEqual({ baseUrl: '/api' });
      expect(sessionInfo).not.toHaveProperty('sessionId');
    });
  });
});
