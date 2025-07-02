

import { chatService } from './chatService';

/**
 * 翻訳サービスを初期化（後方互換性のため）
 */
export function initializeTranslationService(apiKey: string) {
  chatService.initializeTranslation(apiKey);
}

/**
 * 基本的なチャットストリーミング（後方互換性のため）
 */
export async function* streamChat(
    message: string, 
    history: any[],
    systemInstruction: string
): AsyncGenerator<string, void, unknown> {
  const stream = chatService.streamChat(message, history, systemInstruction);
  for await (const chunk of stream) {
    yield chunk;
  }
}

/**
 * 翻訳機能付きストリーミングチャット（後方互換性のため）
 */
export async function* streamChatWithTranslation(
    message: string,
    history: any[],
    systemInstruction: string,
    targetLanguage: string = 'ja'
): AsyncGenerator<string, void, unknown> {
  const stream = chatService.streamChatWithTranslation(
    message, 
    history, 
    systemInstruction, 
    targetLanguage
  );
  for await (const chunk of stream) {
    yield chunk;
  }
}