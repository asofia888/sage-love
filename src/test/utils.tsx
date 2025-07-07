import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Initialize i18n for tests
i18n.use(initReactI18next).init({
  lng: 'ja',
  fallbackLng: 'ja',
  resources: {
    ja: {
      translation: {
        appName: 'テストアプリ',
        appSubtitle: 'テストサブタイトル',
        chatPlaceholder: 'メッセージを入力してください',
        sendButton: '送信',
        sendingButton: '送信中...',
        clearChatButton: 'チャットをクリア',
        confirmClearTitle: 'チャットをクリアしますか？',
        confirmClearText: 'この操作は取り消せません。',
        confirmClearButton: 'クリア',
        cancelButton: 'キャンセル',
        helpButton: 'ヘルプ',
        shareButton: 'シェア',
        errorMessageDefault: 'エラーが発生しました',
        errorSageResponsePrefix: 'エラー: ',
        systemInstructionForSage: 'あなたは聖者です。',
        welcomeMessageTitle: 'ようこそ',
        welcomeMessageContent: 'こんにちは、私は聖者です。',
        textSizeSmall: '小',
        textSizeMedium: '中',
        textSizeLarge: '大',
        languageJapanese: '日本語',
        languageEnglish: 'English',
        languageSpanish: 'Español',
        languagePortuguese: 'Português',
        disclaimerLinkText: '免責事項',
        privacyPolicyLinkText: 'プライバシーポリシー',
        termsOfServiceLinkText: '利用規約',
        buyMeACoffeeText: '応援してください',
        buyMeACoffeeButton: 'コーヒーを買う',
        buyMeACoffeeButtonAria: 'コーヒーを買って応援',
        voiceInputButton: '音声入力',
        voiceInputButtonAria: '音声入力を開始',
        voiceInputStarted: '音声入力が開始されました',
        voiceInputStopped: '音声入力が停止されました',
        voiceInputError: '音声入力エラー',
        voiceInputNotSupported: '音声入力はサポートされていません'
      }
    }
  },
  interpolation: {
    escapeValue: false,
  },
});

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// Mock data factory functions
export const createMockMessage = (overrides = {}) => ({
  id: 'test-message-1',
  text: 'テストメッセージ',
  sender: 'user' as const,
  timestamp: new Date('2023-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockChatHistory = (count = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `test-message-${i + 1}`,
    text: `テストメッセージ ${i + 1}`,
    sender: (i % 2 === 0 ? 'user' : 'ai') as const,
    timestamp: new Date(`2023-01-01T0${i}:00:00Z`),
  }));
};

export const createMockApiResponse = (overrides = {}) => ({
  message: 'テスト応答',
  timestamp: new Date().toISOString(),
  sessionId: 'test-session-123',
  ...overrides,
});

export const createMockCrisisResult = (overrides = {}) => ({
  isCrisis: false,
  severity: 'low' as const,
  detectedKeywords: [],
  triggerPatterns: [],
  recommendedAction: 'monitor' as const,
  ...overrides,
});

// Mock fetch helper
export const mockFetch = (response: any, ok = true) => {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(response),
  });
};