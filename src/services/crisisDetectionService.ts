/**
 * 危機検出サービス - 自傷・自殺に関する言葉の文脈解析付き検出。
 * キーワード辞書本体は src/data/crisisKeywords/*.json に分離している。
 */
import {
  CATEGORY_ORDER,
  CATEGORY_SEVERITY,
  CRISIS_LANGUAGES,
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

/** Devanagari: チャンドラビンドゥ(ँ) とアヌスヴァーラ(ं) は実運用で混用される */
const DEVANAGARI_CHANDRABINDU = /ँ/g;

/** Arabic: タシュキール(発音記号)とタトウィール(伸ばし記号)は表記揺れでしかない */
const ARABIC_DIACRITICS = /[ً-ٰٟـ]/g;

/**
 * 表記揺れを吸収してからマッチさせる。
 * 辞書側とテキスト側の双方に同じ正規化をかけるので、辞書に異体字を
 * 並べなくても「मरना चाहता हूँ / हूं」「أريد / اريد」の両方を拾える。
 */
function normalizeForMatching(text: string, lang: string): string {
  // NFKC: 全角英数（ＯＤ）や半角カナ（ｼﾆﾀｲ）を通常の字形に寄せる
  const normalized = text.normalize('NFKC').toLowerCase();

  if (lang === 'hi') {
    return normalized.replace(DEVANAGARI_CHANDRABINDU, 'ं');
  }

  if (lang === 'ar') {
    return normalized
      .replace(ARABIC_DIACRITICS, '')
      .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ → ا
      .replace(/ؤ/g, 'و')                     // ؤ → و
      .replace(/[ئى]/g, 'ي')             // ئ ى → ي
      .replace(/ة/g, 'ه');                    // ة → ه
  }

  return normalized;
}

const ASCII_ALNUM = /[a-z0-9]/;

/**
 * substring マッチ。ただしキーワードの端が ASCII 英数字のときは、その外側に
 * ASCII 英数字が続いていないことを求める。
 *
 * Why: 日本語の辞書には「ODした」のような英字始まりの俗語が要るが、
 * 素の includes だと「iPodしか」「CoDしてた」にも一致してしまう。
 */
function includesKeyword(text: string, keyword: string): boolean {
  const guardStart = ASCII_ALNUM.test(keyword[0] ?? '');
  const guardEnd = ASCII_ALNUM.test(keyword[keyword.length - 1] ?? '');
  if (!guardStart && !guardEnd) return text.includes(keyword);

  for (let at = text.indexOf(keyword); at !== -1; at = text.indexOf(keyword, at + 1)) {
    const before = text[at - 1] ?? '';
    const after = text[at + keyword.length] ?? '';
    if (guardStart && ASCII_ALNUM.test(before)) continue;
    if (guardEnd && ASCII_ALNUM.test(after)) continue;
    return true;
  }
  return false;
}

/**
 * 正規化済みテキストにキーワードが文脈的に含まれるかチェック。
 * - 除外語が含まれる場合は取り除いた残りで再判定
 * - 単語境界マッチが効くスクリプトでは Unicode の語境界を使用
 *
 * normalizedText は呼び出し側で normalizeForMatching 済みであること
 * （キーワードごとに本文を正規化し直さないため）。
 */
function matchesKeyword(
  normalizedText: string,
  keyword: string,
  exclusions: string[],
  lang: string
): boolean {
  const normalizedKeyword = normalizeForMatching(keyword, lang);

  for (const exclusion of exclusions) {
    const normalizedExclusion = normalizeForMatching(exclusion, lang);
    if (normalizedText.includes(normalizedExclusion)) {
      const cleaned = normalizedText.replaceAll(normalizedExclusion, '  ');
      if (!cleaned.includes(normalizedKeyword)) {
        return false;
      }
    }
  }

  if (usesSubstringMatch(lang)) {
    return includesKeyword(normalizedText, normalizedKeyword);
  }

  // ASCII の \b はアクセント付き文字を語の一部と見なさないため、"sin mí" や
  // "désespoir" のように非ASCII文字で終わる/始まるキーワードが一致しなくなる。
  // Unicode の文字・数字クラスで前後の境界を自前に作る。
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
  return pattern.test(normalizedText);
}

interface MatchContext {
  category: CrisisCategoryName;
  entry: KeywordEntry;
}

function collectMatches(text: string, lang: string): MatchContext[] {
  const data = getCrisisData(lang);
  if (!data) return [];

  const normalizedText = normalizeForMatching(text, lang);
  const matches: MatchContext[] = [];
  for (const category of CATEGORY_ORDER) {
    // カテゴリを持たない辞書があっても検出全体を落とさない
    const categoryData = data[category];
    if (!categoryData) continue;
    const { keywords, exclusions } = categoryData;
    for (const entry of keywords) {
      if (matchesKeyword(normalizedText, entry.word, exclusions, lang)) {
        matches.push({ category, entry });
      }
    }
  }
  return matches;
}

function noCrisis(): CrisisDetectionResult {
  return {
    isCrisis: false,
    severity: 'low',
    detectedKeywords: [],
    triggerPatterns: [],
    recommendedAction: 'monitor',
  };
}

/**
 * 1つの言語の辞書だけでテキストを評価する。
 * 文脈依存キーワードの「2つ以上で初めてトリガー」は辞書ごとに数える
 * （別言語の辞書の語が偶然1つずつ当たっただけでは危機としない）。
 */
function detectInLanguage(text: string, lang: string): CrisisDetectionResult {
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
    if (contextualCount < 2) return noCrisis();
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
   * テキストから危機の兆候を検出する。
   *
   * 画面の言語によらず、辞書を持つ全言語で評価する。
   *
   * Why: 以前は language（＝画面の表示言語）の辞書しか見ていなかったため、
   * 英語表示のまま「死にたい」と打った人、日本語表示で "I want to kill myself"
   * と打った人は素通りしていた。さらにブラウザが未対応言語（de/zh/ko 等）の
   * 場合、画面は英語にフォールバックするのに language は 'de' のままなので、
   * 辞書が見つからず検出そのものが無効になっていた。
   * 聖者は「相手が最後に使った言語」で応じるので、入力言語は表示言語と
   * 一致しないのが普通にありうる。
   *
   * language は同じ深刻度で複数の辞書が当たったときの優先（先に評価する言語）
   * にだけ使う。最も深刻な結果を返す。
   */
  static detectCrisis(text: string, language: string = DEFAULT_LANG): CrisisDetectionResult {
    const preferred = language.split('-')[0];
    const order = [preferred, ...CRISIS_LANGUAGES.filter((lang) => lang !== preferred)];

    let best = noCrisis();
    for (const lang of order) {
      const result = detectInLanguage(text, lang);
      if (!result.isCrisis) continue;
      if (!best.isCrisis || SEVERITY_LEVEL[result.severity] > SEVERITY_LEVEL[best.severity]) {
        best = result;
      }
    }
    return best;
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
