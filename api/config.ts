/**
 * Backend API configuration constants
 */

export const API_CONFIG = {
  REQUEST_TIMEOUT: 25000, // 25 seconds (within Vercel's 30s Edge Function limit)
  MAX_OUTPUT_TOKENS: 4096,
} as const;

/**
 * Environment variable definitions with validation rules
 */
interface EnvVarDef {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVarDef[] = [
  { name: 'GEMINI_API_KEY', required: true, description: 'Google Gemini API key' },
  { name: 'SESSION_SECRET', required: true, description: 'HMAC key for signing session cookies (min 16 chars; generate with `openssl rand -base64 32`)' },
  { name: 'UPSTASH_REDIS_REST_URL', required: false, description: 'Upstash Redis REST URL (required for rate limiting)' },
  { name: 'UPSTASH_REDIS_REST_TOKEN', required: false, description: 'Upstash Redis REST token (required for rate limiting)' },
  { name: 'ADMIN_TOKEN', required: false, description: 'Admin dashboard access token' },
];

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all required and optional environment variables.
 * Returns errors for missing required vars and warnings for missing optional vars.
 * Also checks that paired variables (e.g. UPSTASH_REDIS_REST_URL + TOKEN) are both set.
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.name];
    if (!value || value.trim() === '') {
      if (v.required) {
        errors.push(`Missing required env var: ${v.name} — ${v.description}`);
      } else {
        warnings.push(`Missing optional env var: ${v.name} — ${v.description}`);
      }
    }
  }

  // Enforce minimum entropy on SESSION_SECRET (HMAC key strength).
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret && sessionSecret.trim().length > 0 && sessionSecret.length < 16) {
    errors.push('SESSION_SECRET is too short (min 16 chars). Generate with: openssl rand -base64 32');
  }

  // Paired variable check: UPSTASH URL and TOKEN must both be set or both unset
  const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (hasUrl !== hasToken) {
    errors.push(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set. ' +
      `Currently: URL=${hasUrl ? 'set' : 'missing'}, TOKEN=${hasToken ? 'set' : 'missing'}`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
