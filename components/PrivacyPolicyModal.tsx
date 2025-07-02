import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
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
      titleId="privacy-policy-modal-title"
      title={t('privacyPolicyModalTitle')}
      footer={footer}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        <div className="text-sm text-slate-300 leading-relaxed space-y-4">
          {/* プライバシーポリシーの内容を段落に分けて表示 */}
          <div className="whitespace-pre-wrap">
            {t('privacyPolicy')}
          </div>
          
          {/* 重要な注意事項をハイライト */}
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <div>
                <h4 className="font-medium text-blue-200 mb-2">重要なポイント</h4>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• 会話履歴はお使いのブラウザ内にのみ保存されます</li>
                  <li>• 個人を特定できる情報は収集されません</li>
                  <li>• 危機検出機能は安全性向上のみを目的としています</li>
                  <li>• いつでもデータを削除し、利用を停止できます</li>
                </ul>
              </div>
            </div>
          </div>

          {/* データ削除の方法 */}
          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 12a1 1 0 102 0V7a1 1 0 10-2 0v5zm1-8a1 1 0 011 1v.01a1 1 0 11-2 0V5a1 1 0 011-1zm0 14a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd"/>
              </svg>
              <div>
                <h4 className="font-medium text-green-200 mb-2">データの管理</h4>
                <p className="text-sm text-green-200">
                  会話履歴を削除するには、アプリ内の「会話をクリア」ボタンを使用するか、
                  ブラウザの設定からローカルストレージをクリアしてください。
                </p>
              </div>
            </div>
          </div>

          {/* 最終更新日 */}
          <div className="text-xs text-slate-400 pt-4 border-t border-slate-700">
            最終更新: 2025年1月
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;