import { test, expect } from '@playwright/test';

test.describe('Chat Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('i18nextLng', 'ja');
      localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ necessary: true, functional: false })
      );
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
    });
    await page.goto('/');
  });

  test('displays welcome message on initial load', async ({ page }) => {
    // App title
    await expect(page.locator('h1')).toContainText('聖者の愛');

    // Welcome message from the sage
    await expect(page.getByText('ようこそ、真理の探究者よ。')).toBeVisible();
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: /送信/ });
    await expect(sendButton).toBeDisabled();
  });

  test('can type a message and enable send button', async ({ page }) => {
    const textarea = page.getByRole('textbox');
    await textarea.fill('こんにちは');

    const sendButton = page.getByRole('button', { name: /送信/ });
    await expect(sendButton).toBeEnabled();
  });

  test('sending a message shows user message and loading state', async ({ page }) => {
    // Mock the API to delay response so we can observe loading state
    await page.route('**/api/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'テストの応答です。',
          timestamp: new Date().toISOString(),
          sessionId: 'test',
          cache: { hit: false, tokensSaved: 0 },
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('テストメッセージ');
    await page.getByRole('button', { name: /送信/ }).click();

    // User message appears
    await expect(page.getByText('テストメッセージ')).toBeVisible();

    // Welcome message disappears (messages > 0)
    await expect(page.getByText('ようこそ、真理の探究者よ。')).not.toBeVisible();

    // Input is cleared after sending
    await expect(textarea).toHaveValue('');
  });

  test('full chat round-trip: send message and receive AI response', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: '心の平和を見つけるには、まず自分自身を受け入れることから始めましょう。',
          timestamp: new Date().toISOString(),
          sessionId: 'test',
          cache: { hit: false, tokensSaved: 0 },
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('心の平和とは何ですか？');
    await page.getByRole('button', { name: /送信/ }).click();

    // Wait for AI response to appear
    await expect(
      page.getByText('心の平和を見つけるには、まず自分自身を受け入れることから始めましょう。')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Enter key sends message, Shift+Enter does not', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: '応答',
          timestamp: new Date().toISOString(),
          sessionId: 'test',
          cache: { hit: false, tokensSaved: 0 },
        }),
      });
    });

    const textarea = page.getByRole('textbox');

    // Shift+Enter should NOT send (adds newline)
    await textarea.fill('一行目');
    await textarea.press('Shift+Enter');
    await expect(page.getByText('一行目')).not.toBeVisible();

    // Enter should send
    await textarea.fill('送信テスト');
    await textarea.press('Enter');
    await expect(page.getByText('送信テスト')).toBeVisible();
  });

  test('API error displays error banner', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', details: 'Server error' }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('エラーテスト');
    await page.getByRole('button', { name: /送信/ }).click();

    // Error alert should appear
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });

  test('clear chat flow works', async ({ page }) => {
    // First send a message to have something to clear
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: '応答テスト',
          timestamp: new Date().toISOString(),
          sessionId: 'test',
          cache: { hit: false, tokensSaved: 0 },
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('クリアテスト');
    await page.getByRole('button', { name: /送信/ }).click();
    await expect(page.getByText('クリアテスト')).toBeVisible();

    // Click clear chat button (trash icon button in header)
    await page.getByRole('button', { name: /チャットをクリア|クリア|clear/i }).click();

    // Confirmation modal should appear
    await expect(page.getByText(/本当に.*削除/)).toBeVisible();

    // Confirm clear
    await page.getByRole('button', { name: /削除|確認/ }).click();

    // Welcome message should reappear
    await expect(page.getByText('ようこそ、真理の探究者よ。')).toBeVisible();
  });

  test('help modal opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: /ヘルプ|help/i }).click();

    // Modal content should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /閉じる|close/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('chat history persists across page reload', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: '永続化テスト応答',
          timestamp: new Date().toISOString(),
          sessionId: 'test',
          cache: { hit: false, tokensSaved: 0 },
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('永続化テスト');
    await page.getByRole('button', { name: /送信/ }).click();
    await expect(page.getByText('永続化テスト応答')).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();

    // Messages should persist via localStorage
    await expect(page.getByText('永続化テスト')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('永続化テスト応答')).toBeVisible({ timeout: 5000 });
  });

  test('rate limit response shows appropriate error', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({
          code: 'RATE_LIMIT_EXCEEDED',
          details: 'Too many requests',
          retryAfter: 60,
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('レート制限テスト');
    await page.getByRole('button', { name: /送信/ }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Responsive & Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('i18nextLng', 'ja');
      localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ necessary: true, functional: false })
      );
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
    });
    await page.goto('/');
  });

  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('textarea is focusable and accessible', async ({ page }) => {
    const textarea = page.getByRole('textbox');
    await textarea.focus();
    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveAttribute('aria-label');
  });
});
