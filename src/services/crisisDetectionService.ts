/**
 * 危機検出サービス - 自傷・自殺に関する言葉の文脈解析付き検出
 */
export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedKeywords: string[];
  triggerPatterns: string[];
  recommendedAction: 'monitor' | 'gentle_intervention' | 'immediate_intervention' | 'emergency_resources';
}

interface KeywordEntry {
  word: string;
  /** 高確信度キーワードは単独でトリガーする。文脈依存キーワードは複合条件が必要 */
  confidence: 'high' | 'contextual';
}

interface CategoryConfig {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  keywords: Record<string, KeywordEntry[]>;
  /** これらのパターンを含む場合はマッチを除外する */
  exclusions: Record<string, string[]>;
}

export class CrisisDetectionService {
  // 重要: これらのキーワードは研究に基づいた危機検出のためのものです
  private static readonly CATEGORIES: CategoryConfig[] = [
    // 自殺関連（直接的）
    {
      name: 'suicide',
      severity: 'critical',
      keywords: {
        ja: [
          { word: '自殺', confidence: 'high' },
          { word: '死にたい', confidence: 'high' },
          { word: '消えたい', confidence: 'high' },
          { word: '終わりにしたい', confidence: 'high' },
          { word: '自分を殺', confidence: 'high' },
          { word: '死んでしまいたい', confidence: 'high' },
          { word: '生きていたくない', confidence: 'high' },
          { word: '死のう', confidence: 'high' },
          { word: '死ぬしかない', confidence: 'high' },
          { word: '生きる意味', confidence: 'contextual' },
          { word: 'もう限界', confidence: 'contextual' },
          { word: '死ぬ', confidence: 'contextual' },
        ],
        en: [
          { word: 'suicide', confidence: 'high' },
          { word: 'kill myself', confidence: 'high' },
          { word: 'want to die', confidence: 'high' },
          { word: 'end it all', confidence: 'high' },
          { word: 'no point living', confidence: 'high' },
          { word: 'better off dead', confidence: 'high' },
          { word: "can't go on", confidence: 'contextual' },
        ],
        es: [
          { word: 'suicidio', confidence: 'high' },
          { word: 'matarme', confidence: 'high' },
          { word: 'quiero morir', confidence: 'high' },
          { word: 'acabar con todo', confidence: 'high' },
          { word: 'no vale la pena vivir', confidence: 'high' },
          { word: 'mejor muerto', confidence: 'high' },
        ],
        pt: [
          { word: 'suicídio', confidence: 'high' },
          { word: 'me matar', confidence: 'high' },
          { word: 'quero morrer', confidence: 'high' },
          { word: 'acabar com tudo', confidence: 'high' },
          { word: 'não vale a pena viver', confidence: 'high' },
          { word: 'melhor morto', confidence: 'high' },
        ],
        fr: [
          { word: 'suicide', confidence: 'high' },
          { word: 'me suicider', confidence: 'high' },
          { word: 'me tuer', confidence: 'high' },
          { word: 'je veux mourir', confidence: 'high' },
          { word: 'envie de mourir', confidence: 'high' },
          { word: 'en finir avec la vie', confidence: 'high' },
          { word: 'plus envie de vivre', confidence: 'high' },
          { word: 'mieux mort', confidence: 'high' },
          { word: 'en finir', confidence: 'contextual' },
          { word: 'mourir', confidence: 'contextual' },
        ],
        hi: [
          { word: 'आत्महत्या', confidence: 'high' },
          { word: 'खुदकुशी', confidence: 'high' },
          { word: 'खुद को मार', confidence: 'high' },
          { word: 'मरना चाहता हूं', confidence: 'high' },
          { word: 'मरना चाहती हूं', confidence: 'high' },
          { word: 'जीना नहीं चाहता', confidence: 'high' },
          { word: 'जीना नहीं चाहती', confidence: 'high' },
          { word: 'सब खत्म कर', confidence: 'high' },
          { word: 'जीने का कोई मतलब नहीं', confidence: 'high' },
          { word: 'मर जाऊं', confidence: 'contextual' },
          { word: 'मरना', confidence: 'contextual' },
        ],
        ar: [
          { word: 'انتحار', confidence: 'high' },
          { word: 'أقتل نفسي', confidence: 'high' },
          { word: 'اقتل نفسي', confidence: 'high' },
          { word: 'أريد أن أموت', confidence: 'high' },
          { word: 'اريد ان اموت', confidence: 'high' },
          { word: 'أنهي حياتي', confidence: 'high' },
          { word: 'انهي حياتي', confidence: 'high' },
          { word: 'لا أريد العيش', confidence: 'high' },
          { word: 'لا اريد الحياة', confidence: 'high' },
          { word: 'أفضل ميتا', confidence: 'high' },
          { word: 'لا فائدة من الحياة', confidence: 'contextual' },
          { word: 'أموت', confidence: 'contextual' },
        ],
      },
      exclusions: {
        ja: ['必死', '死角', '死語', '死蔵', '死守', '死闘', '死球', '死後', '死因', '死者', '死亡事故', '死活問題', '生死', '死神', '死刑', '瀕死'],
        en: ['deadline', 'die out', 'diet', 'died down'],
        es: [],
        pt: [],
        fr: ['mourir de rire', 'mourir d\'envie', 'mourir de faim', 'mourir d\'ennui', 'à mourir de rire'],
        hi: ['डर से मर', 'भूख से मर', 'हंसी से मर', 'थक कर मर'],
        ar: ['يموت من الضحك', 'أموت فيك', 'اموت فيك', 'أموت من الضحك', 'اموت من الضحك', 'أموت من الجوع', 'اموت من الجوع'],
      },
    },
    // 自傷関連
    {
      name: 'selfHarm',
      severity: 'high',
      keywords: {
        ja: [
          { word: '自傷', confidence: 'high' },
          { word: '自分を傷つけ', confidence: 'high' },
          { word: 'リストカット', confidence: 'high' },
          { word: '切りたい', confidence: 'contextual' },
          { word: '痛みで忘れたい', confidence: 'high' },
        ],
        en: [
          { word: 'self harm', confidence: 'high' },
          { word: 'self-harm', confidence: 'high' },
          { word: 'hurt myself', confidence: 'high' },
          { word: 'cut myself', confidence: 'high' },
          { word: 'self injury', confidence: 'high' },
          { word: 'want to cut', confidence: 'contextual' },
        ],
        es: [
          { word: 'autolesión', confidence: 'high' },
          { word: 'hacerme daño', confidence: 'high' },
          { word: 'cortarme', confidence: 'high' },
          { word: 'lastimarse', confidence: 'contextual' },
        ],
        pt: [
          { word: 'autolesão', confidence: 'high' },
          { word: 'me machucar', confidence: 'high' },
          { word: 'me cortar', confidence: 'high' },
          { word: 'me ferir', confidence: 'contextual' },
        ],
        fr: [
          { word: 'automutilation', confidence: 'high' },
          { word: 'me faire du mal', confidence: 'high' },
          { word: 'me couper', confidence: 'high' },
          { word: 'me blesser', confidence: 'high' },
          { word: 'me scarifier', confidence: 'high' },
          { word: 'me mutiler', confidence: 'high' },
          { word: 'envie de me couper', confidence: 'contextual' },
        ],
        hi: [
          { word: 'खुद को चोट', confidence: 'high' },
          { word: 'खुद को नुकसान', confidence: 'high' },
          { word: 'खुद को काटना', confidence: 'high' },
          { word: 'खुद को जख्मी', confidence: 'high' },
          { word: 'खुद को तकलीफ', confidence: 'contextual' },
        ],
        ar: [
          { word: 'إيذاء النفس', confidence: 'high' },
          { word: 'ايذاء النفس', confidence: 'high' },
          { word: 'أؤذي نفسي', confidence: 'high' },
          { word: 'اؤذي نفسي', confidence: 'high' },
          { word: 'أجرح نفسي', confidence: 'high' },
          { word: 'اجرح نفسي', confidence: 'high' },
          { word: 'أقطع نفسي', confidence: 'high' },
          { word: 'اقطع نفسي', confidence: 'high' },
        ],
      },
      exclusions: {
        ja: ['爪を切りたい', '髪を切りたい', '縁を切りたい', '電話を切りたい'],
        en: ['shortcut', 'cut the', 'cut down on', 'cut back', 'paper cut'],
        es: [],
        pt: [],
        fr: ['couper les cheveux', 'couper les ongles', 'couper court', 'couper la parole'],
        hi: ['बाल काटना', 'नाखून काटना', 'फोन काट'],
        ar: ['قص الشعر', 'قص الأظافر', 'اقطع الاتصال', 'قطع المكالمة'],
      },
    },
    // 絶望関連（中程度）
    {
      name: 'despair',
      severity: 'medium',
      keywords: {
        ja: [
          { word: '絶望', confidence: 'contextual' },
          { word: 'もうだめ', confidence: 'contextual' },
          { word: '希望がない', confidence: 'contextual' },
          { word: '生きていても', confidence: 'high' },
          { word: '意味がない', confidence: 'contextual' },
        ],
        en: [
          { word: 'hopeless', confidence: 'contextual' },
          { word: 'no hope', confidence: 'contextual' },
          { word: "can't take it", confidence: 'contextual' },
          { word: 'give up', confidence: 'contextual' },
        ],
        es: [
          { word: 'sin esperanza', confidence: 'contextual' },
          { word: 'no puedo más', confidence: 'contextual' },
          { word: 'rendirse', confidence: 'contextual' },
        ],
        pt: [
          { word: 'sem esperança', confidence: 'contextual' },
          { word: 'não aguento mais', confidence: 'contextual' },
          { word: 'desistir', confidence: 'contextual' },
        ],
        fr: [
          { word: 'désespoir', confidence: 'contextual' },
          { word: 'sans espoir', confidence: 'contextual' },
          { word: "je n'en peux plus", confidence: 'contextual' },
          { word: 'abandonner', confidence: 'contextual' },
          { word: 'à bout', confidence: 'contextual' },
          { word: 'plus la force', confidence: 'contextual' },
        ],
        hi: [
          { word: 'निराशा', confidence: 'contextual' },
          { word: 'कोई उम्मीद नहीं', confidence: 'contextual' },
          { word: 'हार मान ली', confidence: 'contextual' },
          { word: 'बहुत थक गया', confidence: 'contextual' },
          { word: 'बहुत थक गई', confidence: 'contextual' },
          { word: 'सहन नहीं कर सकता', confidence: 'contextual' },
        ],
        ar: [
          { word: 'يأس', confidence: 'contextual' },
          { word: 'لا أمل', confidence: 'contextual' },
          { word: 'ما في أمل', confidence: 'contextual' },
          { word: 'لا أستطيع الاستمرار', confidence: 'contextual' },
          { word: 'لم أعد أتحمل', confidence: 'contextual' },
          { word: 'استسلمت', confidence: 'contextual' },
        ],
      },
      exclusions: {
        ja: ['絶望的に美味', '絶望先生'],
        en: ['give up sugar', 'give up smoking', 'give up caffeine', 'never give up'],
        es: [],
        pt: [],
        fr: ['abandonner le sucre', 'abandonner la cigarette', 'abandonner le café', 'ne jamais abandonner'],
        hi: ['चीनी छोड़', 'सिगरेट छोड़', 'कभी हार मत मान'],
        ar: ['لا تستسلم أبدا', 'استسلمت للعادة', 'ترك التدخين'],
      },
    },
    // 孤立関連（軽度）
    {
      name: 'isolation',
      severity: 'low',
      keywords: {
        ja: [
          { word: 'ひとりぼっち', confidence: 'contextual' },
          { word: '誰もわかってくれない', confidence: 'contextual' },
          { word: '孤独', confidence: 'contextual' },
          { word: '助けて', confidence: 'contextual' },
        ],
        en: [
          { word: 'nobody understands', confidence: 'contextual' },
          { word: 'help me', confidence: 'contextual' },
        ],
        es: [
          { word: 'nadie me entiende', confidence: 'contextual' },
          { word: 'ayúdame', confidence: 'contextual' },
        ],
        pt: [
          { word: 'ninguém me entende', confidence: 'contextual' },
          { word: 'me ajude', confidence: 'contextual' },
        ],
        fr: [
          { word: 'personne ne me comprend', confidence: 'contextual' },
          { word: 'seul au monde', confidence: 'contextual' },
          { word: 'aidez-moi', confidence: 'contextual' },
          { word: 'tout seul', confidence: 'contextual' },
          { word: 'toute seule', confidence: 'contextual' },
        ],
        hi: [
          { word: 'अकेला', confidence: 'contextual' },
          { word: 'अकेली', confidence: 'contextual' },
          { word: 'कोई नहीं समझता', confidence: 'contextual' },
          { word: 'कोई नहीं समझती', confidence: 'contextual' },
          { word: 'मदद करो', confidence: 'contextual' },
        ],
        ar: [
          { word: 'وحيد', confidence: 'contextual' },
          { word: 'وحيدة', confidence: 'contextual' },
          { word: 'لا أحد يفهمني', confidence: 'contextual' },
          { word: 'لا احد يفهمني', confidence: 'contextual' },
          { word: 'ساعدني', confidence: 'contextual' },
          { word: 'النجدة', confidence: 'contextual' },
        ],
      },
      exclusions: {
        ja: ['孤独のグルメ', '孤独な戦い', '孤独死'],
        en: ['alone time', 'standalone', 'home alone', 'leave me alone', 'help me understand', 'help me find', 'help me with'],
        es: [],
        pt: [],
        fr: ["laissez-moi seul", "laissez-moi tranquille", "aidez-moi à comprendre", "aidez-moi à trouver"],
        hi: ['अकेला सफर', 'अकेला छोड़ दो', 'मदद करो समझने में'],
        ar: ['اتركني وحدي', 'دعني وحدي', 'ساعدني في فهم', 'ساعدني في إيجاد'],
      },
    },
  ];

  /**
   * JavaScript の `\b`（ASCII 単語境界）が効かないスクリプトかを判定。
   * CJK に加え、Devanagari（Hindi）と Arabic は文字クラスが ASCII `\w` 外なので
   * 単語境界マッチが破綻する → substring マッチで代替する。
   */
  private static usesSubstringMatch(lang: string): boolean {
    return ['ja', 'zh', 'ko', 'hi', 'ar'].includes(lang);
  }

  /**
   * テキストにキーワードが文脈的に含まれるかチェック
   * - 除外パターンに該当する場合はfalse
   * - 単語境界マッチが効くスクリプトでは \b を使用
   */
  private static matchesKeyword(
    text: string,
    keyword: string,
    exclusions: string[],
    lang: string
  ): boolean {
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    // 除外パターンチェック: テキストに除外語が含まれていたらその部分を除去して再判定
    for (const exclusion of exclusions) {
      if (lowerText.includes(exclusion.toLowerCase())) {
        // 除外語を取り除いた残りのテキストでキーワードが見つかるか確認
        const cleaned = lowerText.replaceAll(exclusion.toLowerCase(), '  ');
        if (!cleaned.includes(lowerKeyword)) {
          return false;
        }
      }
    }

    if (this.usesSubstringMatch(lang)) {
      return lowerText.includes(lowerKeyword);
    }

    // Latin 系言語: 単語境界を使ったマッチング
    const escaped = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    return pattern.test(text);
  }

  /**
   * テキストから危機の兆候を検出
   */
  static detectCrisis(text: string, language: string = 'ja'): CrisisDetectionResult {
    const detectedKeywords: string[] = [];
    const triggerPatterns: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let hasHighConfidence = false;
    let contextualCount = 0;

    const lang = language.split('-')[0];

    for (const category of this.CATEGORIES) {
      const keywords = category.keywords[lang] || [];
      const exclusions = category.exclusions[lang] || [];

      for (const entry of keywords) {
        if (this.matchesKeyword(text, entry.word, exclusions, lang)) {
          detectedKeywords.push(entry.word);
          triggerPatterns.push(category.name);

          if (entry.confidence === 'high') {
            hasHighConfidence = true;
            if (this.getSeverityLevel(category.severity) > this.getSeverityLevel(maxSeverity)) {
              maxSeverity = category.severity;
            }
          } else {
            contextualCount++;
          }
        }
      }
    }

    // 文脈依存キーワードのみの場合: 2つ以上マッチで初めてトリガー
    if (!hasHighConfidence && contextualCount >= 2) {
      // 文脈依存キーワードの最高重要度を適用
      for (const category of this.CATEGORIES) {
        const keywords = category.keywords[lang] || [];
        for (const entry of keywords) {
          if (entry.confidence === 'contextual' && detectedKeywords.includes(entry.word)) {
            if (this.getSeverityLevel(category.severity) > this.getSeverityLevel(maxSeverity)) {
              maxSeverity = category.severity;
            }
          }
        }
      }
    } else if (!hasHighConfidence) {
      // 高確信度キーワードなし & 文脈依存が1つ以下 → 危機ではない
      return {
        isCrisis: false,
        severity: 'low',
        detectedKeywords: [],
        triggerPatterns: [],
        recommendedAction: 'monitor',
      };
    }

    const isCrisis = detectedKeywords.length > 0;
    const recommendedAction = this.getRecommendedAction(maxSeverity, detectedKeywords.length);

    return {
      isCrisis,
      severity: maxSeverity,
      detectedKeywords,
      triggerPatterns,
      recommendedAction,
    };
  }

  /**
   * 複数のメッセージから危機パターンを検出
   */
  static detectCrisisPattern(messages: string[], language: string = 'ja'): CrisisDetectionResult {
    const allText = messages.join(' ');
    const result = this.detectCrisis(allText, language);

    // 複数メッセージでの継続的な危機兆候をチェック
    const crisisCount = messages.reduce((count, message) => {
      const messageResult = this.detectCrisis(message, language);
      return count + (messageResult.isCrisis ? 1 : 0);
    }, 0);

    // 継続的な危機兆候がある場合は重要度を上げる
    if (crisisCount >= 2 && result.severity !== 'critical') {
      result.severity = result.severity === 'high' ? 'critical' : 'high';
      result.recommendedAction = this.getRecommendedAction(result.severity, result.detectedKeywords.length);
    }

    return result;
  }

  /**
   * 重要度の数値変換（比較用）
   */
  private static getSeverityLevel(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity];
  }

  /**
   * 推奨アクションの決定
   */
  private static getRecommendedAction(
    severity: 'low' | 'medium' | 'high' | 'critical',
    keywordCount: number
  ): 'monitor' | 'gentle_intervention' | 'immediate_intervention' | 'emergency_resources' {
    if (severity === 'critical' || keywordCount >= 3) {
      return 'emergency_resources';
    } else if (severity === 'high' || keywordCount >= 2) {
      return 'immediate_intervention';
    } else if (severity === 'medium') {
      return 'gentle_intervention';
    } else {
      return 'monitor';
    }
  }

  /**
   * 危機レベルに応じたメッセージの生成
   */
  static generateCrisisResponse(result: CrisisDetectionResult, language: string = 'ja'): string {
    const responses = {
      ja: {
        emergency_resources: '深刻な心の痛みを感じておられることが伝わります。あなたの命は尊く、助けを求めることは勇気ある行動です。すぐに専門家にご相談ください。',
        immediate_intervention: 'とても辛い状況におられることがわかります。一人で抱え込まず、信頼できる人や専門家に相談することをお勧めします。',
        gentle_intervention: '心に重い負担を感じておられるようですね。あなたの気持ちは理解できます。話を聞いてくれる人がそばにいることを忘れないでください。',
        monitor: '困難な時期を過ごしておられるのですね。あなたの気持ちに寄り添い、支えになりたいと思います。',
      },
      en: {
        emergency_resources: 'I can sense you are experiencing deep emotional pain. Your life is precious, and seeking help is a courageous step. Please reach out to a professional immediately.',
        immediate_intervention: 'I understand you are in a very difficult situation. Please do not carry this burden alone - consider speaking with someone you trust or a professional.',
        gentle_intervention: 'It seems you are carrying a heavy emotional burden. Your feelings are valid and understood. Remember that there are people who care about you.',
        monitor: 'I can see you are going through a challenging time. I want to be here to support and listen to you.',
      },
      es: {
        emergency_resources: 'Puedo sentir que estás experimentando un dolor emocional profundo. Tu vida es preciosa, y buscar ayuda es un paso valiente. Por favor, contacta a un profesional inmediatamente.',
        immediate_intervention: 'Entiendo que estás en una situación muy difícil. Por favor, no cargues con esto solo - considera hablar con alguien de confianza o un profesional.',
        gentle_intervention: 'Parece que llevas una carga emocional pesada. Tus sentimientos son válidos y comprendidos. Recuerda que hay personas que se preocupan por ti.',
        monitor: 'Puedo ver que estás pasando por un momento difícil. Quiero estar aquí para apoyarte y escucharte.',
      },
      pt: {
        emergency_resources: 'Posso sentir que você está experimentando uma dor emocional profunda. Sua vida é preciosa, e buscar ajuda é um passo corajoso. Por favor, procure um profissional imediatamente.',
        immediate_intervention: 'Entendo que você está em uma situação muito difícil. Por favor, não carregue esse fardo sozinho - considere falar com alguém de confiança ou um profissional.',
        gentle_intervention: 'Parece que você está carregando um fardo emocional pesado. Seus sentimentos são válidos e compreendidos. Lembre-se de que há pessoas que se importam com você.',
        monitor: 'Posso ver que você está passando por um momento difícil. Quero estar aqui para apoiá-lo e ouvi-lo.',
      },
      fr: {
        emergency_resources: "Je perçois que vous traversez une douleur émotionnelle profonde. Votre vie est précieuse, et demander de l'aide est un acte de courage. Veuillez contacter un professionnel immédiatement.",
        immediate_intervention: "Je comprends que vous vivez une situation très difficile. Ne portez pas ce fardeau seul — parlez-en à une personne de confiance ou à un professionnel.",
        gentle_intervention: "Il semble que vous portiez un poids émotionnel lourd. Vos sentiments sont légitimes et compris. Souvenez-vous qu'il y a des personnes qui tiennent à vous.",
        monitor: "Je vois que vous traversez une période difficile. Je suis là pour vous écouter et vous soutenir.",
      },
      hi: {
        emergency_resources: 'मुझे महसूस हो रहा है कि आप गहरे भावनात्मक दर्द से गुज़र रहे हैं। आपका जीवन बहुमूल्य है, और मदद माँगना साहस का काम है। कृपया तुरंत किसी विशेषज्ञ से संपर्क करें।',
        immediate_intervention: 'मैं समझता हूँ कि आप बहुत कठिन परिस्थिति में हैं। कृपया यह बोझ अकेले न उठाएँ — किसी विश्वसनीय व्यक्ति या विशेषज्ञ से बात करने पर विचार करें।',
        gentle_intervention: 'ऐसा लगता है कि आप एक भारी भावनात्मक बोझ उठा रहे हैं। आपकी भावनाएँ वैध हैं और समझी जाती हैं। याद रखें कि ऐसे लोग हैं जो आपकी परवाह करते हैं।',
        monitor: 'मैं देख सकता हूँ कि आप एक कठिन समय से गुज़र रहे हैं। मैं यहाँ आपको सुनने और सहारा देने के लिए हूँ।',
      },
      ar: {
        emergency_resources: 'أشعر أنك تمر بألم عاطفي عميق. حياتك ثمينة، وطلب المساعدة خطوة شجاعة. الرجاء التواصل مع مختص فورا.',
        immediate_intervention: 'أفهم أنك في موقف صعب جدا. أرجوك لا تحمل هذا العبء وحدك — فكر في التحدث مع شخص تثق به أو مع مختص.',
        gentle_intervention: 'يبدو أنك تحمل عبئا عاطفيا ثقيلا. مشاعرك حقيقية ومفهومة. تذكر أن هناك من يهتمون بأمرك.',
        monitor: 'أرى أنك تمر بوقت صعب. أنا هنا لأدعمك وأستمع إليك.',
      },
    };

    const lang = language.split('-')[0] as keyof typeof responses;
    const langResponses = responses[lang] || responses.ja;

    return langResponses[result.recommendedAction];
  }
}
