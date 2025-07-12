import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { removeExistingStructuredData, addStructuredDataToHead } from './seoUtils';
import { createWebApplicationSchema, createFAQSchema } from './structuredDataHelpers';

interface StructuredDataUpdaterProps {
  currentLang: string;
}

/**
 * Component responsible for updating structured data based on current language
 */
const StructuredDataUpdater: React.FC<StructuredDataUpdaterProps> = ({ currentLang }) => {
  const { t } = useTranslation();

  useEffect(() => {
    // Remove existing structured data
    removeExistingStructuredData();

    // Create and add new WebApplication schema
    const webAppSchema = createWebApplicationSchema(
      t('appName'),
      t('seoDescription1'),
      currentLang
    );
    addStructuredDataToHead(webAppSchema);

    // Create and add FAQ schema
    const faqSchema = createFAQSchema(currentLang);
    addStructuredDataToHead(faqSchema);
  }, [currentLang, t]);

  return null;
};

export default StructuredDataUpdater;