import { ChatMessage } from '../types';
import { apiService, ChatRequest } from './apiService';

/**
 * ストリーミングレスポンスを処理するサービス
 * API呼び出しはapiService経由で統一
 */
export class StreamingService {
  /**
   * API レスポンスからストリーミングテキストを生成
   * apiService経由で統一されたエラーハンドリングとタイムアウト制御
   */
  static async* streamApiResponse(
    message: string,
    history: ChatMessage[],
    systemInstruction: string,
    language: string = 'ja'
  ): AsyncGenerator<string, void, unknown> {
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

      // apiService経由で統一されたAPI呼び出し
      const response = await apiService.sendMessage(request);

      // レスポンスをストリーミング風に分割
      yield* StreamingService.simulateStreaming(response.message);

    } catch (error: any) {
      console.error('Error in streaming service:', error);
      throw error;
    }
  }

  /**
   * テキストを単語単位でストリーミング風に分割
   */
  static async* simulateStreaming(
    text: string, 
    delayMs: number = 30
  ): AsyncGenerator<string, void, unknown> {
    const words = text.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      yield words[i];
      if (i < words.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * ストリーミングレスポンスをテキストに変換
   */
  static async streamToText(
    stream: AsyncGenerator<string, void, unknown>
  ): Promise<string> {
    let fullText = '';
    for await (const chunk of stream) {
      fullText += chunk;
    }
    return fullText;
  }
}