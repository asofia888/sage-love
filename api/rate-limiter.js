// Advanced Rate Limiting and Cost Control Module
class RateLimiter {
  constructor() {
    // In-memory storage (in production, use Redis for better scalability)
    this.ipRequests = new Map();
    this.sessionRequests = new Map();
    this.dailyCosts = new Map();
    this.globalMetrics = {
      totalRequests: 0,
      totalCost: 0,
      dailyLimit: parseFloat(process.env.DAILY_COST_LIMIT) || 50.0, // $50 daily limit
      lastReset: new Date().toDateString()
    };
  }

  // Enhanced rate limiting configuration
  getRateLimitConfig() {
    return {
      // Per IP limits
      ip: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10,           // Reduced from 20 to 10
        burstLimit: 3,             // Max 3 requests per minute
        burstWindowMs: 60 * 1000,  // 1 minute burst window
      },
      
      // Per session limits
      session: {
        daily: 30,                 // Reduced from 50 to 30
        hourly: 15,                // Max 15 per hour
        windowMs: 60 * 60 * 1000,  // 1 hour
      },
      
      // Global cost controls
      global: {
        maxCostPerHour: 5.0,       // $5 per hour limit
        maxCostPerDay: 50.0,       // $50 per day limit
        emergencyStopCost: 75.0,   // Emergency stop at $75
      },
      
      // Content-based limits
      content: {
        maxMessageLength: 1000,    // Reduced from 2000
        maxHistoryMessages: 5,     // Limit conversation history
        maxTokensPerRequest: 2000, // Approximate token limit
      }
    };
  }

  // Estimate request cost (rough approximation for Gemini)
  estimateRequestCost(messageLength, historyLength = 0) {
    // Rough cost estimation:
    // Input tokens: ~$0.075 per 1K tokens
    // Output tokens: ~$0.30 per 1K tokens
    // Average Japanese character ≈ 1.5 tokens
    
    const inputTokens = (messageLength + historyLength * 100) * 1.5;
    const estimatedOutputTokens = Math.min(inputTokens * 2, 2000); // Max 2K output
    
    const inputCost = (inputTokens / 1000) * 0.075;
    const outputCost = (estimatedOutputTokens / 1000) * 0.30;
    
    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
  }

  // Check if request should be blocked
  shouldBlockRequest(clientIP, sessionId, messageLength, historyLength = 0) {
    const config = this.getRateLimitConfig();
    const now = Date.now();
    const currentHour = new Date().getHours();
    const currentDay = new Date().toDateString();
    
    // Reset daily metrics if new day
    if (this.globalMetrics.lastReset !== currentDay) {
      this.resetDailyMetrics();
    }

    // 1. Check global emergency stop
    if (this.globalMetrics.totalCost >= config.global.emergencyStopCost) {
      return {
        blocked: true,
        reason: 'EMERGENCY_COST_LIMIT',
        message: 'Service temporarily unavailable due to high usage.',
        retryAfter: this.getTimeUntilReset('daily')
      };
    }

    // 2. Check daily cost limit
    if (this.globalMetrics.totalCost >= config.global.maxCostPerDay) {
      return {
        blocked: true,
        reason: 'DAILY_COST_LIMIT',
        message: 'Daily cost limit reached. Service will resume tomorrow.',
        retryAfter: this.getTimeUntilReset('daily')
      };
    }

    // 3. Check hourly cost limit
    const hourlyCost = this.getHourlyCost();
    if (hourlyCost >= config.global.maxCostPerHour) {
      return {
        blocked: true,
        reason: 'HOURLY_COST_LIMIT',
        message: 'Hourly cost limit reached. Please try again next hour.',
        retryAfter: this.getTimeUntilReset('hourly')
      };
    }

    // 4. Check content limits
    if (messageLength > config.content.maxMessageLength) {
      return {
        blocked: true,
        reason: 'MESSAGE_TOO_LONG',
        message: `Message too long. Maximum ${config.content.maxMessageLength} characters allowed.`,
        retryAfter: 0
      };
    }

    if (historyLength > config.content.maxHistoryMessages) {
      return {
        blocked: true,
        reason: 'HISTORY_TOO_LONG',
        message: 'Too many messages in conversation history.',
        retryAfter: 0
      };
    }

    // 5. Check IP-based rate limits
    const ipKey = `ip_${clientIP}`;
    const ipData = this.ipRequests.get(ipKey) || { 
      requests: [], 
      burstRequests: [] 
    };

    // Clean old requests
    const ipWindowStart = now - config.ip.windowMs;
    const burstWindowStart = now - config.ip.burstWindowMs;
    
    ipData.requests = ipData.requests.filter(timestamp => timestamp > ipWindowStart);
    ipData.burstRequests = ipData.burstRequests.filter(timestamp => timestamp > burstWindowStart);

    // Check burst limit (short term)
    if (ipData.burstRequests.length >= config.ip.burstLimit) {
      return {
        blocked: true,
        reason: 'BURST_LIMIT_EXCEEDED',
        message: 'Too many requests too quickly. Please slow down.',
        retryAfter: Math.ceil(config.ip.burstWindowMs / 1000)
      };
    }

    // Check standard IP limit
    if (ipData.requests.length >= config.ip.maxRequests) {
      return {
        blocked: true,
        reason: 'IP_RATE_LIMIT',
        message: 'Too many requests from this IP. Please try again later.',
        retryAfter: Math.ceil(config.ip.windowMs / 1000)
      };
    }

    // 6. Check session-based limits
    const sessionKey = `session_${sessionId}`;
    const sessionData = this.sessionRequests.get(sessionKey) || {
      dailyRequests: [],
      hourlyRequests: []
    };

    // Clean old session requests
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const hourStart = now - config.session.windowMs;
    
    sessionData.dailyRequests = sessionData.dailyRequests.filter(timestamp => timestamp > dayStart);
    sessionData.hourlyRequests = sessionData.hourlyRequests.filter(timestamp => timestamp > hourStart);

    // Check session limits
    if (sessionData.dailyRequests.length >= config.session.daily) {
      return {
        blocked: true,
        reason: 'SESSION_DAILY_LIMIT',
        message: 'Daily usage limit reached for this session.',
        retryAfter: this.getTimeUntilReset('daily')
      };
    }

    if (sessionData.hourlyRequests.length >= config.session.hourly) {
      return {
        blocked: true,
        reason: 'SESSION_HOURLY_LIMIT',
        message: 'Hourly usage limit reached for this session.',
        retryAfter: this.getTimeUntilReset('hourly')
      };
    }

    // 7. Estimate cost and check if affordable
    const estimatedCost = this.estimateRequestCost(messageLength, historyLength);
    
    if (this.globalMetrics.totalCost + estimatedCost > config.global.maxCostPerDay) {
      return {
        blocked: true,
        reason: 'PROJECTED_COST_LIMIT',
        message: 'Request would exceed daily cost limit.',
        retryAfter: this.getTimeUntilReset('daily')
      };
    }

    // Request is allowed - update counters
    ipData.requests.push(now);
    ipData.burstRequests.push(now);
    sessionData.dailyRequests.push(now);
    sessionData.hourlyRequests.push(now);

    this.ipRequests.set(ipKey, ipData);
    this.sessionRequests.set(sessionKey, sessionData);

    return {
      blocked: false,
      estimatedCost,
      remainingRequests: {
        ip: config.ip.maxRequests - ipData.requests.length,
        session: config.session.daily - sessionData.dailyRequests.length,
        burst: config.ip.burstLimit - ipData.burstRequests.length
      }
    };
  }

  // Record actual cost after request completion
  recordActualCost(cost) {
    this.globalMetrics.totalCost += cost;
    this.globalMetrics.totalRequests += 1;
    
    // Log high-cost requests for monitoring
    if (cost > 0.10) { // Log requests over 10 cents
      console.warn(`High-cost request: $${cost.toFixed(4)}, Total: $${this.globalMetrics.totalCost.toFixed(2)}`);
    }
  }

  // Get current usage statistics
  getUsageStats() {
    const config = this.getRateLimitConfig();
    return {
      globalMetrics: this.globalMetrics,
      limits: config.global,
      remainingBudget: Math.max(0, config.global.maxCostPerDay - this.globalMetrics.totalCost),
      utilizationPercentage: (this.globalMetrics.totalCost / config.global.maxCostPerDay) * 100
    };
  }

  // Reset daily metrics
  resetDailyMetrics() {
    this.globalMetrics.totalRequests = 0;
    this.globalMetrics.totalCost = 0;
    this.globalMetrics.lastReset = new Date().toDateString();
    this.dailyCosts.clear();
    console.log('Daily metrics reset');
  }

  // Get hourly cost
  getHourlyCost() {
    const now = Date.now();
    const hourStart = now - (60 * 60 * 1000);
    
    // This is simplified - in production, maintain hourly cost tracking
    return this.globalMetrics.totalCost * 0.1; // Rough estimate
  }

  // Get time until reset
  getTimeUntilReset(type) {
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

  // Clean up old data (call periodically)
  cleanup() {
    const now = Date.now();
    const cleanupAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean IP data
    for (const [key, data] of this.ipRequests.entries()) {
      if (data.requests.length === 0 || Math.max(...data.requests) < now - cleanupAge) {
        this.ipRequests.delete(key);
      }
    }
    
    // Clean session data
    for (const [key, data] of this.sessionRequests.entries()) {
      if (data.dailyRequests.length === 0 || Math.max(...data.dailyRequests) < now - cleanupAge) {
        this.sessionRequests.delete(key);
      }
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Cleanup every hour
setInterval(() => {
  rateLimiter.cleanup();
}, 60 * 60 * 1000);

export default rateLimiter;