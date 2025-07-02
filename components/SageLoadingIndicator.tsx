import React from 'react';
import { useTranslation } from 'react-i18next';

const SageLoadingIndicator: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      className="p-2"
      role="status"
      aria-live="polite"
      aria-label={t('sageIsResponding')}
    >
      <svg
        viewBox="0 0 24 24" // Adjusted for the new animation
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor" // Dots will use current text color
        className="w-8 h-8 text-sky-400" // Removed animate-pulse as SVG handles its own animation
        aria-hidden="true"
      >
        <circle cx="4" cy="12" r="3">
          <animate attributeName="opacity"
            dur="1s"
            values="0;1;0"
            repeatCount="indefinite"
            begin="0.1" />
        </circle>
        <circle cx="12" cy="12" r="3">
          <animate attributeName="opacity"
            dur="1s"
            values="0;1;0"
            repeatCount="indefinite"
            begin="0.2" />
        </circle>
        <circle cx="20" cy="12" r="3">
          <animate attributeName="opacity"
            dur="1s"
            values="0;1;0"
            repeatCount="indefinite"
            begin="0.3" />
        </circle>
      </svg>
    </div>
  );
};

export default SageLoadingIndicator;