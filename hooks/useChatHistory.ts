
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';

const CHAT_HISTORY_STORAGE_KEY = 'chatHistory';

export function useChatHistory(isI18nInitialized: boolean): [
    ChatMessage[], 
    React.Dispatch<React.SetStateAction<ChatMessage[]>>, 
    () => void
] {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on initial mount
    useEffect(() => {
        if (!isI18nInitialized) return;
        try {
            const item = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
            const savedHistory: any[] = item ? JSON.parse(item) : [];
            
            if (savedHistory.length > 0) {
                setMessages(savedHistory.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
            }
        } catch (e) {
            console.error("Failed to load history:", e);
            localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
            setMessages([]);
        } finally {
            setIsLoaded(true);
        }
    }, [isI18nInitialized]);

    // Save to localStorage whenever messages change, but only after initial load
    useEffect(() => {
        if (!isLoaded) return;
        
        const historyToSave = messages.filter(msg => !msg.isTyping);
        if (historyToSave.length > 0) {
            localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(historyToSave));
        } else {
            localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
        }
    }, [messages, isLoaded]);

    const clearChat = useCallback(() => {
        setMessages([]);
        localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    }, []);

    return [messages, setMessages, clearChat];
}
