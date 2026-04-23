/**
 * Secure API Service - Communicates with serverless backend.
 *
 * Session identity is managed by a server-issued HMAC-signed cookie (HttpOnly),
 * so the client no longer generates or sends any session identifier. Cookies
 * ride along automatically because requests are same-origin.
 */

import { API } from '../config/constants';

export interface ChatRequest {
  message: string;
  systemInstruction?: string;
  conversationHistory?: Array<{
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
  }>;
  language?: string;
}

export interface ChatResponse {
  message: string;
  timestamp: string;
  sessionId: string;
}

export interface ApiError {
  error: string;
  message: string;
  retryAfter?: number;
}

export interface StreamMetadata {
  sessionId?: string;
  cache?: { hit: boolean; tokensSaved: number };
  timestamp?: string;
}

/**
 * Translate an SSE `data: { ... }` JSON payload into either yielded text or a
 * thrown error. Returned metadata (non-null) signals the `done` event.
 */
function handleStreamEvent(
  data: string,
  onMeta: (m: StreamMetadata) => void,
): string | null {
  let parsed: {
    type?: string;
    text?: string;
    code?: string;
    details?: string;
    retryAfter?: number;
    sessionId?: string;
    cache?: { hit: boolean; tokensSaved: number };
    timestamp?: string;
  };
  try {
    parsed = JSON.parse(data);
  } catch {
    console.warn('Ignoring malformed SSE payload:', data);
    return null;
  }

  if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
    return parsed.text;
  }
  if (parsed.type === 'done') {
    onMeta({
      sessionId: parsed.sessionId,
      cache: parsed.cache,
      timestamp: parsed.timestamp,
    });
    return null;
  }
  if (parsed.type === 'error') {
    throw new Error(
      `API_ERROR:${parsed.code || 'UNKNOWN_ERROR'}:${parsed.details || ''}:${parsed.retryAfter || 0}`
    );
  }
  return null;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API.BASE_URL;
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API.TIMEOUT_MS);

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        credentials: 'same-origin', // send signed session cookie
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: request.message,
          systemInstruction: request.systemInstruction,
          conversationHistory: request.conversationHistory,
          language: request.language || 'ja'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const apiError = data as ApiError;
        throw new Error(`API_ERROR:${apiError.error}:${apiError.message}:${apiError.retryAfter || 0}`);
      }

      return data as ChatResponse;

    } catch (error) {
      console.error('API Service Error:', error);

      if (error instanceof Error) {
        // Handle timeout/abort errors
        if (error.name === 'AbortError') {
          throw new Error('API_ERROR:TIMEOUT:Request timed out. The response was taking too long.:0');
        }

        // Handle network errors
        if (error.message.includes('Failed to fetch') || error.name === 'NetworkError') {
          throw new Error('API_ERROR:NETWORK_ERROR:Network connection failed. Please check your internet connection.:0');
        }

        // Re-throw API errors
        if (error.message.startsWith('API_ERROR:')) {
          throw error;
        }
      }

      // Generic error
      throw new Error('API_ERROR:UNKNOWN_ERROR:An unexpected error occurred. Please try again.:0');
    }
  }

  /**
   * Open an SSE chat stream. Yields chunk text as it arrives; the final return
   * value carries the `done` event's metadata (sessionId, cache info).
   *
   * We don't wrap the fetch in a global AbortController timeout the way
   * sendMessage does — streams are expected to stay open for many seconds
   * while the model thinks, and a single timeout would kill long answers.
   */
  async *streamMessage(
    request: ChatRequest
  ): AsyncGenerator<string, StreamMetadata | undefined, unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: request.message,
          systemInstruction: request.systemInstruction,
          conversationHistory: request.conversationHistory,
          language: request.language || 'ja',
          stream: true,
        }),
      });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.name === 'NetworkError')) {
        throw new Error('API_ERROR:NETWORK_ERROR:Network connection failed. Please check your internet connection.:0');
      }
      throw new Error('API_ERROR:UNKNOWN_ERROR:An unexpected error occurred. Please try again.:0');
    }

    // Pre-stream failures (rate limit, validation, session init) still come
    // back as JSON with a non-2xx status.
    if (!response.ok) {
      const data = await response.json().catch(() => ({} as ApiError));
      const code = (data as ApiError).error || (data as { code?: string }).code || 'UNKNOWN_ERROR';
      const details = (data as ApiError).message || (data as { details?: string }).details || 'An unexpected error occurred.';
      throw new Error(`API_ERROR:${code}:${details}:${(data as ApiError).retryAfter || 0}`);
    }

    if (!response.body) {
      throw new Error('API_ERROR:NETWORK_ERROR:Response body is empty.:0');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let metadata: StreamMetadata | undefined;
    const captureMeta = (m: StreamMetadata) => { metadata = m; };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line (\n\n).
        let sepIdx: number;
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);

          let dataPayload = '';
          for (const line of rawEvent.split('\n')) {
            if (line.startsWith('data:')) {
              // Per SSE spec, strip exactly one leading space after `data:`.
              dataPayload += line.slice(5).replace(/^ /, '');
            }
          }
          if (!dataPayload) continue;

          const chunk = handleStreamEvent(dataPayload, captureMeta);
          if (chunk !== null) yield chunk;
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* reader already released */
      }
    }

    return metadata;
  }

  // Method to check service health
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        credentials: 'same-origin',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Method to get current service info
  getSessionInfo() {
    return {
      baseUrl: this.baseUrl,
    };
  }
}

// Singleton instance
export const apiService = new ApiService();
