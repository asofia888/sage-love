
import React from 'react';
import Modal from './Modal'; // Import the generic Modal

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText: string;
  cancelText: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText,
  cancelText
}) => {
  const footer = (
    <div className="flex justify-end space-x-3 rtl:space-x-reverse">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75 transition-colors"
      >
        {cancelText}
      </button>
      <button
        onClick={onConfirm}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition-colors"
      >
        {confirmText}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="confirmation-modal-title"
      title={title}
      footer={footer}
      panelClassName="max-w-sm"
    >
      <div className="text-sm text-slate-300 leading-relaxed">
        {children}
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
