
import React from 'react';
import { useTranslation } from 'react-i18next';

interface PromptSuggestionsProps {
  onSelectPrompt: (promptText: string) => void;
  textSize: string; // Added textSize prop
}

const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ onSelectPrompt, textSize }) => {
  const { t } = useTranslation();

  const suggestions = [
    { id: 's1', key: 'promptSuggestion1', ariaKey: 'promptSuggestion1' },
    { id: 's2', key: 'promptSuggestion2', ariaKey: 'promptSuggestion2' },
    { id: 's3', key: 'promptSuggestion3', ariaKey: 'promptSuggestion3' },
    { id: 's4', key: 'promptSuggestion4', ariaKey: 'promptSuggestion4' },
  ];

  const buttonTextClass = textSize === 'large' ? 'text-base' : 'text-sm';

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-3 px-2 sm:px-0">
      {suggestions.map(suggestion => (
        <button
          key={suggestion.id}
          onClick={() => onSelectPrompt(t(suggestion.key))}
          className={`px-3 py-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-sm text-slate-100 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors duration-150 border border-slate-400/50 hover:border-sky-500/70 ${buttonTextClass}`}
          aria-label={t(suggestion.ariaKey)}
        >
          {t(suggestion.key)}
        </button>
      ))}
    </div>
  );
};

export default PromptSuggestions;