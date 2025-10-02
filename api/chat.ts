
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { shouldBlockRequest, recordActualCost } from './rate-limiter';

export const config = {
  runtime: 'edge',
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

// Request timeout configuration
const REQUEST_TIMEOUT = 25000; // 25 seconds (within Vercel's 30s Edge Function limit)

// Sleep function for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries,
  baseDelay: number = RETRY_CONFIG.baseDelay
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on authentication errors or invalid requests
      if (error.message?.includes('API key not valid') || 
          error.message?.includes('API key is not configured') ||
          error.status === 400 || 
          error.status === 401 || 
          error.status === 403) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt),
        RETRY_CONFIG.maxDelay
      );
      
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function handleError(error: any) {
    console.error('Error in Vercel Edge Function:', error);
    let statusCode = 500;
    let errorCode = 'errorGeneric'; // Corresponds to i18n key

    const errorMessage = error.message || 'An unknown error occurred';

    if (errorMessage.includes('API key not valid')) {
        statusCode = 401;
        errorCode = 'errorAuth';
    } else if (errorMessage.toLowerCase().includes('quota')) {
        statusCode = 429;
        errorCode = 'errorQuota';
    } else if (errorMessage.includes('API key is not configured')) {
        errorCode = 'errorNoApiKeyConfig';
    } else if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
        statusCode = 503;
        errorCode = 'errorServiceUnavailable';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        statusCode = 408;
        errorCode = 'errorTimeout';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        statusCode = 429;
        errorCode = 'errorRateLimit';
    }

    return new Response(JSON.stringify({
      code: errorCode,
      details: errorMessage
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
}


export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, conversationHistory, systemInstruction } = await req.json();

    // Get client IP and session ID for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';
    const sessionId = req.headers.get('X-Session-ID') || 'unknown';

    // Check rate limits
    const rateLimitResult = await shouldBlockRequest(
      clientIP,
      sessionId,
      message?.length || 0,
      conversationHistory?.length || 0
    );

    if (rateLimitResult.blocked) {
      return new Response(JSON.stringify({
        code: rateLimitResult.reason,
        details: rateLimitResult.message,
        retryAfter: rateLimitResult.retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Reason': rateLimitResult.reason || 'RATE_LIMIT_EXCEEDED',
        },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('API key is not configured on the server.');
    }

    if (!message) {
      return new Response(JSON.stringify({ code: 'errorGeneric', details: 'Message is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
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
    
    // Generate response with retry logic and timeout
    const result = await retryWithBackoff(async () => {
      return await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
        )
      ]);
    });
    const response = await result.response;
    const text = response.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('AI service returned empty response');
    }

    // Record actual cost after successful request
    if (rateLimitResult.estimatedCost) {
      await recordActualCost(rateLimitResult.estimatedCost);
    }

    // Return successful response
    return new Response(JSON.stringify({
      message: text.trim(),
      timestamp: new Date().toISOString(),
      sessionId: sessionId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-RateLimit-Remaining-IP': String(rateLimitResult.remainingRequests?.ip || 0),
        'X-RateLimit-Remaining-Session': String(rateLimitResult.remainingRequests?.session || 0),
      },
    });

  } catch (error: any) {
    return handleError(error);
  }
}
