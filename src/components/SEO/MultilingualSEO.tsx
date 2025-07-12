import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MetaTagUpdater from './MetaTagUpdater';
import StructuredDataUpdater from './StructuredDataUpdater';
import CanonicalURLUpdater from './CanonicalURLUpdater';

/**
 * Main component for managing multilingual SEO
 * Orchestrates meta tags, structured data, and canonical URL updates
 */
const MultilingualSEO: React.FC = () => {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    const updateSEOForLanguage = () => {
      const currentLang = i18n.language.split('-')[0];
      
      // All SEO updates are now handled by individual components
      // This component only needs to trigger re-renders when language changes
    };
    
    // Update SEO when language changes
    if (i18n.isInitialized) {
      updateSEOForLanguage();
    }
    
    // Listen for language changes
    i18n.on('languageChanged', updateSEOForLanguage);
    
    return () => {
      i18n.off('languageChanged', updateSEOForLanguage);
    };
  }, [i18n]);

  const currentLang = i18n.language.split('-')[0];
  
  return (
    <>
      <MetaTagUpdater currentLang={currentLang} />
      <StructuredDataUpdater currentLang={currentLang} />
      <CanonicalURLUpdater currentLang={currentLang} />
    </>
  );
};

export default MultilingualSEO;