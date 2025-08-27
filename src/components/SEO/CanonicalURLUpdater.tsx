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
      // 全言語で同じcanonical URLを使用（重複回避）
      canonical.setAttribute('href', `${baseUrl}/`);
    }
    
    // OG URLも更新
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', `${baseUrl}/`);
    }
  }, [currentLang, baseUrl]);

  return null;
};

export default CanonicalURLUpdater;