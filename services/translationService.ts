import { GoogleGenAI } from '@google/genai';

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
  private geminiTranslator: GoogleGenAI;
  private cache = new Map<string, CachedTranslation>();
  private glossary = new Map<string, Map<string, string>>();

  constructor(apiKey: string) {
    this.geminiTranslator = new GoogleGenAI({ apiKey });
    this.loadSpiritualGlossary();
  }

  async translateAIResponse(
    text: string,
    targetLang: string,
    context: TranslationContext,
    previousResponses: string[] = []
  ): Promise<string> {
    if (targetLang === 'ja') {
      return text; // 日本語はそのまま返す
    }

    const cacheKey = this.generateCacheKey(text, targetLang, context);
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      return cached.translation;
    }

    try {
      const enhancedPrompt = this.buildTranslationPrompt(text, targetLang, context, previousResponses);
      
      const response = await this.geminiTranslator.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
        config: {
          temperature: 0.4, // 重複回避のため少し創造性を上げる
          topP: 0.9
        }
      });

      const translation = response.text;

      // キャッシュに保存
      this.cache.set(cacheKey, {
        translation,
        timestamp: Date.now(),
        expiryTime: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7日間
      });

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // フォールバックとして元のテキストを返す
    }
  }

  private buildTranslationPrompt(
    text: string,
    targetLang: string,
    context: TranslationContext,
    previousResponses: string[] = []
  ): string {
    const cultureSpecificInstructions = {
      'japanese-sage': {
        'en': 'Maintain the dignified, wise tone of a Japanese sage. Use formal but warm language.',
        'es': 'Mantén el tono digno y sabio de un sabio japonés. Usa lenguaje formal pero cálido.',
        'zh': '保持日本聖者莊嚴而智慧的語調。使用正式但溫暖的語言。',
        'ko': '일본 성자의 품위 있고 지혜로운 어조를 유지하세요. 정중하지만 따뜻한 언어를 사용하세요.'
      }
    };

    const glossaryTerms = this.getRelevantGlossaryTerms(text, targetLang);
    const instruction = cultureSpecificInstructions[context.culturalContext]?.[targetLang] || '';
    
    // 重複回避のための指示を構築
    const duplicateAvoidanceSection = previousResponses.length > 0 ? `

IMPORTANT - Avoid Duplication:
Previous responses in this conversation (avoid similar phrasing, expressions, and approaches):
${previousResponses.map((resp, i) => `Response ${i + 1}: "${resp.substring(0, 200)}${resp.length > 200 ? '...' : ''}"`).join('\n')}

Guidelines to avoid repetition:
- Use different vocabulary and expressions from previous responses
- Approach the topic from a new angle or perspective
- Vary sentence structure and rhythm
- Offer fresh insights while maintaining the sage's wisdom
- If the content naturally overlaps, express it in a distinctly different way` : '';

    return `You are an expert translator specializing in spiritual and philosophical texts.

Task: Translate the following Japanese sage's response to ${targetLang}.

Context:
- Domain: ${context.domain}
- Tone: ${context.tone}
- Cultural Context: ${context.culturalContext}

Special Instructions:
${instruction}

Important Terms (use these specific translations):
${glossaryTerms.map(([original, translation]) => `${original} → ${translation}`).join('\n')}
${duplicateAvoidanceSection}

Original Text:
${text}

Requirements:
1. Preserve the spiritual wisdom and dignity
2. Maintain cultural sensitivity
3. Use natural, flowing language
4. Keep the warm, accessible tone
5. Ensure technical terms are accurately translated
6. Do not add explanations or change the meaning
7. Avoid repetitive phrasing from previous responses in this conversation

Translation:`;
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

  private getRelevantGlossaryTerms(text: string, targetLang: string): [string, string][] {
    const terms: [string, string][] = [];
    
    for (const [originalTerm, translations] of this.glossary) {
      if (text.includes(originalTerm)) {
        const translation = translations.get(targetLang);
        if (translation) {
          terms.push([originalTerm, translation]);
        }
      }
    }
    
    return terms;
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

    const score = {
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