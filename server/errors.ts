/**
 * Custom Error Classes for Type-Safe Error Handling
 */

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA = 'QUOTA',
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  VALIDATION = 'VALIDATION',
  INTERNAL = 'INTERNAL',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
}

/**
 * Base API Error Class
 */
export class APIError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly errorCode: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    category: ErrorCategory,
    statusCode: number,
    isRetryable: boolean,
    errorCode: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
    this.category = category;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.errorCode = errorCode;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends APIError {
  constructor(message: string = 'API key not valid', context?: Record<string, unknown>) {
    super(message, ErrorCategory.AUTHENTICATION, 401, false, 'errorAuth', context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends APIError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.RATE_LIMIT, 429, true, 'errorRateLimit', context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Quota Error
 */
export class QuotaError extends APIError {
  constructor(message: string = 'API quota exceeded', context?: Record<string, unknown>) {
    super(message, ErrorCategory.QUOTA, 429, false, 'errorQuota', context);
    this.name = 'QuotaError';
  }
}

/**
 * Timeout Error
 */
export class TimeoutError extends APIError {
  constructor(message: string = 'Request timeout', context?: Record<string, unknown>) {
    super(message, ErrorCategory.TIMEOUT, 408, true, 'errorTimeout', context);
    this.name = 'TimeoutError';
  }
}

/**
 * Service Unavailable Error
 */
export class ServiceUnavailableError extends APIError {
  constructor(message: string = 'Service temporarily unavailable', context?: Record<string, unknown>) {
    super(message, ErrorCategory.SERVICE_UNAVAILABLE, 503, true, 'errorServiceUnavailable', context);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends APIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.VALIDATION, 400, false, 'errorValidation', context);
    this.name = 'ValidationError';
  }
}

/**
 * Circuit Breaker Error
 */
export class CircuitBreakerError extends APIError {
  constructor(message: string = 'Circuit breaker is open', context?: Record<string, unknown>) {
    super(message, ErrorCategory.CIRCUIT_BREAKER, 503, true, 'errorCircuitBreaker', context);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Parse error from Gemini API
 */
export function parseGeminiError(error: unknown): APIError {
  if (error instanceof APIError) {
    return error;
  }

  const err = error as { message?: string; status?: number; statusText?: string };
  const errorMessage = err.message || err.statusText || 'Unknown error occurred';

  // Authentication errors
  if (errorMessage.includes('API key not valid') || err.status === 401) {
    return new AuthenticationError(errorMessage);
  }

  // Forbidden
  if (err.status === 403) {
    return new AuthenticationError('Access forbidden', { originalError: errorMessage });
  }

  // Quota errors
  if (errorMessage.toLowerCase().includes('quota') || errorMessage.includes('exceeded')) {
    return new QuotaError(errorMessage);
  }

  // Rate limit errors
  if (errorMessage.includes('rate limit') || err.status === 429) {
    return new RateLimitError(errorMessage);
  }

  // Service unavailable
  if (errorMessage.includes('overloaded') || errorMessage.includes('503') || err.status === 503) {
    return new ServiceUnavailableError(errorMessage);
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    return new TimeoutError(errorMessage);
  }

  // Validation errors
  if (err.status === 400) {
    return new ValidationError(errorMessage);
  }

  // Default to internal error
  return new APIError(
    errorMessage,
    ErrorCategory.INTERNAL,
    500,
    false,
    'errorGeneric',
    { originalError: error }
  );
}

/**
 * Error Response Builder
 */
export function buildErrorResponse(error: APIError) {
  const response = {
    code: error.errorCode,
    details: error.message,
    category: error.category,
    timestamp: error.timestamp.toISOString(),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add retry-after header for retryable errors
  if (error instanceof RateLimitError && error.retryAfter) {
    headers['Retry-After'] = String(error.retryAfter);
  }

  return new Response(JSON.stringify(response), {
    status: error.statusCode,
    headers,
  });
}
