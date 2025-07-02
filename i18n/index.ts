import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Lazy load language resources
const loadLanguage = async (lng: string) => {
  try {
    switch (lng) {
      case 'ja':
        return (await import('./ja.ts')).default;
      case 'en':
        return (await import('./en.ts')).default;
      case 'es':
        return (await import('./es.ts')).default;
      case 'pt':
        return (await import('./pt.ts')).default;
      case 'de':
        return (await import('./de.ts')).default;
      case 'fr':
        return (await import('./fr.ts')).default;
      case 'it':
        return (await import('./it.ts')).default;
      case 'ru':
        return (await import('./ru.ts')).default;
      case 'hi':
        return (await import('./hi.ts')).default;
      case 'ar':
        return (await import('./ar.ts')).default;
      case 'bn':
        return (await import('./bn.ts')).default;
      case 'ta':
        return (await import('./ta.ts')).default;
      case 'zh':
        return (await import('./zh.ts')).default;
      case 'ko':
        return (await import('./ko.ts')).default;
      default:
        return (await import('./en.ts')).default;
    }
  } catch (error) {
    console.warn(`Failed to load language ${lng}, falling back to English`);
    return (await import('./en.ts')).default;
  }
};

// Initialize i18n with lazy loading
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ja',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    // Load resources dynamically
    resources: {},
  });

// Add language loading function
i18n.on('languageChanged', async (lng) => {
  if (!i18n.hasResourceBundle(lng, 'translation')) {
    const resources = await loadLanguage(lng);
    i18n.addResourceBundle(lng, 'translation', resources, true, true);
  }
});

// Load initial language
const initLanguage = async () => {
  const currentLang = i18n.language || 'ja';
  const resources = await loadLanguage(currentLang);
  i18n.addResourceBundle(currentLang, 'translation', resources, true, true);
};

initLanguage();

export default i18n;