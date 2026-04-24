import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatHistory } from '@/hooks/useChatHistory';
import { createMockMessage } from '../../test/utils';
import { MessageSender } from '../../types';

const STORAGE_KEY = 'chatHistory';

describe('useChatHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChatHistory(true));
    const [messages] = result.current;
    expect(messages).toEqual([]);
  });

  it('should add a new message', () => {
    const { result } = renderHook(() => useChatHistory(true));
    const newMessage = createMockMessage({
      text: 'テストメッセージ',
      sender: MessageSender.USER,
    });

    act(() => {
      const [, setMessages] = result.current;
      setMessages([newMessage]);
    });

    const [messages] = result.current;
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe('テストメッセージ');
  });

  it('should clear all messages via clearChat', () => {
    const { result } = renderHook(() => useChatHistory(true));
    const msg1 = createMockMessage({ text: 'メッセージ1' });
    const msg2 = createMockMessage({ text: 'メッセージ2' });

    act(() => {
      const [, setMessages] = result.current;
      setMessages([msg1, msg2]);
    });

    expect(result.current[0]).toHaveLength(2);

    act(() => {
      const [, , clearChat] = result.current;
      clearChat();
    });

    expect(result.current[0]).toEqual([]);
  });

  it('should persist messages to localStorage', async () => {
    const { result } = renderHook(() => useChatHistory(true));
    const newMessage = createMockMessage({
      text: '永続化テスト',
      sender: MessageSender.USER,
    });

    act(() => {
      const [, setMessages] = result.current;
      setMessages([newMessage]);
    });

    await waitFor(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
    });

    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].text).toBe('永続化テスト');
  });

  it('should load messages from localStorage on initialization', () => {
    const existingMessages = [
      { id: '1', text: '既存メッセージ1', sender: MessageSender.USER, timestamp: '2023-01-01T00:00:00Z' },
      { id: '2', text: '既存メッセージ2', sender: MessageSender.AI, timestamp: '2023-01-01T00:01:00Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingMessages));

    const { result } = renderHook(() => useChatHistory(true));
    const [messages] = result.current;
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe('既存メッセージ1');
    expect(messages[1].text).toBe('既存メッセージ2');
  });

  it('should not load from localStorage when i18n is not initialized', () => {
    const existingMessages = [
      { id: '1', text: '既存メッセージ', sender: MessageSender.USER, timestamp: '2023-01-01T00:00:00Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingMessages));

    const { result } = renderHook(() => useChatHistory(false));
    const [messages] = result.current;
    expect(messages).toEqual([]);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json data');
    const { result } = renderHook(() => useChatHistory(true));
    const [messages] = result.current;
    expect(messages).toEqual([]);
  });

  it('should maintain message order', () => {
    const { result } = renderHook(() => useChatHistory(true));
    const message1 = createMockMessage({ id: 'm1', text: '最初のメッセージ' });
    const message2 = createMockMessage({ id: 'm2', text: '2番目のメッセージ' });
    const message3 = createMockMessage({ id: 'm3', text: '3番目のメッセージ' });

    act(() => {
      const [, setMessages] = result.current;
      setMessages([message1, message2, message3]);
    });

    const [messages] = result.current;
    expect(messages[0].text).toBe('最初のメッセージ');
    expect(messages[1].text).toBe('2番目のメッセージ');
    expect(messages[2].text).toBe('3番目のメッセージ');
  });

  it('should parse string timestamps into Date objects when loading', () => {
    const messageWithStringTimestamp = {
      id: 'test-1',
      text: 'タイムスタンプテスト',
      sender: MessageSender.USER,
      timestamp: '2023-01-01T00:00:00Z',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([messageWithStringTimestamp]));

    const { result } = renderHook(() => useChatHistory(true));
    const [messages] = result.current;
    expect(messages).toHaveLength(1);
    expect(messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('should accumulate messages across multiple setMessages calls', () => {
    const { result } = renderHook(() => useChatHistory(true));
    const userMessage = createMockMessage({ id: 'u1', text: 'ユーザー', sender: MessageSender.USER });
    const aiMessage = createMockMessage({ id: 'a1', text: 'AI', sender: MessageSender.AI });

    act(() => {
      const [, setMessages] = result.current;
      setMessages(prev => [...prev, userMessage]);
    });
    act(() => {
      const [, setMessages] = result.current;
      setMessages(prev => [...prev, aiMessage]);
    });

    const [messages] = result.current;
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe(MessageSender.USER);
    expect(messages[1].sender).toBe(MessageSender.AI);
  });
});
