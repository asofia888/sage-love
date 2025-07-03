/**
 * Secure API Service - Communicates with serverless backend
 */

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
  private sessionId: string;

  constructor() {
    // Use environment variable for API base URL
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://sage-love.vercel.app/api'
      : '/api';
    
    // Generate or retrieve session ID
    this.sessionId = this.getSessionId();
  }

  private getSessionId(): string {
    let sessionId = localStorage.getItem('sage-session-id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sage-session-id', sessionId);
    }
    return sessionId;
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
        },
        body: JSON.stringify({
          message: request.message,
          systemInstruction: request.systemInstruction,
          conversationHistory: request.conversationHistory,
          language: request.language || 'ja'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiError = data as ApiError;
        throw new Error(`API_ERROR:${apiError.error}:${apiError.message}:${apiError.retryAfter || 0}`);
      }

      return data as ChatResponse;

    } catch (error) {
      console.error('API Service Error:', error);
      
      if (error instanceof Error) {
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
        headers: {
          'X-Session-ID': this.sessionId,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Method to get current session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      baseUrl: this.baseUrl,
    };
  }

  // Method to reset session (useful for testing or user logout)
  resetSession() {
    localStorage.removeItem('sage-session-id');
    this.sessionId = this.getSessionId();
  }
}

// Singleton instance
export const apiService = new ApiService();