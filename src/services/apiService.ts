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
