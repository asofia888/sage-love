import React, { useEffect } from 'react';
import { updateMetaTag } from './seoUtils';

interface CanonicalURLUpdaterProps {
  currentLang: string;
  baseUrl?: string;
}

/**
 * Component responsible for updating canonical URL based on current language
 */
const CanonicalURLUpdater: React.FC<CanonicalURLUpdaterProps> = ({ 
  currentLang, 
  baseUrl = 'https://www.sage-love.com' 
}) => {
  useEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      const url = currentLang === 'ja' ? baseUrl : `${baseUrl}?lang=${currentLang}`;
      canonical.setAttribute('href', url);
    }
  }, [currentLang, baseUrl]);

  return null;
};

export default CanonicalURLUpdater;