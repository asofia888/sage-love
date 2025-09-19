import { ChatMessage } from '../types';
import { StreamingService } from './streamingService';
import { EnhancedTranslationService, TranslationContext } from './translationService';

/**
 * チャット機能の核となるサービス
 */
export class ChatService {
  private translationService: EnhancedTranslationService | null = null;

  /**
   * 翻訳サービスを初期化
   */
  initializeTranslation(apiKey: string): void {
    this.translationService = new EnhancedTranslationService(apiKey);
  }

  /**
   * 基本的なチャットストリーミング
   */
  async* streamChat(
    message: string,
    history: ChatMessage[],
    systemInstruction: string,
    language: string = 'ja'
  ): AsyncGenerator<string, void, unknown> {
    try {
      const stream = StreamingService.streamApiResponse(message, history, systemInstruction, language);
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 翻訳機能付きチャットストリーミング
   */
  async* streamChatWithTranslation(
    message: string,
    history: ChatMessage[],
    systemInstruction: string,
    targetLanguage: string = 'ja'
  ): AsyncGenerator<string, void, unknown> {
    try {
      // 1. まず日本語で聖者の応答を取得
      const japaneseStream = this.streamChat(message, history, systemInstruction);
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
      if (this.translationService && targetLanguage !== 'ja') {
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
        
        const translatedText = await this.translationService.translateAIResponse(
          fullJapaneseText,
          targetLanguage,
          translationContext,
          aiResponses
        );
        
        // 5. 翻訳結果をストリーミング風に返す
        const streamingTranslation = StreamingService.simulateStreaming(translatedText);
        for await (const chunk of streamingTranslation) {
          yield chunk;
        }
      } else {
        // 翻訳サービスが初期化されていない場合はフォールバック
        yield fullJapaneseText;
      }
      
    } catch (error) {
      console.error('Error in translation chat:', error);
      // エラーの場合は元のストリームにフォールバック
      const fallbackStream = this.streamChat(message, history, systemInstruction);
      for await (const chunk of fallbackStream) {
        yield chunk;
      }
    }
  }

  /**
   * 翻訳サービスが初期化されているかチェック
   */
  isTranslationAvailable(): boolean {
    return this.translationService !== null;
  }
}

// シングルトンインスタンス
export const chatService = new ChatService();