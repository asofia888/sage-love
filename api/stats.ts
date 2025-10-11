/**
 * Statistics and Health Monitoring Endpoint
 */

import { geminiCircuitBreaker } from './circuit-breaker';
import { getUsageStats } from './rate-limiter';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Basic authentication check (optional - add API key check here)
  const authHeader = req.headers.get('Authorization');
  const expectedAuth = process.env.STATS_API_KEY;

  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get circuit breaker stats
    const circuitBreakerStats = geminiCircuitBreaker.getStats();

    // Get rate limiting stats
    const rateLimitStats = await getUsageStats();

    // System health check
    const health = {
      status: circuitBreakerStats.state === 'CLOSED' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 'N/A',
    };

    const stats = {
      health,
      circuitBreaker: {
        state: circuitBreakerStats.state,
        failureCount: circuitBreakerStats.failureCount,
        successCount: circuitBreakerStats.successCount,
        totalRequests: circuitBreakerStats.totalRequests,
        rejectedRequests: circuitBreakerStats.rejectedRequests,
        lastFailureTime: circuitBreakerStats.lastFailureTime?.toISOString(),
        lastStateChange: circuitBreakerStats.lastStateChange.toISOString(),
        failureRate: circuitBreakerStats.totalRequests > 0
          ? (circuitBreakerStats.failureCount / circuitBreakerStats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
      },
      rateLimit: rateLimitStats,
    };

    return new Response(JSON.stringify(stats, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in stats endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
