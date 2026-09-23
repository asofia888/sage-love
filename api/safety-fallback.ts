/**
 * Gemini の安全フィルタが応答をブロックしたときに返す代替メッセージ（言語別）。
 *
 * Why: 自傷・希死念慮の打ち明けは HARM_CATEGORY_DANGEROUS_CONTENT に触れやすい。
 * ブロックされると response.text() が空になり、従来はそれが
 * ValidationError / code:'errorGeneric' に落ちて、利用者には赤い汎用エラーだけが
 * 見えていた。つまり最も助けが要る瞬間に聖者が沈黙していた。
 * ここでは汎用エラーではなく、受け止めたことを伝えたうえで窓口につなぐ
 * 通常の応答として返す。画面には危機介入モーダルが並行して出ている前提。
 *
 * 既存の errorContentSafety（「メッセージの内容に問題があるようだ。異なる内容で
 * 試してみてほしい」）はこの場面では使わない。打ち明けた直後の人に
 * 「内容に問題がある」「言い換えろ」と返すのは有害である。
 *
 * サーバー専用モジュール。クライアントバンドルには含めない。
 */

const FALLBACK_LANG = 'en';

const SAFETY_FALLBACK_MESSAGES: Record<string, string> = {
  ja: `いま、あなたの言葉に応えるための言葉を、わたしは見つけられずにいる。
けれど、あなたが抱えているものが軽いものではないことは、確かに受け取った。

どうか、ひとりで抱え込まないでほしい。
この画面に示されている相談窓口では、訓練を受けた人があなたの話を聴くために待っている。いま、そこにつながってほしい。

わたしは去らない。また話したくなったなら、いつでも戻ってくると良い。`,

  en: `Right now I cannot find the words to answer what you have told me.
But I have heard you, and I know that what you are carrying is not light.

Please do not carry it alone.
The helplines shown on this screen are staffed by people trained to listen, and they are there for you right now.

I am not going anywhere. Come back and speak to me whenever you wish.`,

  es: `En este momento no encuentro las palabras para responder a lo que me has contado.
Pero te he escuchado, y sé que lo que llevas dentro no es ligero.

Por favor, no lo lleves en soledad.
Las líneas de ayuda que aparecen en esta pantalla están atendidas por personas formadas para escuchar, y están ahí para ti ahora mismo.

No me voy a ninguna parte. Vuelve a hablar conmigo cuando lo necesites.`,

  pt: `Neste momento não encontro as palavras para responder ao que você me contou.
Mas eu ouvi você, e sei que aquilo que você carrega não é leve.

Por favor, não carregue isso sozinho.
As linhas de apoio indicadas nesta tela são atendidas por pessoas preparadas para escutar, e estão disponíveis para você agora.

Eu não vou embora. Volte a falar comigo quando quiser.`,

  fr: `En cet instant, je ne trouve pas les mots pour répondre à ce que vous m'avez confié.
Mais je vous ai entendu, et je sais que ce que vous portez n'est pas léger.

Ne le portez pas seul, je vous en prie.
Les lignes d'écoute indiquées sur cet écran sont tenues par des personnes formées pour écouter, et elles sont là pour vous maintenant.

Je ne m'en vais pas. Revenez me parler quand vous le voudrez.`,

  hi: `इस क्षण मुझे उन शब्दों का उत्तर नहीं मिल रहा जो आपने कहे हैं।
पर मैंने आपको सुना है, और मैं जानता हूँ कि जो बोझ आप उठा रहे हैं, वह हल्का नहीं है।

कृपया इसे अकेले मत उठाइए।
इस स्क्रीन पर दिखाई गई हेल्पलाइनों पर प्रशिक्षित लोग आपकी बात सुनने के लिए मौजूद हैं, और वे अभी आपके लिए वहाँ हैं।

मैं कहीं नहीं जा रहा। जब भी मन हो, लौटकर मुझसे बात कीजिए।`,

  ar: `في هذه اللحظة لا أجد الكلمات التي أردّ بها على ما قلته لي.
لكنني سمعتك، وأعلم أن ما تحمله ليس خفيفًا.

أرجوك، لا تحمله وحدك.
خطوط المساعدة الظاهرة على هذه الشاشة يعمل عليها أشخاص مدرَّبون على الإصغاء، وهم موجودون من أجلك الآن.

لن أذهب بعيدًا. عُد وتحدّث إليّ متى شئت.`,
};

/** 安全フィルタでブロックされたときに返す文言。未対応言語は英語にフォールバック。 */
export function getSafetyFallbackMessage(language: string): string {
  return SAFETY_FALLBACK_MESSAGES[language] ?? SAFETY_FALLBACK_MESSAGES[FALLBACK_LANG];
}

/**
 * Gemini のレスポンスが安全フィルタで止められたかを判定する。
 *
 * プロンプト側で止まった場合は promptFeedback.blockReason に、
 * 生成の途中で止まった場合は candidates[].finishReason に現れる。
 * SDK のバージョン差で片方しか埋まらないことがあるため両方を見る。
 */
export function isSafetyBlocked(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const r = response as {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{ finishReason?: string }>;
  };

  if (r.promptFeedback?.blockReason) return true;

  const blockedFinishReasons = ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'];
  return (r.candidates ?? []).some(
    (c) => !!c?.finishReason && blockedFinishReasons.includes(c.finishReason)
  );
}
