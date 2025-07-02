

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, ApiError, MessageSender } from './types';
import ChatInput from './components/ChatInput';
import ChatMessageDisplay from './components/ChatMessageDisplay';
import TextSizeSelector from './components/TextSizeSelector';
import PromptSuggestions from './components/PromptSuggestions';
import DisclaimerModal from './components/DisclaimerModal';
import LanguageSelector from './components/LanguageSelector';
import ClearChatButton from './components/ClearChatButton';
import ShareButton from './components/ShareButton';
import WelcomeMessage from './components/WelcomeMessage';
import ConfirmationModal from './components/ConfirmationModal';
import HelpModal from './components/HelpModal';
import HelpButton from './components/HelpButton';
import { useChatHistory } from './hooks/useChatHistory';
import { useTextSize } from './hooks/useTextSize';
import * as geminiService from './services/geminiService';
import { DuplicateAvoidanceService } from './services/duplicateAvoidanceService';


// --- Main App Component ---

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
  const [textSize, setTextSize] = useTextSize();
  const [messages, setMessages, clearChat] = useChatHistory(i18n.isInitialized);


  // 翻訳サービスの初期化
  useEffect(() => {
    // 環境変数からAPI Keyを取得（実際の実装では適切な方法で）
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || 'demo-key';
    geminiService.initializeTranslationService(apiKey);
  }, []);

  // Effect to update html lang, dir, and OGP url attributes for RTL/sharing support
  useEffect(() => {
    const currentLang = i18n.language.split('-')[0];
    document.documentElement.lang = currentLang;
    document.documentElement.dir = i18n.dir(currentLang);

    // Update the og:url meta tag with the canonical URL for better sharing previews
    const canonicalUrl = new URL(window.location.pathname, window.location.origin).href;
    const ogUrlMeta = document.querySelector('meta[property="og:url"]');
    if (ogUrlMeta) {
      ogUrlMeta.setAttribute('content', canonicalUrl);
    }
  }, [i18n, i18n.language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleClearChat = () => {
    setIsClearConfirmOpen(true);
  };
  
  const confirmClearChat = () => {
    clearChat();
    setError(null);
    setIsClearConfirmOpen(false);
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
        // 基本システムプロンプトに重複回避指示を追加
        const baseSystemInstruction = t('systemInstructionForSage');
        const duplicateAvoidancePrompt = DuplicateAvoidanceService.generateDuplicateAvoidancePrompt(historyForApi);
        const enhancedSystemInstruction = baseSystemInstruction + duplicateAvoidancePrompt;
        
        const currentLang = i18n.language.split('-')[0];
        const stream = geminiService.streamChatWithTranslation(
            userInput, 
            historyForApi, 
            enhancedSystemInstruction,
            currentLang
        );
        
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk;
            setMessages(prev => 
                prev.map(m => m.id === aiMessageId ? { ...m, text: fullText } : m)
            );
        }

        // 応答完了後に多様性を評価
        const aiResponses = historyForApi
            .filter(msg => msg.sender === 'ai' && !msg.isTyping)
            .map(msg => msg.text);
        
        const diversityEvaluation = DuplicateAvoidanceService.evaluateResponseDiversity(
            fullText, 
            aiResponses
        );

        // デバッグ情報をコンソールに出力
        if (diversityEvaluation.diversityScore < 0.5) {
            console.warn('応答の多様性が低い可能性があります:', {
                diversityScore: diversityEvaluation.diversityScore,
                suggestions: diversityEvaluation.suggestions
            });
        }

    } catch (e: any) {
        console.error("Error calling Gemini API:", e);
        const apiError: ApiError = e && e.code ? e : { code: 'errorMessageDefault', details: String(e) };
        setError(apiError);
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
  }, [messages, isLoading, t, setMessages]);


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
              <p className="text-xs sm:text-sm text-slate-200">{t('appSubtitle')}</p>
            </div>
            <div className="mt-2 sm:mt-0 flex items-center space-x-2 rtl:space-x-reverse sm:flex-1 sm:justify-end">
              <HelpButton onClick={() => setIsHelpOpen(true)} />
              <ShareButton />
              <ClearChatButton onClear={handleClearChat} />
              <TextSizeSelector currentTextSize={textSize} onSetTextSize={setTextSize} />
              <LanguageSelector />
            </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 bg-transparent">
          <div className="container mx-auto max-w-4xl space-y-4">
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
          </div>
        </main>

        {error && (
          <div className="p-4 bg-red-700/80 text-white text-center backdrop-blur-sm" role="alert" onClick={() => setError(null)}>
             <p>{t('errorSageResponsePrefix')}{t(error.code) || t('errorMessageDefault')}</p>
          </div>
        )}

        <footer className="p-4 bg-slate-800/50 backdrop-blur-md shadow-up sticky bottom-0 z-10">
          <div className="container mx-auto max-w-4xl">
            {messages.length === 0 && !isLoading && (
              <PromptSuggestions
                onSelectPrompt={handleSendMessage}
                textSize={textSize}
              />
            )}
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            <div className="text-center mt-3 text-xs text-slate-200 flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
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
              <p className="text-slate-300">
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
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ConfirmationModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearChat}
        title={t('confirmClearTitle')}
        confirmText={t('confirmClearButton')}
        cancelText={t('cancelButton')}
      >
        <p>{t('confirmClearText')}</p>
      </ConfirmationModal>
    </>
  );
};

export default App;
