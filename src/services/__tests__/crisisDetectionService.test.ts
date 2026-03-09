import { describe, it, expect } from 'vitest';
import { CrisisDetectionService } from '@/services/crisisDetectionService';

describe('CrisisDetectionService', () => {
  describe('detectCrisis', () => {
    it('should detect no crisis for normal messages', () => {
      const result = CrisisDetectionService.detectCrisis('こんにちは、元気ですか？');

      expect(result.isCrisis).toBe(false);
      expect(result.severity).toBe('low');
      expect(result.detectedKeywords).toHaveLength(0);
      expect(result.recommendedAction).toBe('monitor');
    });

    it('should detect critical crisis for suicide-related keywords', () => {
      const result = CrisisDetectionService.detectCrisis('死にたい');

      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.detectedKeywords).toContain('死にたい');
      expect(result.recommendedAction).toBe('emergency_resources');
    });

    it('should detect high severity for self-harm keywords', () => {
      const result = CrisisDetectionService.detectCrisis('自分を傷つけたい');

      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.detectedKeywords).toContain('自分を傷つけ');
      expect(result.recommendedAction).toBe('immediate_intervention');
    });

    it('should detect medium severity when multiple contextual despair keywords appear', () => {
      const result = CrisisDetectionService.detectCrisis('絶望している、希望がない');

      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('medium');
      expect(result.detectedKeywords).toContain('絶望');
      expect(result.detectedKeywords).toContain('希望がない');
      expect(result.recommendedAction).toBe('immediate_intervention'); // 複数キーワードで escalated
    });

    it('should NOT trigger on a single contextual keyword alone', () => {
      const result = CrisisDetectionService.detectCrisis('仕事で疲れた');

      expect(result.isCrisis).toBe(false);
      expect(result.recommendedAction).toBe('monitor');
    });

    it('should NOT trigger on a single isolation keyword alone', () => {
      const result = CrisisDetectionService.detectCrisis('ひとりぼっちです');

      expect(result.isCrisis).toBe(false);
      expect(result.recommendedAction).toBe('monitor');
    });

    it('should trigger when multiple contextual keywords combine', () => {
      const result = CrisisDetectionService.detectCrisis('孤独で絶望している');

      expect(result.isCrisis).toBe(true);
      expect(result.detectedKeywords).toContain('孤独');
      expect(result.detectedKeywords).toContain('絶望');
    });

    it('should work with English keywords', () => {
      const result = CrisisDetectionService.detectCrisis('I want to die', 'en');

      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.detectedKeywords).toContain('want to die');
      expect(result.recommendedAction).toBe('emergency_resources');
    });

    it('should handle case insensitive matching', () => {
      const result = CrisisDetectionService.detectCrisis('死にたい気持ち');

      expect(result.isCrisis).toBe(true);
      expect(result.detectedKeywords).toContain('死にたい');
    });

    it('should escalate action based on multiple high-confidence keywords', () => {
      const result = CrisisDetectionService.detectCrisis('自殺したい、自分を傷つけたい');

      expect(result.isCrisis).toBe(true);
      expect(result.detectedKeywords.length).toBeGreaterThanOrEqual(2);
      expect(result.recommendedAction).toBe('emergency_resources');
    });
  });

  describe('false positive prevention', () => {
    it('should NOT trigger on 必死に (desperately)', () => {
      const result = CrisisDetectionService.detectCrisis('必死に頑張っています');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on 死角 (blind spot)', () => {
      const result = CrisisDetectionService.detectCrisis('この計画には死角がある');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on 死語 (obsolete word)', () => {
      const result = CrisisDetectionService.detectCrisis('その表現はもう死語だよ');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on 死守 (defend to the last)', () => {
      const result = CrisisDetectionService.detectCrisis('このポジションを死守する');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on 瀕死 (near death - gaming context)', () => {
      const result = CrisisDetectionService.detectCrisis('瀕死の状態からHPを回復した');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on 髪を切りたい (want a haircut)', () => {
      const result = CrisisDetectionService.detectCrisis('髪を切りたいな');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on English "deadline"', () => {
      const result = CrisisDetectionService.detectCrisis('The deadline is tomorrow', 'en');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on English "standalone"', () => {
      const result = CrisisDetectionService.detectCrisis('This is a standalone app', 'en');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on English "help me understand"', () => {
      const result = CrisisDetectionService.detectCrisis('Can you help me understand this?', 'en');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on English "give up sugar"', () => {
      const result = CrisisDetectionService.detectCrisis('I want to give up sugar', 'en');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on English "my phone is broken"', () => {
      const result = CrisisDetectionService.detectCrisis('My phone is broken', 'en');

      expect(result.isCrisis).toBe(false);
    });

    it('should NOT trigger on 孤独のグルメ (TV show name)', () => {
      const result = CrisisDetectionService.detectCrisis('孤独のグルメを見ています');

      expect(result.isCrisis).toBe(false);
    });

    it('should still detect genuine crisis even with common words nearby', () => {
      const result = CrisisDetectionService.detectCrisis('必死に生きてきたけど、もう死にたい');

      expect(result.isCrisis).toBe(true);
      expect(result.detectedKeywords).toContain('死にたい');
    });
  });

  describe('detectCrisisPattern', () => {
    it('should detect pattern across multiple messages', () => {
      const messages = [
        '死にたい',
        '自分を傷つけたい',
        '希望がない',
      ];

      const result = CrisisDetectionService.detectCrisisPattern(messages);

      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.recommendedAction).toBe('emergency_resources');
    });

    it('should escalate severity for consistent crisis patterns', () => {
      const messages = [
        '絶望して希望がない',
        'もうだめだ意味がない',
      ];

      const result = CrisisDetectionService.detectCrisisPattern(messages);

      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should not escalate for single crisis message', () => {
      const messages = [
        'こんにちは',
        '死にたい',
        '元気です',
      ];

      const result = CrisisDetectionService.detectCrisisPattern(messages);

      expect(result.isCrisis).toBe(true);
      // Only one message has crisis, so no escalation beyond critical (already max from 死にたい)
      expect(result.severity).toBe('critical');
    });

    it('should not trigger for benign messages with common words', () => {
      const messages = [
        '必死に頑張った',
        '死角を突かれた',
        '締め切り死守',
      ];

      const result = CrisisDetectionService.detectCrisisPattern(messages);

      expect(result.isCrisis).toBe(false);
    });
  });

  describe('generateCrisisResponse', () => {
    it('should generate appropriate response for emergency level', () => {
      const crisisResult = {
        isCrisis: true,
        severity: 'critical' as const,
        detectedKeywords: ['死にたい'],
        triggerPatterns: ['suicide'],
        recommendedAction: 'emergency_resources' as const,
      };

      const response = CrisisDetectionService.generateCrisisResponse(crisisResult);

      expect(response).toContain('深刻な心の痛み');
      expect(response).toContain('専門家');
    });

    it('should generate appropriate response for immediate intervention', () => {
      const crisisResult = {
        isCrisis: true,
        severity: 'high' as const,
        detectedKeywords: ['自傷'],
        triggerPatterns: ['selfHarm'],
        recommendedAction: 'immediate_intervention' as const,
      };

      const response = CrisisDetectionService.generateCrisisResponse(crisisResult);

      expect(response).toContain('辛い状況');
      expect(response).toContain('相談');
    });

    it('should generate response in English', () => {
      const crisisResult = {
        isCrisis: true,
        severity: 'critical' as const,
        detectedKeywords: ['want to die'],
        triggerPatterns: ['suicide'],
        recommendedAction: 'emergency_resources' as const,
      };

      const response = CrisisDetectionService.generateCrisisResponse(crisisResult, 'en');

      expect(response).toContain('deep emotional pain');
      expect(response).toContain('professional');
    });

    it('should fallback to Japanese for unsupported languages', () => {
      const crisisResult = {
        isCrisis: true,
        severity: 'critical' as const,
        detectedKeywords: ['test'],
        triggerPatterns: ['suicide'],
        recommendedAction: 'emergency_resources' as const,
      };

      const response = CrisisDetectionService.generateCrisisResponse(crisisResult, 'fr');

      expect(response).toContain('深刻な心の痛み');
    });
  });
});
