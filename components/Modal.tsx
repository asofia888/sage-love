
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  titleId,
  title,
  children,
  footer,
  panelClassName = 'max-w-lg'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      firstElement.focus();

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else { // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };
      
      const currentModalRef = modalRef.current;
      currentModalRef?.addEventListener('keydown', handleTabKey);
      
      return () => {
        currentModalRef?.removeEventListener('keydown', handleTabKey);
      }
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={modalRef}
        className={`bg-slate-800 rounded-lg shadow-2xl p-6 m-4 w-full text-slate-200 relative transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeInScale 0.2s forwards' }}
      >
        <h2 id={titleId} className="text-xl font-bold text-sky-400 mb-4">{title}</h2>
        
        {children}

        {footer && <div className="mt-6">{footer}</div>}
        
        <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-full p-1"
            aria-label={t('closeModalButton')}
        >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
      <style>
        {`
          @keyframes fadeInScale {
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Modal;
