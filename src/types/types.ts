

export enum MessageSender {
  USER = 'user',
  AI = 'assistant',
}

// 基本メッセージ型
interface BaseMessage {
  id: string;
  sender: MessageSender;
  timestamp: string;
}

// ユーザーメッセージ型（常に完了済み）
export interface UserMessage extends BaseMessage {
  sender: MessageSender.USER;
  text: string;
  isTyping?: false; // ユーザーメッセージは常に完了済み
}

// AIメッセージ型（タイピング状態を持つ）
export interface AIMessage extends BaseMessage {
  sender: MessageSender.AI;
  text: string;
  isTyping?: boolean;
  // 翻訳関連のフィールド
  originalText?: string;           // 元の日本語テキスト
  translatedText?: string;         // 翻訳されたテキスト
  targetLanguage?: string;         // 翻訳先言語
  translationQuality?: number;     // 翻訳品質スコア (0-1)
  isTranslated?: boolean;          // 翻訳されたメッセージかどうか
}

// 統合メッセージ型（判別可能な合併型）
export type ChatMessage = UserMessage | AIMessage;

// エラー型の強化
export type ErrorCode = 
  | 'errorMessageDefault'
  | 'errorAuth'
  | 'errorQuota'
  | 'errorNoApiKeyConfig'
  | 'errorNetwork'
  | 'errorTranslation'
  | 'errorStreaming';

export interface ApiError {
  code: ErrorCode;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
}

// サービス関連の型
export interface StreamingOptions {
  delayMs?: number;
  maxRetries?: number;
}

export interface TranslationOptions {
  domain?: 'spiritual' | 'general';
  tone?: 'sage' | 'casual' | 'formal';
  culturalContext?: string;
}