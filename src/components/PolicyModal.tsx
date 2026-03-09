import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  titleKey: string;
  children: React.ReactNode;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, titleId, titleKey, children }) => {
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
      titleId={titleId}
      title={t(titleKey)}
      footer={footer}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        {children}
      </div>
    </Modal>
  );
};

export default PolicyModal;
