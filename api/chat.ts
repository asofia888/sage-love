import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentResult } from '@google/generative-ai';
import { shouldBlockRequest, recordActualCost, recordCacheSavings } from './rate-limiter';
import { parseGeminiError, buildErrorResponse, ValidationError, APIError } from './errors';
import { retryWithBackoff, withTimeout, RetryStatsTracker } from './retry-utils';
import { geminiCircuitBreaker } from './circuit-breaker';
import { getModelWithCache, calculateCacheSavings, getCacheStats } from './context-cache';
import { API_CONFIG, validateEnv } from './config';
import { getOrCreateSession, attachSessionCookie, SessionResult } from './session';

export const config = {
  runtime: 'edge',
};

// Validate environment variables at module load time
const envValidation = validateEnv();
if (envValidation.warnings.length > 0) {
  console.warn('⚠️ Environment warnings:\n  ' + envValidation.warnings.join('\n  '));
}
if (!envValidation.valid) {
  console.error('❌ Environment validation failed:\n  ' + envValidation.errors.join('\n  '));
}

// Retry stats tracker
const retryStats = new RetryStatsTracker();

type RateLimitResult = Awaited<ReturnType<typeof shouldBlockRequest>>;

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

/** SSE event formatter — data: <json>\n\n */
function sseEvent(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Build the prompt text fed to Gemini. System instruction is attached to the
 * model separately so context caching can deduplicate it.
 */
function buildPrompt(conversationHistory: unknown, message: string): string {
  let prompt = '';
  if (Array.isArray(conversationHistory)) {
    const recentHistory = conversationHistory.slice(-10);
    const historyText = recentHistory
      .map((msg: { sender: string; text: string }) =>
        `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');
    if (historyText) {
      prompt += `\n\nConversation History:\n${historyText}`;
    }
  }
  prompt += `\n\nUser: ${message}\nAssistant:`;
  return prompt;
}


export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Establish the signed session cookie before anything else so every response
  // (including rate-limit and error responses) carries Set-Cookie when new.
  let session: SessionResult;
  try {
    session = await getOrCreateSession(req);
  } catch (e) {
    console.error('Session init failed:', e);
    return new Response(JSON.stringify({
      code: 'SESSION_INIT_ERROR',
      details: 'Server configuration error.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { message, conversationHistory, systemInstruction, stream: streamRequested } = body || {};

    // Get client IP and session ID for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';
    const sessionId = session.sessionId;

    // Check rate limits
    const rateLimitResult = await shouldBlockRequest(
      clientIP,
      sessionId,
      message?.length || 0,
      conversationHistory?.length || 0
    );

    if (rateLimitResult.blocked) {
      return attachSessionCookie(new Response(JSON.stringify({
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
      }), session);
    }

    if (!envValidation.valid) {
      throw new ValidationError(
        'Server configuration error: ' + envValidation.errors.join('; ')
      );
    }

    if (!message) {
      throw new ValidationError('Message is required.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ValidationError('GEMINI_API_KEY is not configured.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    const generationConfig = {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: API_CONFIG.MAX_OUTPUT_TOKENS,
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const { model, cached, tokensSaved } = await getModelWithCache(
      genAI,
      systemInstruction || '',
      generationConfig,
      safetySettings
    );

    if (cached) {
      console.log(`📦 Context cache hit: ~${tokensSaved} tokens saved`);
    }

    const prompt = buildPrompt(conversationHistory, message);

    if (streamRequested) {
      return handleStreamingResponse({
        model,
        prompt,
        session,
        sessionId,
        cached,
        tokensSaved,
        rateLimitResult,
      });
    }

    return await handleJsonResponse({
      model,
      prompt,
      session,
      sessionId,
      cached,
      tokensSaved,
      rateLimitResult,
    });

  } catch (error: unknown) {
    retryStats.recordAttempt(0, false);
    return attachSessionCookie(handleError(error), session);
  }
}

interface ResponseContext {
  model: Awaited<ReturnType<typeof getModelWithCache>>['model'];
  prompt: string;
  session: SessionResult;
  sessionId: string;
  cached: boolean;
  tokensSaved: number;
  rateLimitResult: RateLimitResult;
}

/**
 * Non-streaming JSON path. Retried under the circuit breaker and assembled into
 * a single response, matching the pre-streaming contract.
 */
async function handleJsonResponse(ctx: ResponseContext): Promise<Response> {
  const { model, prompt, session, sessionId, cached, tokensSaved, rateLimitResult } = ctx;

  let retryAttempts = 0;
  const result = await geminiCircuitBreaker.execute<GenerateContentResult>(async () => {
    return await retryWithBackoff(
      async () => {
        return await withTimeout(
          model.generateContent(prompt),
          API_CONFIG.REQUEST_TIMEOUT,
          'Request timeout: AI service took too long to respond'
        );
      },
      { maxRetries: 3, baseDelay: 1000, maxDelay: 10000, backoffFactor: 2, jitterFactor: 0.3 },
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

  retryStats.recordAttempt(retryAttempts, true);

  if (rateLimitResult.estimatedCost) {
    await recordActualCost(rateLimitResult.estimatedCost);
  }
  if (cached && tokensSaved > 0) {
    await recordCacheSavings(calculateCacheSavings(tokensSaved));
  }

  const cacheStats = getCacheStats();

  return attachSessionCookie(new Response(JSON.stringify({
    message: text.trim(),
    timestamp: new Date().toISOString(),
    sessionId,
    cache: { hit: cached, tokensSaved },
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-RateLimit-Remaining-IP': String(rateLimitResult.remainingRequests?.ip || 0),
      'X-RateLimit-Remaining-Session': String(rateLimitResult.remainingRequests?.session || 0),
      'X-Context-Cache-Hit': String(cached),
      'X-Context-Cache-Tokens-Saved': String(tokensSaved),
      'X-Context-Cache-TTL': String(cacheStats.remainingTTL),
    },
  }), session);
}

/**
 * SSE streaming path. Gemini's generateContentStream() yields partial
 * responses which we forward verbatim as `data: {...}\n\n` events. Errors
 * after the stream has started must be sent as an `error` event — we cannot
 * switch HTTP status once headers have been flushed.
 *
 * Retries are intentionally omitted here: once any chunk has been delivered
 * to the browser, a silent retry would either replay text the user already
 * saw or skip ahead. We still wrap the stream init in the circuit breaker
 * so upstream outages trip the breaker just like the JSON path.
 */
function handleStreamingResponse(ctx: ResponseContext): Response {
  const { model, prompt, session, sessionId, cached, tokensSaved, rateLimitResult } = ctx;
  const encoder = new TextEncoder();
  const cacheStats = getCacheStats();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (payload: object) => {
        controller.enqueue(encoder.encode(sseEvent(payload)));
      };

      try {
        const streamResult = await geminiCircuitBreaker.execute(async () =>
          withTimeout(
            model.generateContentStream(prompt),
            API_CONFIG.REQUEST_TIMEOUT,
            'Request timeout: AI service took too long to respond'
          )
        );

        let fullText = '';
        for await (const chunk of streamResult.stream) {
          let chunkText = '';
          try {
            chunkText = chunk.text();
          } catch (err) {
            // A malformed chunk (e.g. safety-blocked) shouldn't tear down the
            // stream — skip it and keep the connection alive for the rest.
            console.warn('Stream chunk text() failed:', err);
            continue;
          }
          if (chunkText) {
            fullText += chunkText;
            enqueue({ type: 'chunk', text: chunkText });
          }
        }

        if (!fullText.trim()) {
          enqueue({
            type: 'error',
            code: 'errorGeneric',
            details: 'AI service returned empty response',
            category: 'INTERNAL',
          });
          controller.close();
          retryStats.recordAttempt(0, false);
          return;
        }

        retryStats.recordAttempt(0, true);

        if (rateLimitResult.estimatedCost) {
          await recordActualCost(rateLimitResult.estimatedCost);
        }
        if (cached && tokensSaved > 0) {
          await recordCacheSavings(calculateCacheSavings(tokensSaved));
        }

        enqueue({
          type: 'done',
          sessionId,
          cache: { hit: cached, tokensSaved },
          timestamp: new Date().toISOString(),
        });
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        const apiError = error instanceof APIError ? error : parseGeminiError(error);
        retryStats.recordAttempt(0, false);
        enqueue({
          type: 'error',
          code: apiError.errorCode,
          details: apiError.message,
          category: apiError.category,
          retryAfter: apiError.isRetryable ? 1 : 0,
        });
        controller.close();
      }
    },
  });

  return attachSessionCookie(new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining-IP': String(rateLimitResult.remainingRequests?.ip || 0),
      'X-RateLimit-Remaining-Session': String(rateLimitResult.remainingRequests?.session || 0),
      'X-Context-Cache-Hit': String(cached),
      'X-Context-Cache-Tokens-Saved': String(tokensSaved),
      'X-Context-Cache-TTL': String(cacheStats.remainingTTL),
    },
  }), session);
}
