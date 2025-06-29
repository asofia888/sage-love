

import React, { useState } from 'react';
import { ChatMessage, MessageSender } from '../types';
import { useTranslation } from 'react-i18next';
import SageLoadingIndicator from './SageLoadingIndicator'; // Import the new component

const SageAvatarIcon: React.FC = () => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  </div>
);

const UserAvatarIcon: React.FC = () => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-md flex-shrink-0" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </div>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    {/* Heroicons clipboard icon path */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

interface ChatMessageDisplayProps {
  message: ChatMessage;
  currentLang: string;
  textSize: string;
}

const ChatMessageDisplay: React.FC<ChatMessageDisplayProps> = ({ message, currentLang, textSize }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  const isUser = message.sender === MessageSender.USER;
  const messageAlignment = isUser ? 'justify-end' : 'justify-start';

  // Handling for AI typing indicator: show only if AI is typing AND there's no text yet.
  if (message.sender === MessageSender.AI && message.isTyping && !message.text) {
    return (
      <div className={`flex items-end space-x-2 rtl:space-x-reverse ${messageAlignment} py-2`}>
        <SageAvatarIcon />
        <SageLoadingIndicator />
      </div>
    );
  }
  
  const bubbleBaseStyle = 'backdrop-blur-sm shadow-lg text-slate-50';
  const userBubbleColor = 'bg-emerald-800/75';
  const aiBubbleColor = 'bg-sky-800/75';
  const bubbleColor = isUser ? userBubbleColor : aiBubbleColor;

  const formattedTimestamp = message.timestamp.toLocaleTimeString(currentLang.split('-')[0], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const textClass = textSize === 'large' ? 'text-base' : 'text-sm';

  const handleCopy = async () => {
    if (!message.text) return;
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Revert icon after 2 seconds
    } catch (err) {
      console.error('Failed to copy message: ', err);
      // Optional: Show an error tooltip or message to the user
    }
  };

  const showCopyButton = !isUser && !message.id.startsWith('welcome-');

  return (
    <div
      className={`flex items-end space-x-2 rtl:space-x-reverse ${messageAlignment}`}
      aria-atomic="true"
    >
      {!isUser && <SageAvatarIcon />}
      <div className={`p-3 rounded-lg max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl ${bubbleColor} ${bubbleBaseStyle} relative group`}>
        
        {showCopyButton && (
          <button
            onClick={handleCopy}
            className="absolute top-1.5 end-1.5 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:ring-opacity-75 transition-all duration-150 ease-in-out"
            aria-label={t('copyMessageButtonLabel')}
            title={isCopied ? t('messageCopiedTooltip') : t('copyMessageButtonLabel')}
          >
            {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
          </button>
        )}
        
        <p className={`${textClass} ${showCopyButton ? 'pe-8' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-emerald-300' : 'text-sky-300'} text-opacity-80`}>
          {formattedTimestamp}
        </p>
      </div>
      {isUser && <UserAvatarIcon />}
    </div>
  );
};

export default ChatMessageDisplay;