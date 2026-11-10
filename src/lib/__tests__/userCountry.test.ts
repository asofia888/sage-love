import { describe, it, expect, afterEach, vi } from 'vitest';
import { countryFromLocale, countryFromTimeZone, detectUserCountry } from '../userCountry';

function mockEnvironment(timeZone: string | undefined, language: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
}

describe('countryFromTimeZone', () => {
  it.each([
    ['Asia/Tokyo', 'JP'],
    ['America/New_York', 'US'],
    ['America/Indiana/Indianapolis', 'US'],
    ['Pacific/Honolulu', 'US'],
    ['America/Toronto', 'CA'],
    ['Europe/London', 'GB'],
    ['Australia/Sydney', 'AU'],
    ['Europe/Berlin', 'DE'],
    ['Europe/Paris', 'FR'],
    ['Europe/Madrid', 'ES'],
    ['America/Sao_Paulo', 'BR'],
    ['Europe/Lisbon', 'PT'],
    ['Asia/Beirut', 'LB'],
    ['Asia/Riyadh', 'SA'],
    ['America/Mexico_City', 'MX'],
    ['America/Argentina/Buenos_Aires', 'AR'],
    ['Asia/Seoul', 'KR'],
  ])('%s → %s', (timeZone, country) => {
    expect(countryFromTimeZone(timeZone)).toBe(country);
  });

  it('ブラウザが返す旧名でも同じ国になる', () => {
    expect(countryFromTimeZone('Asia/Calcutta')).toBe('IN');
    expect(countryFromTimeZone('Asia/Kolkata')).toBe('IN');
    expect(countryFromTimeZone('Europe/Kiev')).toBe(countryFromTimeZone('Europe/Kyiv'));
  });

  it('国を特定できないゾーンは undefined', () => {
    expect(countryFromTimeZone('UTC')).toBeUndefined();
    expect(countryFromTimeZone('Etc/GMT+9')).toBeUndefined();
    expect(countryFromTimeZone('')).toBeUndefined();
    expect(countryFromTimeZone(undefined)).toBeUndefined();
  });
});

describe('countryFromLocale', () => {
  it('地域サブタグを国として取り出す', () => {
    expect(countryFromLocale('en-US')).toBe('US');
    expect(countryFromLocale('pt-br')).toBe('BR');
    expect(countryFromLocale('en-GB-oxendict')).toBe('GB');
  });

  /** 以前の split('-')[1] は "zh-Hant-TW" から HANT を国として返していた */
  it('文字体系サブタグを国と取り違えない', () => {
    expect(countryFromLocale('zh-Hant-TW')).toBe('TW');
    expect(countryFromLocale('sr-Latn')).toBeUndefined();
  });

  it('地域が無い・国でない場合は undefined', () => {
    expect(countryFromLocale('ja')).toBeUndefined();
    expect(countryFromLocale('es-419')).toBeUndefined();
    expect(countryFromLocale(undefined)).toBeUndefined();
  });
});

describe('detectUserCountry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * この関数を作った理由そのもの。表示言語が英語（en-US）でも、
   * 日本に居る人には日本から掛かる窓口を出さなければならない。
   */
  it('表示言語の地域より、いま居る場所（タイムゾーン）を優先する', () => {
    mockEnvironment('Asia/Tokyo', 'en-US');
    expect(detectUserCountry()).toBe('JP');
  });

  it('タイムゾーンから判らなければロケールの地域に頼る', () => {
    mockEnvironment('UTC', 'en-GB');
    expect(detectUserCountry()).toBe('GB');
  });

  it('どちらからも判らなければ undefined（国で絞り込ませない）', () => {
    mockEnvironment('UTC', 'ar');
    expect(detectUserCountry()).toBeUndefined();
  });

  it('Intl が例外を投げても落ちない', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
      throw new Error('unsupported');
    });
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    expect(detectUserCountry()).toBe('FR');
  });
});
