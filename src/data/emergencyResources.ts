/**
 * 緊急時リソース - 地域別相談窓口情報
 */
export interface EmergencyResource {
  id: string;
  name: string;
  type: 'hotline' | 'chat' | 'text' | 'website' | 'app';
  phone?: string;
  website?: string;
  hours: string;
  language: string[];
  description: string;
  isAvailable24h: boolean;
  isFree: boolean;
}

export interface RegionalResources {
  country: string;
  countryCode: string;
  region?: string;
  resources: EmergencyResource[];
}

/**
 * 地域別緊急時リソースデータベース
 */
export const EMERGENCY_RESOURCES: RegionalResources[] = [
  // 日本
  {
    country: '日本',
    countryCode: 'JP',
    resources: [
      {
        id: 'jp-inochi-no-denwa',
        name: 'いのちの電話',
        type: 'hotline',
        phone: '0570-783-556',
        website: 'https://www.inochinodenwa.org/',
        hours: '24時間年中無休',
        language: ['ja'],
        description: '自殺防止を目的とした電話相談。経験豊富な相談員が対応します。',
        isAvailable24h: true,
        isFree: false // 通話料金がかかる
      },
      {
        id: 'jp-yorisoi-hotline',
        name: 'よりそいホットライン',
        type: 'hotline',
        phone: '0120-279-338',
        website: 'https://www.since2011.net/yorisoi/',
        hours: '24時間年中無休',
        language: ['ja', 'en', 'es', 'pt', 'ko', 'zh', 'th', 'tl'],
        description: 'どんな悩みでも相談できる無料電話相談。外国語対応もあります。',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'jp-sns-sodan',
        name: 'SNS相談（厚生労働省）',
        type: 'chat',
        website: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/jisatsu/soudan_sns.html',
        hours: '相談先により異なる',
        language: ['ja'],
        description: 'LINE、Twitter、チャットなどのSNSで相談できるサービス一覧。',
        isAvailable24h: false,
        isFree: true
      },
      {
        id: 'jp-kokoro-no-denwa',
        name: 'こころの健康相談統一ダイヤル',
        type: 'hotline',
        phone: '0570-064-556',
        website: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/shougaishahukushi/kokoro/index.html',
        hours: '自治体により異なる',
        language: ['ja'],
        description: '各都道府県・政令指定都市が実施している心の健康電話相談窓口に接続されます。',
        isAvailable24h: false,
        isFree: false
      }
    ]
  },
  
  // アメリカ
  {
    country: 'United States',
    countryCode: 'US',
    resources: [
      {
        id: 'us-988-lifeline',
        name: '988 Suicide & Crisis Lifeline',
        type: 'hotline',
        phone: '988',
        website: 'https://988lifeline.org/',
        hours: '24/7',
        language: ['en', 'es'],
        description: 'Free and confidential emotional support for people in suicidal crisis or emotional distress.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'us-crisis-text-line',
        name: 'Crisis Text Line',
        type: 'text',
        phone: 'Text HOME to 741741',
        website: 'https://www.crisistextline.org/',
        hours: '24/7',
        language: ['en', 'es'],
        description: 'Free crisis support via text message. Text HOME to 741741.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'us-trevor-project',
        name: 'The Trevor Project',
        type: 'hotline',
        phone: '1-866-488-7386',
        website: 'https://www.thetrevorproject.org/',
        hours: '24/7',
        language: ['en'],
        description: 'Crisis intervention and suicide prevention for LGBTQ young people.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },
  
  // イギリス
  {
    country: 'United Kingdom',
    countryCode: 'GB',
    resources: [
      {
        id: 'uk-samaritans',
        name: 'Samaritans',
        type: 'hotline',
        phone: '116 123',
        website: 'https://www.samaritans.org/',
        hours: '24/7',
        language: ['en'],
        description: 'Free emotional support for anyone in emotional distress, struggling to cope, or at risk of suicide.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'uk-shout',
        name: 'Shout',
        type: 'text',
        phone: 'Text SHOUT to 85258',
        website: 'https://giveusashout.org/',
        hours: '24/7',
        language: ['en'],
        description: 'Free crisis text support. Text SHOUT to 85258.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },
  
  // カナダ
  {
    country: 'Canada',
    countryCode: 'CA',
    resources: [
      {
        id: 'ca-talk-suicide',
        name: 'Talk Suicide Canada',
        type: 'hotline',
        phone: '1-833-456-4566',
        website: 'https://talksuicide.ca/',
        hours: '24/7',
        language: ['en', 'fr'],
        description: 'Free, confidential suicide prevention service available across Canada.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'ca-kids-help-phone',
        name: 'Kids Help Phone',
        type: 'hotline',
        phone: '1-800-668-6868',
        website: 'https://kidshelpphone.ca/',
        hours: '24/7',
        language: ['en', 'fr'],
        description: 'Counselling and crisis support for children and youth.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },
  
  // オーストラリア
  {
    country: 'Australia',
    countryCode: 'AU',
    resources: [
      {
        id: 'au-lifeline',
        name: 'Lifeline Australia',
        type: 'hotline',
        phone: '13 11 14',
        website: 'https://www.lifeline.org.au/',
        hours: '24/7',
        language: ['en'],
        description: 'Crisis support and suicide prevention services.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'au-beyond-blue',
        name: 'Beyond Blue',
        type: 'hotline',
        phone: '1300 22 4636',
        website: 'https://www.beyondblue.org.au/',
        hours: '24/7',
        language: ['en'],
        description: 'Support for anxiety, depression and suicide prevention.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },
  
  // ドイツ
  {
    country: 'Deutschland',
    countryCode: 'DE',
    resources: [
      {
        id: 'de-telefonseelsorge',
        name: 'Telefonseelsorge',
        type: 'hotline',
        phone: '0800 111 0 111 または 0800 111 0 222',
        website: 'https://www.telefonseelsorge.de/',
        hours: '24/7',
        language: ['de'],
        description: 'Kostenlose telefonische Beratung in Krisen.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },
  
  // フランス
  {
    country: 'France',
    countryCode: 'FR',
    resources: [
      {
        id: 'fr-sos-amitie',
        name: 'SOS Amitié',
        type: 'hotline',
        phone: '09 72 39 40 50',
        website: 'https://www.sos-amitie.org/',
        hours: '24/7',
        language: ['fr'],
        description: 'Service d\'écoute par téléphone, accessible 24h/24.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },
  
  // スペイン
  {
    country: 'España',
    countryCode: 'ES',
    resources: [
      {
        id: 'es-telefono-esperanza',
        name: 'Teléfono de la Esperanza',
        type: 'hotline',
        phone: '717 003 717',
        website: 'https://telefonodelaesperanza.org/',
        hours: '24/7',
        language: ['es'],
        description: 'Servicio gratuito de atención emocional y prevención del suicidio.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },
  
  // 国際リソース
  {
    country: 'International',
    countryCode: 'INTL',
    resources: [
      {
        id: 'intl-befrienders',
        name: 'Befrienders Worldwide',
        type: 'website',
        website: 'https://www.befrienders.org/',
        hours: 'Varies by location',
        language: ['en', 'multiple'],
        description: 'International network of suicide prevention centers. Find local support worldwide.',
        isAvailable24h: false,
        isFree: true
      },
      {
        id: 'intl-opencounseling',
        name: 'Open Counseling',
        type: 'website',
        website: 'https://www.opencounseling.com/suicide-hotlines',
        hours: 'Resource directory',
        language: ['en'],
        description: 'International directory of suicide prevention resources by country.',
        isAvailable24h: false,
        isFree: true
      }
    ]
  }
];

/**
 * 緊急時リソース検索サービス
 */
export class EmergencyResourceService {
  /**
   * 言語と地域に基づいてリソースを取得
   */
  static getResourcesByLanguageAndRegion(language: string, countryCode?: string): EmergencyResource[] {
    const lang = language.split('-')[0];
    let resources: EmergencyResource[] = [];
    
    // 指定された国のリソースを最優先
    if (countryCode) {
      const countryResources = EMERGENCY_RESOURCES.find(
        region => region.countryCode === countryCode.toUpperCase()
      );
      if (countryResources) {
        resources.push(...countryResources.resources.filter(r => 
          r.language.includes(lang) || r.language.includes('en')
        ));
      }
    }
    
    // 言語が一致するリソースを追加
    for (const region of EMERGENCY_RESOURCES) {
      for (const resource of region.resources) {
        if (resource.language.includes(lang) && !resources.find(r => r.id === resource.id)) {
          resources.push(resource);
        }
      }
    }
    
    // 国際リソースを追加
    const intlResources = EMERGENCY_RESOURCES.find(r => r.countryCode === 'INTL');
    if (intlResources) {
      resources.push(...intlResources.resources);
    }
    
    // 24時間利用可能なものを最優先
    return resources.sort((a, b) => {
      if (a.isAvailable24h && !b.isAvailable24h) return -1;
      if (!a.isAvailable24h && b.isAvailable24h) return 1;
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return 0;
    });
  }
  
  /**
   * 緊急性レベルに基づく推奨リソース
   */
  static getRecommendedResources(
    severity: 'low' | 'medium' | 'high' | 'critical',
    language: string,
    countryCode?: string
  ): EmergencyResource[] {
    const allResources = this.getResourcesByLanguageAndRegion(language, countryCode);
    
    if (severity === 'critical') {
      // 最高緊急度: 24時間対応の電話相談を最優先
      return allResources.filter(r => 
        r.type === 'hotline' && r.isAvailable24h
      ).slice(0, 3);
    } else if (severity === 'high') {
      // 高緊急度: 電話相談とテキスト相談
      return allResources.filter(r => 
        r.type === 'hotline' || r.type === 'text'
      ).slice(0, 4);
    } else {
      // 中・低緊急度: 全てのリソース
      return allResources.slice(0, 6);
    }
  }
}