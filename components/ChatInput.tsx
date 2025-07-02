

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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

  return (
    <form onSubmit={handleSubmit} className="flex items-start space-x-2 rtl:space-x-reverse">
      <textarea
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('chatPlaceholder')}
        aria-label={t('chatPlaceholder')}
        className="flex-grow p-3 border border-slate-600/70 rounded-lg bg-slate-800/60 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder-slate-400 shadow-sm transition-colors duration-200 backdrop-blur-sm"
        rows={2}
        disabled={isLoading}
        style={{ minHeight: '3rem', maxHeight: '10rem' }}
      />
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
  );
};

export default ChatInput;