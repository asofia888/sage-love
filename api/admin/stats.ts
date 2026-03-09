/**
 * Admin endpoint for monitoring usage and costs
 */

import { getUsageStats, config as rateLimitConfig } from '../rate-limiter';
import { validateEnv } from '../config';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Simple authentication check
    const authHeader = req.headers.get('Authorization');
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
      return new Response(JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        message: 'ADMIN_TOKEN is not configured',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (authHeader !== `Bearer ${adminToken}`) {
      return new Response(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Valid authorization required',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get usage statistics
    const usageStats = await getUsageStats();
    const envValidation = validateEnv();

    // Get current timestamp and calculate time until resets
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfHour = new Date(now);
    endOfHour.setMinutes(59, 59, 999);

    const stats = {
      timestamp: now.toISOString(),

      // Current usage
      usage: usageStats,

      // Limits and thresholds
      limits: {
        dailyCostLimit: rateLimitConfig.global.maxCostPerDay,
        hourlyCostLimit: rateLimitConfig.global.maxCostPerHour,
        emergencyStopLimit: rateLimitConfig.global.emergencyStopCost,
        ipRequestLimit: rateLimitConfig.ip.requests,
        sessionDailyLimit: rateLimitConfig.session.daily,
        maxMessageLength: rateLimitConfig.content.maxMessageLength,
      },

      // Time until resets
      resetTimes: {
        dailyResetIn: Math.ceil((endOfDay.getTime() - now.getTime()) / 1000),
        hourlyResetIn: Math.ceil((endOfHour.getTime() - now.getTime()) / 1000),
      },

      // Environment validation
      environment: {
        valid: envValidation.valid,
        warnings: envValidation.warnings,
        errors: envValidation.errors,
      },
    };

    return new Response(JSON.stringify(stats, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);

    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve statistics',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
