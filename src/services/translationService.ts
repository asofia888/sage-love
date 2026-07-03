export interface TranslationContext {
  domain: 'spiritual' | 'philosophical' | 'practical';
  tone: 'sage' | 'gentle' | 'formal';
  culturalContext: string;
}

export interface QualityScore {
  overall: number;
  fluency: number;
  accuracy: number;
  cultural: number;
  terminology: number;
  suggestions: string[];
}

export interface CachedTranslation {
  translation: string;
  timestamp: number;
  expiryTime: number;
}

export interface TranslationIssue {
  type: 'low_quality' | 'incorrect_term' | 'cultural_issue';
  score?: QualityScore;
  timestamp: Date;
  details?: string;
}

export class EnhancedTranslationService {
  private cache = new Map<string, CachedTranslation>();
  private glossary = new Map<string, Map<string, string>>();

  constructor() {
    this.loadSpiritualGlossary();
  }

  async translateAIResponse(
    text: string,
    targetLang: string,
    context: TranslationContext,
    _previousResponses: string[] = []
  ): Promise<string> {
    if (targetLang === 'ja') {
      return text; // 日本語はそのまま返す
    }

    const cacheKey = this.generateCacheKey(text, targetLang, context);
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      return cached.translation;
    }

    // Translation is now handled server-side via api/chat.ts
    // This client-side implementation is deprecated
    return text;
  }

  private generateCacheKey(
    text: string,
    targetLang: string,
    context: TranslationContext
  ): string {
    const contextStr = `${context.domain}-${context.tone}-${context.culturalContext}`;
    return `${targetLang}-${contextStr}-${this.hashString(text)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bitに変換
    }
    return hash.toString();
  }

  private isExpired(cached: CachedTranslation): boolean {
    return Date.now() > cached.expiryTime;
  }

  private loadSpiritualGlossary(): void {
    const glossaryData = {
      "真我": {
        "en": "True Self",
        "es": "Verdadero Ser",
        "zh": "真我",
        "ko": "참자아"
      },
      "内なる平和": {
        "en": "inner peace",
        "es": "paz interior",
        "zh": "内心平静",
        "ko": "내면의 평화"
      },
      "悟り": {
        "en": "enlightenment",
        "es": "iluminación",
        "zh": "覺悟",
        "ko": "깨달음"
      },
      "瞑想": {
        "en": "meditation",
        "es": "meditación",
        "zh": "冥想",
        "ko": "명상"
      },
      "智慧": {
        "en": "wisdom",
        "es": "sabiduría",
        "zh": "智慧",
        "ko": "지혜"
      },
      "慈悲": {
        "en": "compassion",
        "es": "compasión",
        "zh": "慈悲",
        "ko": "자비"
      },
      "覚醒": {
        "en": "awakening",
        "es": "despertar",
        "zh": "覺醒",
        "ko": "각성"
      },
      "解脱": {
        "en": "liberation",
        "es": "liberación",
        "zh": "解脫",
        "ko": "해탈"
      }
    };

    for (const [term, translations] of Object.entries(glossaryData)) {
      this.glossary.set(term, new Map(Object.entries(translations)));
    }
  }

  // 翻訳品質を簡易評価
  async evaluateTranslation(
    original: string,
    translated: string,
    targetLang: string
  ): Promise<QualityScore> {
    // 簡単な品質チェック（より高度な評価は後で実装）
    const hasSpecialTerms = this.checkSpiritualTerminology(original, translated, targetLang);
    const lengthRatio = translated.length / original.length;
    const reasonableLength = lengthRatio > 0.5 && lengthRatio < 2.0;

    const score: QualityScore = {
      overall: hasSpecialTerms && reasonableLength ? 0.8 : 0.6,
      fluency: 0.8,
      accuracy: hasSpecialTerms ? 0.9 : 0.7,
      cultural: 0.8,
      terminology: hasSpecialTerms ? 0.9 : 0.6,
      suggestions: []
    };

    if (!hasSpecialTerms) {
      score.suggestions.push('専門用語の翻訳を確認してください');
    }
    if (!reasonableLength) {
      score.suggestions.push('翻訳の長さが適切でない可能性があります');
    }

    return score;
  }

  private checkSpiritualTerminology(
    original: string,
    translated: string,
    targetLang: string
  ): boolean {
    let foundTerms = 0;
    let correctTerms = 0;

    for (const [originalTerm, translations] of this.glossary) {
      if (original.includes(originalTerm)) {
        foundTerms++;
        const expectedTranslation = translations.get(targetLang);
        if (expectedTranslation && translated.toLowerCase().includes(expectedTranslation.toLowerCase())) {
          correctTerms++;
        }
      }
    }

    return foundTerms === 0 || correctTerms / foundTerms >= 0.8;
  }
}