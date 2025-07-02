
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Content } from '@google/genai';
import { type ChatMessage, MessageSender } from '../types';

export const config = {
  runtime: 'edge',
};

// Helper function to convert frontend history to API format
const toApiHistory = (messages: ChatMessage[]): Content[] => {
    return messages
      .filter(msg => !msg.isTyping && !msg.id.startsWith('welcome-'))
      .map(msg => ({
        role: msg.sender === MessageSender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
};

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
    const { message, history, systemInstruction } = await req.json();

    if (!process.env.API_KEY) {
      throw new Error('API key is not configured on the server.');
    }

    if (!message) {
      return new Response(JSON.stringify({ code: 'errorGeneric', details: 'Message is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Combine history and new message for a stateless API call
    const contents: Content[] = [
      ...toApiHistory(history || []),
      { role: 'user', parts: [{ text: message }] }
    ];

    const resultStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: contents,
        config: {
            systemInstruction: systemInstruction || 'You are a helpful assistant.',
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
        }
    });

    // Create a new ReadableStream to pipe the Gemini stream to the client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of resultStream) {
          const chunkText = chunk.text;
          if (chunkText) {
            controller.enqueue(encoder.encode(chunkText));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error: any) {
    return handleError(error);
  }
}
