

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import VoiceInputButton from './VoiceInputButton';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStopStreaming?: () => void;
}

// 送信アイコン（紙飛行機）
const SendIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

// 停止アイコン（四角）
const StopIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, onStopStreaming }) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換確定のEnter（isComposing中）では送信しない
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
    setVoiceError(null);
    
    if (isFinal) {
      // 最終的な認識結果
      setInputValue(prev => {
        const newValue = prev.trim() ? `${prev} ${transcript}` : transcript;
        return newValue;
      });
      setIsVoiceInput(false);
      
      // フォーカスをテキストエリアに戻す
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
      // 中間的な認識結果（リアルタイム表示）
      setIsVoiceInput(true);
      // 中間結果は inputValue に直接は反映せず、プレースホルダー的に表示
    }
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
    setIsVoiceInput(false);
    
    // エラーメッセージを3秒後に自動で消去
    setTimeout(() => {
      setVoiceError(null);
    }, 3000);
  };

  return (
    <div className="space-y-2">
      {/* エラーメッセージ表示 */}
      {voiceError && (
        <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {voiceError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isVoiceInput ? t('chatVoiceListening') : t('chatPlaceholder')}
            aria-label={t('chatPlaceholder')}
            className={`w-full p-3 pr-20 border border-slate-600/70 rounded-lg bg-slate-800/60 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder-slate-300 shadow-sm transition-colors duration-200 backdrop-blur-sm ${isVoiceInput ? 'bg-indigo-900/30 border-indigo-500/50' : ''}`}
            rows={2}
            disabled={isLoading}
            style={{ minHeight: '3rem', maxHeight: '10rem' }}
          />
          
          {/* 右側のボタン群 */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {/* 音声入力ボタン */}
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              onError={handleVoiceError}
              disabled={isLoading}
              className="bg-slate-700/50 hover:bg-slate-600/50 backdrop-blur-sm"
            />
            
            {/* 送信/停止ボタン: ストリーミング中は停止ボタンに切り替わる */}
            {isLoading && onStopStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                aria-label={t('stopGeneratingButton')}
                title={t('stopGeneratingButton')}
                className="p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-500/90 hover:bg-red-600 text-white shadow-md hover:shadow-lg animate-pulse"
              >
                <StopIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                aria-label={t('sendButton')}
                className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isLoading || !inputValue.trim()
                    ? 'bg-slate-600/50 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg'
                }`}
              >
                <SendIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;