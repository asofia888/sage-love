
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '../types';
import { STORAGE } from '../config/constants';
import { storage } from '../lib/storage';
import { analytics } from '../lib/analytics';

// メッセージ数制限チェックとトリム（フックに依存しない純粋なロジック）
function trimMessagesIfNeeded(messageList: ChatMessage[]): ChatMessage[] {
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
}

// 保存フォーマットのスキーマバージョン。将来メッセージ構造を変えたら
// この値を上げ、loadInitialMessages のマイグレーション分岐を追加する。
const SCHEMA_VERSION = 1;

interface StoredHistory {
    v: number;
    messages: unknown[];
}

// 保存済みデータから生メッセージ配列を取り出す。
// v0（バージョン無しの素の配列）も後方互換で受け入れ、次回保存時に現行版へ移行する。
function extractRawMessages(parsed: unknown): unknown[] {
    if (Array.isArray(parsed)) {
        return parsed; // legacy v0
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as StoredHistory).messages)) {
        return (parsed as StoredHistory).messages;
    }
    return [];
}

// 現行スキーマのシリアライズ文字列を作る（保存とdedup比較で共用）
function serializeHistory(messages: ChatMessage[]): string {
    return JSON.stringify({ v: SCHEMA_VERSION, messages });
}

// localStorageから履歴を同期的に読み込む（useStateの遅延初期化用）
function loadInitialMessages(): ChatMessage[] {
    try {
        const item = storage.getRaw(STORAGE.CHAT_HISTORY_KEY);
        if (!item) return [];

        const rawMessages = extractRawMessages(JSON.parse(item));
        if (rawMessages.length === 0) return [];

        const loadedMessages = (rawMessages as Array<Record<string, unknown>>).map(msg => ({
            ...msg,
            // 旧形式データも含めISO文字列に正規化（型は string）
            timestamp: typeof msg.timestamp === 'string'
                ? msg.timestamp
                : new Date((msg.timestamp as number | undefined) ?? Date.now()).toISOString()
        })) as unknown as ChatMessage[];

        return trimMessagesIfNeeded(loadedMessages);
    } catch (e) {
        console.error("Failed to load history:", e);
        storage.remove(STORAGE.CHAT_HISTORY_KEY);

        // Analytics tracking for errors
        analytics.trackError(e instanceof Error ? e : 'Unknown error', 'chat_history_load');
        return [];
    }
}

export function useChatHistory(_isI18nInitialized: boolean): [
    ChatMessage[],
    React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    () => void
] {
    // 遅延初期化で同期的に読み込む（effect内setStateを避け、初期描画から履歴を表示）
    const [messages, setMessages] = useState<ChatMessage[]>(loadInitialMessages);
    // 直前に保存したシリアライズ済みデータ。ストリーミング中は保存対象
    // （isTyping除外後）が変わらないため、同一内容の再書き込みをスキップする
    const lastSavedRef = useRef<string | null>(null);

    // メッセージ設定時の最適化版セッター
    const optimizedSetMessages = useCallback((newMessages: React.SetStateAction<ChatMessage[]>) => {
        setMessages(prevMessages => {
            const updated = typeof newMessages === 'function' ? newMessages(prevMessages) : newMessages;
            return trimMessagesIfNeeded(updated);
        });
    }, []);

    // Save to localStorage with size checking
    useEffect(() => {
        const startTime = performance.now();

        try {
            const historyToSave = messages.filter(msg => !msg.isTyping);

            if (historyToSave.length > 0) {
                const dataString = serializeHistory(historyToSave);

                // ストリーミング中のチャンク更新等で内容が変わっていなければ書き込まない
                if (dataString === lastSavedRef.current) return;

                const dataSize = new Blob([dataString]).size;

                // ストレージサイズ制限チェック
                if (dataSize > STORAGE.SIZE_LIMIT) {
                    console.warn(`Storage size limit exceeded (${dataSize} bytes). Trimming history.`);

                    // さらにトリムして保存
                    const furtherTrimmed = historyToSave.slice(-STORAGE.TRIM_TO_MESSAGES * 0.8);
                    const trimmedString = serializeHistory(furtherTrimmed);
                    storage.setRaw(STORAGE.CHAT_HISTORY_KEY, trimmedString);
                    lastSavedRef.current = trimmedString;

                    // Analytics tracking
                    analytics.trackEvent('storage_limit_exceeded', {
                        event_category: 'performance',
                        data_size: dataSize,
                        limit: STORAGE.SIZE_LIMIT
                    });
                } else {
                    storage.setRaw(STORAGE.CHAT_HISTORY_KEY, dataString);
                    lastSavedRef.current = dataString;
                }
            } else {
                storage.remove(STORAGE.CHAT_HISTORY_KEY);
                lastSavedRef.current = null;
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
    }, [messages]);

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

    return [messages, optimizedSetMessages, clearChat];
}
