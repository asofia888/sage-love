
import { apiService, ChatRequest } from './apiService';
import { ChatMessage } from '../types';

/**
 * Secure Gemini Service - Routes requests through serverless backend
 * No longer requires client-side API keys
 */

/**
 * Secure chat function using serverless backend.
 * The system prompt is built server-side from the language — the client no
 * longer sends any instruction text.
 */
export async function sendSecureChat(
  message: string,
  history: ChatMessage[],
  language: string = 'ja'
): Promise<string> {
  try {
    const request: ChatRequest = {
      message,
      conversationHistory: history.map(msg => ({
        sender: msg.sender === 'user' ? 'user' : 'assistant',
        text: msg.text,
        timestamp: msg.timestamp
      })),
      language
    };

    const response = await apiService.sendMessage(request);
    return response.message;

  } catch (error) {
    console.error('Secure chat error:', error);
    // API_ERROR:CODE:MESSAGE:RETRY_AFTER 形式のまま投げ、
    // ErrorService.parseApiErrorFormat が表示用コードと retryAfter に解決する
    throw error;
  }
}

/**
 * Real token-by-token streaming via SSE from Gemini through the Edge function.
 */
export async function* streamChat(
    message: string,
    history: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  yield* streamChatWithTranslation(message, history, 'ja');
}

/**
 * Streaming chat with language selection. Yields chunks from the real
 * Gemini stream; errors keep the API_ERROR wire format for ErrorService.
 * signal はユーザーによる停止（停止ボタン/アンマウント）用。
 */
export async function* streamChatWithTranslation(
    message: string,
    history: ChatMessage[],
    targetLanguage: string = 'ja',
    signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const request: ChatRequest = {
    message,
    conversationHistory: history.map(msg => ({
      sender: msg.sender === 'user' ? 'user' : 'assistant',
      text: msg.text,
      timestamp: msg.timestamp,
    })),
    language: targetLanguage,
  };

  try {
    yield* apiService.streamMessage(request, signal);
  } catch (error) {
    console.error('Stream chat error:', error);
    throw error;
  }
}