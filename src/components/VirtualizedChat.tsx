import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import ChatMessageDisplay from './ChatMessageDisplay';
import { ChatMessage, MessageSender } from '../types';

interface VirtualizedChatProps {
  messages: ChatMessage[];
  textSize: string;
  currentLang: string;
}

/**
 * react-virtuoso ベースの仮想化チャットリスト。動的高さ・スクロール位置保持・
 * followOutput による自動スクロールはすべてライブラリ側が面倒を見てくれるので、
 * ここではメッセージ配列から ChatMessageDisplay を生やすだけに留める。
 */
const VirtualizedChat: React.FC<VirtualizedChatProps> = ({
  messages,
  textSize,
  currentLang,
}) => {
  return (
    <Virtuoso
      style={{ height: '100%' }}
      data={messages}
      initialTopMostItemIndex={Math.max(0, messages.length - 1)}
      computeItemKey={(_, message) => message.id}
      followOutput={(isAtBottom) => {
        // ユーザー自身の送信後は常に最下部まで滑らかにスクロール。
        // アシスタントの応答中は、ユーザーがすでに最下部にいる場合のみ追従する
        // （履歴を遡って読んでいる最中に強制スクロールしないため）。
        const last = messages[messages.length - 1];
        if (last?.sender === MessageSender.USER) return 'smooth';
        return isAtBottom ? 'smooth' : false;
      }}
      itemContent={(_, message) => (
        <div className="py-2">
          <ChatMessageDisplay
            message={message}
            currentLang={currentLang}
            textSize={textSize}
          />
        </div>
      )}
    />
  );
};

export default VirtualizedChat;
