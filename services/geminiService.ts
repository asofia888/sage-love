
import { type ChatMessage } from '../types';

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
        // Try to parse the error body, otherwise use status text
        const errorData = await response.json().catch(() => ({ details: response.statusText }));
        throw new Error(`API Error: ${response.status} ${errorData.details || 'Failed to fetch'}`);
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
    // Rethrow a more user-friendly error to be caught by the UI component
    throw new Error(`${error.message || 'Failed to get response from AI.'}`);
  }
}
