import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

/**
 * Google Analytics 4 統合コンポーネント
 * プライバシーを尊重したトラッキングを実装
 */
const GoogleAnalytics: React.FC = () => {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    // Google Analytics 4 の測定ID（実際の本番環境では適切なIDに変更）
    const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // 実際のトラッキングIDに変更してください
    
    // 開発環境ではトラッキングを無効化
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    
    // Google Analytics スクリプトの動的読み込み
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    
    // dataLayer の初期化
    window.dataLayer = window.dataLayer || [];
    
    // gtag 関数の定義
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    // Google Analytics の初期化
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      // プライバシー設定
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // カスタム設定
      custom_map: {
        custom_parameter_1: 'user_language',
        custom_parameter_2: 'app_version'
      }
    });
    
    // 初期ページビューの送信
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      user_language: i18n.language,
      app_version: '1.0.0',
      content_group1: 'spiritual_ai_chat'
    });
    
    // 言語変更の追跡
    const handleLanguageChange = (lng: string) => {
      window.gtag('event', 'language_change', {
        event_category: 'user_interaction',
        event_label: lng,
        custom_parameter: lng
      });
    };
    
    // 言語変更イベントリスナーの登録
    i18n.on('languageChanged', handleLanguageChange);
    
    // クリーンアップ関数
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
      // スクリプトの削除
      const existingScript = document.querySelector(`script[src*="${GA_MEASUREMENT_ID}"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [i18n]);
  
  // エラーハンドリング
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (window.gtag && process.env.NODE_ENV === 'production') {
        window.gtag('event', 'exception', {
          description: event.error?.message || 'Unknown error',
          fatal: false,
          event_category: 'javascript_error'
        });
      }
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  return null; // このコンポーネントは何も描画しない
};

export default GoogleAnalytics;