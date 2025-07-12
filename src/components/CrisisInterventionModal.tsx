import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CrisisDetectionResult } from '../services/crisisDetectionService';
import { EmergencyResource, EmergencyResourceService } from '../data/emergencyResources';

interface CrisisInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  crisisResult: CrisisDetectionResult;
  userLanguage: string;
  userCountry?: string;
}

const CrisisInterventionModal: React.FC<CrisisInterventionModalProps> = ({
  isOpen,
  onClose,
  crisisResult,
  userLanguage,
  userCountry
}) => {
  const { t } = useTranslation();
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [showAllResources, setShowAllResources] = useState(false);

  useEffect(() => {
    if (isOpen && crisisResult.isCrisis) {
      const recommendedResources = EmergencyResourceService.getRecommendedResources(
        crisisResult.severity,
        userLanguage,
        userCountry
      );
      setResources(recommendedResources);
    }
  }, [isOpen, crisisResult, userLanguage, userCountry]);

  if (!isOpen) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 border-red-700';
      case 'high': return 'bg-orange-600 border-orange-700';
      case 'medium': return 'bg-yellow-600 border-yellow-700';
      default: return 'bg-blue-600 border-blue-700';
    }
  };

  const getSeverityText = (severity: string) => {
    const severityKeys: { [key: string]: string } = {
      'critical': t('crisis.severity.critical', '緊急'),
      'high': t('crisis.severity.high', '重要'),
      'medium': t('crisis.severity.medium', '注意'),
      'low': t('crisis.severity.low', '軽度')
    };
    return severityKeys[severity] || severity;
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'hotline':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
          </svg>
        );
      case 'text':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
          </svg>
        );
      case 'chat':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
          </svg>
        );
      case 'website':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.894A1 1 0 0018 16V3z" clipRule="evenodd"/>
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className={`px-6 py-4 border-b border-slate-700 ${getSeverityColor(crisisResult.severity)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {t('crisis.title', '重要なお知らせ')}
                </h2>
                <span className="text-sm text-white opacity-90">
                  {getSeverityText(crisisResult.severity)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 p-2"
              aria-label={t('closeButton', '閉じる')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="px-6 py-6 space-y-6">
          {/* 緊急メッセージ */}
          <div className="bg-slate-700 rounded-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <div className="text-slate-200">
                <p className="font-medium mb-2">
                  {t('crisis.youAreNotAlone', 'あなたは一人ではありません')}
                </p>
                <p className="text-sm">
                  {t('crisis.helpAvailable', 'あなたの気持ちは大切です。専門の方があなたを支援する準備ができています。助けを求めることは強さの証拠です。')}
                </p>
              </div>
            </div>
          </div>

          {/* AI制限の説明 */}
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <p className="text-sm text-yellow-200">
                {t('crisis.aiLimitation', 'AIには限界があります。深刻な心の問題については、以下の専門機関にすぐにご相談ください。')}
              </p>
            </div>
          </div>

          {/* 緊急時リソース */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
              </svg>
              {t('crisis.emergencyResources', '今すぐ利用できる相談窓口')}
            </h3>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {resources.slice(0, showAllResources ? resources.length : 4).map((resource) => (
                <div key={resource.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-blue-500 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-2 bg-blue-600 rounded-lg">
                      {getResourceTypeIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-200 mb-1">{resource.name}</h4>
                      <p className="text-sm text-slate-400 mb-2">{resource.description}</p>
                      
                      {/* 連絡先情報 */}
                      <div className="space-y-1">
                        {resource.phone && (
                          <div className="flex items-center text-sm">
                            <span className="text-slate-400 w-12">{t('phone', '電話')}:</span>
                            <a 
                              href={`tel:${resource.phone.replace(/[^\d+]/g, '')}`}
                              className="text-blue-400 hover:text-blue-300 font-mono"
                            >
                              {resource.phone}
                            </a>
                          </div>
                        )}
                        {resource.website && (
                          <div className="flex items-center text-sm">
                            <span className="text-slate-400 w-12">{t('web', 'Web')}:</span>
                            <a 
                              href={resource.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 truncate"
                            >
                              {resource.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center text-sm">
                          <span className="text-slate-400 w-12">{t('hours', '時間')}:</span>
                          <span className="text-slate-300">{resource.hours}</span>
                          {resource.isAvailable24h && (
                            <span className="ml-2 px-2 py-0.5 bg-green-600 text-green-100 text-xs rounded-full">
                              24/7
                            </span>
                          )}
                        </div>
                        {resource.isFree && (
                          <div className="flex items-center text-sm">
                            <span className="text-slate-400 w-12"></span>
                            <span className="px-2 py-0.5 bg-blue-600 text-blue-100 text-xs rounded-full">
                              {t('free', '無料')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {resources.length > 4 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllResources(!showAllResources)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  {showAllResources 
                    ? t('showLess', '少なく表示') 
                    : t('showMore', 'さらに表示') + ` (${resources.length - 4})`
                  }
                </button>
              </div>
            )}
          </div>

          {/* 重要な注意事項 */}
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <h4 className="font-medium text-red-200 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              {t('crisis.importantNote', '重要な注意')}
            </h4>
            <p className="text-sm text-red-200">
              {t('crisis.emergencyNote', '生命に関わる緊急事態の場合は、救急サービス（日本: 119、米国: 911など）にすぐに連絡してください。')}
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 bg-slate-750 border-t border-slate-700 flex justify-between items-center">
          <p className="text-sm text-slate-400">
            {t('crisis.footer', 'あなたの命は大切です。助けを求めることを躊躇しないでください。')}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-colors"
          >
            {t('understood', '理解しました')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrisisInterventionModal;