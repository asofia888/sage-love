/**
 * 緊急時リソース - 地域別相談窓口情報
 *
 * ⚠️ 電話番号・受付時間は運営団体の都合で変わる。定期的な実地確認が必要である
 *    （最終確認: 2026-08-01）。誤った番号を出すことは窓口を出さないことより
 *    有害なので、確証が持てないものはこのデータベースに入れず、
 *    INTL のディレクトリ（Find A Helpline 等）に委ねる方針とする。
 */
export interface EmergencyResource {
  id: string;
  name: string;
  type: 'hotline' | 'chat' | 'text' | 'website' | 'app';
  phone?: string;
  website?: string;
  hours: string;
  language: string[];
  /**
   * その番号に発信できる国（ISO 3166-1 alpha-2）。国内専用の短縮番号や
   * フリーダイヤル（日本の 0120、ブラジルの 188 等）は国外から掛からないため、
   * 発信元が判っている場合はここで絞り込む。
   * 未指定 = 地理的制約なし（Web・チャット等）。
   */
  dialableFrom?: string[];
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
        dialableFrom: ['JP'],
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
        dialableFrom: ['JP'],
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
        dialableFrom: ['JP'],
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
        dialableFrom: ['US'],
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
        dialableFrom: ['US'],
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
        dialableFrom: ['US'],
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
        dialableFrom: ['GB', 'IE'],
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
        dialableFrom: ['GB'],
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
        dialableFrom: ['CA'],
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
        dialableFrom: ['CA'],
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
        dialableFrom: ['AU'],
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
        dialableFrom: ['AU'],
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
        dialableFrom: ['DE'],
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
        id: 'fr-3114',
        name: '3114 — Numéro national de prévention du suicide',
        type: 'hotline',
        phone: '3114',
        website: 'https://3114.fr/',
        hours: '24h/24, 7j/7',
        language: ['fr'],
        dialableFrom: ['FR'],
        description: 'Ligne nationale gratuite de prévention du suicide, répondue par des professionnels de santé.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'fr-sos-amitie',
        name: 'SOS Amitié',
        type: 'hotline',
        phone: '09 72 39 40 50',
        website: 'https://www.sos-amitie.org/',
        hours: '24/7',
        language: ['fr'],
        dialableFrom: ['FR'],
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
        id: 'es-024',
        name: '024 — Línea de atención a la conducta suicida',
        type: 'hotline',
        phone: '024',
        website: 'https://www.sanidad.gob.es/linea024/home.htm',
        hours: '24/7',
        language: ['es'],
        dialableFrom: ['ES'],
        description: 'Línea nacional gratuita y confidencial de atención a la conducta suicida.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'es-telefono-esperanza',
        name: 'Teléfono de la Esperanza',
        type: 'hotline',
        phone: '717 003 717',
        website: 'https://telefonodelaesperanza.org/',
        hours: '24/7',
        language: ['es'],
        dialableFrom: ['ES'],
        description: 'Servicio gratuito de atención emocional y prevención del suicidio.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },

  // ブラジル（ポルトガル語圏）
  {
    country: 'Brasil',
    countryCode: 'BR',
    resources: [
      {
        id: 'br-cvv',
        name: 'CVV — Centro de Valorização da Vida',
        type: 'hotline',
        phone: '188',
        website: 'https://www.cvv.org.br/',
        hours: '24 horas, todos os dias',
        language: ['pt'],
        dialableFrom: ['BR'],
        description: 'Apoio emocional e prevenção do suicídio, gratuito e sigiloso, em todo o Brasil.',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'br-cvv-chat',
        name: 'CVV — Chat e e-mail',
        type: 'chat',
        website: 'https://www.cvv.org.br/chat/',
        hours: '24 horas, todos os dias',
        language: ['pt'],
        description: 'Mesmo acolhimento do CVV por chat online, sem necessidade de telefone.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },

  // ポルトガル（ポルトガル語圏）
  {
    country: 'Portugal',
    countryCode: 'PT',
    resources: [
      {
        id: 'pt-sns24',
        name: 'SNS 24 — Aconselhamento psicológico',
        type: 'hotline',
        phone: '808 24 24 24',
        website: 'https://www.sns24.gov.pt/',
        hours: '24 horas, todos os dias',
        language: ['pt'],
        dialableFrom: ['PT'],
        description: 'Linha nacional de saúde do SNS, com opção de aconselhamento psicológico.',
        isAvailable24h: true,
        isFree: false // custo de chamada para a rede fixa nacional
      }
    ]
  },

  // インド（ヒンディー語圏）
  {
    country: 'भारत / India',
    countryCode: 'IN',
    resources: [
      {
        id: 'in-tele-manas',
        name: 'Tele-MANAS (टेली-मानस)',
        type: 'hotline',
        phone: '14416',
        website: 'https://telemanas.mohfw.gov.in/',
        hours: '24x7',
        language: ['hi', 'en'],
        dialableFrom: ['IN'],
        description: 'भारत सरकार की निःशुल्क राष्ट्रीय टेली-मानसिक स्वास्थ्य हेल्पलाइन, कई भाषाओं में उपलब्ध।',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'in-aasra',
        name: 'AASRA',
        type: 'hotline',
        phone: '+91 98204 66726',
        website: 'http://www.aasra.info/',
        hours: '24x7',
        language: ['hi', 'en'],
        // 国際形式の番号だが、インド国内の利用者向けのサービスである
        dialableFrom: ['IN'],
        description: 'आत्महत्या रोकथाम और भावनात्मक सहायता हेल्पलाइन, गोपनीय और निःशुल्क।',
        isAvailable24h: true,
        isFree: true
      },
      {
        id: 'in-icall',
        name: 'iCALL (TISS)',
        type: 'hotline',
        phone: '+91 91529 87821',
        website: 'https://icallhelpline.org/',
        hours: 'सोम–शनि, 10:00–20:00 IST',
        language: ['hi', 'en'],
        dialableFrom: ['IN'],
        description: 'प्रशिक्षित परामर्शदाताओं द्वारा निःशुल्क टेलीफोन और ईमेल परामर्श।',
        isAvailable24h: false,
        isFree: true
      }
    ]
  },

  // レバノン（アラビア語圏）
  {
    country: 'لبنان / Lebanon',
    countryCode: 'LB',
    resources: [
      {
        id: 'lb-embrace-lifeline',
        name: 'Embrace Lifeline (خط الحياة)',
        type: 'hotline',
        phone: '1564',
        website: 'https://embracelebanon.org/lifeline/',
        hours: '24/7',
        language: ['ar', 'en'],
        dialableFrom: ['LB'],
        description: 'خط وطني مجاني وسري للدعم النفسي والوقاية من الانتحار، بالعربية والإنجليزية.',
        isAvailable24h: true,
        isFree: true
      }
    ]
  },

  // サウジアラビア（アラビア語圏）
  {
    country: 'السعودية / Saudi Arabia',
    countryCode: 'SA',
    resources: [
      {
        id: 'sa-mental-health-line',
        name: 'المركز الوطني لتعزيز الصحة النفسية',
        type: 'hotline',
        phone: '920033360',
        website: 'https://ncmh.org.sa/',
        hours: 'حسب أوقات عمل المركز',
        language: ['ar'],
        dialableFrom: ['SA'],
        description: 'خط الدعم النفسي التابع للمركز الوطني لتعزيز الصحة النفسية.',
        isAvailable24h: false,
        isFree: true
      }
    ]
  },

  // 国際リソース（どの国・どの言語からも必ず案内できる最後の砦）
  {
    country: 'International',
    countryCode: 'INTL',
    resources: [
      {
        id: 'intl-findahelpline',
        name: 'Find A Helpline',
        type: 'website',
        website: 'https://findahelpline.com/',
        hours: 'Directory — availability varies by country',
        language: ['en', 'es', 'pt', 'fr', 'ar', 'hi', 'ja', 'multiple'],
        description: 'Free, verified helplines in 130+ countries. Choose your country to see local phone, text and chat support.',
        isAvailable24h: false,
        isFree: true
      },
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
 * その窓口に発信元の国から実際に到達できるか。
 * dialableFrom 未指定（Web・チャット等）は制約なし。
 * 発信元が不明なときは判定材料が無いので除外しない。
 */
function isReachableFrom(resource: EmergencyResource, countryCode?: string): boolean {
  if (!resource.dialableFrom || !countryCode) return true;
  return resource.dialableFrom.includes(countryCode.toUpperCase());
}

/**
 * 緊急時リソース検索サービス
 */
export class EmergencyResourceService {
  /**
   * どの言語・どの国から呼ばれても必ず案内できる国際リソース。
   * 「窓口が1件も出ない」状態を作らないための最後の砦である。
   */
  static getGlobalFallbackResources(): EmergencyResource[] {
    const intl = EMERGENCY_RESOURCES.find(r => r.countryCode === 'INTL');
    return intl ? [...intl.resources] : [];
  }

  /**
   * 言語と地域に基づいてリソースを取得
   */
  static getResourcesByLanguageAndRegion(language: string, countryCode?: string): EmergencyResource[] {
    const lang = language.split('-')[0];
    const resources: EmergencyResource[] = [];

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

    // 言語が一致するリソースを追加。
    // ただし発信元から掛けられない国内専用番号は混ぜない
    // （例: ブラジルの利用者に日本の 0120 を出しても掛からない）。
    for (const region of EMERGENCY_RESOURCES) {
      for (const resource of region.resources) {
        if (
          resource.language.includes(lang) &&
          isReachableFrom(resource, countryCode) &&
          !resources.find(r => r.id === resource.id)
        ) {
          resources.push(resource);
        }
      }
    }

    // 国際リソースを追加
    for (const resource of this.getGlobalFallbackResources()) {
      if (!resources.find(r => r.id === resource.id)) {
        resources.push(resource);
      }
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
   * 緊急性レベルに基づく推奨リソース。
   *
   * 不変条件: **常に1件以上を返す**。深刻度による絞り込みで候補が空になっても
   * 段階的に条件を緩めてフォールバックする。危機介入モーダルが窓口ゼロで
   * 開くことは、助けを求めた人に空欄を返すことであり、あってはならない。
   */
  static getRecommendedResources(
    severity: 'low' | 'medium' | 'high' | 'critical',
    language: string,
    countryCode?: string
  ): EmergencyResource[] {
    const allResources = this.getResourcesByLanguageAndRegion(language, countryCode);

    let picked: EmergencyResource[];
    if (severity === 'critical') {
      // 最高緊急度: 24時間対応の電話相談を最優先
      picked = allResources.filter(r =>
        r.type === 'hotline' && r.isAvailable24h
      ).slice(0, 3);
    } else if (severity === 'high') {
      // 高緊急度: 電話相談とテキスト相談
      picked = allResources.filter(r =>
        r.type === 'hotline' || r.type === 'text'
      ).slice(0, 4);
    } else {
      // 中・低緊急度: 全てのリソース
      picked = allResources.slice(0, 6);
    }

    // 1段目: 種別・24時間の条件を落として、候補に残っている窓口を出す
    if (picked.length === 0) {
      picked = allResources.slice(0, 4);
    }
    // 2段目: それでも空なら国際ディレクトリを出す（ここは必ず非空）
    if (picked.length === 0) {
      picked = this.getGlobalFallbackResources();
    }
    return picked;
  }
}
