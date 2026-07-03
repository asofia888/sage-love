import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  // Per IP limits
  ip: {
    requests: 10,           // 10 requests
    window: '15 m',         // per 15 minutes
    burstLimit: 3,          // Max 3 requests per minute
    burstWindow: '1 m',     // 1 minute burst window
    // IP単位の日次上限。署名Cookieを毎回捨てる濫用でもセッション制限を
    // すり抜けられないための天井。NAT/CGNAT共有IPを考慮しセッション日次(30)より
    // 十分高くしつつ、1IPで日次コスト上限を食い潰せない値に抑える
    daily: 100,             // 100 requests per day per IP
  },

  // Per session limits
  session: {
    daily: 30,              // 30 requests per day
    hourly: 15,             // 15 requests per hour
  },

  // Global cost controls
  global: {
    maxCostPerHour: 5.0,    // $5 per hour limit
    maxCostPerDay: 10.0,    // $10 per day limit
    emergencyStopCost: 15.0, // Emergency stop at $15 (must stay above maxCostPerDay)
  },

  // Content-based limits
  content: {
    maxMessageLength: 1000,    // Max 1000 characters
    maxHistoryMessages: 10,    // Limit conversation history (matches api/chat.ts slice(-10))
    // 履歴1件あたりの本文長上限。正規のAI応答(最大4096トークン)より十分大きく、
    // 巨大な履歴本文を送り込むコスト膨張攻撃だけを弾く
    maxHistoryMessageLength: 8000,
    maxTokensPerRequest: 2000, // Approximate token limit
  }
};

// Initialize Redis client only if credentials are available
let redis: Redis | null = null;
let ipRateLimiter: Ratelimit | null = null;
let ipDailyRateLimiter: Ratelimit | null = null;
let burstRateLimiter: Ratelimit | null = null;
let sessionHourlyRateLimiter: Ratelimit | null = null;
let sessionDailyRateLimiter: Ratelimit | null = null;

// Check if Upstash Redis is configured
const isRedisConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Initialize Redis and rate limiters
if (isRedisConfigured()) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // IP-based rate limiter (sliding window)
    ipRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.ip.requests, RATE_LIMIT_CONFIG.ip.window as `${number} m`),
      analytics: true,
      prefix: 'ratelimit:ip',
    });

    // IP-based daily limiter (cookie-drop abuse ceiling)
    ipDailyRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.ip.daily, '1 d'),
      analytics: true,
      prefix: 'ratelimit:ip:daily',
    });

    // Burst rate limiter (fixed window for quick bursts)
    burstRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(RATE_LIMIT_CONFIG.ip.burstLimit, RATE_LIMIT_CONFIG.ip.burstWindow as `${number} m`),
      analytics: true,
      prefix: 'ratelimit:burst',
    });

    // Session hourly rate limiter
    sessionHourlyRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.session.hourly, '1 h'),
      analytics: true,
      prefix: 'ratelimit:session:hourly',
    });

    // Session daily rate limiter
    sessionDailyRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.session.daily, '1 d'),
      analytics: true,
      prefix: 'ratelimit:session:daily',
    });

    console.log('✅ Upstash Redis rate limiting initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Upstash Redis:', error);
  }
} else {
  console.warn('⚠️ Upstash Redis not configured. Rate limiting will be disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
}

/**
 * Estimate the cost of a request based on message and history length
 */
function estimateRequestCost(messageLength: number, historyLength: number = 0): number {
  // Cost estimation for gemini-3-flash-preview (api/config.ts MODEL_NAME):
  // Input: $0.50 per 1M tokens = $0.0005 per 1K tokens (text)
  // Output: $3.00 per 1M tokens = $0.0030 per 1K tokens
  // Average character ≈ 1.5 tokens
  // モデルを変える場合はこの単価も必ず更新すること（日次$10上限はこの見積りで判定している）

  const inputTokens = (messageLength + historyLength * 100) * 1.5;
  const estimatedOutputTokens = Math.min(inputTokens * 2, 2000); // Max 2K output

  const inputCost = (inputTokens / 1000) * 0.0005;
  const outputCost = (estimatedOutputTokens / 1000) * 0.0030;

  return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
}

// Costs are stored in Redis as integers (dollars * COST_SCALE) because INCRBY
// only accepts integers — passing a fractional dollar amount makes the command
// fail and silently drops the cost record.
const COST_SCALE = 10000; // preserves 4 decimal places

/**
 * Get current daily cost from Redis (in dollars).
 * Redis 障害時は例外を投げる — 呼び出し側（コスト上限チェック）が
 * fail-closed で扱えるよう、ここで 0 に潰さない。
 */
async function getDailyCost(): Promise<number> {
  if (!redis) return 0;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const costKey = `cost:daily:${today}`;
  const cost = await redis.get<number>(costKey);
  return (cost || 0) / COST_SCALE;
}

/**
 * Get current hourly cost from Redis (in dollars).
 * Redis 障害時は例外を投げる（getDailyCost と同じ方針）。
 */
async function getHourlyCost(): Promise<number> {
  if (!redis) return 0;

  const currentHour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
  const costKey = `cost:hourly:${currentHour}`;
  const cost = await redis.get<number>(costKey);
  return (cost || 0) / COST_SCALE;
}

/**
 * Record actual cost (in dollars) after request completion
 */
export async function recordActualCost(cost: number): Promise<void> {
  if (!redis || cost <= 0) return;

  // Store as integer (multiply by COST_SCALE)
  const scaledCost = Math.round(cost * COST_SCALE);
  if (scaledCost <= 0) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().toISOString().substring(0, 13);

    // Increment daily cost (expires after 2 days)
    const dailyKey = `cost:daily:${today}`;
    await redis.incrby(dailyKey, scaledCost);
    await redis.expire(dailyKey, 172800); // 2 days in seconds

    // Increment hourly cost (expires after 2 hours)
    const hourlyKey = `cost:hourly:${currentHour}`;
    await redis.incrby(hourlyKey, scaledCost);
    await redis.expire(hourlyKey, 7200); // 2 hours in seconds

    // Log high-cost requests
    if (cost > 0.10) {
      const totalCost = await getDailyCost();
      console.warn(`⚠️ High-cost request: $${cost.toFixed(4)}, Daily total: $${totalCost.toFixed(2)}`);
    }
  } catch (error) {
    console.error('Error recording cost:', error);
  }
}

/**
 * Get time until next reset (in seconds)
 */
function getTimeUntilReset(type: 'hourly' | 'daily'): number {
  const now = new Date();

  if (type === 'daily') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
  }

  if (type === 'hourly') {
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return Math.ceil((nextHour.getTime() - now.getTime()) / 1000);
  }

  return 3600; // Default 1 hour
}

/**
 * Rate limiting result interface
 */
export interface RateLimitResult {
  blocked: boolean;
  reason?: string;
  message?: string;
  retryAfter?: number;
  estimatedCost?: number;
  remainingRequests?: {
    ip?: number;
    session?: number;
    burst?: number;
  };
}

/**
 * Content limit checks. These need no Redis, so they must run unconditionally —
 * even when Redis is unavailable and the rate-limit checks are bypassed.
 */
function checkContentLimits(
  messageLength: number,
  historyLength: number,
  longestHistoryMessageLength: number = 0
): RateLimitResult | null {
  if (messageLength > RATE_LIMIT_CONFIG.content.maxMessageLength) {
    return {
      blocked: true,
      reason: 'MESSAGE_TOO_LONG',
      message: `Message too long. Maximum ${RATE_LIMIT_CONFIG.content.maxMessageLength} characters allowed.`,
      retryAfter: 0,
    };
  }

  if (historyLength > RATE_LIMIT_CONFIG.content.maxHistoryMessages) {
    return {
      blocked: true,
      reason: 'HISTORY_TOO_LONG',
      message: 'Too many messages in conversation history.',
      retryAfter: 0,
    };
  }

  if (longestHistoryMessageLength > RATE_LIMIT_CONFIG.content.maxHistoryMessageLength) {
    return {
      blocked: true,
      reason: 'HISTORY_MESSAGE_TOO_LONG',
      message: `A conversation history entry is too long. Maximum ${RATE_LIMIT_CONFIG.content.maxHistoryMessageLength} characters per message.`,
      retryAfter: 0,
    };
  }

  return null;
}

/**
 * Check if a request should be blocked based on rate limits
 */
export async function shouldBlockRequest(
  clientIP: string,
  sessionId: string,
  messageLength: number,
  historyLength: number = 0,
  longestHistoryMessageLength: number = 0
): Promise<RateLimitResult> {
  // 1. Check content limits first (no Redis needed)
  const contentViolation = checkContentLimits(messageLength, historyLength, longestHistoryMessageLength);
  if (contentViolation) {
    return contentViolation;
  }

  // If Redis is not configured, bypass rate limiting (content limits above still apply)
  if (!redis || !ipRateLimiter || !ipDailyRateLimiter || !burstRateLimiter || !sessionHourlyRateLimiter || !sessionDailyRateLimiter) {
    console.warn('⚠️ Rate limiting bypassed: Redis not configured');
    return {
      blocked: false,
      estimatedCost: estimateRequestCost(messageLength, historyLength),
    };
  }

  const estimatedCost = estimateRequestCost(messageLength, historyLength);

  // 2-3. Global cost limits — Redis 障害でコストが読めない場合は fail-closed。
  // 「使用額 0」と誤認して日次上限($10)を素通りさせないため、読み取り失敗は拒否する。
  // （IP/セッション制限の障害は下の catch で従来どおり fail-open。）
  try {
    const dailyCost = await getDailyCost();
    const hourlyCost = await getHourlyCost();

    if (dailyCost >= RATE_LIMIT_CONFIG.global.emergencyStopCost) {
      return {
        blocked: true,
        reason: 'EMERGENCY_COST_LIMIT',
        message: 'Service temporarily unavailable due to high usage.',
        retryAfter: getTimeUntilReset('daily'),
      };
    }

    if (dailyCost >= RATE_LIMIT_CONFIG.global.maxCostPerDay) {
      return {
        blocked: true,
        reason: 'DAILY_COST_LIMIT',
        message: 'Daily cost limit reached. Service will resume tomorrow.',
        retryAfter: getTimeUntilReset('daily'),
      };
    }

    if (hourlyCost >= RATE_LIMIT_CONFIG.global.maxCostPerHour) {
      return {
        blocked: true,
        reason: 'HOURLY_COST_LIMIT',
        message: 'Hourly cost limit reached. Please try again next hour.',
        retryAfter: getTimeUntilReset('hourly'),
      };
    }

    if (dailyCost + estimatedCost > RATE_LIMIT_CONFIG.global.maxCostPerDay) {
      return {
        blocked: true,
        reason: 'PROJECTED_COST_LIMIT',
        message: 'Request would exceed daily cost limit.',
        retryAfter: getTimeUntilReset('daily'),
      };
    }
  } catch (error) {
    console.error('Cost check unavailable — failing closed:', error);
    return {
      blocked: true,
      reason: 'COST_CHECK_UNAVAILABLE',
      message: 'Service temporarily unavailable. Please try again shortly.',
      retryAfter: 60,
    };
  }

  try {
    // 4. Check burst rate limit (prevent rapid-fire requests)
    const burstResult = await burstRateLimiter.limit(clientIP);
    if (!burstResult.success) {
      return {
        blocked: true,
        reason: 'BURST_LIMIT_EXCEEDED',
        message: 'Too many requests too quickly. Please slow down.',
        retryAfter: Math.ceil(burstResult.reset / 1000 - Date.now() / 1000),
      };
    }

    // 5. Check IP-based daily limit (cookie-drop abuse ceiling)
    const ipDailyResult = await ipDailyRateLimiter.limit(clientIP);
    if (!ipDailyResult.success) {
      return {
        blocked: true,
        reason: 'IP_DAILY_LIMIT',
        message: 'Daily request limit reached for this network. Please try again tomorrow.',
        retryAfter: getTimeUntilReset('daily'),
      };
    }

    // 6. Check IP-based rate limit (short window)
    const ipResult = await ipRateLimiter.limit(clientIP);
    if (!ipResult.success) {
      return {
        blocked: true,
        reason: 'IP_RATE_LIMIT',
        message: 'Too many requests from this IP. Please try again later.',
        retryAfter: Math.ceil(ipResult.reset / 1000 - Date.now() / 1000),
      };
    }

    // 6. Check session hourly limit
    const sessionHourlyResult = await sessionHourlyRateLimiter.limit(sessionId);
    if (!sessionHourlyResult.success) {
      return {
        blocked: true,
        reason: 'SESSION_HOURLY_LIMIT',
        message: 'Hourly usage limit reached for this session.',
        retryAfter: Math.ceil(sessionHourlyResult.reset / 1000 - Date.now() / 1000),
      };
    }

    // 7. Check session daily limit
    const sessionDailyResult = await sessionDailyRateLimiter.limit(sessionId);
    if (!sessionDailyResult.success) {
      return {
        blocked: true,
        reason: 'SESSION_DAILY_LIMIT',
        message: 'Daily usage limit reached for this session.',
        retryAfter: Math.ceil(sessionDailyResult.reset / 1000 - Date.now() / 1000),
      };
    }

    // All checks passed - allow the request
    return {
      blocked: false,
      estimatedCost,
      remainingRequests: {
        ip: ipResult.remaining,
        session: sessionDailyResult.remaining,
        burst: burstResult.remaining,
      },
    };
  } catch (error) {
    console.error('Error in rate limiting check:', error);
    // IP/セッション制限のRedis障害はfail-open（正当なユーザーを止めない）。
    // コスト上限は上のブロックで別途fail-closed済み。
    return {
      blocked: false,
      estimatedCost,
    };
  }
}

/**
 * Get current usage statistics
 */
export async function getUsageStats() {
  if (!redis) {
    return {
      redisConfigured: false,
      message: 'Redis not configured',
    };
  }

  try {
    const dailyCost = await getDailyCost();
    const hourlyCost = await getHourlyCost();

    return {
      redisConfigured: true,
      dailyCost,
      hourlyCost,
      limits: RATE_LIMIT_CONFIG.global,
      remainingBudget: Math.max(0, RATE_LIMIT_CONFIG.global.maxCostPerDay - dailyCost),
      utilizationPercentage: (dailyCost / RATE_LIMIT_CONFIG.global.maxCostPerDay) * 100,
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {
      redisConfigured: true,
      error: 'Failed to retrieve stats',
    };
  }
}

// Export config for testing/monitoring
export const config = RATE_LIMIT_CONFIG;
