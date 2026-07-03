import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitBreaker, CircuitState } from '@/api/circuit-breaker';
import { CircuitBreakerError } from '@/api/errors';

/**
 * サーキットブレーカーの状態遷移テスト。
 * CLOSED→OPEN→HALF_OPEN→CLOSED の一巡と、監視ウィンドウによる失敗カウントの
 * 減衰（fake timersで時間を進めて検証）をカバーする。
 */

const CONFIG = {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 1000, // 1秒でHALF_OPEN試行可
  monitoringPeriod: 5000, // 5秒で失敗カウント減衰
};

const failingCall = () => Promise.reject(new Error('upstream failure'));
const succeedingCall = () => Promise.resolve('ok');

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new CircuitBreaker(CONFIG);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays CLOSED below the failure threshold and passes results through', async () => {
    await expect(breaker.execute(succeedingCall)).resolves.toBe('ok');
    await expect(breaker.execute(failingCall)).rejects.toThrow('upstream failure');
    await expect(breaker.execute(failingCall)).rejects.toThrow('upstream failure');

    const stats = breaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failureCount).toBe(2);
  });

  it('opens after consecutive failures reach the threshold and rejects fast', async () => {
    for (let i = 0; i < CONFIG.failureThreshold; i++) {
      await expect(breaker.execute(failingCall)).rejects.toThrow('upstream failure');
    }
    expect(breaker.getStats().state).toBe(CircuitState.OPEN);

    // OPEN中は上流を呼ばずに即座に拒否する
    const fn = vi.fn(succeedingCall);
    await expect(breaker.execute(fn)).rejects.toBeInstanceOf(CircuitBreakerError);
    expect(fn).not.toHaveBeenCalled();
    expect(breaker.getStats().rejectedRequests).toBe(1);
  });

  it('a success resets the consecutive-failure count while CLOSED', async () => {
    await expect(breaker.execute(failingCall)).rejects.toThrow();
    await expect(breaker.execute(failingCall)).rejects.toThrow();
    await expect(breaker.execute(succeedingCall)).resolves.toBe('ok');
    // 直前の成功でカウントは0に戻っているため、あと2回の失敗では開かない
    await expect(breaker.execute(failingCall)).rejects.toThrow();
    await expect(breaker.execute(failingCall)).rejects.toThrow();

    expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
  });

  it('decays stale failures outside the monitoring period', async () => {
    await expect(breaker.execute(failingCall)).rejects.toThrow();
    await expect(breaker.execute(failingCall)).rejects.toThrow();

    // 監視ウィンドウを超えて時間が経過した後の失敗は「1回目」として数える
    vi.advanceTimersByTime(CONFIG.monitoringPeriod + 1);
    await expect(breaker.execute(failingCall)).rejects.toThrow();

    const stats = breaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failureCount).toBe(1);
  });

  it('transitions OPEN → HALF_OPEN after the timeout and closes after enough successes', async () => {
    for (let i = 0; i < CONFIG.failureThreshold; i++) {
      await expect(breaker.execute(failingCall)).rejects.toThrow();
    }
    expect(breaker.getStats().state).toBe(CircuitState.OPEN);

    vi.advanceTimersByTime(CONFIG.timeout + 1);

    // 試行1回目: HALF_OPENで上流を実際に呼ぶ
    await expect(breaker.execute(succeedingCall)).resolves.toBe('ok');
    expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

    // successThreshold回の成功でCLOSEDへ復帰
    await expect(breaker.execute(succeedingCall)).resolves.toBe('ok');
    expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
  });

  it('re-opens immediately when the HALF_OPEN trial fails', async () => {
    for (let i = 0; i < CONFIG.failureThreshold; i++) {
      await expect(breaker.execute(failingCall)).rejects.toThrow();
    }
    vi.advanceTimersByTime(CONFIG.timeout + 1);

    await expect(breaker.execute(failingCall)).rejects.toThrow('upstream failure');
    expect(breaker.getStats().state).toBe(CircuitState.OPEN);

    // 再びタイムアウト前は即拒否
    await expect(breaker.execute(succeedingCall)).rejects.toBeInstanceOf(CircuitBreakerError);
  });

  it('reset() returns the breaker to a clean CLOSED state', async () => {
    for (let i = 0; i < CONFIG.failureThreshold; i++) {
      await expect(breaker.execute(failingCall)).rejects.toThrow();
    }
    expect(breaker.getStats().state).toBe(CircuitState.OPEN);

    breaker.reset();
    const stats = breaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failureCount).toBe(0);
    await expect(breaker.execute(succeedingCall)).resolves.toBe('ok');
  });
});
