
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguageWithDynamicLoad } from '../i18n';

// Currently supported languages with translation files
const languages = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' },
];

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  
  const changeLanguage = async (lng: string) => {
    if (lng === i18n.language) return; // No change needed
    
    setIsLoading(true);
    try {
      await changeLanguageWithDynamicLoad(lng);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        value={i18n.language.split('-')[0]}
        disabled={isLoading}
        className={`bg-slate-700/80 text-white text-sm rounded-md p-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={t('languageSelectorLabel')}
      >
        {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name} {isLoading && i18n.language.split('-')[0] === lang.code ? '...' : ''}
            </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
