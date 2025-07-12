
import React from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'ru', name: 'Русский' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ar', name: 'العربية' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'zh', name: '中文 (简体)' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
];

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

  return (
    <div>
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        value={i18n.language.split('-')[0]}
        className="bg-slate-700/80 text-white text-sm rounded-md p-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow"
        aria-label={t('languageSelectorLabel')}
      >
        {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
