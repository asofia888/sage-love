// Admin endpoint for monitoring usage and costs
import rateLimiter from '../rate-limiter.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://sage-love.vercel.app' 
    : '*'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Simple authentication check (in production, use proper auth)
    const authHeader = req.headers.authorization;
    const adminToken = process.env.ADMIN_TOKEN || 'admin-secret-token';
    
    if (authHeader !== `Bearer ${adminToken}`) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Valid authorization required' 
      });
    }
    
    // Get comprehensive usage statistics
    const usageStats = rateLimiter.getUsageStats();
    const config = rateLimiter.getRateLimitConfig();
    
    // Get current timestamp and calculate time until resets
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfHour = new Date(now);
    endOfHour.setMinutes(59, 59, 999);
    
    const stats = {
      timestamp: now.toISOString(),
      
      // Current usage
      usage: {
        totalRequests: usageStats.globalMetrics.totalRequests,
        totalCost: usageStats.globalMetrics.totalCost,
        budgetUtilization: usageStats.utilizationPercentage,
        remainingBudget: usageStats.remainingBudget
      },
      
      // Limits and thresholds
      limits: {
        dailyCostLimit: config.global.maxCostPerDay,
        hourlyCostLimit: config.global.maxCostPerHour,
        emergencyStopLimit: config.global.emergencyStopCost,
        ipRequestLimit: config.ip.maxRequests,
        sessionDailyLimit: config.session.daily,
        maxMessageLength: config.content.maxMessageLength
      },
      
      // Time until resets
      resetTimes: {
        dailyResetIn: Math.ceil((endOfDay.getTime() - now.getTime()) / 1000),
        hourlyResetIn: Math.ceil((endOfHour.getTime() - now.getTime()) / 1000)
      },
      
      // Health indicators
      health: {
        status: usageStats.utilizationPercentage > 90 ? 'critical' :
                usageStats.utilizationPercentage > 75 ? 'warning' :
                usageStats.utilizationPercentage > 50 ? 'moderate' : 'healthy',
        emergencyStopActive: usageStats.globalMetrics.totalCost >= config.global.emergencyStopCost,
        dailyLimitReached: usageStats.globalMetrics.totalCost >= config.global.maxCostPerDay,
        budgetAlert: usageStats.utilizationPercentage > 80
      },
      
      // Performance metrics
      performance: {
        averageCostPerRequest: usageStats.globalMetrics.totalRequests > 0 ? 
          usageStats.globalMetrics.totalCost / usageStats.globalMetrics.totalRequests : 0,
        requestsPerHour: usageStats.globalMetrics.totalRequests * (1000 * 60 * 60) / 
          (Date.now() - new Date().setHours(0, 0, 0, 0)),
        projectedDailyCost: usageStats.globalMetrics.totalCost * 
          (24 * 60 * 60 * 1000) / (Date.now() - new Date().setHours(0, 0, 0, 0))
      }
    };
    
    res.status(200).json(stats);
    
  } catch (error) {
    console.error('Admin stats error:', error);
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve statistics'
    });
  }
}