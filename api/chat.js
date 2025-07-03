// Vercel Serverless Function for secure API handling
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimiter from './rate-limiter.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://sage-love.vercel.app' 
    : '*'
  );
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get client IP and session ID for rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const sessionId = req.headers['x-session-id'] || clientIP;
    
    // Validate request body early for rate limiting
    const { message, conversationHistory = [] } = req.body || {};
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'INVALID_MESSAGE',
        message: 'Message is required and must be a non-empty string' 
      });
    }
    
    // Apply advanced rate limiting and cost control
    const rateLimitResult = rateLimiter.shouldBlockRequest(
      clientIP, 
      sessionId, 
      message.length, 
      conversationHistory.length
    );
    
    if (rateLimitResult.blocked) {
      return res.status(429).json({ 
        error: rateLimitResult.reason,
        message: rateLimitResult.message,
        retryAfter: rateLimitResult.retryAfter
      });
    }
    
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({ 
        error: 'SERVER_CONFIG_ERROR',
        message: 'Service temporarily unavailable' 
      });
    }
    
    // Further validate request body
    const { systemInstruction, language } = req.body;
    
    if (message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'EMPTY_MESSAGE',
        message: 'Message cannot be empty' 
      });
    }
    
    // Note: Length validation already done in rate limiter
    
    // Content filtering - basic checks
    const suspiciousPatterns = [
      /API.{0,10}KEY/i,
      /TOKEN/i,
      /PASSWORD/i,
      /<script[^>]*>/i,
      /javascript:/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(message))) {
      return res.status(400).json({ 
        error: 'CONTENT_FILTERED',
        message: 'Message contains prohibited content' 
      });
    }
    
    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    });
    
    // Prepare conversation context
    let prompt = systemInstruction || '';
    
    // Add conversation history if provided (limited by rate limiter)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-5); // Limit to last 5 messages (reduced from 10)
      const historyText = recentHistory
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n');
      prompt += `\n\nConversation History:\n${historyText}`;
    }
    
    prompt += `\n\nUser: ${message}\nAssistant:`;
    
    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text || text.trim().length === 0) {
      return res.status(500).json({ 
        error: 'EMPTY_RESPONSE',
        message: 'AI service returned empty response' 
      });
    }
    
    // Record actual cost and update metrics
    rateLimiter.recordActualCost(rateLimitResult.estimatedCost);
    
    // Get current usage stats for monitoring
    const usageStats = rateLimiter.getUsageStats();
    
    // Log request with cost information
    console.log(`Chat request: IP=${clientIP}, Session=${sessionId}, Language=${language || 'unknown'}, MessageLength=${message.length}, EstimatedCost=$${rateLimitResult.estimatedCost.toFixed(4)}, TotalCost=$${usageStats.globalMetrics.totalCost.toFixed(2)}`);
    
    // Return successful response with usage info
    res.status(200).json({
      message: text.trim(),
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      usage: {
        estimatedCost: rateLimitResult.estimatedCost,
        remainingRequests: rateLimitResult.remainingRequests,
        budgetUtilization: usageStats.utilizationPercentage
      }
    });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Handle specific API errors
    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({ 
        error: 'API_KEY_ERROR',
        message: 'Service authentication error' 
      });
    }
    
    if (error.message?.includes('QUOTA')) {
      return res.status(503).json({ 
        error: 'QUOTA_EXCEEDED',
        message: 'Service temporarily unavailable due to high demand' 
      });
    }
    
    if (error.message?.includes('SAFETY')) {
      return res.status(400).json({ 
        error: 'CONTENT_SAFETY',
        message: 'Message violates content safety guidelines' 
      });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.' 
    });
  }
}