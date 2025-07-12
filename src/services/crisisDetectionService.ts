/**
 * 危機検出サービス - 自傷・自殺に関する言葉の検出
 */
export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedKeywords: string[];
  triggerPatterns: string[];
  recommendedAction: 'monitor' | 'gentle_intervention' | 'immediate_intervention' | 'emergency_resources';
}

export class CrisisDetectionService {
  // 重要: これらのキーワードは研究に基づいた危機検出のためのものです
  private static readonly CRISIS_KEYWORDS = {
    // 自殺関連（直接的）
    suicide: {
      ja: ['自殺', '死にたい', '消えたい', '生きる意味', '終わりにしたい', '死ぬ', '自分を殺', 'もう限界'],
      en: ['suicide', 'kill myself', 'want to die', 'end it all', 'no point living', 'better off dead', 'can\'t go on'],
      es: ['suicidio', 'matarme', 'quiero morir', 'acabar con todo', 'no vale la pena vivir', 'mejor muerto'],
      pt: ['suicídio', 'me matar', 'quero morrer', 'acabar com tudo', 'não vale a pena viver', 'melhor morto'],
    },
    
    // 自傷関連
    selfHarm: {
      ja: ['自傷', '自分を傷つけ', '切りたい', '痛みで忘れたい', 'リストカット'],
      en: ['self harm', 'hurt myself', 'cut myself', 'want to cut', 'self injury'],
      es: ['autolesión', 'hacerme daño', 'cortarme', 'lastimarse'],
      pt: ['autolesão', 'me machucar', 'me cortar', 'me ferir'],
    },
    
    // 絶望関連（中程度）
    despair: {
      ja: ['絶望', 'もうだめ', '希望がない', '生きていても', '意味がない', '疲れた', '限界'],
      en: ['hopeless', 'no hope', 'can\'t take it', 'give up', 'exhausted', 'broken'],
      es: ['sin esperanza', 'no puedo más', 'rendirse', 'agotado', 'roto'],
      pt: ['sem esperança', 'não aguento mais', 'desistir', 'exausto', 'quebrado'],
    },
    
    // 孤立関連（軽度）
    isolation: {
      ja: ['ひとりぼっち', '誰もわかってくれない', '孤独', '助けて', '辛い'],
      en: ['alone', 'nobody understands', 'lonely', 'help me', 'struggling'],
      es: ['solo', 'nadie me entiende', 'solitario', 'ayúdame', 'luchando'],
      pt: ['sozinho', 'ninguém me entende', 'solitário', 'me ajude', 'lutando'],
    }
  };

  /**
   * テキストから危機の兆候を検出
   */
  static detectCrisis(text: string, language: string = 'ja'): CrisisDetectionResult {
    const normalizedText = text.toLowerCase();
    const detectedKeywords: string[] = [];
    const triggerPatterns: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // 言語コードを正規化（例: 'ja-JP' -> 'ja'）
    const lang = language.split('-')[0] as keyof typeof this.CRISIS_KEYWORDS.suicide;

    // 各カテゴリーのキーワードをチェック
    const categories = [
      { name: 'suicide', keywords: this.CRISIS_KEYWORDS.suicide[lang] || [], severity: 'critical' as const },
      { name: 'selfHarm', keywords: this.CRISIS_KEYWORDS.selfHarm[lang] || [], severity: 'high' as const },
      { name: 'despair', keywords: this.CRISIS_KEYWORDS.despair[lang] || [], severity: 'medium' as const },
      { name: 'isolation', keywords: this.CRISIS_KEYWORDS.isolation[lang] || [], severity: 'low' as const },
    ];

    for (const category of categories) {
      for (const keyword of category.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          detectedKeywords.push(keyword);
          triggerPatterns.push(category.name);
          
          // より深刻な重要度を設定
          if (this.getSeverityLevel(category.severity) > this.getSeverityLevel(maxSeverity)) {
            maxSeverity = category.severity;
          }
        }
      }
    }

    const isCrisis = detectedKeywords.length > 0;
    const recommendedAction = this.getRecommendedAction(maxSeverity, detectedKeywords.length);

    return {
      isCrisis,
      severity: maxSeverity,
      detectedKeywords,
      triggerPatterns,
      recommendedAction
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
        monitor: '困難な時期を過ごしておられるのですね。あなたの気持ちに寄り添い、支えになりたいと思います。'
      },
      en: {
        emergency_resources: 'I can sense you are experiencing deep emotional pain. Your life is precious, and seeking help is a courageous step. Please reach out to a professional immediately.',
        immediate_intervention: 'I understand you are in a very difficult situation. Please do not carry this burden alone - consider speaking with someone you trust or a professional.',
        gentle_intervention: 'It seems you are carrying a heavy emotional burden. Your feelings are valid and understood. Remember that there are people who care about you.',
        monitor: 'I can see you are going through a challenging time. I want to be here to support and listen to you.'
      },
      es: {
        emergency_resources: 'Puedo sentir que estás experimentando un dolor emocional profundo. Tu vida es preciosa, y buscar ayuda es un paso valiente. Por favor, contacta a un profesional inmediatamente.',
        immediate_intervention: 'Entiendo que estás en una situación muy difícil. Por favor, no cargues con esto solo - considera hablar con alguien de confianza o un profesional.',
        gentle_intervention: 'Parece que llevas una carga emocional pesada. Tus sentimientos son válidos y comprendidos. Recuerda que hay personas que se preocupan por ti.',
        monitor: 'Puedo ver que estás pasando por un momento difícil. Quiero estar aquí para apoyarte y escucharte.'
      },
      pt: {
        emergency_resources: 'Posso sentir que você está experimentando uma dor emocional profunda. Sua vida é preciosa, e buscar ajuda é um passo corajoso. Por favor, procure um profissional imediatamente.',
        immediate_intervention: 'Entendo que você está em uma situação muito difícil. Por favor, não carregue esse fardo sozinho - considere falar com alguém de confiança ou um profissional.',
        gentle_intervention: 'Parece que você está carregando um fardo emocional pesado. Seus sentimentos são válidos e compreendidos. Lembre-se de que há pessoas que se importam com você.',
        monitor: 'Posso ver que você está passando por um momento difícil. Quero estar aqui para apoiá-lo e ouvi-lo.'
      }
    };

    const lang = language.split('-')[0] as keyof typeof responses;
    const langResponses = responses[lang] || responses.ja;
    
    return langResponses[result.recommendedAction];
  }
}