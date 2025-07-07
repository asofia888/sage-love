import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatHistory } from '@/hooks/useChatHistory';
import { createMockMessage } from '../../test/utils';

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

  it('should add new message', () => {
    const { result } = renderHook(() => useChatHistory(true));
    
    const newMessage = createMockMessage({
      text: 'テストメッセージ',
      sender: 'user'
    });
    
    act(() => {
      const [, setMessages] = result.current;
      setMessages([newMessage]);
    });
    
    const [messages] = result.current;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(newMessage);
  });

  it('should clear all messages', () => {
    const { result } = renderHook(() => useChatHistory(true));
    
    const message1 = createMockMessage({ text: 'メッセージ1' });
    const message2 = createMockMessage({ text: 'メッセージ2' });
    
    act(() => {
      const [, setMessages] = result.current;
      setMessages([message1, message2]);
    });
    
    // Verify messages are added
    expect(result.current[0]).toHaveLength(2);
    
    act(() => {
      const [, , clearChat] = result.current;
      clearChat();
    });
    
    const [messages] = result.current;
    expect(messages).toEqual([]);
  });

  it('should persist messages to localStorage', () => {
    const { result } = renderHook(() => useChatHistory(true));
    
    const newMessage = createMockMessage({
      text: '永続化テスト',
      sender: 'user'
    });
    
    act(() => {
      const [, setMessages] = result.current;
      setMessages([newMessage]);
    });
    
    // Check if localStorage is called with the correct data
    const storedData = localStorage.getItem('sage-chat-history');
    expect(storedData).toBeTruthy();
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].text).toBe('永続化テスト');
    }
  });

  it('should load messages from localStorage on initialization', () => {
    const existingMessages = [
      createMockMessage({ text: '既存メッセージ1' }),
      createMockMessage({ text: '既存メッセージ2' })
    ];
    
    // Pre-populate localStorage
    localStorage.setItem('sage-chat-history', JSON.stringify(existingMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }))));
    
    const { result } = renderHook(() => useChatHistory(true));
    
    const [messages] = result.current;
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe('既存メッセージ1');
    expect(messages[1].text).toBe('既存メッセージ2');
  });

  it('should not load from localStorage when i18n is not initialized', () => {
    const existingMessages = [
      createMockMessage({ text: '既存メッセージ' })
    ];
    
    localStorage.setItem('sage-chat-history', JSON.stringify(existingMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }))));
    
    const { result } = renderHook(() => useChatHistory(false));
    
    const [messages] = result.current;
    expect(messages).toEqual([]);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('sage-chat-history', 'invalid json data');
    
    const { result } = renderHook(() => useChatHistory(true));
    
    const [messages] = result.current;
    expect(messages).toEqual([]);
  });

  it('should maintain message order', () => {
    const { result } = renderHook(() => useChatHistory(true));
    
    const message1 = createMockMessage({ 
      text: '最初のメッセージ',
      timestamp: new Date('2023-01-01T00:00:00Z')
    });
    const message2 = createMockMessage({ 
      text: '2番目のメッセージ',
      timestamp: new Date('2023-01-01T00:01:00Z')
    });
    const message3 = createMockMessage({ 
      text: '3番目のメッセージ',
      timestamp: new Date('2023-01-01T00:02:00Z')
    });
    
    act(() => {
      const [, setMessages] = result.current;
      setMessages([message1, message2, message3]);
    });
    
    const [messages] = result.current;
    expect(messages[0].text).toBe('最初のメッセージ');
    expect(messages[1].text).toBe('2番目のメッセージ');
    expect(messages[2].text).toBe('3番目のメッセージ');
  });

  it('should handle timestamp parsing correctly', () => {
    const messageWithStringTimestamp = {
      id: 'test-1',
      text: 'タイムスタンプテスト',
      sender: 'user' as const,
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    localStorage.setItem('sage-chat-history', JSON.stringify([messageWithStringTimestamp]));
    
    const { result } = renderHook(() => useChatHistory(true));
    
    const [messages] = result.current;
    expect(messages).toHaveLength(1);
    expect(messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('should update messages correctly when adding multiple messages', () => {
    const { result } = renderHook(() => useChatHistory(true));
    
    const userMessage = createMockMessage({
      text: 'ユーザーメッセージ',
      sender: 'user'
    });
    
    const aiMessage = createMockMessage({
      text: 'AI応答',
      sender: 'ai'
    });
    
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
    expect(messages[0].sender).toBe('user');
    expect(messages[1].sender).toBe('ai');
  });

  it('should clear localStorage when clearChat is called', () => {
    const { result } = renderHook(() => useChatHistory(true));
    
    const newMessage = createMockMessage({ text: 'テスト' });
    
    act(() => {
      const [, setMessages] = result.current;
      setMessages([newMessage]);
    });
    
    // Verify localStorage has data
    expect(localStorage.getItem('sage-chat-history')).toBeTruthy();
    
    act(() => {
      const [, , clearChat] = result.current;
      clearChat();
    });
    
    // Verify localStorage is cleared
    expect(localStorage.getItem('sage-chat-history')).toBe('[]');
  });
});