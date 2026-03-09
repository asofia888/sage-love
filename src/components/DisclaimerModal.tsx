import React from 'react';
import { useTranslation } from 'react-i18next';
import PolicyModal from './PolicyModal';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <PolicyModal isOpen={isOpen} onClose={onClose} titleId="disclaimer-modal-title" titleKey="disclaimerModalTitle">
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {t('comprehensiveDisclaimer')}
      </p>
    </PolicyModal>
  );
};

export default DisclaimerModal;
