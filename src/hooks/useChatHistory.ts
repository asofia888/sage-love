
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage } from '../types';
import { STORAGE } from '../config/constants';
import { storage } from '../lib/storage';
import { analytics } from '../lib/analytics';

export function useChatHistory(isI18nInitialized: boolean): [
    ChatMessage[],
    React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    () => void,
    { totalMessages: number; memoryUsage: number; isNearLimit: boolean }
] {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // メモリ使用量とメタデータを計算
    const memoryStats = useMemo(() => {
        const jsonString = JSON.stringify(messages);
        const memoryUsage = new Blob([jsonString]).size;
        const isNearLimit = memoryUsage > STORAGE.SIZE_LIMIT * 0.8; // 80%に達したら警告

        return {
            totalMessages: messages.length,
            memoryUsage,
            isNearLimit
        };
    }, [messages]);

    // メッセージ数制限チェックとトリム
    const trimMessagesIfNeeded = useCallback((messageList: ChatMessage[]): ChatMessage[] => {
        if (messageList.length <= STORAGE.MAX_MESSAGES) {
            return messageList;
        }

        console.warn(`Message history exceeded ${STORAGE.MAX_MESSAGES} messages. Trimming to ${STORAGE.TRIM_TO_MESSAGES} most recent messages.`);

        // 最新のメッセージを保持（ユーザーメッセージとアシスタントメッセージのペアを維持）
        const trimmed = messageList.slice(-STORAGE.TRIM_TO_MESSAGES);

        // Analytics tracking for performance monitoring
        analytics.trackEvent('chat_history_trimmed', {
            event_category: 'performance',
            original_count: messageList.length,
            trimmed_count: trimmed.length,
            memory_usage: new Blob([JSON.stringify(messageList)]).size
        });

        return trimmed;
    }, []);

    // Load from localStorage on initial mount
    useEffect(() => {
        if (!isI18nInitialized) return;

        const startTime = performance.now();

        try {
            const item = storage.getRaw(STORAGE.CHAT_HISTORY_KEY);
            const savedHistory: any[] = item ? JSON.parse(item) : [];

            if (savedHistory.length > 0) {
                const loadedMessages = savedHistory.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));

                // メッセージ数制限チェック
                const trimmedMessages = trimMessagesIfNeeded(loadedMessages);
                setMessages(trimmedMessages);
            }
        } catch (e) {
            console.error("Failed to load history:", e);
            storage.remove(STORAGE.CHAT_HISTORY_KEY);
            setMessages([]);

            // Analytics tracking for errors
            analytics.trackError(e instanceof Error ? e : 'Unknown error', 'chat_history_load');
        } finally {
            setIsLoaded(true);

            const loadTime = performance.now() - startTime;
            console.log(`Chat history loaded in ${loadTime.toFixed(2)}ms`);

            // Analytics tracking for load performance
            analytics.trackPerformance('chat_history_load_time', loadTime);
        }
    }, [isI18nInitialized, trimMessagesIfNeeded]);

    // メッセージ設定時の最適化版セッター
    const optimizedSetMessages = useCallback((newMessages: React.SetStateAction<ChatMessage[]>) => {
        setMessages(prevMessages => {
            const updated = typeof newMessages === 'function' ? newMessages(prevMessages) : newMessages;
            return trimMessagesIfNeeded(updated);
        });
    }, [trimMessagesIfNeeded]);

    // Save to localStorage with size checking
    useEffect(() => {
        if (!isLoaded) return;

        const startTime = performance.now();

        try {
            const historyToSave = messages.filter(msg => !msg.isTyping);

            if (historyToSave.length > 0) {
                const dataString = JSON.stringify(historyToSave);
                const dataSize = new Blob([dataString]).size;

                // ストレージサイズ制限チェック
                if (dataSize > STORAGE.SIZE_LIMIT) {
                    console.warn(`Storage size limit exceeded (${dataSize} bytes). Trimming history.`);

                    // さらにトリムして保存
                    const furtherTrimmed = historyToSave.slice(-STORAGE.TRIM_TO_MESSAGES * 0.8);
                    storage.set(STORAGE.CHAT_HISTORY_KEY, furtherTrimmed);

                    // Analytics tracking
                    analytics.trackEvent('storage_limit_exceeded', {
                        event_category: 'performance',
                        data_size: dataSize,
                        limit: STORAGE.SIZE_LIMIT
                    });
                } else {
                    storage.setRaw(STORAGE.CHAT_HISTORY_KEY, dataString);
                }
            } else {
                storage.remove(STORAGE.CHAT_HISTORY_KEY);
            }

            const saveTime = performance.now() - startTime;
            if (saveTime > 10) { // 10ms以上かかった場合のみログ
                console.log(`Chat history saved in ${saveTime.toFixed(2)}ms`);
            }

        } catch (e) {
            console.error("Failed to save history:", e);

            // Analytics tracking for save errors
            analytics.trackError(e instanceof Error ? e : 'Unknown error', 'chat_history_save');
        }
    }, [messages, isLoaded]);

    const clearChat = useCallback(() => {
        const previousCount = messages.length;
        setMessages([]);
        storage.remove(STORAGE.CHAT_HISTORY_KEY);

        // Analytics tracking
        analytics.trackEvent('chat_cleared', {
            event_category: 'user_interaction',
            previous_message_count: previousCount
        });
    }, [messages.length]);

    return [messages, optimizedSetMessages, clearChat, memoryStats];
}
