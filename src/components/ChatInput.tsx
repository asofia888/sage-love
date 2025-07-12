

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import VoiceInputButton from './VoiceInputButton';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
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

// 送信中のローディングスピナー
const SendingSpinner: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={`${className} animate-spin`}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
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
            placeholder={isVoiceInput ? '音声認識中...' : t('chatPlaceholder')}
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
            
            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              aria-label={isLoading ? t('sendingButton') : t('sendButton')}
              className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                isLoading || !inputValue.trim()
                  ? 'bg-slate-600/50 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <SendingSpinner className="w-5 h-5" />
              ) : (
                <SendIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;