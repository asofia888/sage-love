import { test, expect, Page } from '@playwright/test';

type ChatMock =
  | { kind: 'sse'; text: string; delayMs?: number }
  | { kind: 'error'; status: number; body: unknown; headers?: Record<string, string> };

/**
 * Override window.fetch in the page so /api/chat returns a deterministic
 * response. Mocking at the fetch layer (instead of page.route) lets us hand
 * the app a real ReadableStream for SSE, bypassing any HTTP-layer quirks
 * that may break line-ending-sensitive SSE parsing.
 */
async function installChatMock(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __chatMock?: unknown }).__chatMock = null;
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      const mock = (window as unknown as { __chatMock?: ChatMock | null })
        .__chatMock;
      if (url.includes('/api/chat') && mock) {
        if (mock.kind === 'sse') {
          if (mock.delayMs) {
            await new Promise((r) => setTimeout(r, mock.delayMs));
          }
          const encoder = new TextEncoder();
          const events = [
            `data: ${JSON.stringify({ type: 'chunk', text: mock.text })}\n\n`,
            `data: ${JSON.stringify({
              type: 'done',
              sessionId: 'test',
              cache: { hit: false, tokensSaved: 0 },
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ];
          const stream = new ReadableStream({
            start(controller) {
              for (const ev of events) controller.enqueue(encoder.encode(ev));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          });
        }
        return new Response(JSON.stringify(mock.body), {
          status: mock.status,
          headers: { 'Content-Type': 'application/json', ...(mock.headers ?? {}) },
        });
      }
      return origFetch(input, init);
    };
  });
}

async function setChatMock(page: Page, mock: ChatMock) {
  await page.evaluate((m) => {
    (window as unknown as { __chatMock: unknown }).__chatMock = m;
  }, mock);
}

test.describe('Chat Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // addInitScript fires on every navigation (including reloads), so guard
      // against wiping localStorage that tests intentionally populate.
      if (localStorage.getItem('__e2eSeeded')) return;
      localStorage.clear();
      localStorage.setItem('__e2eSeeded', '1');
      localStorage.setItem('i18nextLng', 'ja');
      localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ necessary: true, functional: false })
      );
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
    });
    await installChatMock(page);
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
    await setChatMock(page, { kind: 'sse', text: 'テストの応答です。', delayMs: 500 });

    const textarea = page.getByRole('textbox');
    await textarea.fill('テストメッセージ');
    await page.getByRole('button', { name: /送信/ }).click();

    // User message appears
    await expect(page.locator('main').getByText('テストメッセージ')).toBeVisible();

    // Welcome message disappears (messages > 0)
    await expect(page.getByText('ようこそ、真理の探究者よ。')).not.toBeVisible();

    // Input is cleared after sending
    await expect(textarea).toHaveValue('');
  });

  test('full chat round-trip: send message and receive AI response', async ({ page }) => {
    await setChatMock(page, {
      kind: 'sse',
      text: '心の平和を見つけるには、まず自分自身を受け入れることから始めましょう。',
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('心の平和とは何ですか？');
    await page.getByRole('button', { name: /送信/ }).click();

    await expect(
      page.getByText('心の平和を見つけるには、まず自分自身を受け入れることから始めましょう。')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Enter key sends message, Shift+Enter does not', async ({ page }) => {
    await setChatMock(page, { kind: 'sse', text: '応答' });

    const textarea = page.getByRole('textbox');

    // Shift+Enter must NOT send — no user bubble in <main>, input still has content
    await textarea.fill('一行目');
    await textarea.press('Shift+Enter');
    await expect(page.locator('main').getByText('一行目')).toHaveCount(0);
    await expect(textarea).not.toHaveValue('');

    // Enter sends — input clears and the message bubble renders in <main>
    await textarea.fill('送信テスト');
    await textarea.press('Enter');
    await expect(textarea).toHaveValue('');
    await expect(page.locator('main').getByText('送信テスト')).toBeVisible();
  });

  test('API error displays error banner', async ({ page }) => {
    await setChatMock(page, {
      kind: 'error',
      status: 500,
      body: { code: 'INTERNAL_ERROR', details: 'Server error' },
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('エラーテスト');
    await page.getByRole('button', { name: /送信/ }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });

  test('clear chat flow works', async ({ page }) => {
    await setChatMock(page, { kind: 'sse', text: '応答テスト' });

    const textarea = page.getByRole('textbox');
    await textarea.fill('クリアテスト');
    await page.getByRole('button', { name: /送信/ }).click();
    await expect(page.locator('main').getByText('クリアテスト')).toBeVisible();

    // Open reset dialog
    await page
      .getByRole('button', { name: /会話をクリア|チャットをクリア|clear/i })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/会話をリセット/);

    // Confirm (scope to dialog so we don't pick up the heading text)
    await dialog.getByRole('button', { name: /^リセット$/ }).click();

    // Welcome message reappears
    await expect(page.getByText('ようこそ、真理の探究者よ。')).toBeVisible();
  });

  test('help modal opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: /使い方|ヘルプ|help/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Close via Escape (more reliable than picking one of two "閉じる" buttons)
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('chat history persists across page reload', async ({ page }) => {
    await setChatMock(page, { kind: 'sse', text: '永続化テスト応答' });

    const textarea = page.getByRole('textbox');
    await textarea.fill('永続化テスト');
    await page.getByRole('button', { name: /送信/ }).click();
    await expect(page.getByText('永続化テスト応答')).toBeVisible({ timeout: 10000 });

    await page.reload();

    // Messages should persist via localStorage (addInitScript is guarded so
    // reload doesn't wipe storage; fetch mock is re-installed before scripts
    // load, but no new API calls fire from persisted history).
    await expect(page.getByText('永続化テスト')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('永続化テスト応答')).toBeVisible({ timeout: 5000 });
  });

  test('rate limit response shows appropriate error', async ({ page }) => {
    await setChatMock(page, {
      kind: 'error',
      status: 429,
      body: {
        code: 'RATE_LIMIT_EXCEEDED',
        details: 'Too many requests',
        retryAfter: 60,
      },
      headers: { 'Retry-After': '60' },
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
      if (localStorage.getItem('__e2eSeeded')) return;
      localStorage.clear();
      localStorage.setItem('__e2eSeeded', '1');
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
