/**
 * Frontend configuration constants
 */

export const STORAGE = {
  CHAT_HISTORY_KEY: 'chatHistory',
  /** 初回訪問時に免責事項を一度だけ提示したかの記録 */
  DISCLAIMER_SEEN_KEY: 'disclaimerAcknowledged',
  MAX_MESSAGES: 100,
  TRIM_TO_MESSAGES: 80,
  SIZE_LIMIT: 1024 * 1024, // 1MB
} as const;

export const API = {
  BASE_URL: '/api',
  TIMEOUT_MS: 55000,
} as const;

/**
 * 1通あたりの本文長の上限。
 *
 * サーバー（server/rate-limiter.ts）が超過分を 429 で弾くので、クライアント側の
 * 入力欄も同じ値で止める必要がある。ここだけの値にすると、長い胸の内を
 * 書き切って送信した瞬間にエラー、という最悪の体験になる。
 * server/rate-limiter.ts はこの定数を import している。片方だけ変えないこと。
 */
export const MESSAGE = {
  MAX_LENGTH: 1000,
  /** 残り何文字から文字数カウンタを表示するか */
  COUNTER_THRESHOLD: 800,
} as const;
