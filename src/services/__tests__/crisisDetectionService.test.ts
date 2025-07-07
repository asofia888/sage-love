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
      const result = CrisisDetectionService.detectCrisis('死にたい、もう疲れた');
      
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.detectedKeywords).toContain('死にたい');
      expect(result.detectedKeywords).toContain('疲れた');
      expect(result.recommendedAction).toBe('emergency_resources');
    });

    it('should detect high severity for self-harm keywords', () => {
      const result = CrisisDetectionService.detectCrisis('自分を傷つけたい');
      
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.detectedKeywords).toContain('自分を傷つけ');
      expect(result.recommendedAction).toBe('immediate_intervention');
    });

    it('should detect medium severity for despair keywords', () => {
      const result = CrisisDetectionService.detectCrisis('絶望している、希望がない');
      
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('medium');
      expect(result.detectedKeywords).toContain('絶望');
      expect(result.detectedKeywords).toContain('希望がない');
      expect(result.recommendedAction).toBe('immediate_intervention'); // 複数キーワードで escalated
    });

    it('should detect low severity for isolation keywords', () => {
      const result = CrisisDetectionService.detectCrisis('ひとりぼっちです');
      
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('low');
      expect(result.detectedKeywords).toContain('ひとりぼっち');
      expect(result.recommendedAction).toBe('monitor');
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

    it('should escalate action based on multiple keywords', () => {
      const result = CrisisDetectionService.detectCrisis('助けて、辛い、孤独');
      
      expect(result.isCrisis).toBe(true);
      expect(result.detectedKeywords).toHaveLength(3);
      expect(result.recommendedAction).toBe('emergency_resources'); // 3つ以上のキーワード
    });
  });

  describe('detectCrisisPattern', () => {
    it('should detect pattern across multiple messages', () => {
      const messages = [
        'ひとりぼっち',
        '希望がない',
        '死にたい'
      ];
      
      const result = CrisisDetectionService.detectCrisisPattern(messages);
      
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.recommendedAction).toBe('emergency_resources');
    });

    it('should escalate severity for consistent crisis patterns', () => {
      const messages = [
        '絶望している',
        'もう疲れた',
        '希望がない'
      ];
      
      const result = CrisisDetectionService.detectCrisisPattern(messages);
      
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.recommendedAction).toBe('emergency_resources'); // 多数のキーワードで escalated
    });

    it('should not escalate for single crisis message', () => {
      const messages = [
        'こんにちは',
        '希望がない',
        '元気です'
      ];
      
      const result = CrisisDetectionService.detectCrisisPattern(messages);
      
      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe('medium');
      expect(result.recommendedAction).toBe('gentle_intervention');
    });
  });

  describe('generateCrisisResponse', () => {
    it('should generate appropriate response for emergency level', () => {
      const crisisResult = {
        isCrisis: true,
        severity: 'critical' as const,
        detectedKeywords: ['死にたい'],
        triggerPatterns: ['suicide'],
        recommendedAction: 'emergency_resources' as const
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
        recommendedAction: 'immediate_intervention' as const
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
        recommendedAction: 'emergency_resources' as const
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
        recommendedAction: 'emergency_resources' as const
      };
      
      const response = CrisisDetectionService.generateCrisisResponse(crisisResult, 'fr');
      
      expect(response).toContain('深刻な心の痛み');
    });
  });
});