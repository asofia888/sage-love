
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { type ChatMessage, MessageSender } from '../types';

export const config = {
  runtime: 'edge',
};

// Helper function to convert frontend history to API format
const toApiHistory = (messages: ChatMessage[]): { role: string; parts: { text: string }[] }[] => {
    return messages
      .filter(msg => !msg.isTyping && !msg.id.startsWith('welcome-'))
      .map(msg => ({
        role: msg.sender === MessageSender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
};

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
      return new Response(JSON.stringify({ error: 'API key is not configured on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash-preview-04-17',
        history: toApiHistory(history || []),
        config: {
            systemInstruction: systemInstruction || 'You are a helpful assistant.',
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
        }
    });

    const result = await chat.sendMessageStream({ message });

    // Create a new ReadableStream to pipe the Gemini stream to the client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of result) {
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
    console.error('Error in Vercel Edge Function:', error);
    return new Response(JSON.stringify({ error: 'Failed to get response from AI', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
