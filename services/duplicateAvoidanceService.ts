import { ChatMessage } from '../types';

export class DuplicateAvoidanceService {
  /**
   * 会話履歴から最近のAI応答を抽出し、重複回避のためのプロンプト拡張を生成
   */
  static generateDuplicateAvoidancePrompt(history: ChatMessage[]): string {
    const recentAIResponses = history
      .filter(msg => msg.sender === 'ai' && !msg.isTyping && msg.text.trim().length > 0)
      .slice(-3) // 最近の3つの応答
      .map(msg => msg.text);

    if (recentAIResponses.length === 0) {
      return '';
    }

    return `\n\n【重要：重複回避の指示】
これまでの応答（似たような表現や構造を避けること）：
${recentAIResponses.map((resp, i) => `応答${i + 1}: 「${resp.substring(0, 150)}${resp.length > 150 ? '...' : ''}」`).join('\n')}

今回の応答では以下を心がけること：
- これまでとは異なる語彙や表現を使用する
- 異なる視点や角度からアプローチする
- 文章の構造やリズムを変える
- 同じ智慧でも新鮮な表現で伝える
- 結論は同じでも、そこに至る道筋や例を変える
- 「〜のだ」「〜である」などの語尾の連続使用を避ける
- 十分な深みと詳細さをもって丁寧に展開する
- 多彩な例えや教えを織り交ぜて豊かに語る
- 聖者らしい威厳と温かさで心に響く言葉を紡ぐ`;
  }

  /**
   * 応答の類似度をチェック（簡易版）
   */
  static calculateSimilarity(newResponse: string, previousResponses: string[]): number {
    if (previousResponses.length === 0) return 0;

    const newWords = this.extractKeyWords(newResponse);
    let maxSimilarity = 0;

    for (const prev of previousResponses) {
      const prevWords = this.extractKeyWords(prev);
      const similarity = this.calculateWordSimilarity(newWords, prevWords);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * テキストからキーワードを抽出
   */
  private static extractKeyWords(text: string): Set<string> {
    // 重要そうな単語を抽出（簡易版）
    const words = text
      .replace(/[。、！？\.\,\!\?]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .filter(word => !this.isCommonWord(word));
    
    return new Set(words);
  }

  /**
   * 一般的すぎる語を除外
   */
  private static isCommonWord(word: string): boolean {
    const commonWords = [
      'です', 'である', 'のだ', 'こと', 'もの', 'それ', 'これ', 'その', 'この',
      'ある', 'いる', 'する', 'なる', 'できる', 'ない', 'ので', 'から',
      'という', 'とは', 'には', 'にも', 'でも', 'しかし', 'だが', 'また'
    ];
    return commonWords.includes(word);
  }

  /**
   * 単語セット間の類似度を計算
   */
  private static calculateWordSimilarity(words1: Set<string>, words2: Set<string>): number {
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 応答の品質評価（多様性の観点から）
   */
  static evaluateResponseDiversity(
    newResponse: string, 
    previousResponses: string[]
  ): {
    diversityScore: number;
    suggestions: string[];
  } {
    const similarity = this.calculateSimilarity(newResponse, previousResponses);
    const diversityScore = Math.max(0, 1 - similarity);

    const suggestions: string[] = [];
    
    if (similarity > 0.7) {
      suggestions.push('表現がやや似ています。より多様な語彙を使用してください。');
    }
    
    if (similarity > 0.5) {
      suggestions.push('異なる視点からのアプローチを試してください。');
    }

    if (this.hasRepetitiveStructure(newResponse)) {
      suggestions.push('文章構造にバリエーションを持たせてください。');
    }

    return {
      diversityScore,
      suggestions
    };
  }

  /**
   * 反復的な構造をチェック
   */
  private static hasRepetitiveStructure(text: string): boolean {
    const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 2) return false;

    // 同じ語尾が連続しているかチェック
    const endings = sentences.map(s => {
      const trimmed = s.trim();
      return trimmed.substring(Math.max(0, trimmed.length - 3));
    });

    let consecutiveCount = 1;
    for (let i = 1; i < endings.length; i++) {
      if (endings[i] === endings[i-1]) {
        consecutiveCount++;
        if (consecutiveCount >= 3) return true;
      } else {
        consecutiveCount = 1;
      }
    }

    return false;
  }
}