/**
 * Frontend configuration constants
 */

export const STORAGE = {
  CHAT_HISTORY_KEY: 'chatHistory',
  SESSION_ID_KEY: 'sage-session-id',
  MAX_MESSAGES: 100,
  TRIM_TO_MESSAGES: 80,
  SIZE_LIMIT: 1024 * 1024, // 1MB
} as const;

export const API = {
  BASE_URL: '/api',
  TIMEOUT_MS: 55000,
} as const;
