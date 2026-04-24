import React from 'react';
import { useTranslation } from 'react-i18next';
import PolicyModal from './PolicyModal';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <PolicyModal isOpen={isOpen} onClose={onClose} titleId="terms-of-service-modal-title" titleKey="termsOfServiceModalTitle">
      <div className="text-sm text-slate-300 leading-relaxed space-y-4">
        <div className="whitespace-pre-wrap">
          {t('termsOfService')}
        </div>

        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div>
              <h4 className="font-medium text-yellow-200 mb-2">{t('termsImportantLimitsTitle')}</h4>
              <ul className="text-sm text-yellow-200 space-y-1">
                <li>• {t('termsImportantLimit1')}</li>
                <li>• {t('termsImportantLimit2')}</li>
                <li>• {t('termsImportantLimit3')}</li>
                <li>• {t('termsImportantLimit4')}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/>
            </svg>
            <div>
              <h4 className="font-medium text-red-200 mb-2">{t('termsProhibitedTitle')}</h4>
              <p className="text-sm text-red-200">
                {t('termsProhibitedText')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" clipRule="evenodd"/>
            </svg>
            <div>
              <h4 className="font-medium text-purple-200 mb-2">{t('termsEmergencyTitle')}</h4>
              <p className="text-sm text-purple-200">
                {t('termsEmergencyText')}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 pt-4 border-t border-slate-700">
          {t('termsLastUpdated')}
        </div>
      </div>
    </PolicyModal>
  );
};

export default TermsOfServiceModal;
