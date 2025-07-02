

import { type ChatMessage, type ApiError } from '../types';

/**
 * Calls the backend API to get a streaming chat response.
 * @param message The latest user message.
 * @param history The previous chat history.
 * @param systemInstruction The system instruction for the AI.
 * @returns An async generator that yields the text chunks of the AI's response.
 */
export async function* streamChat(
    message: string, 
    history: ChatMessage[],
    systemInstruction: string
): AsyncGenerator<string, void, unknown> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        systemInstruction
      }),
    });

    if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({ 
            code: 'errorMessageDefault', 
            details: response.statusText 
        }));
        // Create an error object that matches our ApiError structure
        const error = new Error(errorData.details || 'Failed to fetch') as Error & ApiError;
        error.code = errorData.code;
        throw error;
    }

    if (!response.body) {
        throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        // The 'stream: true' option is not needed for TextDecoder's decode method
        // as it correctly handles streaming chunks by default.
        yield decoder.decode(value);
    }

  } catch (error: any) {
    console.error('Error calling backend API:', error);
    // Rethrow the structured error to be caught by the UI component
    throw error;
  }
}