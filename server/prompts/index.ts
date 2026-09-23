/**
 * 言語別システムプロンプトの索引。サーバー専用。
 *
 * ここに並ぶ言語が server/system-instruction.ts の対応言語そのものであり、
 * resolveLanguage() のフォールバック判定もこのキー集合を使う。
 */
import { SYSTEM_INSTRUCTION_JA } from './ja';
import { SYSTEM_INSTRUCTION_EN } from './en';
import { SYSTEM_INSTRUCTION_ES } from './es';
import { SYSTEM_INSTRUCTION_PT } from './pt';
import { SYSTEM_INSTRUCTION_FR } from './fr';
import { SYSTEM_INSTRUCTION_HI } from './hi';
import { SYSTEM_INSTRUCTION_AR } from './ar';

export const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  ja: SYSTEM_INSTRUCTION_JA,
  en: SYSTEM_INSTRUCTION_EN,
  es: SYSTEM_INSTRUCTION_ES,
  pt: SYSTEM_INSTRUCTION_PT,
  fr: SYSTEM_INSTRUCTION_FR,
  hi: SYSTEM_INSTRUCTION_HI,
  ar: SYSTEM_INSTRUCTION_AR,
};
