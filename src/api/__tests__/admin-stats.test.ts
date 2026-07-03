import { describe, it, expect, beforeEach, afterEach } from 'vitest';

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-api-key-12345';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-for-vitest-0123456789';

const statsHandler = await import('../../../api/admin/stats');

const TOKEN = 'test-admin-token-abcdef';

function statsRequest(auth?: string, method = 'GET'): Request {
  return new Request('http://localhost/api/admin/stats', {
    method,
    headers: auth ? { Authorization: auth } : {},
  });
}

describe('Admin stats endpoint', () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = TOKEN;
  });

  afterEach(() => {
    process.env.ADMIN_TOKEN = TOKEN;
  });

  it('rejects non-GET requests', async () => {
    const response = await statsHandler.default(statsRequest(`Bearer ${TOKEN}`, 'POST'));
    expect(response.status).toBe(405);
  });

  it('fails closed (500) when ADMIN_TOKEN is not configured', async () => {
    delete process.env.ADMIN_TOKEN;
    const response = await statsHandler.default(statsRequest(`Bearer ${TOKEN}`));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('CONFIGURATION_ERROR');
  });

  it('rejects a missing or wrong bearer token', async () => {
    const missing = await statsHandler.default(statsRequest());
    expect(missing.status).toBe(401);

    const wrong = await statsHandler.default(statsRequest('Bearer wrong-token'));
    expect(wrong.status).toBe(401);

    // 長さが同じでも中身が違えば拒否される（定数時間比較の等価性）
    const sameLength = await statsHandler.default(
      statsRequest(`Bearer ${'x'.repeat(TOKEN.length)}`)
    );
    expect(sameLength.status).toBe(401);
  });

  it('returns usage, limits, reset times and circuit breaker stats for a valid token', async () => {
    const response = await statsHandler.default(statsRequest(`Bearer ${TOKEN}`));
    expect(response.status).toBe(200);

    const data = await response.json();
    // 実装のコスト上限値と一致していること
    expect(data.limits).toMatchObject({
      dailyCostLimit: 10.0,
      hourlyCostLimit: 5.0,
      emergencyStopLimit: 15.0,
      maxMessageLength: 1000,
    });
    expect(data.resetTimes.dailyResetIn).toBeGreaterThan(0);
    expect(data.resetTimes.hourlyResetIn).toBeGreaterThan(0);
    expect(data.usage).toBeDefined();
    expect(data.circuitBreaker.state).toBeDefined();
    expect(typeof data.circuitBreaker.totalRequests).toBe('number');
    expect(data.environment).toHaveProperty('valid');
  });
});
