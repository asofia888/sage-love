import React from 'react';
import { useTranslation } from 'react-i18next';
import PolicyModal from './PolicyModal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <PolicyModal isOpen={isOpen} onClose={onClose} titleId="privacy-policy-modal-title" titleKey="privacyPolicyModalTitle">
      <div className="text-sm text-slate-300 leading-relaxed space-y-4">
        <div className="whitespace-pre-wrap">
          {t('privacyPolicy')}
        </div>

        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div>
              <h4 className="font-medium text-blue-200 mb-2">{t('privacyPolicyKeyPointsTitle')}</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• {t('privacyPolicyKeyPoint1')}</li>
                <li>• {t('privacyPolicyKeyPoint2')}</li>
                <li>• {t('privacyPolicyKeyPoint3')}</li>
                <li>• {t('privacyPolicyKeyPoint4')}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 12a1 1 0 102 0V7a1 1 0 10-2 0v5zm1-8a1 1 0 011 1v.01a1 1 0 11-2 0V5a1 1 0 011-1zm0 14a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd"/>
            </svg>
            <div>
              <h4 className="font-medium text-green-200 mb-2">{t('privacyPolicyManagementTitle')}</h4>
              <p className="text-sm text-green-200">
                {t('privacyPolicyManagementBody')}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 pt-4 border-t border-slate-700">
          {t('privacyPolicyLastUpdated')}
        </div>
      </div>
    </PolicyModal>
  );
};

export default PrivacyPolicyModal;
