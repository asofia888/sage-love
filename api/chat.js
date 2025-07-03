// Vercel Serverless Function for secure API handling
import { GoogleGenerativeAI } from '@google/generative-ai';

// Rate limiting storage (in production, use Redis or database)
const requestCounts = new Map();

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // max 20 requests per window per IP
  maxRequestsPerSession: 50 // max 50 requests per session per day
};

// Simple rate limiting function
function isRateLimited(identifier, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!requestCounts.has(identifier)) {
    requestCounts.set(identifier, []);
  }
  
  const requests = requestCounts.get(identifier);
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  requestCounts.set(identifier, validRequests);
  
  // Check if limit exceeded
  if (validRequests.length >= limit) {
    return true;
  }
  
  // Add current request
  validRequests.push(now);
  return false;
}

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
    
    // Apply rate limiting
    if (isRateLimited(clientIP, RATE_LIMIT.maxRequests, RATE_LIMIT.windowMs)) {
      return res.status(429).json({ 
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT.windowMs / 1000)
      });
    }
    
    if (isRateLimited(`session_${sessionId}`, RATE_LIMIT.maxRequestsPerSession, 24 * 60 * 60 * 1000)) {
      return res.status(429).json({ 
        error: 'SESSION_LIMIT_EXCEEDED',
        message: 'Daily limit reached. Please try again tomorrow.',
        retryAfter: 24 * 60 * 60
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
    
    // Validate request body
    const { message, systemInstruction, conversationHistory, language } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'INVALID_MESSAGE',
        message: 'Message is required and must be a non-empty string' 
      });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({ 
        error: 'MESSAGE_TOO_LONG',
        message: 'Message must be less than 2000 characters' 
      });
    }
    
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
    
    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10); // Limit to last 10 messages
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
    
    // Log request (in production, use proper logging service)
    console.log(`Chat request: IP=${clientIP}, Session=${sessionId}, Language=${language || 'unknown'}, MessageLength=${message.length}`);
    
    // Return successful response
    res.status(200).json({
      message: text.trim(),
      timestamp: new Date().toISOString(),
      sessionId: sessionId
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