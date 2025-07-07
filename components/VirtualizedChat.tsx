import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ChatMessageDisplay from './ChatMessageDisplay';
import { ChatMessage } from '../types';

interface VirtualizedChatProps {
  messages: ChatMessage[];
  textSize: string;
  currentLang: string;
}

const ITEM_HEIGHT = 120; // メッセージの平均高さ（px）
const BUFFER_SIZE = 5; // 上下に表示する追加アイテム数
const VIRTUALIZATION_THRESHOLD = 20; // 仮想化を開始するメッセージ数

/**
 * 大量メッセージに対応した仮想化チャットコンポーネント
 * パフォーマンス最適化のためにビューポート内のメッセージのみレンダリング
 */
const VirtualizedChat: React.FC<VirtualizedChatProps> = ({
  messages,
  textSize,
  currentLang
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // 仮想化が必要かどうか判定
  const shouldVirtualize = messages.length > VIRTUALIZATION_THRESHOLD;

  // スクロール位置とビューポートの状態管理
  const viewportInfo = useMemo(() => {
    if (!shouldVirtualize || !containerRef.current) {
      return {
        scrollTop: 0,
        viewportHeight: 0,
        startIndex: 0,
        endIndex: messages.length,
        visibleItems: messages.length
      };
    }

    const scrollTop = scrollPositionRef.current;
    const viewportHeight = containerRef.current.clientHeight || 600;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const visibleItems = Math.ceil(viewportHeight / ITEM_HEIGHT) + (BUFFER_SIZE * 2);
    const endIndex = Math.min(messages.length, startIndex + visibleItems);

    return {
      scrollTop,
      viewportHeight,
      startIndex,
      endIndex,
      visibleItems
    };
  }, [messages.length, shouldVirtualize]);

  // 表示するメッセージの計算
  const visibleMessages = useMemo(() => {
    if (!shouldVirtualize) {
      return messages.map((message, index) => ({ message, index }));
    }

    return messages
      .slice(viewportInfo.startIndex, viewportInfo.endIndex)
      .map((message, relativeIndex) => ({
        message,
        index: viewportInfo.startIndex + relativeIndex
      }));
  }, [messages, viewportInfo, shouldVirtualize]);

  // スクロールハンドラー
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    scrollPositionRef.current = target.scrollTop;
    
    // パフォーマンス追跡
    if (window.gtag && shouldVirtualize) {
      window.gtag('event', 'virtualized_scroll', {
        event_category: 'performance',
        scroll_position: target.scrollTop,
        total_messages: messages.length,
        visible_messages: visibleMessages.length
      });
    }
  }, [shouldVirtualize, messages.length, visibleMessages.length]);

  // 最下部への自動スクロール
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      const totalHeight = messages.length * ITEM_HEIGHT;
      containerRef.current.scrollTop = totalHeight;
      scrollPositionRef.current = totalHeight;
    }
  }, [messages.length]);

  // 新しいメッセージが追加された時の自動スクロール
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // ユーザーが最下部近くにいる場合のみ自動スクロール
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        
        if (isNearBottom || lastMessage.role === 'user') {
          requestAnimationFrame(scrollToBottom);
        }
      }
    }
  }, [messages.length, scrollToBottom]);

  // 仮想化されていない場合の通常レンダリング
  if (!shouldVirtualize) {
    return (
      <div 
        ref={containerRef}
        className="space-y-4"
        onScroll={handleScroll}
      >
        {messages.map((message, index) => (
          <ChatMessageDisplay
            key={message.id}
            message={message}
            currentLang={currentLang}
            textSize={textSize}
          />
        ))}
      </div>
    );
  }

  // 仮想化レンダリング
  const totalHeight = messages.length * ITEM_HEIGHT;
  const offsetY = viewportInfo.startIndex * ITEM_HEIGHT;

  return (
    <div 
      ref={containerRef}
      className="relative overflow-y-auto"
      style={{ height: '100%' }}
      onScroll={handleScroll}
    >
      {/* パフォーマンス情報表示（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-2 text-xs z-50 rounded">
          <div>Virtual: {shouldVirtualize ? 'ON' : 'OFF'}</div>
          <div>Total: {messages.length}</div>
          <div>Visible: {visibleMessages.length}</div>
          <div>Range: {viewportInfo.startIndex}-{viewportInfo.endIndex}</div>
        </div>
      )}

      {/* 仮想スクロール用の全体の高さを確保 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 表示されるメッセージ */}
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <div className="space-y-4">
            {visibleMessages.map(({ message, index }) => (
              <div
                key={message.id}
                style={{ 
                  minHeight: ITEM_HEIGHT,
                  // メッセージの推定高さに基づく最適化
                  height: 'auto'
                }}
              >
                <ChatMessageDisplay
                  message={message}
                  currentLang={currentLang}
                  textSize={textSize}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedChat;