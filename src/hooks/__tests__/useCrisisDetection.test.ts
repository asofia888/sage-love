import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '../../test/utils'; // i18n をテスト用に初期化する（副作用 import）
import { useCrisisDetection } from '@/hooks/useCrisisDetection';

// 実データ上の深刻度（src/data/crisisKeywords）
const CRITICAL_MESSAGE = '死にたい';
const HIGH_MESSAGE = 'リストカット';
const NEUTRAL_MESSAGE = '今日はいい天気だ';

const HIGH_DELAY = 3000;
const CRITICAL_COOLDOWN = 2 * 60 * 1000;
const HIGH_COOLDOWN = 10 * 60 * 1000;

function setup(options = {}) {
  return renderHook(() => useCrisisDetection({ enabled: true, autoShowModal: true, ...options }));
}

/** 単発検出を走らせ、遅延表示のタイマーも進める */
function send(hook: ReturnType<typeof setup>, message: string, advanceMs = HIGH_DELAY) {
  act(() => {
    hook.result.current.checkForCrisis(message);
  });
  act(() => {
    vi.advanceTimersByTime(advanceMs);
  });
}

function close(hook: ReturnType<typeof setup>) {
  act(() => {
    hook.result.current.closeCrisisModal();
  });
}

describe('useCrisisDetection のモーダル表示ポリシー', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('critical は即座にモーダルを開く', () => {
    const hook = setup();
    send(hook, CRITICAL_MESSAGE, 0);
    expect(hook.result.current.isCrisisModalOpen).toBe(true);
  });

  it('high は遅延のあとに開く', () => {
    const hook = setup();
    act(() => {
      hook.result.current.checkForCrisis(HIGH_MESSAGE);
    });
    expect(hook.result.current.isCrisisModalOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(HIGH_DELAY);
    });
    expect(hook.result.current.isCrisisModalOpen).toBe(true);
  });

  it('危機でないメッセージでは開かない', () => {
    const hook = setup();
    send(hook, NEUTRAL_MESSAGE);
    expect(hook.result.current.isCrisisModalOpen).toBe(false);
  });

  /**
   * これがこのフックで最も重要な不変条件。
   * 以前は全深刻度で1本のカウンタを共有していたため、
   * セッション前半の medium/high が枠を使い切ると、
   * あとから来た critical で緊急窓口が一切出なかった。
   */
  it('非 critical が表示枠を使い切っても critical は必ず開く', () => {
    const hook = setup({ maxModalsPerSession: 1 });

    // 非 critical の枠（1回）を使い切る
    send(hook, HIGH_MESSAGE);
    expect(hook.result.current.isCrisisModalOpen).toBe(true);
    close(hook);

    // 枠を使い切っていることの確認: 2回目の high は開かない
    act(() => {
      vi.advanceTimersByTime(HIGH_COOLDOWN + 1000);
    });
    send(hook, HIGH_MESSAGE);
    expect(hook.result.current.isCrisisModalOpen).toBe(false);

    // それでも critical は開く
    send(hook, CRITICAL_MESSAGE, 0);
    expect(hook.result.current.isCrisisModalOpen).toBe(true);
  });

  it('critical はセッション中に何度でも開ける（クールダウンを挟めば）', () => {
    const hook = setup({ maxModalsPerSession: 1 });

    for (let i = 0; i < 5; i++) {
      send(hook, CRITICAL_MESSAGE, 0);
      expect(hook.result.current.isCrisisModalOpen, `${i + 1} 回目`).toBe(true);
      close(hook);
      act(() => {
        vi.advanceTimersByTime(CRITICAL_COOLDOWN + 1000);
      });
    }
  });

  it('critical でもクールダウン中は開き直さない', () => {
    const hook = setup();

    send(hook, CRITICAL_MESSAGE, 0);
    close(hook);

    act(() => {
      vi.advanceTimersByTime(CRITICAL_COOLDOWN / 2);
    });
    send(hook, CRITICAL_MESSAGE, 0);
    expect(hook.result.current.isCrisisModalOpen).toBe(false);
  });

  it('深刻度ごとに表示回数を数える（high の消費が critical を減らさない）', () => {
    const hook = setup({ maxModalsPerSession: 4 });

    // high を上限（3回）まで消費する
    for (let i = 0; i < 3; i++) {
      send(hook, HIGH_MESSAGE);
      close(hook);
      act(() => {
        vi.advanceTimersByTime(HIGH_COOLDOWN + 1000);
      });
    }

    // 4回目の high は high 側の上限で止まる
    send(hook, HIGH_MESSAGE);
    expect(hook.result.current.isCrisisModalOpen).toBe(false);

    // critical は影響を受けない
    send(hook, CRITICAL_MESSAGE, 0);
    expect(hook.result.current.isCrisisModalOpen).toBe(true);
  });

  it('resetCrisisHistory で表示回数の記録も戻る', () => {
    const hook = setup({ maxModalsPerSession: 1 });

    send(hook, HIGH_MESSAGE);
    close(hook);

    act(() => {
      hook.result.current.resetCrisisHistory();
    });

    send(hook, HIGH_MESSAGE);
    expect(hook.result.current.isCrisisModalOpen).toBe(true);
  });

  describe('複数ターン評価（checkMessageHistory）', () => {
    const userMsg = (text: string) => ({
      id: `u-${text}`,
      text,
      sender: 'user' as const,
      timestamp: new Date().toISOString(),
    });

    it('流れとして現れた危機でモーダルを開く', () => {
      const hook = setup();
      act(() => {
        hook.result.current.checkMessageHistory([
          userMsg(CRITICAL_MESSAGE),
          userMsg('そうかもしれない'),
        ] as never);
      });
      expect(hook.result.current.isCrisisModalOpen).toBe(true);
    });

    /**
     * 以前はパターン経路だけクールダウンを見ておらず、
     * 悪化が続くあいだ毎ターン開き直していた。
     */
    it('クールダウン中は開き直さない', () => {
      const hook = setup();
      const history = [userMsg(CRITICAL_MESSAGE), userMsg('そうかもしれない')] as never;

      act(() => {
        hook.result.current.checkMessageHistory(history);
      });
      close(hook);

      act(() => {
        vi.advanceTimersByTime(CRITICAL_COOLDOWN / 2);
        hook.result.current.checkMessageHistory(history);
      });
      expect(hook.result.current.isCrisisModalOpen).toBe(false);
    });
  });
});
