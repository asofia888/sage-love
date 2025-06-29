import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, MessageSender } from './types';
import ChatInput from './components/ChatInput';
import ChatMessageDisplay from './components/ChatMessageDisplay';
import TextSizeSelector from './components/TextSizeSelector';
import PromptSuggestions from './components/PromptSuggestions';
import DisclaimerModal from './components/DisclaimerModal'; // Import the modal component
import * as geminiService from './services/geminiService';

const TEXT_SIZE_STORAGE_KEY = 'appTextSize';
const CHAT_HISTORY_STORAGE_KEY = 'chatHistory';

// --- Reusable UI Components ---

const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'ru', name: 'Русский' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ar', name: 'العربية' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'zh', name: '中文 (简体)' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
];

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);
  return (
    <div>
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        value={i18n.language.split('-')[0]}
        className="bg-slate-700/80 text-white text-sm rounded-md p-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow"
        aria-label={t('languageSelectorLabel')}
      >
        {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
        ))}
      </select>
    </div>
  );
};

const ClearChatButton: React.FC<{ onClear: () => void }> = ({ onClear }) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClear}
      className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-colors"
      aria-label={t('clearConversationButtonLabel')}
      title={t('clearConversationTooltip')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  );
};

const SageAvatarIcon: React.FC = () => (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    </div>
);
  
const WelcomeMessage: React.FC<{ textSize: string }> = ({ textSize }) => {
    const { t, i18n } = useTranslation();
    const textClass = textSize === 'large' ? 'text-base' : 'text-sm';
    const formattedTimestamp = new Date().toLocaleTimeString(i18n.language.split('-')[0], {
        hour: '2-digit', minute: '2-digit'
    });
    return (
        <div className="flex items-end space-x-2 rtl:space-x-reverse justify-start">
            <SageAvatarIcon />
            <div className="p-3 rounded-lg max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl bg-sky-800/75 backdrop-blur-sm shadow-lg text-slate-50 relative group">
                <p className={`${textClass}`} style={{ whiteSpace: 'pre-wrap' }}>{t('welcomeMessage')}</p>
                <p className="text-xs mt-1 text-sky-300 text-opacity-80">{formattedTimestamp}</p>
            </div>
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [textSize, setTextSize] = useState<string>(() => {
    return localStorage.getItem(TEXT_SIZE_STORAGE_KEY) || 'normal';
  });

  // Effect to update html lang and dir attributes for RTL support
  useEffect(() => {
    const currentLang = i18n.language.split('-')[0];
    document.documentElement.lang = currentLang;
    document.documentElement.dir = i18n.dir(currentLang);
  }, [i18n, i18n.language]);

  // Load chat history from localStorage
  useEffect(() => {
    if (!i18n.isInitialized) return;
    try {
        const savedHistory: ChatMessage[] = JSON.parse(localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) || '[]');
        if (savedHistory.length > 0) {
          setMessages(savedHistory.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
        } else {
          setMessages([]);
        }
    } catch(e) {
        console.error("Failed to load history:", e);
        localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
        setMessages([]);
    }
  }, [i18n.isInitialized]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    const historyToSave = messages.filter(msg => !msg.isTyping);
    if (historyToSave.length > 0) {
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(historyToSave));
    } else {
        localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
  }, [textSize]);

  const handleSetTextSize = (newSize: string) => {
    setTextSize(newSize);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    setError(null);
  };

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (isLoading) return;
    setError(null);

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: userInput,
      sender: MessageSender.USER,
      timestamp: new Date(),
    };
    
    // Capture history for the API call *before* adding the new user message to it.
    const historyForApi = [...messages];

    const aiMessageId = `ai-response-${Date.now()}`;
    const aiPlaceholderMessage: ChatMessage = {
        id: aiMessageId,
        text: '',
        sender: MessageSender.AI,
        timestamp: new Date(),
        isTyping: true,
    };
    
    setMessages(prev => [...prev, newUserMessage, aiPlaceholderMessage]);
    setIsLoading(true);

    try {
        const systemInstruction = t('systemInstructionForSage');
        const stream = geminiService.streamChat(userInput, historyForApi, systemInstruction);
        
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk;
            setMessages(prev => 
                prev.map(m => m.id === aiMessageId ? { ...m, text: fullText } : m)
            );
        }

    } catch (e: any) {
        console.error("Error calling Gemini API:", e);
        const errorMessage = e.message || t('errorMessageDefault');
        setError(`${t('errorSageResponsePrefix')}${errorMessage}`);
        // On error, remove the placeholder
        setMessages(prev => prev.filter(m => m.id !== aiMessageId));
    } finally {
        // Once the stream is finished, mark the message as not typing.
        // This handles empty streams correctly and ensures the final state is clean.
        setMessages(prev => 
            prev.map(m => m.id === aiMessageId ? { ...m, isTyping: false } : m)
        );
        setIsLoading(false);
    }
  }, [messages, isLoading, t]);


  return (
    <>
      <div className="flex flex-col h-screen bg-transparent text-slate-100">
        <header className="p-4 bg-slate-800/50 backdrop-blur-md shadow-lg sticky top-0 z-10">
          <div className="container mx-auto flex flex-col sm:flex-row items-center">
            <div className="hidden sm:flex sm:flex-1"></div>
            <div className="text-center py-1 sm:py-0">
              <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">
                {t('appName')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">{t('appSubtitle')}</p>
            </div>
            <div className="mt-2 sm:mt-0 flex items-center space-x-2 rtl:space-x-reverse sm:flex-1 sm:justify-end">
              <ClearChatButton onClear={handleClearChat} />
              <TextSizeSelector currentTextSize={textSize} onSetTextSize={handleSetTextSize} />
              <LanguageSelector />
            </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 space-y-4 bg-transparent">
          {messages.length === 0 && <WelcomeMessage textSize={textSize} />}
          {messages.map(msg => (
            <ChatMessageDisplay
              key={msg.id}
              message={msg}
              currentLang={i18n.language}
              textSize={textSize}
            />
          ))}
          <div ref={messagesEndRef} />
        </main>

        {error && (
          <div className="p-4 bg-red-700/80 text-white text-center backdrop-blur-sm" role="alert" onClick={() => setError(null)}>
            <p>{error}</p>
          </div>
        )}

        <footer className="p-4 bg-slate-800/50 backdrop-blur-md shadow-up sticky bottom-0 z-10">
          <div className="container mx-auto">
            {messages.length === 0 && !isLoading && (
              <PromptSuggestions
                onSelectPrompt={handleSendMessage}
                textSize={textSize}
              />
            )}
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            <div className="text-center mt-3 text-xs text-slate-400 flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
              <p>
                {t('buyMeACoffeeText')}{' '}
                <a 
                  href="https://buymeacoffee.com/asofia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-400 hover:text-sky-300 underline transition-colors"
                  aria-label={t('buyMeACoffeeButtonAria')}
                >
                  {t('buyMeACoffeeButton')}
                </a>
              </p>
              <p className="text-slate-500">
                <button
                  onClick={() => setIsDisclaimerOpen(true)}
                  className="underline hover:text-sky-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1"
                >
                  {t('disclaimerLinkText')}
                </button>
              </p>
            </div>
          </div>
        </footer>
      </div>
      <DisclaimerModal isOpen={isDisclaimerOpen} onClose={() => setIsDisclaimerOpen(false)} />
    </>
  );
};

export default App;
