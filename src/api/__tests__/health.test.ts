import { describe, it, expect, beforeEach, afterEach } from 'vitest';

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-api-key-12345';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-for-vitest-0123456789';

const healthHandler = await import('../../../api/health');

describe('Health endpoint', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const KEYS = ['GEMINI_API_KEY', 'SESSION_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];

  beforeEach(() => {
    for (const k of KEYS) savedEnv[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it('rejects non-GET requests', async () => {
    const response = await healthHandler.default(new Request('http://localhost/api/health', { method: 'POST' }));
    expect(response.status).toBe(405);
  });

  it('reports healthy with service configuration flags', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const response = await healthHandler.default(new Request('http://localhost/api/health'));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.configValid).toBe(true);
    expect(data.services.gemini_api).toBe('configured');
    expect(data.services.redis).toBe('not_configured');
    expect(data.timestamp).toBeDefined();
  });

  it('reports degraded when a required env var is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await healthHandler.default(new Request('http://localhost/api/health'));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('degraded');
    expect(data.configValid).toBe(false);
    expect(data.services.gemini_api).toBe('not_configured');
  });
});
