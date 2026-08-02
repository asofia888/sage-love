import { describe, it, expect } from 'vitest';
import { CrisisDetectionService } from '../crisisDetectionService';
import { getCrisisData, CATEGORY_ORDER } from '../../data/crisisKeywords';

const SUPPORTED_LANGUAGES = ['ja', 'en', 'es', 'pt', 'fr', 'hi', 'ar'] as const;

const detect = (text: string, lang: string) =>
  CrisisDetectionService.detectCrisis(text, lang);

/**
 * 準備・計画行動は臨床上もっとも切迫した危険信号だが、
 * 語彙的な希死念慮の辞書だけでは一切拾えていなかった。
 */
describe('準備・計画行動の検出', () => {
  it.each([
    ['ja', '遺書を書きました'],
    ['ja', '薬をたくさん飲もうと思っています'],
    ['ja', '楽に死ねる方法を調べています'],
    ['ja', '首を吊るつもりです'],
    ['en', 'I have been saving up my pills'],
    ['en', 'I wrote a suicide note last night'],
    ['en', 'I looked up how to kill myself'],
    ['es', 'estoy guardando pastillas'],
    ['es', 'busqué cómo suicidarme'],
    ['pt', 'escrevi uma carta de suicídio'],
    ['pt', 'estou guardando comprimidos'],
    ['fr', "j'ai écrit une lettre d'adieu et je garde mes médicaments"],
    ['hi', 'मैंने सुसाइड नोट लिखा है'],
    ['ar', 'كتبت رسالة انتحار'],
  ])('%s: "%s" を最高深刻度で検出する', (lang, text) => {
    const result = detect(text, lang);
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.recommendedAction).toBe('emergency_resources');
  });
});

/**
 * 受動的希死念慮と負担感（Joiner の対人関係理論の中核）は、
 * 「死にたい」と口にしない人の危険を示す重要な手がかりである。
 */
describe('受動的希死念慮・負担感の検出', () => {
  it.each([
    ['ja', 'いなくなりたいとよく思います'],
    ['ja', '私がいない方がみんな幸せだと思う'],
    ['ja', '眠ったまま目が覚めなければいいのに'],
    ['ja', '生まれてこなければよかった'],
    ['en', 'everyone would be better off without me'],
    ['en', "I wish I wasn't here"],
    ['es', 'creo que estarían mejor sin mí'],
    ['pt', 'acho que estariam melhor sem mim'],
    ['fr', 'tout le monde serait mieux sans moi'],
    ['hi', 'मेरे बिना सब बेहतर होंगे'],
    ['ar', 'سيكونون أفضل بدوني'],
  ])('%s: "%s" を検出する', (lang, text) => {
    expect(detect(text, lang).isCrisis).toBe(true);
  });
});

/**
 * 否定形の誤検出は、「死にたいわけじゃない」と明言した人に
 * 最高深刻度の介入を返してしまい、聞いていないという印象を与える。
 */
describe('否定形を危機と誤判定しない', () => {
  it.each([
    ['ja', '死にたいわけじゃないけど疲れた'],
    ['ja', '自殺したいわけじゃないんです'],
    ['ja', '消えたいとは思わないが、しんどい'],
    ['en', "I don't want to die, I just feel tired"],
    ['en', 'I would never kill myself, but I am exhausted'],
    ['es', 'No quiero morir, solo estoy cansado'],
    ['es', 'nunca me mataría, pero estoy agotado'],
    ['pt', 'Não quero morrer, só estou cansado'],
    ['fr', 'Je ne veux pas mourir, je suis juste fatigué'],
    ['hi', 'मैं मरना नहीं चाहता, बस थका हूँ'],
    ['ar', 'لا أريد أن أموت، أنا متعب فقط'],
  ])('%s: "%s" は危機としない', (lang, text) => {
    expect(detect(text, lang).isCrisis).toBe(false);
  });
});

/**
 * 辞書に載っている綴りと実際に打たれる綴りは一致しない。
 * ヒンディー語のチャンドラビンドゥ、アラビア語のハムザ・母音記号は代表例。
 */
describe('表記揺れの吸収', () => {
  it.each([
    ['hi', 'मैं मरना चाहता हूँ', 'チャンドラビンドゥ(ँ)'],
    ['hi', 'मैं मरना चाहता हूं', 'アヌスヴァーラ(ं)'],
    ['ar', 'أريد أن أموت', 'ハムザ付き'],
    ['ar', 'اريد ان اموت', 'ハムザ無し'],
    ['ar', 'أُرِيدُ أَنْ أَمُوتَ', '母音記号つき'],
  ])('%s: %s（%s）を同じく検出する', (lang, text) => {
    expect(detect(text, lang).isCrisis).toBe(true);
  });

  /**
   * ASCII の \b はアクセント付き文字を語の一部と見なさないため、
   * "sin mí" のように非ASCIIで終わる語がマッチしなくなる回帰を防ぐ。
   */
  it('アクセントで終わるキーワードもマッチする', () => {
    expect(detect('creo que estarían mejor sin mí', 'es').isCrisis).toBe(true);
  });
});

describe('日常表現を誤検出しない', () => {
  it.each([
    ['ja', '必死に頑張っています'],
    ['ja', '練炭バーベキューをしました'],
    ['ja', '孤独のグルメを見た'],
    ['en', 'I need to meet the deadline'],
    ['en', 'I want to cut down on sugar'],
    ['es', 'nunca me rindo'],
    ['fr', 'je vais mourir de rire'],
    ['ar', 'أموت من الضحك'],
  ])('%s: "%s" は危機としない', (lang, text) => {
    expect(detect(text, lang).isCrisis).toBe(false);
  });
});

describe('複数ターンのエスカレーション', () => {
  it('単発では危機でない発言でも、繰り返せば深刻度が上がる', () => {
    const messages = ['もう限界かもしれない', '生きる意味がわからない'];
    const single = detect(messages[0], 'ja');
    const pattern = CrisisDetectionService.detectCrisisPattern(messages, 'ja');
    expect(single.isCrisis).toBe(false);
    expect(pattern.isCrisis).toBe(true);
  });

  it('危機的な発言が複数ターン続けば深刻度を引き上げる', () => {
    const messages = ['自分を傷つけたい', 'またリストカットをしてしまった'];
    // 各メッセージは単独では high 止まり
    for (const message of messages) {
      const single = CrisisDetectionService.detectCrisis(message, 'ja');
      expect(single.isCrisis).toBe(true);
      expect(single.severity).toBe('high');
    }
    // continuous な兆候として critical へ引き上がる
    const pattern = CrisisDetectionService.detectCrisisPattern(messages, 'ja');
    expect(pattern.severity).toBe('critical');
    expect(pattern.recommendedAction).toBe('emergency_resources');
  });
});

describe('辞書データの整合性', () => {
  it.each(SUPPORTED_LANGUAGES)('%s: 全カテゴリが定義されている', (lang) => {
    const data = getCrisisData(lang);
    expect(data).toBeDefined();
    for (const category of CATEGORY_ORDER) {
      expect(data![category], `${lang}.${category} が無い`).toBeDefined();
      expect(Array.isArray(data![category].keywords)).toBe(true);
      expect(Array.isArray(data![category].exclusions)).toBe(true);
    }
  });

  it.each(SUPPORTED_LANGUAGES)('%s: 準備行動カテゴリに語彙がある', (lang) => {
    expect(getCrisisData(lang)!.preparation.keywords.length).toBeGreaterThan(0);
  });

  /**
   * exclusions が空だと否定形をそのまま危機と判定してしまう。
   * es/pt は実際にこの状態で「死にたくない」を critical と誤判定していた。
   */
  it.each(SUPPORTED_LANGUAGES)('%s: suicide カテゴリに除外語がある', (lang) => {
    expect(getCrisisData(lang)!.suicide.exclusions.length).toBeGreaterThan(0);
  });

  it.each(SUPPORTED_LANGUAGES)('%s: 全深刻度の応答文が揃っている', (lang) => {
    const responses = getCrisisData(lang)!.responses;
    for (const action of [
      'monitor',
      'gentle_intervention',
      'immediate_intervention',
      'emergency_resources',
    ] as const) {
      expect(responses[action]?.length, `${lang}.${action} が空`).toBeGreaterThan(0);
    }
  });
});
