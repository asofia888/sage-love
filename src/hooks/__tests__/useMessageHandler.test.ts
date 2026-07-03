import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '../../test/utils'; // i18n をテスト用に初期化する（副作用 import）
import { useMessageHandler } from '@/hooks/useMessageHandler';
import { ChatMessage, MessageSender } from '../../types';
import * as geminiService from '../../services/geminiService';

vi.mock('../../services/geminiService', () => ({
  streamChatWithTranslation: vi.fn(),
}));

const mockedStream = vi.mocked(geminiService.streamChatWithTranslation);

/**
 * setMessages の関数型 updater を実際に適用して現在のメッセージ配列を追跡する。
 */
function setup(initial: ChatMessage[] = []) {
  let current: ChatMessage[] = initial;
  const setMessages = vi.fn(
    (updater: React.SetStateAction<ChatMessage[]>) => {
      current = typeof updater === 'function' ? updater(current) : updater;
    }
  ) as unknown as React.Dispatch<React.SetStateAction<ChatMessage[]>>;

  const hook = renderHook(() =>
    useMessageHandler({ messages: initial, setMessages })
  );

  return { hook, getMessages: () => current };
}

const aiMessageOf = (messages: ChatMessage[]) =>
  messages.find(m => m.sender === MessageSender.AI);

describe('useMessageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should accumulate streamed chunks into the AI message and clear isTyping', async () => {
    mockedStream.mockImplementation(async function* () {
      yield 'こんにちは、';
      yield '旅人よ。';
    });

    const { hook, getMessages } = setup();

    await act(async () => {
      await hook.result.current.handleSendMessage('こんにちは');
    });

    const messages = getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe(MessageSender.USER);
    expect(messages[0].text).toBe('こんにちは');

    const ai = aiMessageOf(messages);
    expect(ai?.text).toBe('こんにちは、旅人よ。');
    expect(ai?.isTyping).toBe(false);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.isLoading).toBe(false);
  });

  it('should keep the partial response and set a mapped error when the stream fails midway', async () => {
    mockedStream.mockImplementation(async function* () {
      yield '道の途中で';
      throw new Error('API_ERROR:RATE_LIMIT_EXCEEDED:Too many requests:60');
    });

    const { hook, getMessages } = setup();

    await act(async () => {
      await hook.result.current.handleSendMessage('質問');
    });

    // 部分応答はメッセージとして残る
    const ai = aiMessageOf(getMessages());
    expect(ai?.text).toBe('道の途中で');
    expect(ai?.isTyping).toBe(false);

    // エラーコードは表示用コードにマッピングされ retryAfter も保持される
    expect(hook.result.current.error?.code).toBe('errorRateLimit');
    expect(hook.result.current.error?.retryAfter).toBe(60);
  });

  it('should remove the placeholder when the stream fails before any text arrives', async () => {
    // ストリーム開始前に即座に失敗するケース（同期throw）
    mockedStream.mockImplementation(() => {
      throw new Error('API_ERROR:NETWORK_ERROR:Network connection failed:0');
    });

    const { hook, getMessages } = setup();

    await act(async () => {
      await hook.result.current.handleSendMessage('質問');
    });

    const messages = getMessages();
    // ユーザーメッセージのみ残り、空のAIプレースホルダーは消える
    expect(messages).toHaveLength(1);
    expect(messages[0].sender).toBe(MessageSender.USER);
    expect(hook.result.current.error?.code).toBe('errorNetwork');
  });

  it('should stop the stream via stopStreaming without showing an error (partial kept)', async () => {
    mockedStream.mockImplementation(async function* (
      _message: string,
      _history: ChatMessage[],
      _lang?: string,
      signal?: AbortSignal
    ) {
      yield '部分応答';
      await new Promise<never>((_, reject) => {
        const abort = () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal?.aborted) return abort();
        signal?.addEventListener('abort', abort);
      });
    });

    const { hook, getMessages } = setup();

    let sendPromise: Promise<void> = Promise.resolve();
    act(() => {
      sendPromise = hook.result.current.handleSendMessage('質問');
    });

    await act(async () => {
      hook.result.current.stopStreaming();
      await sendPromise;
    });

    // エラーバナーは出さない
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.isLoading).toBe(false);

    // 途中まで届いたテキストは保持され、typing は解除される
    const ai = aiMessageOf(getMessages());
    expect(ai?.text).toBe('部分応答');
    expect(ai?.isTyping).toBe(false);
  });

  it('should remove the placeholder when stopped before any text arrives', async () => {
    mockedStream.mockImplementation(async function* (
      _message: string,
      _history: ChatMessage[],
      _lang?: string,
      signal?: AbortSignal
    ) {
      await new Promise<never>((_, reject) => {
        const abort = () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal?.aborted) return abort();
        signal?.addEventListener('abort', abort);
      });
      yield '';
    });

    const { hook, getMessages } = setup();

    let sendPromise: Promise<void> = Promise.resolve();
    act(() => {
      sendPromise = hook.result.current.handleSendMessage('質問');
    });

    await act(async () => {
      hook.result.current.stopStreaming();
      await sendPromise;
    });

    expect(hook.result.current.error).toBeNull();
    const messages = getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].sender).toBe(MessageSender.USER);
  });

  it('should pass the abort signal through to the streaming service', async () => {
    mockedStream.mockImplementation(async function* () {
      yield 'ok';
    });

    const { hook } = setup();

    await act(async () => {
      await hook.result.current.handleSendMessage('質問');
    });

    expect(mockedStream).toHaveBeenCalledTimes(1);
    const signal = mockedStream.mock.calls[0][3];
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
