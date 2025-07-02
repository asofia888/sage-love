

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  isTyping?: boolean; // Added to indicate AI is "typing" or generating response
}

export interface ApiError {
  code: string;
  details?: string;
}