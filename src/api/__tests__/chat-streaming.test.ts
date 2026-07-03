import { describe, it, expect, beforeEach, vi } from 'vitest';

// Required env vars must be present before the handler module is imported.
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-api-key-12345';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-for-vitest-0123456789';

// Mock Google Generative AI (streaming path)
const mockGenerateContentStream = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: vi.fn(),
  generateContentStream: mockGenerateContentStream,
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  },
}));

const chatHandler = await import('../../../api/chat');
const { geminiCircuitBreaker } = await import('../../../api/circuit-breaker');

function streamRequest(message = 'こんにちは'): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      language: 'ja',
      conversationHistory: [],
      stream: true,
    }),
  });
}

/** SSEレスポンス本文を data: JSON のイベント配列にパースする */
async function readSseEvents(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text();
  return text
    .split('\n\n')
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => JSON.parse(block.replace(/^data: /, '')));
}

async function* chunksOf(...texts: Array<string | (() => string)>) {
  for (const t of texts) {
    yield { text: typeof t === 'function' ? t : () => t };
  }
}

describe('Chat API streaming (SSE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 共有シングルトンのブレーカーを毎テスト初期化（失敗テストの影響を残さない）
    geminiCircuitBreaker.reset();
  });

  it('streams chunks in order and terminates with a done event', async () => {
    mockGenerateContentStream.mockResolvedValue({ stream: chunksOf('こん', 'にちは、', '旅人よ。') });

    const response = await chatHandler.default(streamRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(response.headers.get('Cache-Control')).toContain('no-cache');
    // 新規セッションのCookieはSSEレスポンスにも付く
    expect(response.headers.get('Set-Cookie') || '').toContain('sid=');

    const events = await readSseEvents(response);
    expect(events.map(e => e.type)).toEqual(['chunk', 'chunk', 'chunk', 'done']);
    expect(events.slice(0, 3).map(e => e.text)).toEqual(['こん', 'にちは、', '旅人よ。']);

    const done = events[3];
    expect(done.sessionId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(done.timestamp).toBeDefined();
    // 削除済みのcacheフィールドが復活していないこと
    expect(done).not.toHaveProperty('cache');
  });

  it('skips chunks whose text() throws and keeps the stream alive', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGenerateContentStream.mockResolvedValue({
      stream: chunksOf('前半', () => {
        throw new Error('malformed chunk');
      }, '後半'),
    });

    const response = await chatHandler.default(streamRequest());
    const events = await readSseEvents(response);

    expect(events.map(e => e.type)).toEqual(['chunk', 'chunk', 'done']);
    expect(events.slice(0, 2).map(e => e.text)).toEqual(['前半', '後半']);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('emits an error event when the stream yields no text at all', async () => {
    mockGenerateContentStream.mockResolvedValue({ stream: chunksOf() });

    const response = await chatHandler.default(streamRequest());
    const events = await readSseEvents(response);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    expect(events[0].code).toBe('errorGeneric');
  });

  it('emits an error event (not a broken stream) when stream initialization fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateContentStream.mockRejectedValue(new Error('upstream exploded'));

    const response = await chatHandler.default(streamRequest());

    // ヘッダはすでに200で返っているため、エラーはSSEイベントとして通知される
    expect(response.status).toBe(200);
    const events = await readSseEvents(response);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    expect(events[0].code).toBeDefined();
    expect(events[0].details).toBeDefined();
    errorSpy.mockRestore();
  });

  it('rejects oversized history entries before opening a stream', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        language: 'ja',
        stream: true,
        conversationHistory: [
          { sender: 'assistant', text: 'あ'.repeat(8001), timestamp: '2026-01-01T00:00:00Z' },
        ],
      }),
    });

    const response = await chatHandler.default(request);
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.code).toBe('HISTORY_MESSAGE_TOO_LONG');
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });
});
