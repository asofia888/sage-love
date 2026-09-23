import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  readCookieConsent,
  saveCookieConsent,
  reopenCookieConsent,
  onCookieConsentReopen,
  onCookieConsentChange,
  useCookieConsent,
} from '@/hooks/useCookieConsent';

const CONSENT_KEY = 'cookieConsent';
const DATE_KEY = 'cookieConsentDate';

describe('readCookieConsent', () => {
  beforeEach(() => localStorage.clear());

  it('未保存なら null（=未同意）', () => {
    expect(readCookieConsent()).toBeNull();
  });

  it('保存した設定を読み戻せる', () => {
    saveCookieConsent({ necessary: true, functional: true });
    expect(readCookieConsent()).toEqual({ necessary: true, functional: true });
  });

  it('necessary は常に true に倒す', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ necessary: false, functional: false }));
    localStorage.setItem(DATE_KEY, new Date().toISOString());
    expect(readCookieConsent()?.necessary).toBe(true);
  });

  /** functional が壊れていたら計測を回してはいけないので未同意に倒す */
  it.each([
    ['functional が boolean でない', JSON.stringify({ necessary: true, functional: 'yes' })],
    ['JSON として壊れている', '{ not json'],
    ['null', 'null'],
  ])('%s の場合は null', (_label, stored) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(CONSENT_KEY, stored);
    localStorage.setItem(DATE_KEY, new Date().toISOString());
    expect(readCookieConsent()).toBeNull();
  });

  describe('有効期限', () => {
    it('保存から1年以内なら有効', () => {
      const elevenMonthsAgo = new Date(Date.now() - 334 * 24 * 60 * 60 * 1000);
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ necessary: true, functional: true }));
      localStorage.setItem(DATE_KEY, elevenMonthsAgo.toISOString());
      expect(readCookieConsent()?.functional).toBe(true);
    });

    /** 一度同意したら永久に有効、という状態を作らない */
    it('1年を超えたら未同意に戻す', () => {
      const thirteenMonthsAgo = new Date(Date.now() - 396 * 24 * 60 * 60 * 1000);
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ necessary: true, functional: true }));
      localStorage.setItem(DATE_KEY, thirteenMonthsAgo.toISOString());
      expect(readCookieConsent()).toBeNull();
    });

    it('日付が無い・壊れている場合も未同意に倒す', () => {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ necessary: true, functional: true }));
      expect(readCookieConsent()).toBeNull();

      localStorage.setItem(DATE_KEY, 'not-a-date');
      expect(readCookieConsent()).toBeNull();
    });
  });
});

describe('同意の購読', () => {
  beforeEach(() => localStorage.clear());

  it('保存すると useCookieConsent が追従する（同一タブ）', () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current).toBeNull();

    act(() => saveCookieConsent({ necessary: true, functional: true }));
    expect(result.current).toEqual({ necessary: true, functional: true });

    act(() => saveCookieConsent({ necessary: true, functional: false }));
    expect(result.current?.functional).toBe(false);
  });

  it('onCookieConsentChange は解除できる', () => {
    const listener = vi.fn();
    const unsubscribe = onCookieConsentChange(listener);

    saveCookieConsent({ necessary: true, functional: true });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveCookieConsent({ necessary: true, functional: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

/**
 * 同意は与えるのと同じ手軽さで撤回できる必要がある（GDPR 7条3項）。
 * 以前は保存後にバナーが二度と出ず、撤回手段が実質存在しなかった。
 */
describe('reopenCookieConsent', () => {
  it('購読側に再オープンを通知する', () => {
    const listener = vi.fn();
    const unsubscribe = onCookieConsentReopen(listener);

    reopenCookieConsent();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    reopenCookieConsent();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('storage が使えない環境', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'localStorage', original);
  });

  it('読み書きが例外を投げてもクラッシュしない', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
      },
    });

    expect(() => readCookieConsent()).not.toThrow();
    expect(readCookieConsent()).toBeNull();
    expect(() => saveCookieConsent({ necessary: true, functional: true })).not.toThrow();
  });
});
