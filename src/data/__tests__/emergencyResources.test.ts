import { describe, it, expect } from 'vitest';
import {
  EMERGENCY_RESOURCES,
  EmergencyResourceService,
} from '../emergencyResources';

/** アプリが対応している言語（src/lib/i18n.ts の resources と一致させること） */
const SUPPORTED_LANGUAGES = ['ja', 'en', 'es', 'pt', 'fr', 'hi', 'ar'] as const;

/**
 * 実際に来うる国コード。データを持っている国だけでなく、
 * 持っていない国（EG/MX/NG）と地域不明（undefined）も必ず含める。
 */
const COUNTRIES: Array<string | undefined> = [
  undefined,
  'JP', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES',
  'BR', 'PT', 'IN', 'LB', 'SA',
  'EG', 'MX', 'NG',
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

describe('EmergencyResourceService', () => {
  describe('不変条件: 窓口がゼロ件になってはならない', () => {
    it.each(SUPPORTED_LANGUAGES)(
      '%s: すべての国・すべての深刻度で必ず1件以上の窓口を返す',
      (lang) => {
        for (const country of COUNTRIES) {
          for (const severity of SEVERITIES) {
            const resources = EmergencyResourceService.getRecommendedResources(
              severity,
              lang,
              country
            );
            expect(
              resources.length,
              `${lang}/${country ?? 'unknown'}/${severity} で窓口が0件になった`
            ).toBeGreaterThan(0);
          }
        }
      }
    );

    it('地域タグ付きロケール（ja-JP 等）でも空にならない', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const resources = EmergencyResourceService.getRecommendedResources(
          'critical',
          `${lang}-XX`,
          'XX'
        );
        expect(resources.length).toBeGreaterThan(0);
      }
    });

    it('国際フォールバックは常に非空である', () => {
      expect(EmergencyResourceService.getGlobalFallbackResources().length).toBeGreaterThan(0);
    });
  });

  describe('地理フィルタ: 掛からない番号を案内しない', () => {
    it('ブラジルの利用者に日本国内専用のフリーダイヤルを出さない', () => {
      const resources = EmergencyResourceService.getResourcesByLanguageAndRegion('pt', 'BR');
      expect(resources.find(r => r.id === 'jp-yorisoi-hotline')).toBeUndefined();
    });

    it('フランスの利用者にカナダ専用番号を出さない', () => {
      const resources = EmergencyResourceService.getResourcesByLanguageAndRegion('fr', 'FR');
      expect(resources.find(r => r.id === 'ca-talk-suicide')).toBeUndefined();
      expect(resources.find(r => r.id === 'ca-kids-help-phone')).toBeUndefined();
    });

    it('日本にいる英語話者にはよりそいホットラインを出す（日本から掛かるため）', () => {
      const resources = EmergencyResourceService.getResourcesByLanguageAndRegion('en', 'JP');
      expect(resources.find(r => r.id === 'jp-yorisoi-hotline')).toBeDefined();
    });

    it('発信元が不明なときは地理で絞り込まない', () => {
      const resources = EmergencyResourceService.getResourcesByLanguageAndRegion('pt', undefined);
      expect(resources.find(r => r.id === 'jp-yorisoi-hotline')).toBeDefined();
    });

    it('Web・チャットは dialableFrom を持たず、どの国でも案内できる', () => {
      const resources = EmergencyResourceService.getResourcesByLanguageAndRegion('pt', 'PT');
      expect(resources.find(r => r.id === 'br-cvv-chat')).toBeDefined();
    });
  });

  describe('地域データ: 各言語圏に実在の窓口が届く', () => {
    it('ブラジルのポルトガル語話者に CVV が最優先で届く', () => {
      const resources = EmergencyResourceService.getRecommendedResources('critical', 'pt', 'BR');
      expect(resources[0].id).toBe('br-cvv');
      expect(resources[0].phone).toBe('188');
    });

    it('インドのヒンディー語話者に Tele-MANAS が届く', () => {
      const resources = EmergencyResourceService.getRecommendedResources('critical', 'hi', 'IN');
      expect(resources.map(r => r.id)).toContain('in-tele-manas');
    });

    it('レバノンのアラビア語話者に Embrace Lifeline が届く', () => {
      const resources = EmergencyResourceService.getRecommendedResources('critical', 'ar', 'LB');
      expect(resources.map(r => r.id)).toContain('lb-embrace-lifeline');
    });

    it('データを持たないアラビア語圏でも国際ディレクトリが届く', () => {
      const resources = EmergencyResourceService.getRecommendedResources('critical', 'ar', 'EG');
      expect(resources.length).toBeGreaterThan(0);
      expect(resources.map(r => r.id)).toContain('intl-findahelpline');
    });

    it('スペインのスペイン語話者に 024 が届く', () => {
      const resources = EmergencyResourceService.getRecommendedResources('critical', 'es', 'ES');
      expect(resources.map(r => r.id)).toContain('es-024');
    });

    it('フランスのフランス語話者に 3114 が届く', () => {
      const resources = EmergencyResourceService.getRecommendedResources('critical', 'fr', 'FR');
      expect(resources.map(r => r.id)).toContain('fr-3114');
    });
  });

  describe('データ整合性', () => {
    const allResources = EMERGENCY_RESOURCES.flatMap(region => region.resources);

    it('リソースIDが一意である', () => {
      const ids = allResources.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('連絡手段（電話またはWeb）を必ず持つ', () => {
      for (const resource of allResources) {
        expect(
          Boolean(resource.phone || resource.website),
          `${resource.id} に連絡手段が無い`
        ).toBe(true);
      }
    });

    it('対応言語が必ず1つ以上宣言されている', () => {
      for (const resource of allResources) {
        expect(resource.language.length, `${resource.id} に言語が無い`).toBeGreaterThan(0);
      }
    });

    it('電話をかける窓口はすべて dialableFrom を宣言している', () => {
      // 宣言が無いと、掛からない国の利用者にその番号を出してしまう
      for (const resource of allResources.filter(r => r.phone && r.type === 'hotline')) {
        expect(
          resource.dialableFrom,
          `${resource.id} は電話窓口なので dialableFrom が必要`
        ).toBeDefined();
      }
    });

    it('他国向けの電話窓口を混ぜない（国が判っている場合）', () => {
      const usResources = EmergencyResourceService.getRecommendedResources('critical', 'en', 'US');
      for (const resource of usResources) {
        if (resource.dialableFrom) {
          expect(
            resource.dialableFrom,
            `${resource.id} は米国から掛けられないのに提示された`
          ).toContain('US');
        }
      }
    });

    it('対応7言語すべてに、その言語で読める窓口が1件以上存在する', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const matching = allResources.filter(r => r.language.includes(lang));
        expect(matching.length, `${lang} 向けの窓口が1件も無い`).toBeGreaterThan(0);
      }
    });
  });
});
