import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * rate-limiter の Redis 経路のユニットテスト。
 * @upstash/redis と @upstash/ratelimit をモックし、コスト上限の fail-closed、
 * 各リミッター（burst/IP/セッション）のブロック理由、fail-open を検証する。
 *
 * モジュールは読み込み時に env を見て初期化するため、各テストで
 * vi.resetModules() + 動的 import を使う。
 */

const h = vi.hoisted(() => {
  const redisMock = {
    get: vi.fn(),
    incrby: vi.fn(),
    expire: vi.fn(),
    incr: vi.fn(),
  };
  // Ratelimit の生成順: ip → burst → sessionHourly → sessionDaily
  const limiters: Array<{ limit: ReturnType<typeof vi.fn> }> = [];
  return { redisMock, limiters };
});

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => h.redisMock),
}));

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = vi.fn(() => 'sliding');
    static fixedWindow = vi.fn(() => 'fixed');
    limit = vi.fn(async () => ({ success: true, remaining: 9, reset: Date.now() + 60000 }));
    constructor() {
      h.limiters.push(this as unknown as { limit: ReturnType<typeof vi.fn> });
    }
  }
  return { Ratelimit };
});

// h.limiters のインデックス（生成順）
const IP = 0;
const BURST = 1;
const SESSION_HOURLY = 2;
const SESSION_DAILY = 3;

const COST_SCALE = 10000;

function setCosts(daily: number, hourly: number) {
  h.redisMock.get.mockImplementation(async (key: string) => {
    if (key.startsWith('cost:daily:')) return Math.round(daily * COST_SCALE);
    if (key.startsWith('cost:hourly:')) return Math.round(hourly * COST_SCALE);
    return null;
  });
}

async function loadModule() {
  return await import('@/api/rate-limiter');
}

describe('rate-limiter (Redis paths)', () => {
  afterEach(() => {
    // 同一ワーカー内の他テストファイルへ env 変更を漏らさない
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  });

  beforeEach(() => {
    vi.resetModules();
    h.limiters.length = 0;
    h.redisMock.get.mockReset();
    h.redisMock.incrby.mockReset().mockResolvedValue(1);
    h.redisMock.expire.mockReset().mockResolvedValue(1);
    h.redisMock.incr.mockReset().mockResolvedValue(1);
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
    setCosts(0, 0);
  });

  it('allows a request when costs and limiters are all under limits', async () => {
    const { shouldBlockRequest } = await loadModule();
    const result = await shouldBlockRequest('1.2.3.4', 'session-1', 100, 2);

    expect(result.blocked).toBe(false);
    expect(result.estimatedCost).toBeGreaterThan(0);
    expect(result.remainingRequests).toBeDefined();
    // 4リミッターすべて評価される（ip/burst は IP、session系は sessionId がキー）
    expect(h.limiters).toHaveLength(4);
    expect(h.limiters[IP].limit).toHaveBeenCalledWith('1.2.3.4');
    expect(h.limiters[BURST].limit).toHaveBeenCalledWith('1.2.3.4');
    expect(h.limiters[SESSION_HOURLY].limit).toHaveBeenCalledWith('session-1');
    expect(h.limiters[SESSION_DAILY].limit).toHaveBeenCalledWith('session-1');
  });

  it.each([
    [15.0, 0, 'EMERGENCY_COST_LIMIT'],
    [10.0, 0, 'DAILY_COST_LIMIT'],
    [0, 5.0, 'HOURLY_COST_LIMIT'],
  ])('blocks when cost daily=$%s hourly=$%s → %s', async (daily, hourly, reason) => {
    setCosts(daily as number, hourly as number);
    const { shouldBlockRequest } = await loadModule();
    const result = await shouldBlockRequest('1.2.3.4', 's', 100, 0);

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe(reason);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('fails CLOSED when the cost lookup itself fails (Redis outage)', async () => {
    h.redisMock.get.mockRejectedValue(new Error('redis down'));
    const { shouldBlockRequest } = await loadModule();
    const result = await shouldBlockRequest('1.2.3.4', 's', 100, 0);

    // 「使用額0」と誤認して$10/日を素通りさせない
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('COST_CHECK_UNAVAILABLE');
  });

  it.each([
    [BURST, 'BURST_LIMIT_EXCEEDED'],
    [IP, 'IP_RATE_LIMIT'],
    [SESSION_HOURLY, 'SESSION_HOURLY_LIMIT'],
    [SESSION_DAILY, 'SESSION_DAILY_LIMIT'],
  ])('blocks with the specific reason when limiter #%s rejects → %s', async (index, reason) => {
    const { shouldBlockRequest } = await loadModule();
    h.limiters[index as number].limit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30000,
    });

    const result = await shouldBlockRequest('1.2.3.4', 's', 100, 0);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe(reason);
  });

  it('fails OPEN when a limiter itself throws (does not lock out legitimate users)', async () => {
    const { shouldBlockRequest } = await loadModule();
    h.limiters[IP].limit.mockRejectedValue(new Error('limiter down'));

    const result = await shouldBlockRequest('1.2.3.4', 's', 100, 0);
    expect(result.blocked).toBe(false);
    expect(result.estimatedCost).toBeGreaterThan(0);
  });

  it('enforces content limits before any Redis access', async () => {
    const { shouldBlockRequest } = await loadModule();

    const tooLong = await shouldBlockRequest('1.2.3.4', 's', 1001, 0);
    expect(tooLong.blocked).toBe(true);
    expect(tooLong.reason).toBe('MESSAGE_TOO_LONG');

    const tooMany = await shouldBlockRequest('1.2.3.4', 's', 100, 11);
    expect(tooMany.blocked).toBe(true);
    expect(tooMany.reason).toBe('HISTORY_TOO_LONG');

    expect(h.redisMock.get).not.toHaveBeenCalled();
  });

  it('records actual cost as a scaled integer with expiry', async () => {
    const { recordActualCost } = await loadModule();
    await recordActualCost(0.05);

    // 日次・時間の両キーに INCRBY(500) + EXPIRE
    expect(h.redisMock.incrby).toHaveBeenCalledTimes(2);
    for (const call of h.redisMock.incrby.mock.calls) {
      expect(call[1]).toBe(Math.round(0.05 * COST_SCALE));
    }
    expect(h.redisMock.expire).toHaveBeenCalledTimes(2);
  });

  it('skips recording non-positive costs', async () => {
    const { recordActualCost } = await loadModule();
    await recordActualCost(0);
    expect(h.redisMock.incrby).not.toHaveBeenCalled();
  });

  it('reports usage stats from stored costs', async () => {
    setCosts(2.5, 0.5);
    const { getUsageStats } = await loadModule();
    const stats = await getUsageStats();

    expect(stats).toMatchObject({ redisConfigured: true, dailyCost: 2.5, hourlyCost: 0.5 });
    expect((stats as { remainingBudget: number }).remainingBudget).toBeCloseTo(7.5);
  });

  it('bypasses rate limiting (but not content limits) when Redis is not configured', async () => {
    vi.resetModules();
    h.limiters.length = 0;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { shouldBlockRequest, getUsageStats } = await loadModule();

    const ok = await shouldBlockRequest('1.2.3.4', 's', 100, 0);
    expect(ok.blocked).toBe(false);

    const tooLong = await shouldBlockRequest('1.2.3.4', 's', 1001, 0);
    expect(tooLong.blocked).toBe(true);
    expect(tooLong.reason).toBe('MESSAGE_TOO_LONG');

    await expect(getUsageStats()).resolves.toMatchObject({ redisConfigured: false });
  });
});
