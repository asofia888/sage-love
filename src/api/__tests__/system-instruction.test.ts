import { describe, it, expect } from 'vitest';
import { buildSystemInstruction, resolveLanguage } from '../../../api/system-instruction';

const SUPPORTED_LANGUAGES = ['ja', 'en', 'es', 'pt', 'fr', 'hi', 'ar'] as const;

/**
 * 「専門家の助けを求めるよう促す」指示が、その言語で実際に書かれているか。
 * 言語ごとに語彙が違うので、各言語での該当語を明示的に持つ。
 */
const PROFESSIONAL_HELP_PATTERN: Record<string, RegExp> = {
  ja: /専門家/,
  en: /professional/i,
  es: /profesional/i,
  pt: /profissional/i,
  fr: /professionnel/i,
  hi: /पेशेवर/,
  ar: /المختصين|مهني/,
};

describe('resolveLanguage', () => {
  it('地域サブタグを落として基底言語に正規化する', () => {
    expect(resolveLanguage('ja-JP')).toBe('ja');
    expect(resolveLanguage('pt-BR')).toBe('pt');
    expect(resolveLanguage('AR-SA')).toBe('ar');
  });

  it('非対応の言語・不正な値は en にフォールバックする', () => {
    expect(resolveLanguage('ko')).toBe('en');
    expect(resolveLanguage('')).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
    expect(resolveLanguage(null)).toBe('en');
    expect(resolveLanguage(42)).toBe('en');
    expect(resolveLanguage({ evil: true })).toBe('en');
  });
});

describe('buildSystemInstruction', () => {
  it.each(SUPPORTED_LANGUAGES)('%s: 非空のシステムプロンプトを返す', (lang) => {
    const instruction = buildSystemInstruction(lang, 'こんにちは', []);
    expect(instruction.length).toBeGreaterThan(500);
  });

  /**
   * 危機に触れたとき専門家につなぐ指示が全言語に無いと、
   * 特定の言語圏の利用者だけが受診勧奨を受けられなくなる。
   */
  it.each(SUPPORTED_LANGUAGES)(
    '%s: 専門家の助けを促す指示を含む',
    (lang) => {
      const instruction = buildSystemInstruction(lang, 'hello', []);
      expect(
        PROFESSIONAL_HELP_PATTERN[lang].test(instruction),
        `${lang} のシステムプロンプトに受診勧奨の指示が無い`
      ).toBe(true);
    }
  );

  it('危機を検出した場合は危機対応指示を追記する', () => {
    const normal = buildSystemInstruction('ja', '今日はいい天気だ', []);
    const crisis = buildSystemInstruction('ja', '死にたい', []);
    expect(crisis.length).toBeGreaterThan(normal.length);
    expect(crisis).toContain('【最優先の指示 — 危機対応】');
  });

  /**
   * 危機対応指示が日本語ハードコードだと、他言語の利用者に対して
   * プロンプトの言語が混ざり、応答の言語が揺れる原因になる。
   */
  it.each([
    ['en', 'I want to die', /HIGHEST PRIORITY/],
    ['es', 'quiero morir', /MÁXIMA PRIORIDAD/],
    ['pt', 'quero morrer', /PRIORIDADE MÁXIMA/],
    ['fr', 'je veux mourir', /PRIORITAIRE/],
    ['hi', 'मैं मरना चाहता हूँ', /सर्वोच्च प्राथमिकता/],
    ['ar', 'أريد أن أموت', /أولوية قصوى/],
  ])('%s: 危機対応指示は利用者の言語で追記される', (lang, message, pattern) => {
    const crisis = buildSystemInstruction(lang, message, []);
    expect(pattern.test(crisis)).toBe(true);
    // 日本語版のヘッダーが混入していないこと
    expect(crisis).not.toContain('【最優先の指示 — 危機対応】');
  });

  /**
   * ペルソナ側は「断定調を保て」「安易な共感は不要」と指示している。
   * 危機時にそれを上書きしないと、いちばん苦しい場面で冷たい応答になる。
   */
  it.each([
    ['ja', '死にたい', /断定調を保つ必要はない/],
    ['en', 'I want to die', /need not maintain the dignified, assertive register/],
  ])('%s: 危機時は口調制約を明示的に解除する', (lang, message, pattern) => {
    const crisis = buildSystemInstruction(lang, message, []);
    expect(pattern.test(crisis)).toBe(true);
  });

  it('深刻度別のガイダンス文が指示に埋め込まれる', () => {
    const crisis = buildSystemInstruction('ja', '死にたい', []);
    expect(crisis).not.toContain('{guidance}');
    expect(crisis).toContain('専門家');
  });

  it('危機でない通常のメッセージには危機対応指示を足さない', () => {
    const normal = buildSystemInstruction('en', 'what is the meaning of kindness?', []);
    expect(normal).not.toContain('HIGHEST PRIORITY');
  });

  it('壊れた履歴を渡してもクラッシュしない', () => {
    expect(() => buildSystemInstruction('ja', 'hello', null)).not.toThrow();
    expect(() => buildSystemInstruction('ja', 'hello', 'not-an-array')).not.toThrow();
    expect(() =>
      buildSystemInstruction('ja', 'hello', [{ sender: 1, text: null }, undefined])
    ).not.toThrow();
  });
});
