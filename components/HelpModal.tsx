
import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal'; // Import the generic Modal
import { ClearChatButtonIcon, LanguageSelectorIcon, ShareIcon, TextSizeIcon } from './icons/FeatureIcons';


const HelpModal: React.FC<{isOpen: boolean, onClose: () => void}> = ({ isOpen, onClose }) => {
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
      titleId="help-modal-title"
      title={t('helpModalTitle')}
      footer={footer}
    >
      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
        <div className="flex items-start space-x-3 rtl:space-x-reverse">
          <ClearChatButtonIcon />
          <p className="text-sm text-slate-300 leading-relaxed">
            {t('helpItemHistory')}
          </p>
        </div>
        <div className="flex items-start space-x-3 rtl:space-x-reverse">
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <LanguageSelectorIcon />
              <TextSizeIcon/>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {t('helpItemControls')}
          </p>
        </div>
        <div className="flex items-start space-x-3 rtl:space-x-reverse">
          <ShareIcon />
          <p className="text-sm text-slate-300 leading-relaxed">
            {t('helpItemShare')}
          </p>
        </div>
      </div>
    </Modal>
  );
};


export default HelpModal;
