/**
 * SEO utility functions for managing meta tags and structured data
 */

export const updateMetaTag = (selector: string, attribute: string, value: string): void => {
  const element = document.querySelector(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
};

export const getLanguageKeywords = (lang: string): string => {
  const keywordsMap: { [key: string]: string } = {
    ja: 'AI相談,スピリチュアル,人生相談,宗教,哲学,心の悩み,聖者,智慧,無料,オンライン,カウンセリング,メンタルヘルス,自己啓発,瞑想,マインドフルネス',
    en: 'AI counseling,spiritual guidance,life advice,wisdom,meditation,mindfulness,free online,mental health,self-help,philosophy,religious guidance',
    es: 'consejería IA,guía espiritual,consejos de vida,sabiduría,meditación,atención plena,gratis en línea,salud mental,autoayuda,filosofía',
    pt: 'aconselhamento IA,orientação espiritual,conselhos de vida,sabedoria,meditação,atenção plena,grátis online,saúde mental,autoajuda,filosofia'
  };
  
  return keywordsMap[lang] || keywordsMap.en;
};

export const getLocaleMapping = (lang: string): string => {
  const localeMap: { [key: string]: string } = {
    ja: 'ja_JP',
    en: 'en_US',
    es: 'es_ES',
    pt: 'pt_BR'
  };
  
  return localeMap[lang] || 'en_US';
};

export const removeExistingStructuredData = (): void => {
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => {
    if (script.textContent?.includes('WebApplication') || script.textContent?.includes('FAQPage')) {
      script.remove();
    }
  });
};

export const addStructuredDataToHead = (schema: object): void => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};