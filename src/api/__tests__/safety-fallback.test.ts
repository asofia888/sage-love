import { describe, it, expect } from 'vitest';
import {
  getSafetyFallbackMessage,
  isSafetyBlocked,
  describeSafetyBlock,
} from '../../../server/safety-fallback';

const SUPPORTED_LANGUAGES = ['ja', 'en', 'es', 'pt', 'fr', 'hi', 'ar'] as const;

describe('isSafetyBlocked', () => {
  it('プロンプト側でブロックされた場合を検出する', () => {
    expect(isSafetyBlocked({ promptFeedback: { blockReason: 'SAFETY' } })).toBe(true);
  });

  it.each(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'])(
    'finishReason=%s を検出する',
    (finishReason) => {
      expect(isSafetyBlocked({ candidates: [{ finishReason }] })).toBe(true);
    }
  );

  it('正常終了・長さ超過はブロック扱いにしない', () => {
    expect(isSafetyBlocked({ candidates: [{ finishReason: 'STOP' }] })).toBe(false);
    expect(isSafetyBlocked({ candidates: [{ finishReason: 'MAX_TOKENS' }] })).toBe(false);
  });

  it('形の違う値を渡してもクラッシュせず false を返す', () => {
    expect(isSafetyBlocked(undefined)).toBe(false);
    expect(isSafetyBlocked(null)).toBe(false);
    expect(isSafetyBlocked('blocked')).toBe(false);
    expect(isSafetyBlocked({})).toBe(false);
    expect(isSafetyBlocked({ candidates: [] })).toBe(false);
    expect(isSafetyBlocked({ candidates: [{}] })).toBe(false);
  });
});

describe('getSafetyFallbackMessage', () => {
  it.each(SUPPORTED_LANGUAGES)('%s: 実質的な長さの文言を返す', (lang) => {
    expect(getSafetyFallbackMessage(lang).length).toBeGreaterThan(80);
  });

  it('言語ごとに異なる文言である（コピペ漏れの検出）', () => {
    const messages = SUPPORTED_LANGUAGES.map(getSafetyFallbackMessage);
    expect(new Set(messages).size).toBe(SUPPORTED_LANGUAGES.length);
  });

  it('非対応の言語は英語にフォールバックする', () => {
    expect(getSafetyFallbackMessage('ko')).toBe(getSafetyFallbackMessage('en'));
    expect(getSafetyFallbackMessage('')).toBe(getSafetyFallbackMessage('en'));
  });

  /**
   * この文言は、自傷や希死念慮を打ち明けた直後の人が読む可能性が最も高い。
   * 「内容に問題がある」「言い換えてほしい」と返すのは有害なので、
   * errorContentSafety の文言を流用していないことを明示的に守る。
   */
  it('利用者の表現を責める言い回しを含まない', () => {
    expect(getSafetyFallbackMessage('ja')).not.toMatch(/問題があるようだ|異なる内容で/);
    expect(getSafetyFallbackMessage('en')).not.toMatch(/issue with the content|different words/i);
  });

  it('窓口につなぐ案内を含む', () => {
    expect(getSafetyFallbackMessage('ja')).toContain('相談窓口');
    expect(getSafetyFallbackMessage('en')).toMatch(/helpline/i);
  });
});

/**
 * 「ブロックされた」ことだけ分かっても閾値の調整ができない。
 * 止まったのがプロンプト側か応答側か、どのカテゴリが効いたのかをログに残す。
 */
describe('describeSafetyBlock', () => {
  it('プロンプト側のブロック理由と評価を抜き出す', () => {
    const d = describeSafetyBlock({
      promptFeedback: {
        blockReason: 'SAFETY',
        safetyRatings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'HIGH', blocked: true },
        ],
      },
    });

    expect(d.promptBlockReason).toBe('SAFETY');
    expect(d.promptSafetyRatings).toEqual([
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'HIGH', blocked: true },
    ]);
  });

  it('応答側の finishReason と評価を抜き出す', () => {
    const d = describeSafetyBlock({
      candidates: [
        {
          finishReason: 'SAFETY',
          safetyRatings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'MEDIUM' },
          ],
        },
      ],
    });

    expect(d.finishReasons).toEqual(['SAFETY']);
    expect(d.candidateSafetyRatings).toEqual([
      [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'MEDIUM' }],
    ]);
  });

  /** 相談内容がログに流れると、それ自体が事故になる */
  it('利用者の本文は一切含めない', () => {
    const secret = '死にたいと毎晩思っている';
    const d = describeSafetyBlock({
      text: secret,
      candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: secret }] } }],
    });

    expect(JSON.stringify(d)).not.toContain(secret);
  });

  it('形の違う値を渡してもクラッシュしない', () => {
    expect(() => describeSafetyBlock(undefined)).not.toThrow();
    expect(describeSafetyBlock(undefined)).toEqual({ detail: 'unavailable' });
    expect(describeSafetyBlock(null)).toEqual({ detail: 'unavailable' });
    expect(describeSafetyBlock('blocked')).toEqual({ detail: 'unavailable' });
    expect(() => describeSafetyBlock({ candidates: [null] })).not.toThrow();
    expect(() => describeSafetyBlock({ promptFeedback: {} })).not.toThrow();
  });

  it('JSON.stringify できる（そのままログに出せる）', () => {
    const d = describeSafetyBlock({ candidates: [{ finishReason: 'SAFETY' }] });
    expect(() => JSON.stringify(d)).not.toThrow();
  });
});
