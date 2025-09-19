
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
 * Secure chat function using serverless backend
 */
export async function sendSecureChat(
  message: string,
  history: ChatMessage[],
  systemInstruction: string,
  language: string = 'ja'
): Promise<string> {
  try {
    const request: ChatRequest = {
      message,
      systemInstruction,
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
    
    if (error instanceof Error && error.message.startsWith('API_ERROR:')) {
      const [, errorCode] = error.message.split(':');
      
      // Handle specific error types
      switch (errorCode) {
        case 'RATE_LIMIT_EXCEEDED':
          throw new Error('ERR_RATE_LIMIT');
        case 'SESSION_LIMIT_EXCEEDED':
          throw new Error('ERR_SESSION_LIMIT');
        case 'QUOTA_EXCEEDED':
          throw new Error('ERR_QUOTA');
        case 'CONTENT_SAFETY':
          throw new Error('ERR_CONTENT_SAFETY');
        case 'NETWORK_ERROR':
          throw new Error('ERR_NETWORK');
        default:
          throw new Error('ERR_GENERIC');
      }
    }
    
    throw new Error('ERR_GENERIC');
  }
}

/**
 * Legacy streaming chat function - now uses secure backend
 * Returns message in chunks for compatibility
 */
export async function* streamChat(
    message: string,
    history: any[],
    systemInstruction: string
): AsyncGenerator<string, void, unknown> {
  try {
    const fullResponse = await sendSecureChat(message, history, systemInstruction);

    // Use StreamingService for consistent streaming behavior
    const { StreamingService } = await import('./streamingService');
    yield* StreamingService.simulateStreaming(fullResponse, 50);

  } catch (error) {
    console.error('Stream chat error:', error);
    throw error;
  }
}

/**
 * Legacy streaming chat with translation - now uses secure backend
 */
export async function* streamChatWithTranslation(
    message: string,
    history: any[],
    systemInstruction: string,
    targetLanguage: string = 'ja'
): AsyncGenerator<string, void, unknown> {
  try {
    const fullResponse = await sendSecureChat(message, history, systemInstruction, targetLanguage);

    // Use StreamingService for consistent streaming behavior
    const { StreamingService } = await import('./streamingService');
    yield* StreamingService.simulateStreaming(fullResponse, 50);

  } catch (error) {
    console.error('Stream chat with translation error:', error);
    throw error;
  }
}