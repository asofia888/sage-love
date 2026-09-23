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
      // 初回訪問の免責モーダルは全操作を塞ぐので、既読として扱う。
      // 「初回に出る」こと自体は専用のテストで検証する。
      localStorage.setItem('disclaimerAcknowledged', new Date().toISOString());
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
    // AI応答テキストは <main> 外の aria-live リージョンにも複製されるため、
    // チャット本文（main内）にスコープして一意にマッチさせる
    await expect(page.locator('main').getByText('永続化テスト応答')).toBeVisible({ timeout: 10000 });

    await page.reload();

    // Messages should persist via localStorage (addInitScript is guarded so
    // reload doesn't wipe storage; fetch mock is re-installed before scripts
    // load, but no new API calls fire from persisted history).
    // exact: true — 部分一致だと「永続化テスト応答」にもマッチして strict mode violation になる
    await expect(page.getByText('永続化テスト', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('main').getByText('永続化テスト応答')).toBeVisible({ timeout: 5000 });
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

/**
 * 危機介入フローは、このアプリでもっとも安全性が高い経路でありながら
 * e2e が1件も無かった。以下は「利用者が打ち明けたときに、窓口が実際に
 * 画面に出るところまで」を通しで押さえる。
 */
test.describe('Crisis intervention E2E', () => {
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
      localStorage.setItem('disclaimerAcknowledged', new Date().toISOString());
    });
    await installChatMock(page);
    await page.goto('/');
  });

  test('危機的な発言で介入モーダルが開き、相談窓口が1件以上表示される', async ({ page }) => {
    await setChatMock(page, { kind: 'sse', text: 'その苦しさを、わたしは聞いている。' });

    await page.getByRole('textbox').fill('死にたい');
    await page.getByRole('button', { name: /送信/ }).click();

    // critical は遅延なしで即座に開く
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText('重要なお知らせ');

    // 窓口の見出しだけが出て中身が空、という状態にならないこと。
    // 地域データの絞り込みで候補が0件になる不具合が以前あったため、
    // 電話番号かリンクが実際に1つ以上描画されていることまで確認する。
    await expect(dialog).toContainText('今すぐ利用できる相談窓口');
    const contacts = dialog.locator('a[href^="tel:"], a[href^="http"]');
    expect(await contacts.count()).toBeGreaterThan(0);
  });

  test('モーダルを閉じても会話は続けられる', async ({ page }) => {
    await setChatMock(page, { kind: 'sse', text: 'その苦しさを、わたしは聞いている。' });

    await page.getByRole('textbox').fill('死にたい');
    await page.getByRole('button', { name: /送信/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /理解しました/ }).click();
    await expect(dialog).not.toBeVisible();

    // 応答は届いており、入力欄も使える
    await expect(
      page.locator('main').getByText('その苦しさを、わたしは聞いている。')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('textbox')).toBeEditable();
  });

  test('危機的でない発言では介入モーダルは出ない', async ({ page }) => {
    await setChatMock(page, { kind: 'sse', text: '良い問いである。' });

    await page.getByRole('textbox').fill('今日はいい天気ですね');
    await page.getByRole('button', { name: /送信/ }).click();

    await expect(page.locator('main').getByText('良い問いである。')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

/**
 * 初回訪問時の免責提示と、Cookie 設定の再オープン導線。
 */
test.describe('First visit and consent E2E', () => {
  test('初回訪問では免責モーダルが自動で出て、閉じると再訪時は出ない', async ({ page }) => {
    await page.addInitScript(() => {
      // addInitScript は reload でも再実行される。ガードしないと
      // 「免責を閉じた」記録まで消えてしまい、再訪の検証にならない。
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

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText('免責事項');

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    await page.reload();
    await expect(page.getByRole('textbox')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('フッターの Cookie 設定から同意バナーを開き直せる', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('__e2eSeeded')) return;
      localStorage.clear();
      localStorage.setItem('__e2eSeeded', '1');
      localStorage.setItem('i18nextLng', 'ja');
      localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ necessary: true, functional: true })
      );
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
      localStorage.setItem('disclaimerAcknowledged', new Date().toISOString());
    });
    await installChatMock(page);
    await page.goto('/');

    // 同意済みなのでバナーは出ていない
    await expect(page.getByText('Cookieの使用について')).not.toBeVisible();
    const saveButton = page.getByRole('button', { name: '設定を保存' });
    await expect(saveButton).not.toBeVisible();

    // フッターの導線はモバイル/PCで二重にあるため、見えている方を押す
    await page
      .locator('footer')
      .getByRole('button', { name: 'Cookie設定' })
      .filter({ visible: true })
      .first()
      .click();

    // 撤回が目的なので、トグル付きの詳細ビューが直接開く
    await expect(saveButton).toBeVisible();

    // 現在の同意状態がトグルに反映されている
    const toggle = page.getByRole('checkbox', { name: '機能Cookie' });
    await expect(toggle).toBeChecked();

    // input 自体は sr-only（1x1 に clip され、見た目の div に覆われている）ため
    // 直接クリックしても状態が変わらない（firefox/webkit で実際に落ちた）。
    // 利用者と同じく、input を包むラベルを押す。
    await page.locator('label:has(input[type="checkbox"])').click();
    await expect(toggle).not.toBeChecked();

    await saveButton.click();
    await expect(saveButton).not.toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem('cookieConsent'));
    expect(JSON.parse(stored ?? '{}').functional).toBe(false);
  });
});
