import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Required env vars must be present before the handler module is imported.
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-api-key-12345';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-for-vitest-0123456789';

// Mock Google Generative AI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  }
}));

// Import the handler after mocking
const chatHandler = await import('../../../api/chat');

describe('Chat API Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/chat', () => {
    it('should handle successful chat request', async () => {
      const mockResponse = {
        response: {
          text: () => 'こんにちは、聖者です。'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'こんにちは',
          systemInstruction: 'あなたは聖者です。',
          conversationHistory: []
        })
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('こんにちは、聖者です。');
      // Session ID is server-generated (base64url); not user-supplied.
      expect(data.sessionId).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(data.timestamp).toBeDefined();
      // New sessions should issue a signed cookie.
      expect(response.headers.get('Set-Cookie') || '').toContain('sid=');
    });

    it('should reject non-POST requests', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'GET'
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method Not Allowed');
    });

    it('should return error when message is missing', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemInstruction: 'あなたは聖者です。'
        })
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('errorValidation');
      expect(data.details).toContain('Message is required');
    });

    it('should handle API key missing error', async () => {
      // Temporarily mock missing API key
      const originalEnv = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'テスト'
        })
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('errorValidation');
      expect(data.details).toContain('GEMINI_API_KEY');

      // Restore original env
      process.env.GEMINI_API_KEY = originalEnv;
    });

    it('should handle conversation history correctly', async () => {
      const mockResponse = {
        response: {
          text: () => '会話履歴を理解しました。'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const conversationHistory = [
        {
          sender: 'user',
          text: '前の質問',
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          sender: 'assistant',
          text: '前の回答',
          timestamp: '2023-01-01T00:01:00Z'
        }
      ];

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: '続きの質問',
          conversationHistory
        })
      });

      const response = await chatHandler.default(request);
      
      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('前の質問')
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('前の回答')
      );
    });

    it('should limit conversation history to last 10 messages', async () => {
      const mockResponse = {
        response: {
          text: () => '履歴制限テスト'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const conversationHistory = Array.from({ length: 15 }, (_, i) => ({
        sender: i % 2 === 0 ? 'user' : 'assistant',
        text: `メッセージ ${i + 1}`,
        timestamp: new Date().toISOString()
      }));

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: '新しい質問',
          conversationHistory
        })
      });

      const response = await chatHandler.default(request);
      
      expect(response.status).toBe(200);
      
      // Should include recent messages (6-15) but not older ones (1-5)
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs).toContain('メッセージ 15');
      expect(callArgs).toContain('メッセージ 6');
      expect(callArgs).not.toContain('メッセージ 5');
    });

    it('should handle Gemini API errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API key not valid'));

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'テスト'
        })
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('errorAuth');
    });

    it('should handle quota exceeded errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('quota exceeded'));

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'テスト'
        })
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('errorQuota');
    });

    it('should handle empty AI response', async () => {
      const mockResponse = {
        response: {
          text: () => ''
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'テスト'
        })
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('errorValidation');
      expect(data.details).toContain('empty response');
    });

    it('should accept system instruction on request', async () => {
      // System instruction is attached to the model via context caching —
      // it is no longer inlined into the prompt text. We only verify the
      // request is accepted and the user message reaches generateContent.
      const mockResponse = {
        response: {
          text: () => 'システム指示を理解しました。'
        }
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'テスト',
          systemInstruction: 'あなたは優しい聖者です。'
        })
      });

      const response = await chatHandler.default(request);

      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('User: テスト')
      );
    });

    it('should handle malformed JSON request', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      const response = await chatHandler.default(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('errorGeneric');
    });

    it('should set correct response headers', async () => {
      const mockResponse = {
        response: {
          text: () => 'ヘッダーテスト'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'テスト'
        })
      });

      const response = await chatHandler.default(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
    });
  });
});