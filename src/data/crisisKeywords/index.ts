/**
 * 危機検出キーワード辞書 - 言語別 JSON データを集約する。
 * キーワード本体とマッチロジックを分離しているので、辞書のメンテは JSON
 * 側のみで済み、サービス側のコードを触る必要がない。
 */
import ja from './ja.json';
import en from './en.json';
import es from './es.json';
import pt from './pt.json';
import fr from './fr.json';
import hi from './hi.json';
import ar from './ar.json';

export type CrisisCategoryName = 'suicide' | 'selfHarm' | 'despair' | 'isolation';
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CrisisAction =
  | 'monitor'
  | 'gentle_intervention'
  | 'immediate_intervention'
  | 'emergency_resources';

export interface KeywordEntry {
  word: string;
  /** 高確信度キーワードは単独でトリガーする。文脈依存キーワードは複合条件が必要 */
  confidence: 'high' | 'contextual';
}

export interface CategoryData {
  keywords: KeywordEntry[];
  /** これらのパターンを含む場合はマッチを除外する */
  exclusions: string[];
}

export interface CrisisLanguageData {
  suicide: CategoryData;
  selfHarm: CategoryData;
  despair: CategoryData;
  isolation: CategoryData;
  responses: Record<CrisisAction, string>;
}

/**
 * カテゴリ別の重要度。データではなく検出ロジックのメタ情報なので
 * JSON ではなくコード側に置いている。
 */
export const CATEGORY_SEVERITY: Record<CrisisCategoryName, CrisisSeverity> = {
  suicide: 'critical',
  selfHarm: 'high',
  despair: 'medium',
  isolation: 'low',
};

export const CATEGORY_ORDER: CrisisCategoryName[] = [
  'suicide',
  'selfHarm',
  'despair',
  'isolation',
];

const DATA = { ja, en, es, pt, fr, hi, ar } as unknown as Record<string, CrisisLanguageData>;

export function getCrisisData(lang: string): CrisisLanguageData | undefined {
  return DATA[lang];
}

export const DEFAULT_LANG = 'ja';
