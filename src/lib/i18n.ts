import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation modules
import jaTranslation from './locales/ja/translation';
import enTranslation from './locales/en/translation';
import esTranslation from './locales/es/translation';
import ptTranslation from './locales/pt/translation';
import hiTranslation from './locales/hi/translation';
import arTranslation from './locales/ar/translation';
import frTranslation from './locales/fr/translation';

// Resources configuration using imported modules
const resources = {
  ja: {
    translation: jaTranslation
  },
  en: {
    translation: enTranslation
  },
  es: {
    translation: esTranslation
  },
  pt: {
    translation: ptTranslation
  },
  hi: {
    translation: hiTranslation
  },
  ar: {
    translation: arTranslation
  },
  fr: {
    translation: frTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;