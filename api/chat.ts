import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { shouldBlockRequest, recordActualCost } from './rate-limiter';
import { parseGeminiError, buildErrorResponse, ValidationError, TimeoutError, APIError } from './errors';
import { retryWithBackoff, withTimeout, RetryStatsTracker } from './retry-utils';
import { geminiCircuitBreaker } from './circuit-breaker';

export const config = {
  runtime: 'edge',
};

// Request timeout configuration
const REQUEST_TIMEOUT = 25000; // 25 seconds (within Vercel's 30s Edge Function limit)

// Retry stats tracker
const retryStats = new RetryStatsTracker();

/**
 * Handle errors with improved error handling
 */
function handleError(error: unknown): Response {
  console.error('Error in Vercel Edge Function:', error);

  // Parse error to APIError type
  const apiError = error instanceof APIError ? error : parseGeminiError(error);

  // Log error details for monitoring
  console.error('API Error Details:', {
    category: apiError.category,
    statusCode: apiError.statusCode,
    errorCode: apiError.errorCode,
    message: apiError.message,
    timestamp: apiError.timestamp.toISOString(),
    isRetryable: apiError.isRetryable,
  });

  return buildErrorResponse(apiError);
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
      throw new ValidationError('API key is not configured on the server.');
    }

    if (!message) {
      throw new ValidationError('Message is required.');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest", // Currently: Gemini 2.5 Flash
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
        .map((msg: { sender: string; text: string }) =>
          `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n');
      prompt += `\n\nConversation History:\n${historyText}`;
    }

    prompt += `\n\nUser: ${message}\nAssistant:`;

    // Track retry attempts
    let retryAttempts = 0;

    // Generate response with circuit breaker, retry logic and timeout
    const result = await geminiCircuitBreaker.execute(async () => {
      return await retryWithBackoff(
        async () => {
          return await withTimeout(
            model.generateContent(prompt),
            REQUEST_TIMEOUT,
            'Request timeout: AI service took too long to respond'
          );
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffFactor: 2,
          jitterFactor: 0.3,
        },
        (attempt, error, delay) => {
          retryAttempts = attempt;
          console.log(`Retry attempt ${attempt}/3 after ${delay}ms`,
            error instanceof Error ? error.message : String(error));
        }
      );
    });

    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new ValidationError('AI service returned empty response');
    }

    // Record retry statistics
    retryStats.recordAttempt(retryAttempts, true);

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

  } catch (error: unknown) {
    // Record failed attempt in retry statistics
    retryStats.recordAttempt(0, false);
    return handleError(error);
  }
}
