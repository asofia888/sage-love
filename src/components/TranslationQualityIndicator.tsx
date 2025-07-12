import React from 'react';
import { useTranslation } from 'react-i18next';
import { QualityScore, TranslationIssue } from '../services/translationService';

interface TranslationQualityIndicatorProps {
  qualityScore?: QualityScore;
  onReportIssue?: (issue: TranslationIssue) => void;
  isTranslated?: boolean;
}

const StarIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = "w-3 h-3" }) => (
  <svg
    className={`${className} ${filled ? 'text-yellow-400' : 'text-slate-500'}`}
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="1"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);

const TranslationQualityIndicator: React.FC<TranslationQualityIndicatorProps> = ({
  qualityScore,
  onReportIssue,
  isTranslated = false
}) => {
  const { t, i18n } = useTranslation();

  // 日本語の場合は表示しない
  if (i18n.language === 'ja' || !isTranslated) {
    return null;
  }

  if (!qualityScore) {
    return null;
  }

  const handleReportIssue = () => {
    if (onReportIssue) {
      onReportIssue({
        type: 'low_quality',
        score: qualityScore,
        timestamp: new Date(),
        details: `Translation quality below threshold: ${qualityScore.overall}`
      });
    }
  };

  const stars = Math.round(qualityScore.overall * 5);
  const showLowQualityWarning = qualityScore.overall < 0.8;

  return (
    <div className="mt-2 flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-slate-400">翻訳品質:</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map(star => (
            <StarIcon 
              key={star}
              filled={star <= stars}
              className="w-3 h-3"
            />
          ))}
        </div>
        <span className="text-slate-400 ml-1">
          ({Math.round(qualityScore.overall * 100)}%)
        </span>
      </div>
      
      {showLowQualityWarning && (
        <button
          onClick={handleReportIssue}
          className="text-yellow-400 hover:text-yellow-300 transition-colors text-xs underline"
          title="翻訳品質の問題を報告"
        >
          品質を報告
        </button>
      )}
      
      {qualityScore.suggestions.length > 0 && (
        <div className="text-slate-500 text-xs">
          💡 {qualityScore.suggestions[0]}
        </div>
      )}
    </div>
  );
};

export default TranslationQualityIndicator;