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
import { buildCrisisDirective } from './crisis-directives';

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

/**
 * 危機の複数ターン評価で遡るユーザー発言の数。
 * クライアント側 useCrisisDetection の checkHistoryLength と同じ値にすること。
 * ここがズレると「モーダルは出たのにプロンプトには危機指示が付かない」
 * （またはその逆）という食い違いが生じる。
 */
const CRISIS_HISTORY_LENGTH = 5;

/** 危機の複数ターン評価に用いる、直近のユーザー発言（最新の1通を含む）。 */
function recentUserMessages(history: WireHistoryMessage[], message: string): string[] {
  const past = history.filter((m) => m.sender === 'user').map((m) => m.text);
  return [...past, message].slice(-CRISIS_HISTORY_LENGTH);
}

/**
 * 危機判定。クライアント（useMessageHandler）と同じ順序で評価する:
 * まず最新メッセージ単体を見て、そこで検出されなかったときだけ直近の
 * 複数ターンをまとめて評価する。
 *
 * Why: 以前はここが単発判定のみだったため、「疲れた」→「誰も分かって
 * くれない」→「もういいや」のように流れとして現れた危機では、画面には
 * 介入モーダルが出るのに、システムプロンプトには危機指示が付かず、
 * 聖者は平時の断定調・共感禁止のペルソナのまま応答していた。
 */
function detectCrisisAcrossTurns(
  message: string,
  history: WireHistoryMessage[],
  lang: string
) {
  const singleTurn = CrisisDetectionService.detectCrisis(message, lang);
  if (singleTurn.isCrisis) return singleTurn;

  return CrisisDetectionService.detectCrisisPattern(
    recentUserMessages(history, message),
    lang
  );
}

export function buildSystemInstruction(
  language: unknown,
  message: string,
  conversationHistory: unknown
): string {
  const lang = resolveLanguage(language);
  const history = sanitizeHistory(conversationHistory);
  let instruction = INSTRUCTIONS[lang];

  // 危機が検出された場合は、利用者の言語で危機対応指示を追記する。
  // この指示はペルソナ側の口調制約（断定調・共感の禁止）を意図的に上書きする
  // ので、必ずベースのシステムプロンプトより後ろに置くこと。
  const crisisResult = detectCrisisAcrossTurns(message, history, lang);
  if (crisisResult.isCrisis) {
    const guidance = CrisisDetectionService.generateCrisisResponse(crisisResult, lang);
    instruction += `\n\n${buildCrisisDirective(lang, guidance)}`;
  }

  instruction += DuplicateAvoidanceService.generateDuplicateAvoidancePrompt(history);

  return instruction;
}
