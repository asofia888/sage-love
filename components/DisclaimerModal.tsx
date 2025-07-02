
import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal'; // Import the generic Modal

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const footer = (
    <div className="flex justify-end">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-colors"
        aria-label={t('closeModalButton')}
      >
        {t('closeModalButton')}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="disclaimer-modal-title"
      title={t('disclaimerModalTitle')}
      footer={footer}
    >
      <div className="max-h-[60vh] overflow-y-auto pr-2">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {t('comprehensiveDisclaimer')}
        </p>
      </div>
    </Modal>
  );
};

export default DisclaimerModal;
