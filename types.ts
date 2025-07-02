

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  isTyping?: boolean; // Added to indicate AI is "typing" or generating response
  // 翻訳関連のフィールド
  originalText?: string;           // 元の日本語テキスト
  translatedText?: string;         // 翻訳されたテキスト
  targetLanguage?: string;         // 翻訳先言語
  translationQuality?: number;     // 翻訳品質スコア (0-1)
  isTranslated?: boolean;          // 翻訳されたメッセージかどうか
}

export interface ApiError {
  code: string;
  details?: string;
}