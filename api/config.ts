/**
 * Backend API configuration constants
 */

export const API_CONFIG = {
  REQUEST_TIMEOUT: 25000, // 25 seconds (within Vercel's 30s Edge Function limit)
  MAX_OUTPUT_TOKENS: 4096,
} as const;
