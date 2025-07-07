import { describe, it, expect } from 'vitest';
import { TranslationService } from '@/services/translationService';

describe('TranslationService', () => {
  describe('detectLanguage', () => {
    it('should detect Japanese text', () => {
      const japaneseText = 'こんにちは、元気ですか？';
      const detected = TranslationService.detectLanguage(japaneseText);
      
      expect(detected.language).toBe('ja');
      expect(detected.confidence).toBeGreaterThan(0.5);
    });

    it('should detect English text', () => {
      const englishText = 'Hello, how are you doing today?';
      const detected = TranslationService.detectLanguage(englishText);
      
      expect(detected.language).toBe('en');
      expect(detected.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Spanish text', () => {
      const spanishText = 'Hola, ¿cómo estás hoy?';
      const detected = TranslationService.detectLanguage(spanishText);
      
      expect(detected.language).toBe('es');
      expect(detected.confidence).toBeGreaterThan(0.3);
    });

    it('should handle short text', () => {
      const shortText = 'Hi';
      const detected = TranslationService.detectLanguage(shortText);
      
      expect(detected.language).toBeDefined();
      expect(detected.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty text', () => {
      const emptyText = '';
      const detected = TranslationService.detectLanguage(emptyText);
      
      expect(detected.language).toBe('unknown');
      expect(detected.confidence).toBe(0);
    });

    it('should handle mixed language text', () => {
      const mixedText = 'Hello こんにちは Hola';
      const detected = TranslationService.detectLanguage(mixedText);
      
      expect(detected.language).toBeDefined();
      expect(detected.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = TranslationService.getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('ja');
      expect(languages).toContain('en');
    });

    it('should include expected languages', () => {
      const languages = TranslationService.getSupportedLanguages();
      
      expect(languages).toContain('ja');
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('pt');
    });
  });

  describe('getLanguageName', () => {
    it('should return language names', () => {
      expect(TranslationService.getLanguageName('ja')).toBe('日本語');
      expect(TranslationService.getLanguageName('en')).toBe('English');
      expect(TranslationService.getLanguageName('es')).toBe('Español');
      expect(TranslationService.getLanguageName('pt')).toBe('Português');
    });

    it('should handle unknown language codes', () => {
      const unknownName = TranslationService.getLanguageName('xx');
      expect(unknownName).toBe('Unknown');
    });

    it('should handle empty language code', () => {
      const emptyName = TranslationService.getLanguageName('');
      expect(emptyName).toBe('Unknown');
    });
  });

  describe('isRTL', () => {
    it('should identify RTL languages', () => {
      expect(TranslationService.isRTL('ar')).toBe(true);
      expect(TranslationService.isRTL('he')).toBe(true);
      expect(TranslationService.isRTL('fa')).toBe(true);
    });

    it('should identify LTR languages', () => {
      expect(TranslationService.isRTL('ja')).toBe(false);
      expect(TranslationService.isRTL('en')).toBe(false);
      expect(TranslationService.isRTL('es')).toBe(false);
      expect(TranslationService.isRTL('pt')).toBe(false);
    });

    it('should handle unknown languages as LTR', () => {
      expect(TranslationService.isRTL('unknown')).toBe(false);
      expect(TranslationService.isRTL('')).toBe(false);
    });
  });

  describe('normalizeLanguageCode', () => {
    it('should normalize language codes', () => {
      expect(TranslationService.normalizeLanguageCode('ja-JP')).toBe('ja');
      expect(TranslationService.normalizeLanguageCode('en-US')).toBe('en');
      expect(TranslationService.normalizeLanguageCode('es-ES')).toBe('es');
    });

    it('should handle simple language codes', () => {
      expect(TranslationService.normalizeLanguageCode('ja')).toBe('ja');
      expect(TranslationService.normalizeLanguageCode('en')).toBe('en');
    });

    it('should handle complex locale codes', () => {
      expect(TranslationService.normalizeLanguageCode('zh-Hans-CN')).toBe('zh');
      expect(TranslationService.normalizeLanguageCode('pt-BR')).toBe('pt');
    });

    it('should handle invalid codes', () => {
      expect(TranslationService.normalizeLanguageCode('')).toBe('en');
      expect(TranslationService.normalizeLanguageCode('invalid')).toBe('invalid');
    });
  });

  describe('getLanguageDirection', () => {
    it('should return correct direction for languages', () => {
      expect(TranslationService.getLanguageDirection('ja')).toBe('ltr');
      expect(TranslationService.getLanguageDirection('en')).toBe('ltr');
      expect(TranslationService.getLanguageDirection('ar')).toBe('rtl');
      expect(TranslationService.getLanguageDirection('he')).toBe('rtl');
    });

    it('should default to ltr for unknown languages', () => {
      expect(TranslationService.getLanguageDirection('unknown')).toBe('ltr');
      expect(TranslationService.getLanguageDirection('')).toBe('ltr');
    });
  });
});