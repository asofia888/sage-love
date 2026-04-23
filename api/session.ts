/**
 * Server-issued HMAC-signed session cookie.
 *
 * Why: the previous X-Session-ID header was client-controlled and could be
 * rotated freely to bypass per-session rate limits. The ID is now generated
 * server-side, signed with SESSION_SECRET, and stored in an HttpOnly cookie
 * the client cannot forge or inspect.
 */

const SESSION_COOKIE_NAME = 'sid';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return base64url(signature);
}

// Constant-time string comparison to avoid timing side-channels on the HMAC check.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) {
      try {
        out[name] = decodeURIComponent(value);
      } catch {
        out[name] = value;
      }
    }
  }
  return out;
}

function buildSetCookie(value: string): string {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join('; ');
}

export interface SessionResult {
  /** Stable, server-controlled identifier used for rate-limiting keys. */
  sessionId: string;
  /** Non-empty only when a new cookie must be sent on the response. */
  setCookie?: string;
  isNew: boolean;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'SESSION_SECRET env var is required (min 16 chars). ' +
      'Generate with: openssl rand -base64 32'
    );
  }
  return secret;
}

/**
 * Verify an existing session cookie, or mint a new one. The returned
 * sessionId is safe to use as a rate-limit key because the client cannot
 * produce a valid HMAC without SESSION_SECRET.
 */
export async function getOrCreateSession(req: Request): Promise<SessionResult> {
  const secret = getSecret();
  const cookies = parseCookies(req.headers.get('cookie'));
  const existing = cookies[SESSION_COOKIE_NAME];

  if (existing) {
    const dotIdx = existing.lastIndexOf('.');
    if (dotIdx > 0) {
      const id = existing.slice(0, dotIdx);
      const sig = existing.slice(dotIdx + 1);
      // Shape check before constant-time compare keeps malformed cookies cheap.
      if (/^[A-Za-z0-9_-]{16,32}$/.test(id) && /^[A-Za-z0-9_-]+$/.test(sig)) {
        const expected = await hmac(secret, id);
        if (timingSafeEqual(sig, expected)) {
          return { sessionId: id, isNew: false };
        }
      }
    }
  }

  const id = randomSessionId();
  const sig = await hmac(secret, id);
  const value = `${id}.${sig}`;
  return { sessionId: id, setCookie: buildSetCookie(value), isNew: true };
}

/**
 * Append a Set-Cookie header to a Response when a new session was minted.
 * Returns the original Response when no cookie needs to be written.
 */
export function attachSessionCookie(res: Response, session: SessionResult): Response {
  if (!session.setCookie) return res;
  const headers = new Headers(res.headers);
  headers.append('Set-Cookie', session.setCookie);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
