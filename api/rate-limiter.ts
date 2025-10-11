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
  },

  // Per session limits
  session: {
    daily: 30,              // 30 requests per day
    hourly: 15,             // 15 requests per hour
  },

  // Global cost controls
  global: {
    maxCostPerHour: 5.0,    // $5 per hour limit
    maxCostPerDay: 50.0,    // $50 per day limit
    emergencyStopCost: 75.0, // Emergency stop at $75
  },

  // Content-based limits
  content: {
    maxMessageLength: 1000,    // Max 1000 characters
    maxHistoryMessages: 5,     // Limit conversation history
    maxTokensPerRequest: 2000, // Approximate token limit
  }
};

// Initialize Redis client only if credentials are available
let redis: Redis | null = null;
let ipRateLimiter: Ratelimit | null = null;
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
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.ip.requests, RATE_LIMIT_CONFIG.ip.window),
      analytics: true,
      prefix: 'ratelimit:ip',
    });

    // Burst rate limiter (fixed window for quick bursts)
    burstRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(RATE_LIMIT_CONFIG.ip.burstLimit, RATE_LIMIT_CONFIG.ip.burstWindow),
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
  // Cost estimation for Gemini 2.0 Flash (gemini-flash-latest):
  // Input: $0.10 per 1M tokens = $0.0001 per 1K tokens
  // Output: $0.40 per 1M tokens = $0.0004 per 1K tokens
  // Average character ≈ 1.5 tokens

  const inputTokens = (messageLength + historyLength * 100) * 1.5;
  const estimatedOutputTokens = Math.min(inputTokens * 2, 2000); // Max 2K output

  const inputCost = (inputTokens / 1000) * 0.0001;
  const outputCost = (estimatedOutputTokens / 1000) * 0.0004;

  return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
}

/**
 * Get current daily cost from Redis
 */
async function getDailyCost(): Promise<number> {
  if (!redis) return 0;

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const costKey = `cost:daily:${today}`;
    const cost = await redis.get<number>(costKey);
    return cost || 0;
  } catch (error) {
    console.error('Error getting daily cost:', error);
    return 0;
  }
}

/**
 * Get current hourly cost from Redis
 */
async function getHourlyCost(): Promise<number> {
  if (!redis) return 0;

  try {
    const currentHour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
    const costKey = `cost:hourly:${currentHour}`;
    const cost = await redis.get<number>(costKey);
    return cost || 0;
  } catch (error) {
    console.error('Error getting hourly cost:', error);
    return 0;
  }
}

/**
 * Record actual cost after request completion
 */
export async function recordActualCost(cost: number): Promise<void> {
  if (!redis || cost <= 0) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().toISOString().substring(0, 13);

    // Increment daily cost (expires after 2 days)
    const dailyKey = `cost:daily:${today}`;
    await redis.incrby(dailyKey, cost);
    await redis.expire(dailyKey, 172800); // 2 days in seconds

    // Increment hourly cost (expires after 2 hours)
    const hourlyKey = `cost:hourly:${currentHour}`;
    await redis.incrby(hourlyKey, cost);
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
 * Check if a request should be blocked based on rate limits
 */
export async function shouldBlockRequest(
  clientIP: string,
  sessionId: string,
  messageLength: number,
  historyLength: number = 0
): Promise<RateLimitResult> {
  // If Redis is not configured, allow all requests with a warning
  if (!redis || !ipRateLimiter || !burstRateLimiter || !sessionHourlyRateLimiter || !sessionDailyRateLimiter) {
    console.warn('⚠️ Rate limiting bypassed: Redis not configured');
    return {
      blocked: false,
      estimatedCost: estimateRequestCost(messageLength, historyLength),
    };
  }

  try {
    // 1. Check content limits (no Redis needed)
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

    // 2. Check global cost limits
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

    // 3. Check estimated cost
    const estimatedCost = estimateRequestCost(messageLength, historyLength);
    if (dailyCost + estimatedCost > RATE_LIMIT_CONFIG.global.maxCostPerDay) {
      return {
        blocked: true,
        reason: 'PROJECTED_COST_LIMIT',
        message: 'Request would exceed daily cost limit.',
        retryAfter: getTimeUntilReset('daily'),
      };
    }

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

    // 5. Check IP-based rate limit
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
    // On error, fail open (allow the request) but log the error
    return {
      blocked: false,
      estimatedCost: estimateRequestCost(messageLength, historyLength),
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
