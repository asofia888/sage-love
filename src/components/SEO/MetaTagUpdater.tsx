import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { updateMetaTag, getLanguageKeywords, getLocaleMapping } from './seoUtils';

interface MetaTagUpdaterProps {
  currentLang: string;
}

/**
 * Component responsible for updating meta tags based on current language
 */
const MetaTagUpdater: React.FC<MetaTagUpdaterProps> = ({ currentLang }) => {
  const { t } = useTranslation();

  useEffect(() => {
    // Update page title
    document.title = `${t('appName')} | ${t('seoTitle')}`;

    // Update meta description
    updateMetaTag('meta[name="description"]', 'content', t('seoDescription1'));

    // Update keywords
    updateMetaTag('meta[name="keywords"]', 'content', getLanguageKeywords(currentLang));

    // Update OGP tags
    updateMetaTag('meta[property="og:title"]', 'content', `${t('appName')} | ${t('seoTitle')}`);
    updateMetaTag('meta[property="og:description"]', 'content', t('seoDescription1'));
    updateMetaTag('meta[property="og:locale"]', 'content', getLocaleMapping(currentLang));

    // Update Twitter Card tags
    updateMetaTag('meta[name="twitter:title"]', 'content', `${t('appName')} | ${t('seoTitle')}`);
    updateMetaTag('meta[name="twitter:description"]', 'content', t('seoDescription1'));
  }, [currentLang, t]);

  return null;
};

export default MetaTagUpdater;