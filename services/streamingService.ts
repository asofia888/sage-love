import { ChatMessage } from '../types';

/**
 * ストリーミングレスポンスを処理するサービス
 */
export class StreamingService {
  /**
   * API レスポンスからストリーミングテキストを生成
   */
  static async* streamApiResponse(
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
        const errorData = await response.json().catch(() => ({ 
          code: 'errorMessageDefault', 
          details: response.statusText 
        }));
        const error = new Error(errorData.details || 'Failed to fetch') as Error & any;
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
        if (done) break;
        yield decoder.decode(value);
      }

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