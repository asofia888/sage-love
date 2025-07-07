

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ChatInput from './components/ChatInput';
import ChatMessageDisplay from './components/ChatMessageDisplay';
import VirtualizedChat from './components/VirtualizedChat';
import TextSizeSelector from './components/TextSizeSelector';
import PromptSuggestions from './components/PromptSuggestions';
import LanguageSelector from './components/LanguageSelector';
import ClearChatButton from './components/ClearChatButton';
import ShareButton from './components/ShareButton';
import WelcomeMessage from './components/WelcomeMessage';
import HelpButton from './components/HelpButton';
import SEOContent from './components/SEOContent';
import GoogleAnalytics from './components/GoogleAnalytics';
import PerformanceMonitor from './components/PerformanceMonitor';
import MultilingualSEO from './components/MultilingualSEO';

// Lazy load modal components
const DisclaimerModal = React.lazy(() => import('./components/DisclaimerModal'));
const ConfirmationModal = React.lazy(() => import('./components/ConfirmationModal'));
const HelpModal = React.lazy(() => import('./components/HelpModal'));
const CrisisInterventionModal = React.lazy(() => import('./components/CrisisInterventionModal'));
const PrivacyPolicyModal = React.lazy(() => import('./components/PrivacyPolicyModal'));
const TermsOfServiceModal = React.lazy(() => import('./components/TermsOfServiceModal'));
import { useChatHistory } from './hooks/useChatHistory';
import { useTextSize } from './hooks/useTextSize';
import { useMessageHandler } from './hooks/useMessageHandler';


// --- Main App Component ---

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState<boolean>(false);
  const [isTermsOfServiceOpen, setIsTermsOfServiceOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
  const [textSize, setTextSize] = useTextSize();
  const [messages, setMessages, clearChat, memoryStats] = useChatHistory(i18n.isInitialized);
  
  // メッセージハンドリングロジックを分離
  const { 
    handleSendMessage, 
    isLoading, 
    error, 
    setError,
    isCrisisModalOpen,
    closeCrisisModal,
    lastCrisisResult
  } = useMessageHandler({
    messages,
    setMessages
  });


  // 翻訳サービスの初期化（安全のためサーバーサイドAPI経由で実行）
  useEffect(() => {
    // API Keyはサーバーサイドでのみ使用、フロントエンドでは初期化不要
    // geminiService.initializeTranslationService(apiKey); // 削除
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


  return (
    <>
      <GoogleAnalytics />
      <PerformanceMonitor memoryStats={memoryStats} />
      <MultilingualSEO />
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
          <div className="container mx-auto max-w-4xl">
            {messages.length === 0 && <WelcomeMessage textSize={textSize} />}
            {messages.length > 0 && (
              <VirtualizedChat
                messages={messages}
                textSize={textSize}
                currentLang={i18n.language}
              />
            )}
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
              <div className="hidden sm:block">
                <PromptSuggestions
                  onSelectPrompt={handleSendMessage}
                  textSize={textSize}
                />
              </div>
            )}
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            <div className="text-center mt-3 text-xs text-slate-200">
              {/* Mobile: Vertical layout */}
              <div className="sm:hidden">
                <div className="mb-2">
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
                </div>
                <div className="text-slate-300 flex flex-col justify-center items-center gap-2">
                  <div className="flex flex-row gap-4">
                    <button
                      onClick={() => setIsDisclaimerOpen(true)}
                      className="underline hover:text-sky-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1"
                    >
                      {t('disclaimerLinkText')}
                    </button>
                    <button
                      onClick={() => setIsPrivacyPolicyOpen(true)}
                      className="underline hover:text-sky-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1"
                    >
                      {t('privacyPolicyLinkText')}
                    </button>
                  </div>
                  <button
                    onClick={() => setIsTermsOfServiceOpen(true)}
                    className="underline hover:text-sky-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1"
                  >
                    {t('termsOfServiceLinkText')}
                  </button>
                </div>
              </div>
              {/* PC: Horizontal layout */}
              <div className="hidden sm:flex sm:justify-center sm:items-center sm:gap-6 text-slate-300">
                <div className="bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 rounded-lg px-3 py-2 hover:from-sky-500/15 hover:to-indigo-500/15 hover:border-sky-400/30 transition-all duration-200 hover:scale-105">
                  <p className="text-sm">
                    {t('buyMeACoffeeText')}{' '}
                    <a 
                      href="https://buymeacoffee.com/asofia" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-semibold text-sky-400 hover:text-sky-300 underline decoration-2 underline-offset-2 transition-colors"
                      aria-label={t('buyMeACoffeeButtonAria')}
                    >
                      {t('buyMeACoffeeButton')}
                    </a>
                  </p>
                </div>
                <button
                  onClick={() => setIsDisclaimerOpen(true)}
                  className="underline hover:text-sky-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1"
                >
                  {t('disclaimerLinkText')}
                </button>
                <button
                  onClick={() => setIsPrivacyPolicyOpen(true)}
                  className="underline hover:text-sky-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1"
                >
                  {t('privacyPolicyLinkText')}
                </button>
                <button
                  onClick={() => setIsTermsOfServiceOpen(true)}
                  className="underline hover:text-sky-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1"
                >
                  {t('termsOfServiceLinkText')}
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <React.Suspense fallback={<div />}>
        <DisclaimerModal isOpen={isDisclaimerOpen} onClose={() => setIsDisclaimerOpen(false)} />
        <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} />
        <TermsOfServiceModal isOpen={isTermsOfServiceOpen} onClose={() => setIsTermsOfServiceOpen(false)} />
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
        
        {/* Crisis Intervention Modal */}
        {lastCrisisResult && (
          <CrisisInterventionModal
            isOpen={isCrisisModalOpen}
            onClose={closeCrisisModal}
            crisisResult={lastCrisisResult}
            userLanguage={i18n.language}
            userCountry={navigator.language.split('-')[1] || 'JP'}
          />
        )}
      </React.Suspense>
      
      {/* SEO Content - hidden from display but crawlable */}
      <SEOContent />
    </>
  );
};

export default App;
