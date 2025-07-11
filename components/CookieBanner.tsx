import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
}

const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    functional: false
  });

  useEffect(() => {
    // Check if user has already made a cookie choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setIsVisible(true);
    } else {
      // Load saved preferences
      try {
        const savedPreferences = JSON.parse(cookieConsent);
        setPreferences(savedPreferences);
      } catch (error) {
        console.error('Error parsing cookie consent:', error);
        setIsVisible(true);
      }
    }
  }, []);


  const handleAcceptAll = () => {
    const newPreferences = {
      necessary: true,
      functional: true
    };
    savePreferences(newPreferences);
  };

  const handleRejectAll = () => {
    const newPreferences = {
      necessary: true,
      functional: false
    };
    savePreferences(newPreferences);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setPreferences(prefs);
    setIsVisible(false);
    setShowDetails(false);
  };

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'necessary') return; // Cannot disable necessary cookies
    setPreferences(prev => ({ ...prev, [type]: value }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        {!showDetails ? (
          // Simple banner view
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('cookieBannerTitle')}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {t('cookieBannerDescription')}
              </p>
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {t('cookieBannerCustomize')}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                {t('cookieBannerRejectAll')}
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('cookieBannerAcceptAll')}
              </button>
            </div>
          </div>
        ) : (
          // Detailed preferences view
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('cookiePreferencesTitle')}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={t('closeButton')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {t('cookieNecessaryTitle')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('cookieNecessaryDescription')}
                  </p>
                </div>
                <div className="ml-4">
                  <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {t('cookieAlwaysActive')}
                  </span>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {t('cookieFunctionalTitle')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('cookieFunctionalDescription')}
                  </p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => handlePreferenceChange('functional', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                {t('cookieBannerRejectAll')}
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('cookieSavePreferences')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;