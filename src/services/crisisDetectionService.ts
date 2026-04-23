/**
 * 危機検出サービス - 自傷・自殺に関する言葉の文脈解析付き検出。
 * キーワード辞書本体は src/data/crisisKeywords/*.json に分離している。
 */
import {
  CATEGORY_ORDER,
  CATEGORY_SEVERITY,
  CrisisAction,
  CrisisCategoryName,
  CrisisSeverity,
  DEFAULT_LANG,
  getCrisisData,
  KeywordEntry,
} from '../data/crisisKeywords';

export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: CrisisSeverity;
  detectedKeywords: string[];
  triggerPatterns: string[];
  recommendedAction: CrisisAction;
}

const SEVERITY_LEVEL: Record<CrisisSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * JavaScript の `\b`（ASCII 単語境界）が効かないスクリプトかを判定。
 * CJK に加え、Devanagari（Hindi）と Arabic は文字クラスが ASCII `\w` 外なので
 * 単語境界マッチが破綻する → substring マッチで代替する。
 */
function usesSubstringMatch(lang: string): boolean {
  return ['ja', 'zh', 'ko', 'hi', 'ar'].includes(lang);
}

/**
 * テキストにキーワードが文脈的に含まれるかチェック。
 * - 除外語が含まれる場合は取り除いた残りで再判定
 * - 単語境界マッチが効くスクリプトでは \b を使用
 */
function matchesKeyword(
  text: string,
  keyword: string,
  exclusions: string[],
  lang: string
): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  for (const exclusion of exclusions) {
    if (lowerText.includes(exclusion.toLowerCase())) {
      const cleaned = lowerText.replaceAll(exclusion.toLowerCase(), '  ');
      if (!cleaned.includes(lowerKeyword)) {
        return false;
      }
    }
  }

  if (usesSubstringMatch(lang)) {
    return lowerText.includes(lowerKeyword);
  }

  const escaped = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
  return pattern.test(text);
}

interface MatchContext {
  category: CrisisCategoryName;
  entry: KeywordEntry;
}

function collectMatches(text: string, lang: string): MatchContext[] {
  const data = getCrisisData(lang);
  if (!data) return [];

  const matches: MatchContext[] = [];
  for (const category of CATEGORY_ORDER) {
    const { keywords, exclusions } = data[category];
    for (const entry of keywords) {
      if (matchesKeyword(text, entry.word, exclusions, lang)) {
        matches.push({ category, entry });
      }
    }
  }
  return matches;
}

function getRecommendedAction(
  severity: CrisisSeverity,
  keywordCount: number
): CrisisAction {
  if (severity === 'critical' || keywordCount >= 3) return 'emergency_resources';
  if (severity === 'high' || keywordCount >= 2) return 'immediate_intervention';
  if (severity === 'medium') return 'gentle_intervention';
  return 'monitor';
}

export class CrisisDetectionService {
  /**
   * テキストから危機の兆候を検出
   */
  static detectCrisis(text: string, language: string = DEFAULT_LANG): CrisisDetectionResult {
    const lang = language.split('-')[0];
    const matches = collectMatches(text, lang);

    const detectedKeywords: string[] = [];
    const triggerPatterns: string[] = [];
    let maxSeverity: CrisisSeverity = 'low';
    let hasHighConfidence = false;
    let contextualCount = 0;

    for (const { category, entry } of matches) {
      detectedKeywords.push(entry.word);
      triggerPatterns.push(category);

      if (entry.confidence === 'high') {
        hasHighConfidence = true;
        const sev = CATEGORY_SEVERITY[category];
        if (SEVERITY_LEVEL[sev] > SEVERITY_LEVEL[maxSeverity]) {
          maxSeverity = sev;
        }
      } else {
        contextualCount++;
      }
    }

    // 文脈依存キーワードのみの場合: 2つ以上マッチで初めてトリガー
    if (!hasHighConfidence) {
      if (contextualCount < 2) {
        return {
          isCrisis: false,
          severity: 'low',
          detectedKeywords: [],
          triggerPatterns: [],
          recommendedAction: 'monitor',
        };
      }
      for (const { category, entry } of matches) {
        if (entry.confidence !== 'contextual') continue;
        const sev = CATEGORY_SEVERITY[category];
        if (SEVERITY_LEVEL[sev] > SEVERITY_LEVEL[maxSeverity]) {
          maxSeverity = sev;
        }
      }
    }

    return {
      isCrisis: detectedKeywords.length > 0,
      severity: maxSeverity,
      detectedKeywords,
      triggerPatterns,
      recommendedAction: getRecommendedAction(maxSeverity, detectedKeywords.length),
    };
  }

  /**
   * 複数メッセージ全体から危機パターンを検出し、継続的な兆候なら重要度を上げる
   */
  static detectCrisisPattern(messages: string[], language: string = DEFAULT_LANG): CrisisDetectionResult {
    const result = this.detectCrisis(messages.join(' '), language);

    const crisisCount = messages.reduce(
      (count, message) => count + (this.detectCrisis(message, language).isCrisis ? 1 : 0),
      0
    );

    if (crisisCount >= 2 && result.severity !== 'critical') {
      result.severity = result.severity === 'high' ? 'critical' : 'high';
      result.recommendedAction = getRecommendedAction(result.severity, result.detectedKeywords.length);
    }

    return result;
  }

  /**
   * 危機レベルに応じたメッセージを生成。対応言語外は日本語にフォールバック。
   */
  static generateCrisisResponse(result: CrisisDetectionResult, language: string = DEFAULT_LANG): string {
    const lang = language.split('-')[0];
    const data = getCrisisData(lang) ?? getCrisisData(DEFAULT_LANG)!;
    return data.responses[result.recommendedAction];
  }
}
