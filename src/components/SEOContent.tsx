import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * SEOフレンドリーなコンテンツコンポーネント
 * 検索エンジンがクロールしやすい静的コンテンツを提供
 */
const SEOContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  return (
    <div className="hidden" aria-hidden="true" role="complementary">
      {/* SEO用の構造化コンテンツ */}
      <h1>{t('appName')} - {t('seoTitle')}</h1>
      <h2>{t('seoHeading1')}</h2>
      <p>{t('seoDescription1')}</p>
      
      <h2>{t('seoHeading2')}</h2>
      <p>{t('seoDescription2')}</p>
      
      <h3>{t('seoHeading3')}</h3>
      <ul>
        <li>{t('seoFeature1')}</li>
        <li>{t('seoFeature2')}</li>
        <li>{t('seoFeature3')}</li>
        <li>{t('seoFeature4')}</li>
        <li>{t('seoFeature5')}</li>
      </ul>
      
      <h3>{t('seoHeading4')}</h3>
      <p>{t('seoDescription3')}</p>
      
      <h3>{t('seoHeading5')}</h3>
      <p>{t('seoDescription4')}</p>
      
      {/* キーワードリッチなコンテンツ */}
      <div>
        <span>AI相談</span>
        <span>スピリチュアル</span>
        <span>人生相談</span>
        <span>宗教</span>
        <span>哲学</span>
        <span>心の悩み</span>
        <span>聖者</span>
        <span>智慧</span>
        <span>無料</span>
        <span>オンライン</span>
        <span>カウンセリング</span>
        <span>メンタルヘルス</span>
        <span>自己啓発</span>
        <span>瞑想</span>
        <span>マインドフルネス</span>
        <span>24時間</span>
        <span>多言語対応</span>
        <span>プライバシー保護</span>
      </div>
      
      {/* 言語別のコンテンツ */}
      {i18n.language.startsWith('en') && (
        <div>
          <h2>AI Spiritual Guidance</h2>
          <p>Receive wisdom from an AI sage available 24/7. Get spiritual guidance, life advice, and find peace of mind through ancient wisdom combined with modern knowledge.</p>
          <span>spiritual guidance</span>
          <span>AI counseling</span>
          <span>life advice</span>
          <span>wisdom</span>
          <span>meditation</span>
          <span>mindfulness</span>
          <span>free online</span>
        </div>
      )}
      
      {i18n.language.startsWith('es') && (
        <div>
          <h2>Guía Espiritual IA</h2>
          <p>Recibe sabiduría de un sabio IA disponible 24/7. Obtén orientación espiritual, consejos de vida y encuentra paz mental a través de la sabiduría ancestral combinada con el conocimiento moderno.</p>
          <span>guía espiritual</span>
          <span>consejería IA</span>
          <span>consejos de vida</span>
          <span>sabiduría</span>
          <span>meditación</span>
          <span>atención plena</span>
          <span>gratis en línea</span>
        </div>
      )}
      
      {i18n.language.startsWith('pt') && (
        <div>
          <h2>Orientação Espiritual IA</h2>
          <p>Receba sabedoria de um sábio IA disponível 24/7. Obtenha orientação espiritual, conselhos de vida e encontre paz de espírito através da sabedoria ancestral combinada com o conhecimento moderno.</p>
          <span>orientação espiritual</span>
          <span>aconselhamento IA</span>
          <span>conselhos de vida</span>
          <span>sabedoria</span>
          <span>meditação</span>
          <span>atenção plena</span>
          <span>grátis online</span>
        </div>
      )}
    </div>
  );
};

export default SEOContent;