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

/**
 * 聖者は「相手が最後に使った言語」で応じるので、入力の言語は画面の表示言語と
 * 一致しないことが普通にある。以前は画面の言語の辞書しか見ておらず、
 * 英語表示のまま「死にたい」と打った人は素通りしていた。
 */
describe('画面の言語によらず検出する', () => {
  it.each([
    ['en', '死にたい'],
    ['ja', 'I want to kill myself'],
    ['es', 'I want to die'],
    ['en', 'quiero morir'],
    ['ja', 'quero morrer'],
    ['en', 'je veux mourir'],
    ['fr', 'मैं मरना चाहता हूँ'],
    ['pt', 'أريد أن أموت'],
  ])('画面 %s で "%s" を最高深刻度で検出する', (lang, text) => {
    const result = detect(text, lang);
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe('critical');
  });

  /**
   * ブラウザが未対応言語のとき、画面は英語にフォールバックするが
   * i18n.language は 'de-DE' などのまま渡ってくる。辞書が無いからといって
   * 検出そのものが無効になってはならない。
   */
  it.each(['de', 'de-DE', 'zh', 'zh-TW', 'ko', 'it'])(
    '未対応の画面言語 %s でも検出が無効にならない',
    (lang) => {
      expect(detect('I want to kill myself', lang).severity).toBe('critical');
      expect(detect('死にたい', lang).severity).toBe('critical');
    }
  );

  it.each([
    ['ja', "I don't want to die, I just feel tired"],
    ['en', '死にたいわけじゃないけど疲れた'],
    ['en', 'No quiero morir, solo estoy cansado'],
    ['es', 'Não quero morrer, só estou cansado'],
    ['ja', 'Je ne veux pas mourir, je suis juste fatigué'],
    ['en', 'मैं मरना नहीं चाहता, बस थका हूँ'],
    ['ja', 'لا أريد أن أموت، أنا متعب فقط'],
  ])('画面 %s でも否定形 "%s" は危機としない', (lang, text) => {
    expect(detect(text, lang).isCrisis).toBe(false);
  });

  /** 他言語の辞書まで走査することで、日常表現の誤検出が増えてはならない。 */
  it.each([
    ['ja', 'I need to meet the deadline'],
    ['ja', "j'ai acheté du pain et je vais mourir de rire"],
    ['en', '必死に頑張っています'],
    ['en', 'nunca me rindo'],
    ['fr', 'I want to cut down on sugar'],
    ['es', 'estou sozinho em casa hoje'],
    ['en', 'help me understand karma'],
  ])('画面 %s で日常表現 "%s" は危機としない', (lang, text) => {
    expect(detect(text, lang).isCrisis).toBe(false);
  });

  it('同じ深刻度で複数の辞書が当たったら、画面の言語の結果を採る', () => {
    const mixed = '死にたい I want to die';
    expect(detect(mixed, 'ja').detectedKeywords).toContain('死にたい');
    expect(detect(mixed, 'en').detectedKeywords).toContain('want to die');
  });

  /**
   * 文脈依存語の「2つ以上で初めてトリガー」は辞書ごとに数える。
   * 言語をまたいで合算すると、無関係な語の偶然の一致で誤検出が増える。
   */
  it('別々の言語の文脈依存語が1つずつ当たっただけでは危機としない', () => {
    expect(detect('hopeless 孤独', 'en').isCrisis).toBe(false);
  });
});

/**
 * 辞書の見出し語は「死にたい」でも、実際に打たれるのは
 * ひらがな・くだけた語尾・俗語であることが多い。
 */
describe('日本語の口語・表記ゆれ', () => {
  it.each([
    'しにたい',
    'もうしにたい',
    'シニタイ',
    'ｼﾆﾀｲ',
    '死にたくなる',
    '死にたくなった',
    '死にてえ',
    '死んだ方がまし',
    '死んだほうがいい',
    '命を絶ちたい',
    'もう死んでしまおうかな',
    '生きたくない',
    '消えてしまいたい',
    'この世にいたくない',
    '早くお迎えが来てほしい',
  ])('希死念慮 "%s" を最高深刻度で検出する', (text) => {
    const result = detect(text, 'ja');
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it.each([
    '首をつろうと思う',
    'ODした',
    'ＯＤしてしまった',
    '薬を全部飲んだ',
    '今から飛び降りる',
    '電車に飛び込もうと思った',
  ])('準備・実行 "%s" を最高深刻度で検出する', (text) => {
    const result = detect(text, 'ja');
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.triggerPatterns).toContain('preparation');
  });

  it.each(['リスカした', 'アムカしてしまった', '手首を切った'])(
    '自傷 "%s" を検出する',
    (text) => {
      const result = detect(text, 'ja');
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('high');
    }
  );

  it.each(['生きるのに疲れた', '生きるのがつらい', '生きてるのが辛い'])(
    '消耗の訴え "%s" は穏やかな介入の対象にする',
    (text) => {
      const result = detect(text, 'ja');
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('medium');
    }
  );

  /**
   * ひらがな・英字の見出し語は、無関係な語の一部に偶然現れやすい。
   * ここが崩れると、普通の相談に「緊急」のモーダルが出る。
   */
  it.each([
    'わたしにたいして優しくしてくれた',
    'はなしにたいへん感動した',
    '死にたくない',
    'しにたいわけじゃない',
    'iPodしか持っていない',
    'CoDしてたら朝になった',
    '清水の舞台から飛び降りるつもりで告白した',
    '今から死ぬほど食べる',
    'あの頃の自分を殴りたい',
    '気持ちを入れ替えて自分を切り替えたい',
    'ペットを死なせてしまった',
    'プレミアムカードを作った',
    'イギリスかフランスに行きたい',
    '田中氏にたいして失礼だった',
  ])('日常表現 "%s" は危機としない', (text) => {
    expect(detect(text, 'ja').isCrisis).toBe(false);
  });

  /** 既存の「単発では拾わない」設計を、語彙の追加で壊していないこと */
  it('単独の文脈依存語だけでは引き続きトリガーしない', () => {
    expect(detect('もう限界かもしれない', 'ja').isCrisis).toBe(false);
    expect(detect('仕事で疲れた', 'ja').isCrisis).toBe(false);
    expect(detect('生きる意味とは何ですか', 'ja').isCrisis).toBe(false);
  });
});
