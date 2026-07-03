import { describe, it, expect, afterEach, vi } from 'vitest';
import { apiService } from '@/services/apiService';

/**
 * apiService.streamMessage の SSE パーサ/エラー/中断のユニットテスト。
 * fetch をモックし、本物の ReadableStream で SSE ワイヤーフォーマットを再現する。
 */

function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(e));
      }
      controller.close();
    },
  });
  return { ok: true, status: 200, body: stream } as unknown as Response;
}

async function collect(gen: AsyncGenerator<string, unknown, unknown>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) {
    out.push(chunk);
  }
  return out;
}

describe('apiService.streamMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should yield chunk text in order and stop at done', async () => {
    global.fetch = vi.fn().mockResolvedValue(sseResponse([
      'data: {"type":"chunk","text":"こん"}\n\n',
      'data: {"type":"chunk","text":"にちは"}\n\n',
      'data: {"type":"done","sessionId":"s1","timestamp":"2026-01-01T00:00:00Z"}\n\n',
    ]));

    const chunks = await collect(apiService.streamMessage({ message: 'hi' }));
    expect(chunks).toEqual(['こん', 'にちは']);
  });

  it('should handle events split across network packets', async () => {
    // 1イベントが複数のネットワークチャンクに分断されても正しく組み立てる
    global.fetch = vi.fn().mockResolvedValue(sseResponse([
      'data: {"type":"chunk","te',
      'xt":"AB"}\n\ndata: {"type":"chu',
      'nk","text":"CD"}\n\n',
    ]));

    const chunks = await collect(apiService.streamMessage({ message: 'hi' }));
    expect(chunks).toEqual(['AB', 'CD']);
  });

  it('should ignore malformed SSE payloads and continue', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue(sseResponse([
      'data: {broken json\n\n',
      'data: {"type":"chunk","text":"OK"}\n\n',
    ]));

    const chunks = await collect(apiService.streamMessage({ message: 'hi' }));
    expect(chunks).toEqual(['OK']);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should throw API_ERROR (with code and retryAfter) for in-stream error events', async () => {
    global.fetch = vi.fn().mockResolvedValue(sseResponse([
      'data: {"type":"chunk","text":"部分"}\n\n',
      'data: {"type":"error","code":"RATE_LIMIT_EXCEEDED","details":"Too many requests","retryAfter":60}\n\n',
    ]));

    const received: string[] = [];
    await expect(async () => {
      for await (const chunk of apiService.streamMessage({ message: 'hi' })) {
        received.push(chunk);
      }
    }).rejects.toThrow('API_ERROR:RATE_LIMIT_EXCEEDED:Too many requests:60');

    // エラー前に届いたチャンクは呼び出し側に渡っている（部分応答保持の前提）
    expect(received).toEqual(['部分']);
  });

  it('should throw API_ERROR with the server code for non-ok pre-stream responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ code: 'BURST_LIMIT_EXCEEDED', details: 'Slow down', retryAfter: 30 }),
    } as unknown as Response);

    await expect(collect(apiService.streamMessage({ message: 'hi' })))
      .rejects.toThrow('API_ERROR:BURST_LIMIT_EXCEEDED:Slow down:30');
  });

  it('should pass the abort signal to fetch and propagate AbortError unwrapped', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal).toBe(controller.signal);
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(collect(apiService.streamMessage({ message: 'hi' }, controller.signal)))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should wrap network failures into API_ERROR:NETWORK_ERROR', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(collect(apiService.streamMessage({ message: 'hi' })))
      .rejects.toThrow('API_ERROR:NETWORK_ERROR');
  });
});
