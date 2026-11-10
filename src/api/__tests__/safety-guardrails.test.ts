import { describe, it, expect } from 'vitest';
import {
  GUARDRAIL_TOPICS,
  SAFETY_GUARDRAILS,
  buildSafetyGuardrails,
} from '../../../server/safety-guardrails';
import { buildSystemInstruction } from '../../../server/system-instruction';

const SUPPORTED_LANGUAGES = ['ja', 'en', 'es', 'pt', 'fr', 'hi', 'ar'] as const;

/**
 * 各項目がその言語で実際に書かれているかを、項目の核になる語で確かめる。
 * 翻訳を足し忘れたり、別の項目の文を貼り違えたりすると落ちる。
 */
const TOPIC_MARKERS: Record<string, Record<(typeof GUARDRAIL_TOPICS)[number], RegExp>> = {
  ja: {
    unusualExperiences: /声が聞こえる/,
    dissociation: /現実感がない/,
    medication: /主治医/,
    majorDecisions: /決めるのは本人/,
    dependency: /唯一の拠り所/,
    violence: /あなたは悪くない/,
    empathy: /気持ちを受け止め/,
  },
  en: {
    unusualExperiences: /hearing voices/i,
    dissociation: /feeling unreal/i,
    medication: /their own doctor/i,
    majorDecisions: /decision is theirs/i,
    dependency: /only support/i,
    violence: /not their fault/i,
    empathy: /acknowledge the feeling/i,
  },
  es: {
    unusualExperiences: /oye voces/i,
    dissociation: /se siente irreal/i,
    medication: /con su médico/i,
    majorDecisions: /la decisión le corresponde/i,
    dependency: /único apoyo/i,
    violence: /no es culpa suya/i,
    empathy: /reconoce primero ese sentimiento/i,
  },
  pt: {
    unusualExperiences: /ouve vozes/i,
    dissociation: /se sentir irreal/i,
    medication: /com o seu médico/i,
    majorDecisions: /a decisão cabe a ela/i,
    dependency: /único apoio/i,
    violence: /a culpa não é dela/i,
    empathy: /reconheça esse sentimento/i,
  },
  fr: {
    unusualExperiences: /entendre des voix/i,
    dissociation: /se sentir irréelle/i,
    medication: /avec son médecin/i,
    majorDecisions: /la décision lui appartient/i,
    dependency: /seul soutien/i,
    violence: /ce n'est pas sa faute/i,
    empathy: /accueillez d'abord ce sentiment/i,
  },
  hi: {
    unusualExperiences: /आवाज़ें सुनाई/,
    dissociation: /अवास्तविक/,
    medication: /अपने डॉक्टर/,
    majorDecisions: /निर्णय उसी का है/,
    dependency: /एकमात्र सहारा/,
    violence: /उसकी कोई ग़लती नहीं/,
    empathy: /भावना को स्वीकार करें/,
  },
  ar: {
    unusualExperiences: /يسمع أصواتا/,
    dissociation: /غير حقيقية/,
    medication: /مع طبيبه/,
    majorDecisions: /القرار قراره/,
    dependency: /السند الوحيد/,
    violence: /الذنب ليس ذنبه/,
    empathy: /فاعترف أولا بهذا الشعور/,
  },
};

describe('安全のための指針', () => {
  /**
   * 特定の言語だけ項目が欠けると、その言語圏の利用者だけが
   * 「瞑想で薬をやめてよい」と言われうる状態になる。
   */
  it.each(SUPPORTED_LANGUAGES)('%s: 全項目がその言語で書かれている', (lang) => {
    const text = SAFETY_GUARDRAILS[lang];
    expect(text, `${lang} の指針が無い`).toBeDefined();
    expect(text.heading.length).toBeGreaterThan(0);
    expect(text.intro.length).toBeGreaterThan(0);
    for (const topic of GUARDRAIL_TOPICS) {
      expect(text.rules[topic]?.length, `${lang}.${topic} が空`).toBeGreaterThan(40);
      expect(
        TOPIC_MARKERS[lang][topic].test(text.rules[topic]),
        `${lang}.${topic} に核となる語が無い`
      ).toBe(true);
    }
  });

  it.each(SUPPORTED_LANGUAGES)('%s: 組み立てたブロックに全項目が入る', (lang) => {
    const block = buildSafetyGuardrails(lang);
    expect(block.startsWith(SAFETY_GUARDRAILS[lang].heading)).toBe(true);
    for (const topic of GUARDRAIL_TOPICS) {
      expect(block).toContain(SAFETY_GUARDRAILS[lang].rules[topic]);
    }
  });

  it('対応言語外は英語にフォールバックする', () => {
    expect(buildSafetyGuardrails('ko')).toBe(buildSafetyGuardrails('en'));
  });

  /** 服薬の中止を勧めない、は言い回しの揺れで意味が逆転しやすいので個別に固定する */
  it.each([
    ['ja', /決して勧めない/],
    ['en', /Never suggest stopping or reducing medication/],
    ['es', /Nunca sugieras dejar o reducir la medicación/],
    ['pt', /Nunca sugira parar ou reduzir a medicação/],
    ['fr', /Ne suggérez jamais d'arrêter ou de réduire/],
    ['hi', /सुझाव कभी न दें/],
    ['ar', /لا تقترح أبدا إيقاف الدواء/],
  ])('%s: 服薬・治療の中止を勧めないと明記している', (lang, pattern) => {
    expect(pattern.test(SAFETY_GUARDRAILS[lang].rules.medication)).toBe(true);
  });
});

describe('システムプロンプトへの組み込み', () => {
  /** 危機検出に掛からない平時の相談でも、指針は常に付いていなければならない */
  it.each(SUPPORTED_LANGUAGES)('%s: 平時のメッセージにも指針が付く', (lang) => {
    const instruction = buildSystemInstruction(lang, 'hello', []);
    expect(instruction).toContain(buildSafetyGuardrails(lang));
  });

  it('キーワードでは危機と判定されない相談にも指針が付く', () => {
    const instruction = buildSystemInstruction(
      'ja',
      '瞑想を続ければ薬はやめてもよいでしょうか',
      []
    );
    expect(instruction).not.toContain('【最優先の指示 — 危機対応】');
    expect(instruction).toContain('主治医');
  });

  /**
   * 後ろに置かれた指示ほど優先されやすい。
   * ペルソナ → 安全指針 → 危機対応指示 の順を崩さないこと。
   */
  it('ペルソナの後、危機対応指示の前に置かれる', () => {
    const instruction = buildSystemInstruction('ja', '死にたい', []);
    const persona = instruction.indexOf('あなたは、あらゆる時代の多くの聖賢たち');
    const guardrails = instruction.indexOf(SAFETY_GUARDRAILS.ja.heading);
    const crisis = instruction.indexOf('【最優先の指示 — 危機対応】');
    expect(persona).toBe(0);
    expect(guardrails).toBeGreaterThan(persona);
    expect(crisis).toBeGreaterThan(guardrails);
  });

  it('未対応の言語では英語のペルソナと英語の指針が組になる', () => {
    const instruction = buildSystemInstruction('ko', 'hello', []);
    expect(instruction).toContain(SAFETY_GUARDRAILS.en.heading);
    expect(instruction).not.toContain(SAFETY_GUARDRAILS.ja.heading);
  });
});
