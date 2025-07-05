import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Dynamic language loading function
const loadLanguageResources = async (language: string) => {
  try {
    const response = await fetch(`/locales/${language}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load language ${language}`);
    }
    const translations = await response.json();
    return { translation: translations };
  } catch (error) {
    console.error(`Error loading language ${language}:`, error);
    // Fallback to Japanese if language loading fails
    if (language !== 'ja') {
      return loadLanguageResources('ja');
    }
    throw error;
  }
};

// Initialize i18next with dynamic language loading
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Remove the static resources - they will be loaded dynamically
    resources: {},
    
    // Language detection settings
    lng: undefined, // Let the detector determine the language
    fallbackLng: 'ja',
    
    // Namespace settings
    defaultNS: 'translation',
    ns: ['translation'],
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // React settings
    react: {
      useSuspense: false, // Important: disable suspense to prevent loading issues
    },
    
    // Backend settings for dynamic loading
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    
    // Other settings
    debug: false, // Set to true for development if needed
    saveMissing: false,
    updateMissing: false,
    
    // Preload settings
    preload: ['ja', 'en'], // Preload main languages
    
    // Resource loading
    load: 'languageOnly', // Only load language code (ja, not ja-JP)
    
    // Clean code settings
    cleanCode: true,
    
    // Return objects for nested keys
    returnObjects: true,
    
    // Return empty string for missing keys instead of key
    returnEmptyString: false,
    
    // Parsing settings
    parseMissingKeyHandler: (key: string) => {
      console.warn(`Missing translation key: ${key}`);
      return key;
    }
  });

// Custom resource loading function that handles dynamic imports
const loadResources = async (language: string) => {
  try {
    const resources = await loadLanguageResources(language);
    
    // Add the loaded resources to i18n
    i18n.addResourceBundle(language, 'translation', resources.translation, true, true);
    
    // Change language if different from current
    if (i18n.language !== language) {
      await i18n.changeLanguage(language);
    }
    
    return resources;
  } catch (error) {
    console.error(`Failed to load resources for language: ${language}`, error);
    throw error;
  }
};

// Enhanced change language function with dynamic loading
const changeLanguageWithDynamicLoad = async (language: string) => {
  try {
    // Check if resources are already loaded
    if (!i18n.hasResourceBundle(language, 'translation')) {
      await loadResources(language);
    }
    
    // Change the language
    await i18n.changeLanguage(language);
    
    return i18n;
  } catch (error) {
    console.error(`Error changing language to ${language}:`, error);
    // Fallback to Japanese
    if (language !== 'ja') {
      return changeLanguageWithDynamicLoad('ja');
    }
    throw error;
  }
};

// Load initial language resources
const initializeI18n = async () => {
  try {
    // Detect current language
    const detectedLanguage = i18n.language || 'ja';
    const normalizedLanguage = detectedLanguage.split('-')[0]; // Convert ja-JP to ja
    
    // Load resources for detected language
    await loadResources(normalizedLanguage);
    
    // Preload the other main language for better UX
    const otherLanguage = normalizedLanguage === 'ja' ? 'en' : 'ja';
    try {
      await loadResources(otherLanguage);
    } catch (error) {
      // Non-critical error - just log it
      console.warn(`Could not preload ${otherLanguage} resources:`, error);
    }
    
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    // Last resort: try to load Japanese
    try {
      await loadResources('ja');
    } catch (fallbackError) {
      console.error('Failed to load fallback language (Japanese):', fallbackError);
    }
  }
};

// Initialize on load
initializeI18n();

// Export enhanced i18n with custom methods
export default i18n;
export { changeLanguageWithDynamicLoad, loadResources, initializeI18n };