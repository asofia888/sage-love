

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import VoiceInputButton from './VoiceInputButton';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

// Simple inline SVG for loading spinner for button
const ButtonLoadingSpinner: React.FC = () => (
  <svg className="animate-spin ltr:-ml-1 ltr:mr-3 rtl:-mr-1 rtl:ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
      
      <form onSubmit={handleSubmit} className="flex items-start space-x-2 rtl:space-x-reverse">
        <div className="flex-grow relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isVoiceInput ? '音声認識中...' : t('chatPlaceholder')}
            aria-label={t('chatPlaceholder')}
            className={`w-full p-3 pr-12 border border-slate-600/70 rounded-lg bg-slate-800/60 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder-slate-300 shadow-sm transition-colors duration-200 backdrop-blur-sm ${isVoiceInput ? 'bg-indigo-900/30 border-indigo-500/50' : ''}`}
            rows={2}
            disabled={isLoading}
            style={{ minHeight: '3rem', maxHeight: '10rem' }}
          />
          
          {/* 音声入力ボタン（テキストエリア内に配置） */}
          <div className="absolute right-2 bottom-2">
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              onError={handleVoiceError}
              disabled={isLoading}
              className="bg-slate-700/50 hover:bg-slate-600/50 backdrop-blur-sm"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          aria-label={isLoading ? t('sendingButton') : t('sendButton')}
          className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out flex items-center justify-center h-[3rem] min-h-[3rem]"
        >
        {isLoading ? (
          <>
            <ButtonLoadingSpinner />
            {t('sendingButton')}
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 ltr:mr-2 rtl:ml-2 rtl:transform rtl:scale-x-[-1]" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            {t('sendButton')}
          </>
        )}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;