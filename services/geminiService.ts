

import { type ChatMessage, type ApiError } from '../types';
import { EnhancedTranslationService, TranslationContext } from './translationService';

// 翻訳サービスのインスタンス（グローバル）
let translationService: EnhancedTranslationService | null = null;

/**
 * 翻訳サービスを初期化
 */
export function initializeTranslationService(apiKey: string) {
  translationService = new EnhancedTranslationService(apiKey);
}

/**
 * Calls the backend API to get a streaming chat response.
 * @param message The latest user message.
 * @param history The previous chat history.
 * @param systemInstruction The system instruction for the AI.
 * @returns An async generator that yields the text chunks of the AI's response.
 */
export async function* streamChat(
    message: string, 
    history: ChatMessage[],
    systemInstruction: string
): AsyncGenerator<string, void, unknown> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        systemInstruction
      }),
    });

    if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({ 
            code: 'errorMessageDefault', 
            details: response.statusText 
        }));
        // Create an error object that matches our ApiError structure
        const error = new Error(errorData.details || 'Failed to fetch') as Error & ApiError;
        error.code = errorData.code;
        throw error;
    }

    if (!response.body) {
        throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        // The 'stream: true' option is not needed for TextDecoder's decode method
        // as it correctly handles streaming chunks by default.
        yield decoder.decode(value);
    }

  } catch (error: any) {
    console.error('Error calling backend API:', error);
    // Rethrow the structured error to be caught by the UI component
    throw error;
  }
}

/**
 * 翻訳機能付きストリーミングチャット
 * @param message The latest user message.
 * @param history The previous chat history.
 * @param systemInstruction The system instruction for the AI.
 * @param targetLanguage The target language for translation (default: 'ja')
 * @returns An async generator that yields the translated text chunks.
 */
export async function* streamChatWithTranslation(
    message: string,
    history: ChatMessage[],
    systemInstruction: string,
    targetLanguage: string = 'ja'
): AsyncGenerator<string, void, unknown> {
  try {
    // 1. まず日本語で聖者の応答を取得
    const japaneseStream = streamChat(message, history, systemInstruction);
    let fullJapaneseText = '';
    
    // 2. 日本語応答を完全に収集
    for await (const chunk of japaneseStream) {
      fullJapaneseText += chunk;
    }
    
    // 3. 日本語の場合はそのまま返す
    if (targetLanguage === 'ja') {
      yield fullJapaneseText;
      return;
    }
    
    // 4. 他の言語の場合は翻訳
    if (translationService && targetLanguage !== 'ja') {
      const translationContext: TranslationContext = {
        domain: 'spiritual',
        tone: 'sage',
        culturalContext: 'japanese-sage'
      };
      
      // AI応答の履歴を取得（重複回避のため）
      const aiResponses = history
        .filter(msg => msg.sender === 'ai' && !msg.isTyping)
        .map(msg => msg.text)
        .slice(-3); // 最近の3つの応答のみ
      
      const translatedText = await translationService.translateAIResponse(
        fullJapaneseText,
        targetLanguage,
        translationContext,
        aiResponses
      );
      
      // 5. 翻訳結果をストリーミング風に返す
      const words = translatedText.split(/(\s+)/);
      for (let i = 0; i < words.length; i++) {
        yield words[i];
        if (i < words.length - 1) {
          // 自然な表示速度でディレイ
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
    } else {
      // 翻訳サービスが初期化されていない場合はフォールバック
      yield fullJapaneseText;
    }
    
  } catch (error: any) {
    console.error('Error in translation chat:', error);
    // エラーの場合は元のストリームにフォールバック
    const fallbackStream = streamChat(message, history, systemInstruction);
    for await (const chunk of fallbackStream) {
      yield chunk;
    }
  }
}