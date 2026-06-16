
import { apiService, ChatRequest } from './apiService';
import { ChatMessage } from '../types';

/**
 * Secure Gemini Service - Routes requests through serverless backend
 * No longer requires client-side API keys
 */

/**
 * 翻訳サービスを初期化（レガシー互換性のため、現在は不要）
 * @deprecated API key is now handled server-side
 */
export function initializeTranslationService(_apiKey: string) {
  // No longer needed - API key is handled server-side
  console.log('Translation service initialization is now handled server-side');
}

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
        timestamp: msg.timestamp.toISOString()
      })),
      language
    };

    const response = await apiService.sendMessage(request);
    return response.message;

  } catch (error) {
    console.error('Secure chat error:', error);
    throw translateApiError(error);
  }
}

/**
 * Map API_ERROR:* wire format into the ERR_* codes the UI already handles,
 * so streaming and non-streaming paths share error-handling downstream.
 */
function translateApiError(error: unknown): Error {
  if (error instanceof Error && error.message.startsWith('API_ERROR:')) {
    const [, errorCode] = error.message.split(':');
    switch (errorCode) {
      // Content-limit errors carry actionable guidance (shorten the message /
      // clear the conversation). Keep the original API_ERROR so the UI can show
      // the specific MESSAGE_TOO_LONG / HISTORY_TOO_LONG text instead of the
      // generic rate-limit message (ErrorService.parseApiErrorFormat reads the code).
      case 'MESSAGE_TOO_LONG':
      case 'HISTORY_TOO_LONG':
        return error;
      case 'RATE_LIMIT_EXCEEDED':
      case 'IP_RATE_LIMIT':
      case 'SESSION_HOURLY_LIMIT':
      case 'SESSION_DAILY_LIMIT':
      case 'BURST_LIMIT_EXCEEDED':
        return new Error('ERR_RATE_LIMIT');
      case 'SESSION_LIMIT_EXCEEDED':
        return new Error('ERR_SESSION_LIMIT');
      case 'QUOTA_EXCEEDED':
      case 'errorQuota':
        return new Error('ERR_QUOTA');
      case 'CONTENT_SAFETY':
        return new Error('ERR_CONTENT_SAFETY');
      case 'NETWORK_ERROR':
        return new Error('ERR_NETWORK');
      default:
        return new Error('ERR_GENERIC');
    }
  }
  return new Error('ERR_GENERIC');
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
 * Gemini stream; errors are normalized to ERR_* codes.
 */
export async function* streamChatWithTranslation(
    message: string,
    history: ChatMessage[],
    targetLanguage: string = 'ja'
): AsyncGenerator<string, void, unknown> {
  const request: ChatRequest = {
    message,
    conversationHistory: history.map(msg => ({
      sender: msg.sender === 'user' ? 'user' : 'assistant',
      text: msg.text,
      timestamp: msg.timestamp.toISOString(),
    })),
    language: targetLanguage,
  };

  try {
    yield* apiService.streamMessage(request);
  } catch (error) {
    console.error('Stream chat error:', error);
    throw translateApiError(error);
  }
}