import { useState, useEffect } from 'react';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
}

const CONSENT_STORAGE_KEY = 'cookieConsent';
const CONSENT_DATE_STORAGE_KEY = 'cookieConsentDate';

// storage イベントは同一タブでは発火しないため、保存側から明示的に通知する。
const CONSENT_CHANGE_EVENT = 'cookieConsentChange';

// フッターの「Cookie設定」からバナーを開き直すための通知。
const CONSENT_REOPEN_EVENT = 'cookieConsentReopen';

/**
 * 同意の有効期間。これを過ぎたら未同意として扱い、バナーを出し直す。
 * 一度同意したら永久に有効、という状態を作らないための上限である
 * （GDPR では同意の定期的な取り直しが推奨される）。
 */
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** 保存時刻から有効期限が切れているか。日付が読めない場合は期限切れ扱い。 */
function isConsentExpired(): boolean {
  const savedAt = localStorage.getItem(CONSENT_DATE_STORAGE_KEY);
  if (!savedAt) return true;

  const savedTime = Date.parse(savedAt);
  if (Number.isNaN(savedTime)) return true;

  return Date.now() - savedTime > CONSENT_MAX_AGE_MS;
}

// 保存済みの同意設定を読む。未保存・破損・期限切れ時は null（=未同意扱い）
export function readCookieConsent(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    if (isConsentExpired()) return null;
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
 * 同意バナーを開き直す。
 *
 * Why: 同意を与えるのと同じ手軽さで撤回できる必要がある（GDPR 7条3項）。
 * 以前は一度保存するとバナーが二度と出ず、アプリ内に設定を開く導線も
 * なかったため、撤回する手段が実質的に存在しなかった。
 */
export function reopenCookieConsent(): void {
  window.dispatchEvent(new CustomEvent(CONSENT_REOPEN_EVENT));
}

/** 「Cookie設定」からの再オープン要求を購読する。解除関数を返す。 */
export function onCookieConsentReopen(listener: () => void): () => void {
  window.addEventListener(CONSENT_REOPEN_EVENT, listener);
  return () => window.removeEventListener(CONSENT_REOPEN_EVENT, listener);
}

/**
 * 同意設定の変更を購読する。React の外（src/index.tsx の Sentry ゲート等）
 * からも使えるよう、フックとは別に関数として公開する。
 * 同一タブでの保存（CONSENT_CHANGE_EVENT）と別タブでの変更（storage）の
 * 両方に追従する。解除関数を返す。
 */
export function onCookieConsentChange(listener: () => void): () => void {
  window.addEventListener(CONSENT_CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * 現在の同意設定を購読する。バナーでの保存（同一タブ = CONSENT_CHANGE_EVENT）と
 * 別タブでの変更（storage イベント）の両方に追従する。
 */
export function useCookieConsent(): CookiePreferences | null {
  const [consent, setConsent] = useState<CookiePreferences | null>(readCookieConsent);

  useEffect(() => onCookieConsentChange(() => setConsent(readCookieConsent())), []);

  return consent;
}
