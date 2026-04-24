import React, { ReactElement } from 'react';
import { vi } from 'vitest';
import { render, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MessageSender } from '../types';
import jaTranslations from '../lib/locales/ja/translation';

// Initialize i18n for tests using the real Japanese translations so tests
// can assert on real rendered text (aria-labels, placeholders, etc.)
i18n.use(initReactI18next).init({
  lng: 'ja',
  fallbackLng: 'ja',
  resources: {
    ja: { translation: jaTranslations },
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
  sender: MessageSender.USER,
  timestamp: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockChatHistory = (count = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `test-message-${i + 1}`,
    text: `テストメッセージ ${i + 1}`,
    sender: i % 2 === 0 ? MessageSender.USER : MessageSender.AI,
    timestamp: `2023-01-01T0${i}:00:00Z`,
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