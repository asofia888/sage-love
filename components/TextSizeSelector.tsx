

import React from 'react';
import { useTranslation } from 'react-i18next';

interface TextSizeSelectorProps {
  currentTextSize: string;
  onSetTextSize: (size: string) => void;
}

const TextSizeSelector: React.FC<TextSizeSelectorProps> = ({ currentTextSize, onSetTextSize }) => {
  const { t } = useTranslation();

  const sizes = [
    { value: 'normal', labelKey: 'textSizeNormal', ariaKey: 'textSizeNormalAria' },
    { value: 'large', labelKey: 'textSizeLarge', ariaKey: 'textSizeLargeAria' },
  ];

  return (
    <div className="flex items-center space-x-1 rtl:space-x-reverse bg-slate-700/80 text-white rounded-md p-1 backdrop-blur-sm shadow" role="group" aria-labelledby="text-size-label-heading">
      <span id="text-size-label-heading" className="text-sm px-2 text-slate-300 sr-only">{t('textSizeLabel')}</span>
      {sizes.map(size => (
        <button
          key={size.value}
          onClick={() => onSetTextSize(size.value)}
          aria-pressed={currentTextSize === size.value}
          aria-label={t(size.ariaKey)}
          title={t(size.ariaKey)} // Tooltip for better UX
          className={`px-3 py-1 text-sm rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75
            ${currentTextSize === size.value
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-sm'
              : 'bg-transparent hover:bg-slate-600/70 text-slate-200 hover:text-white'
            }
          `}
        >
          {t(size.labelKey)}
        </button>
      ))}
    </div>
  );
};

export default TextSizeSelector;