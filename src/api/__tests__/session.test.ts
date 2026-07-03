import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getOrCreateSession,
  attachSessionCookie,
  timingSafeEqual,
} from '@/api/session';

/**
 * HMAC署名セッションCookieのユニットテスト。
 * 「クライアントは有効なCookieを偽造できない」というセキュリティ核を直接検証する。
 */

const SECRET = 'test-secret-0123456789abcdef';

function requestWithCookie(cookie?: string): Request {
  return new Request('https://example.com/api/chat', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });
}

/** Set-Cookieヘッダ文字列から sid の値（デコード済み）を取り出す */
function cookieValueFrom(setCookie: string): string {
  const match = setCookie.match(/^sid=([^;]+)/);
  expect(match).not.toBeNull();
  return decodeURIComponent(match![1]);
}

describe('session (HMAC-signed cookie)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
  });

  afterEach(() => {
    // 「未設定/短すぎ」のテスト後も、同一ワーカーの他ファイルへ影響させない
    process.env.SESSION_SECRET = SECRET;
  });

  it('mints a new session with a hardened Set-Cookie when no cookie is sent', async () => {
    const session = await getOrCreateSession(requestWithCookie());

    expect(session.isNew).toBe(true);
    expect(session.sessionId).toMatch(/^[A-Za-z0-9_-]{16,32}$/);
    expect(session.setCookie).toBeDefined();
    // Cookie属性のセキュリティ要件
    expect(session.setCookie).toContain('HttpOnly');
    expect(session.setCookie).toContain('Secure');
    expect(session.setCookie).toContain('SameSite=Lax');
    expect(session.setCookie).toContain('Path=/');
    expect(session.setCookie).toMatch(/Max-Age=\d+/);
  });

  it('accepts a validly signed cookie and returns the same sessionId', async () => {
    const first = await getOrCreateSession(requestWithCookie());
    const cookieValue = cookieValueFrom(first.setCookie!);

    const second = await getOrCreateSession(
      requestWithCookie(`sid=${encodeURIComponent(cookieValue)}`)
    );

    expect(second.isNew).toBe(false);
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.setCookie).toBeUndefined();
  });

  it('rejects a cookie with a tampered signature and mints a new session', async () => {
    const first = await getOrCreateSession(requestWithCookie());
    const cookieValue = cookieValueFrom(first.setCookie!);

    // 署名の末尾1文字を改ざん
    const lastChar = cookieValue.slice(-1);
    const flipped = lastChar === 'A' ? 'B' : 'A';
    const tampered = cookieValue.slice(0, -1) + flipped;

    const result = await getOrCreateSession(
      requestWithCookie(`sid=${encodeURIComponent(tampered)}`)
    );

    expect(result.isNew).toBe(true);
    expect(result.sessionId).not.toBe(first.sessionId);
    expect(result.setCookie).toBeDefined();
  });

  it('rejects a cookie whose id was swapped (signature no longer matches)', async () => {
    const a = await getOrCreateSession(requestWithCookie());
    const b = await getOrCreateSession(requestWithCookie());
    const aValue = cookieValueFrom(a.setCookie!);
    const bValue = cookieValueFrom(b.setCookie!);

    // bのIDにaの署名を付けたキメラCookie
    const bId = bValue.slice(0, bValue.lastIndexOf('.'));
    const aSig = aValue.slice(aValue.lastIndexOf('.') + 1);
    const chimera = `${bId}.${aSig}`;

    const result = await getOrCreateSession(
      requestWithCookie(`sid=${encodeURIComponent(chimera)}`)
    );
    expect(result.isNew).toBe(true);
  });

  it('rejects malformed cookies (no dot / bad charset) and mints a new session', async () => {
    for (const bad of ['garbage', 'no-dot-here', 'id.', '.sig', 'id with spaces.sig', 'a.b']) {
      const result = await getOrCreateSession(requestWithCookie(`sid=${bad}`));
      expect(result.isNew).toBe(true);
    }
  });

  it('rejects cookies signed with a different secret', async () => {
    const first = await getOrCreateSession(requestWithCookie());
    const cookieValue = cookieValueFrom(first.setCookie!);

    process.env.SESSION_SECRET = 'another-secret-0123456789abcdef';
    const result = await getOrCreateSession(
      requestWithCookie(`sid=${encodeURIComponent(cookieValue)}`)
    );
    expect(result.isNew).toBe(true);
  });

  it('throws when SESSION_SECRET is missing or too short', async () => {
    delete process.env.SESSION_SECRET;
    await expect(getOrCreateSession(requestWithCookie())).rejects.toThrow(/SESSION_SECRET/);

    process.env.SESSION_SECRET = 'short';
    await expect(getOrCreateSession(requestWithCookie())).rejects.toThrow(/SESSION_SECRET/);
  });

  describe('timingSafeEqual', () => {
    it('returns true only for identical strings', () => {
      expect(timingSafeEqual('abcdef', 'abcdef')).toBe(true);
      expect(timingSafeEqual('abcdef', 'abcdeg')).toBe(false);
      expect(timingSafeEqual('abcdef', 'abcde')).toBe(false);
      expect(timingSafeEqual('', '')).toBe(true);
    });
  });

  describe('attachSessionCookie', () => {
    it('appends Set-Cookie for a new session and preserves status/body', async () => {
      const session = await getOrCreateSession(requestWithCookie());
      const res = new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      const withCookie = attachSessionCookie(res, session);
      expect(withCookie.status).toBe(201);
      expect(withCookie.headers.get('Set-Cookie')).toContain('sid=');
      expect(withCookie.headers.get('Content-Type')).toBe('application/json');
      await expect(withCookie.json()).resolves.toEqual({ ok: true });
    });

    it('returns the response unchanged when no cookie needs to be set', () => {
      const res = new Response('ok');
      const session = { sessionId: 'existing', isNew: false };
      expect(attachSessionCookie(res, session)).toBe(res);
    });
  });
});
