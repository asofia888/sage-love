/**
 * 利用者がいま居る国（ISO 3166-1 alpha-2）を、端末の情報だけから推定する。
 *
 * Why: 相談窓口の電話番号は国内専用のものが多く、居場所を誤ると掛からない番号を
 * 案内してしまう。以前は navigator.language の地域サブタグ（"en-US" の US）を
 * 国として使っていたが、これは「表示言語の好み」であって居場所ではない。
 * 英語設定のまま日本に住む人には、日本から掛からない米国の 988 が出ていた。
 *
 * タイムゾーンは OS が現在地に合わせて持つ値なので、居場所の手がかりとして
 * ロケールより確かである。サーバーに問い合わせず端末内で完結するため、
 * 危機介入モーダルを即座に（オフラインでも）出せる。
 *
 * 推定できない場合は undefined を返す。呼び出し側はその場合、国で絞り込まず
 * 国際ディレクトリを併せて案内する（EmergencyResourceService を参照）。
 */

/**
 * IANA タイムゾーン → 国コード。
 * 窓口データを持つ国は全ゾーンを、それ以外は主要ゾーンを収める
 * （窓口を持たない国でも、国が判れば「掛からない他国の番号」を除外できる）。
 * ブラウザは旧名（Asia/Calcutta 等）を返すことがあるので両方を載せている。
 */
const TIME_ZONE_COUNTRY: Record<string, string> = {
  // 日本
  'Asia/Tokyo': 'JP',

  // アメリカ合衆国（America/Indiana/* 等は接頭辞側で扱う）
  'America/New_York': 'US',
  'America/Detroit': 'US',
  'America/Chicago': 'US',
  'America/Menominee': 'US',
  'America/Denver': 'US',
  'America/Boise': 'US',
  'America/Phoenix': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'America/Juneau': 'US',
  'America/Sitka': 'US',
  'America/Metlakatla': 'US',
  'America/Yakutat': 'US',
  'America/Nome': 'US',
  'America/Adak': 'US',
  'America/Indianapolis': 'US',
  'America/Fort_Wayne': 'US',
  'America/Louisville': 'US',
  'Pacific/Honolulu': 'US',

  // カナダ
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Regina': 'CA',
  'America/Swift_Current': 'CA',
  'America/Halifax': 'CA',
  'America/Glace_Bay': 'CA',
  'America/Moncton': 'CA',
  'America/Goose_Bay': 'CA',
  'America/St_Johns': 'CA',
  'America/Blanc-Sablon': 'CA',
  'America/Atikokan': 'CA',
  'America/Thunder_Bay': 'CA',
  'America/Nipigon': 'CA',
  'America/Rainy_River': 'CA',
  'America/Iqaluit': 'CA',
  'America/Pangnirtung': 'CA',
  'America/Rankin_Inlet': 'CA',
  'America/Resolute': 'CA',
  'America/Cambridge_Bay': 'CA',
  'America/Yellowknife': 'CA',
  'America/Inuvik': 'CA',
  'America/Whitehorse': 'CA',
  'America/Dawson': 'CA',
  'America/Dawson_Creek': 'CA',
  'America/Fort_Nelson': 'CA',
  'America/Creston': 'CA',

  // イギリス・アイルランド
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Europe/Dublin': 'IE',

  // ドイツ・フランス・スペイン・ポルトガル
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Africa/Ceuta': 'ES',
  'Europe/Lisbon': 'PT',
  'Atlantic/Madeira': 'PT',
  'Atlantic/Azores': 'PT',

  // ブラジル
  'America/Sao_Paulo': 'BR',
  'America/Rio_Branco': 'BR',
  'America/Manaus': 'BR',
  'America/Belem': 'BR',
  'America/Fortaleza': 'BR',
  'America/Recife': 'BR',
  'America/Bahia': 'BR',
  'America/Maceio': 'BR',
  'America/Araguaina': 'BR',
  'America/Santarem': 'BR',
  'America/Cuiaba': 'BR',
  'America/Campo_Grande': 'BR',
  'America/Porto_Velho': 'BR',
  'America/Boa_Vista': 'BR',
  'America/Eirunepe': 'BR',
  'America/Noronha': 'BR',

  // インド・レバノン・サウジアラビア
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Beirut': 'LB',
  'Asia/Riyadh': 'SA',

  // --- ここから下は窓口データを持たない国（他国の番号を除外するために載せる） ---

  // 中南米
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Merida': 'MX',
  'America/Monterrey': 'MX',
  'America/Matamoros': 'MX',
  'America/Chihuahua': 'MX',
  'America/Ciudad_Juarez': 'MX',
  'America/Ojinaga': 'MX',
  'America/Mazatlan': 'MX',
  'America/Bahia_Banderas': 'MX',
  'America/Hermosillo': 'MX',
  'America/Tijuana': 'MX',
  'America/Buenos_Aires': 'AR',
  'America/Bogota': 'CO',
  'America/Santiago': 'CL',
  'America/Punta_Arenas': 'CL',
  'America/Lima': 'PE',
  'America/Caracas': 'VE',
  'America/Guayaquil': 'EC',
  'America/La_Paz': 'BO',
  'America/Asuncion': 'PY',
  'America/Montevideo': 'UY',
  'America/Costa_Rica': 'CR',
  'America/Panama': 'PA',
  'America/Guatemala': 'GT',
  'America/El_Salvador': 'SV',
  'America/Tegucigalpa': 'HN',
  'America/Managua': 'NI',
  'America/Havana': 'CU',
  'America/Santo_Domingo': 'DO',
  'America/Puerto_Rico': 'PR',

  // アジア・オセアニア
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Chongqing': 'CN',
  'Asia/Harbin': 'CN',
  'Asia/Urumqi': 'CN',
  'Asia/Taipei': 'TW',
  'Asia/Hong_Kong': 'HK',
  'Asia/Macau': 'MO',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',
  'Asia/Manila': 'PH',
  'Asia/Jakarta': 'ID',
  'Asia/Pontianak': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Asia/Katmandu': 'NP',
  'Pacific/Auckland': 'NZ',

  // 中東・アフリカ
  'Asia/Dubai': 'AE',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Damascus': 'SY',
  'Asia/Baghdad': 'IQ',
  'Asia/Tehran': 'IR',
  'Asia/Jerusalem': 'IL',
  'Asia/Tel_Aviv': 'IL',
  'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS',
  'Asia/Aden': 'YE',
  'Europe/Istanbul': 'TR',
  'Asia/Istanbul': 'TR',
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Tripoli': 'LY',
  'Africa/Khartoum': 'SD',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA',
  'Africa/Accra': 'GH',
  'Africa/Addis_Ababa': 'ET',
  'Africa/Luanda': 'AO',
  'Africa/Maputo': 'MZ',

  // ヨーロッパ
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Luxembourg': 'LU',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG',
  'Europe/Athens': 'GR',
  'Europe/Belgrade': 'RS',
  'Europe/Zagreb': 'HR',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Europe/Moscow': 'RU',
};

/** 配下のゾーンがすべて同じ国に属する接頭辞。 */
const TIME_ZONE_PREFIX_COUNTRY: ReadonlyArray<readonly [string, string]> = [
  ['Australia/', 'AU'],
  ['America/Indiana/', 'US'],
  ['America/Kentucky/', 'US'],
  ['America/North_Dakota/', 'US'],
  ['US/', 'US'],
  ['Canada/', 'CA'],
  ['Brazil/', 'BR'],
  ['America/Argentina/', 'AR'],
];

/** タイムゾーンから国を引く。表に無いゾーン（UTC 等）は undefined。 */
export function countryFromTimeZone(timeZone: string | undefined): string | undefined {
  if (!timeZone) return undefined;
  const exact = TIME_ZONE_COUNTRY[timeZone];
  if (exact) return exact;
  return TIME_ZONE_PREFIX_COUNTRY.find(([prefix]) => timeZone.startsWith(prefix))?.[1];
}

/**
 * ロケールの地域サブタグから国を取る（"en-US" → US、"zh-Hant-TW" → TW）。
 * 文字体系サブタグ（Hant）や数字の地域（es-419 = 中南米全域）は国ではないので拾わない。
 */
export function countryFromLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  const match = /^[a-z]{2,3}(?:-[a-z]{4})?-([a-z]{2})(?:-|$)/i.exec(locale);
  return match?.[1].toUpperCase();
}

/**
 * 利用者の国を推定する。タイムゾーンを優先し、判らなければロケールの地域に頼る。
 * どちらからも判らなければ undefined。
 */
export function detectUserCountry(): string | undefined {
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Intl が使えない環境ではロケールだけで判断する
  }

  const locale = typeof navigator !== 'undefined' ? navigator.language : undefined;
  return countryFromTimeZone(timeZone) ?? countryFromLocale(locale);
}
