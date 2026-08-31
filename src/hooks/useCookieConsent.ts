import { useState, useEffect } from 'react';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
}

const CONSENT_STORAGE_KEY = 'cookieConsent';
const CONSENT_DATE_STORAGE_KEY = 'cookieConsentDate';

// storage イベントは同一タブでは発火しないため、保存側から明示的に通知する。
const CONSENT_CHANGE_EVENT = 'cookieConsentChange';

// 保存済みの同意設定を読む。未保存・破損時は null（=未同意扱い）
export function readCookieConsent(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // functional は計測の可否を決めるので、boolean でなければ同意なしに倒す。
    if (!parsed || typeof parsed.functional !== 'boolean') return null;
    return { necessary: true, functional: parsed.functional };
  } catch (error) {
    console.error('Error parsing cookie consent:', error);
    return null;
  }
}

// 同意設定を保存し、購読側（useCookieConsent）へ変更を通知する。
export function saveCookieConsent(prefs: CookiePreferences): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(prefs));
    localStorage.setItem(CONSENT_DATE_STORAGE_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error saving cookie consent:', error);
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT));
}

/**
 * 現在の同意設定を購読する。バナーでの保存（同一タブ = CONSENT_CHANGE_EVENT）と
 * 別タブでの変更（storage イベント）の両方に追従する。
 */
export function useCookieConsent(): CookiePreferences | null {
  const [consent, setConsent] = useState<CookiePreferences | null>(readCookieConsent);

  useEffect(() => {
    const sync = () => setConsent(readCookieConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return consent;
}
