/**
 * Server-side system instruction builder.
 *
 * Why: the system prompt used to arrive in the request body, which let anyone
 * POST to /api/chat with an arbitrary instruction and use the endpoint as a
 * general-purpose Gemini proxy on our API key. The instruction is now resolved
 * entirely server-side from the requested language; crisis guidance and
 * duplicate-avoidance hints are derived from the message and history the
 * server already receives, so the client no longer sends any prompt text
 * besides the user's own message.
 */
import ja from '../src/lib/locales/ja/translation';
import en from '../src/lib/locales/en/translation';
import es from '../src/lib/locales/es/translation';
import pt from '../src/lib/locales/pt/translation';
import fr from '../src/lib/locales/fr/translation';
import hi from '../src/lib/locales/hi/translation';
import ar from '../src/lib/locales/ar/translation';
import { CrisisDetectionService } from '../src/services/crisisDetectionService';
import { DuplicateAvoidanceService } from '../src/services/duplicateAvoidanceService';

const INSTRUCTIONS: Record<string, string> = {
  ja: ja.systemInstructionForSage,
  en: en.systemInstructionForSage,
  es: es.systemInstructionForSage,
  pt: pt.systemInstructionForSage,
  fr: fr.systemInstructionForSage,
  hi: hi.systemInstructionForSage,
  ar: ar.systemInstructionForSage,
};

// Matches the client's i18next fallbackLng (src/lib/i18n.ts).
const FALLBACK_LANG = 'en';

/** Normalize an untrusted language value to a supported base language. */
export function resolveLanguage(language: unknown): string {
  if (typeof language !== 'string') return FALLBACK_LANG;
  const lang = language.toLowerCase().split('-')[0];
  return lang in INSTRUCTIONS ? lang : FALLBACK_LANG;
}

interface WireHistoryMessage {
  sender: string;
  text: string;
}

/** Keep only well-formed entries from the untrusted history payload. */
function sanitizeHistory(conversationHistory: unknown): WireHistoryMessage[] {
  if (!Array.isArray(conversationHistory)) return [];
  return conversationHistory.filter(
    (m): m is WireHistoryMessage =>
      !!m && typeof m.sender === 'string' && typeof m.text === 'string'
  );
}

export function buildSystemInstruction(
  language: unknown,
  message: string,
  conversationHistory: unknown
): string {
  const lang = resolveLanguage(language);
  let instruction = INSTRUCTIONS[lang];

  // 危機が検出された場合はシステムプロンプトを調整（旧クライアント実装と同文）
  const crisisResult = CrisisDetectionService.detectCrisis(message, lang);
  if (crisisResult.isCrisis) {
    const guidance = CrisisDetectionService.generateCrisisResponse(crisisResult, lang);
    instruction += `\n\n【重要な注意】ユーザーは現在困難な状況にある可能性があります。以下のガイダンスを参考に、共感的で支援的な応答を心がけてください：\n${guidance}\n\nまた、専門的な支援を受けることの重要性を優しく伝えてください。`;
  }

  instruction += DuplicateAvoidanceService.generateDuplicateAvoidancePrompt(
    sanitizeHistory(conversationHistory)
  );

  return instruction;
}
