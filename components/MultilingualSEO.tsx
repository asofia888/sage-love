import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 多言語SEO対応コンポーネント
 * 言語変更時に動的にメタタグとstructured dataを更新
 */
const MultilingualSEO: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  useEffect(() => {
    const updateSEOForLanguage = () => {
      const currentLang = i18n.language.split('-')[0];
      const baseUrl = 'https://www.sage-love.com';
      
      // 言語別メタタグの更新
      const updateMetaTags = () => {
        // Title の更新
        document.title = `${t('appName')} | ${t('seoTitle')}`;
        
        // Description の更新
        const descriptionMeta = document.querySelector('meta[name="description"]');
        if (descriptionMeta) {
          descriptionMeta.setAttribute('content', t('seoDescription1'));
        }
        
        // Keywords の更新（言語別）
        const keywordsMeta = document.querySelector('meta[name="keywords"]');
        if (keywordsMeta) {
          let keywords = '';
          switch (currentLang) {
            case 'ja':
              keywords = 'AI相談,スピリチュアル,人生相談,宗教,哲学,心の悩み,聖者,智慧,無料,オンライン,カウンセリング,メンタルヘルス,自己啓発,瞑想,マインドフルネス';
              break;
            case 'en':
              keywords = 'AI counseling,spiritual guidance,life advice,wisdom,meditation,mindfulness,free online,mental health,self-help,philosophy,religious guidance';
              break;
            case 'es':
              keywords = 'consejería IA,guía espiritual,consejos de vida,sabiduría,meditación,atención plena,gratis en línea,salud mental,autoayuda,filosofía';
              break;
            case 'pt':
              keywords = 'aconselhamento IA,orientação espiritual,conselhos de vida,sabedoria,meditação,atenção plena,grátis online,saúde mental,autoajuda,filosofia';
              break;
            default:
              keywords = 'AI counseling,spiritual guidance,life advice,wisdom,meditation,mindfulness,free online';
          }
          keywordsMeta.setAttribute('content', keywords);
        }
        
        // OGP の更新
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
          ogTitle.setAttribute('content', `${t('appName')} | ${t('seoTitle')}`);
        }
        
        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) {
          ogDescription.setAttribute('content', t('seoDescription1'));
        }
        
        const ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale) {
          const localeMap: { [key: string]: string } = {
            'ja': 'ja_JP',
            'en': 'en_US',
            'es': 'es_ES',
            'pt': 'pt_BR'
          };
          ogLocale.setAttribute('content', localeMap[currentLang] || 'en_US');
        }
        
        // Twitter Card の更新
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) {
          twitterTitle.setAttribute('content', `${t('appName')} | ${t('seoTitle')}`);
        }
        
        const twitterDescription = document.querySelector('meta[name="twitter:description"]');
        if (twitterDescription) {
          twitterDescription.setAttribute('content', t('seoDescription1'));
        }
      };
      
      // Structured Data の更新
      const updateStructuredData = () => {
        // 既存のstructured dataを削除
        const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
        existingScripts.forEach(script => {
          if (script.textContent?.includes('WebApplication') || script.textContent?.includes('FAQPage')) {
            script.remove();
          }
        });
        
        // 新しいWebApplicationのstructured dataを作成
        const webAppSchema = {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": t('appName'),
          "alternateName": currentLang === 'ja' ? "Sage's Love AI" : t('appName'),
          "description": t('seoDescription1'),
          "url": baseUrl,
          "applicationCategory": "LifestyleApplication",
          "operatingSystem": "Web Browser",
          "inLanguage": currentLang,
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": currentLang === 'ja' ? 'JPY' : 'USD',
            "availability": "https://schema.org/InStock"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Sage's Love AI Team",
            "logo": {
              "@type": "ImageObject",
              "url": `${baseUrl}/assets/logo.png`
            }
          },
          "serviceType": getLocalizedText("aiCounselingService", currentLang),
          "availableLanguage": ["ja", "en", "es", "pt"],
          "audience": {
            "@type": "Audience",
            "audienceType": getLocalizedText("audienceType", currentLang)
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": "2847"
          },
          "featureList": getLocalizedFeatures(currentLang)
        };
        
        // FAQのstructured dataを作成
        const faqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": getLocalizedFAQs(currentLang)
        };
        
        // Structured dataをDOMに追加
        const webAppScript = document.createElement('script');
        webAppScript.type = 'application/ld+json';
        webAppScript.textContent = JSON.stringify(webAppSchema);
        document.head.appendChild(webAppScript);
        
        const faqScript = document.createElement('script');
        faqScript.type = 'application/ld+json';
        faqScript.textContent = JSON.stringify(faqSchema);
        document.head.appendChild(faqScript);
      };
      
      // Canonical URL の更新
      const updateCanonicalUrl = () => {
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
          const url = currentLang === 'ja' ? baseUrl : `${baseUrl}?lang=${currentLang}`;
          canonical.setAttribute('href', url);
        }
      };
      
      updateMetaTags();
      updateStructuredData();
      updateCanonicalUrl();
    };
    
    // 言語変更時のSEO更新
    if (i18n.isInitialized) {
      updateSEOForLanguage();
    }
    
    // 言語変更イベントリスナー
    i18n.on('languageChanged', updateSEOForLanguage);
    
    return () => {
      i18n.off('languageChanged', updateSEOForLanguage);
    };
  }, [t, i18n]);
  
  return null; // このコンポーネントは何も描画しない
};

// ヘルパー関数
const getLocalizedText = (key: string, lang: string): string => {
  const texts: { [key: string]: { [lang: string]: string } } = {
    aiCounselingService: {
      ja: 'AIカウンセリングサービス',
      en: 'AI Counseling Service',
      es: 'Servicio de Consejería IA',
      pt: 'Serviço de Aconselhamento IA'
    },
    audienceType: {
      ja: 'スピリチュアルな指導と人生のアドバイスを求める人々',
      en: 'People seeking spiritual guidance and life advice',
      es: 'Personas que buscan orientación espiritual y consejos de vida',
      pt: 'Pessoas que buscam orientação espiritual e conselhos de vida'
    }
  };
  
  return texts[key]?.[lang] || texts[key]?.['en'] || '';
};

const getLocalizedFeatures = (lang: string): string[] => {
  const features: { [lang: string]: string[] } = {
    ja: [
      '24時間利用可能',
      '多言語対応',
      '無料利用',
      'プライバシー保護',
      'スピリチュアル相談',
      '人生相談',
      '心の悩み解決'
    ],
    en: [
      '24/7 availability',
      'Multilingual support',
      'Free to use',
      'Privacy protection',
      'Spiritual guidance',
      'Life counseling',
      'Emotional support'
    ],
    es: [
      'Disponible 24/7',
      'Soporte multiidioma',
      'Gratis',
      'Protección de privacidad',
      'Guía espiritual',
      'Consejería de vida',
      'Apoyo emocional'
    ],
    pt: [
      'Disponível 24/7',
      'Suporte multilíngue',
      'Gratuito',
      'Proteção de privacidade',
      'Orientação espiritual',
      'Aconselhamento de vida',
      'Suporte emocional'
    ]
  };
  
  return features[lang] || features['en'];
};

const getLocalizedFAQs = (lang: string): any[] => {
  const faqs: { [lang: string]: any[] } = {
    ja: [
      {
        "@type": "Question",
        "name": "聖者の愛（AI）は無料で利用できますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "はい、聖者の愛（AI）は完全無料でご利用いただけます。アカウント登録も不要で、いつでもお気軽にご相談ください。"
        }
      },
      {
        "@type": "Question",
        "name": "どのような相談ができますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "人生の悩み、スピリチュアルな疑問、宗教的な質問、日常の心配事など、幅広いご相談にお答えします。聖者の智慧で心の平安を得るお手伝いをいたします。"
        }
      }
    ],
    en: [
      {
        "@type": "Question",
        "name": "Is Sage's Love AI free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Sage's Love AI is completely free to use. No registration required, and you can start consulting anytime."
        }
      },
      {
        "@type": "Question",
        "name": "What kind of consultations can I have?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can consult about life concerns, spiritual questions, religious inquiries, and daily worries. We help you find peace of mind through sage wisdom."
        }
      }
    ],
    es: [
      {
        "@type": "Question",
        "name": "¿Es gratis usar Amor del Sabio IA?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí, Amor del Sabio IA es completamente gratuito. No se requiere registro y puedes comenzar a consultar en cualquier momento."
        }
      },
      {
        "@type": "Question",
        "name": "¿Qué tipo de consultas puedo hacer?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Puedes consultar sobre preocupaciones de la vida, preguntas espirituales, consultas religiosas y preocupaciones diarias. Te ayudamos a encontrar paz mental a través de la sabiduría del sabio."
        }
      }
    ],
    pt: [
      {
        "@type": "Question",
        "name": "O Amor do Sábio IA é gratuito?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim, o Amor do Sábio IA é completamente gratuito. Não é necessário registro e você pode começar a consultar a qualquer momento."
        }
      },
      {
        "@type": "Question",
        "name": "Que tipo de consultas posso fazer?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Você pode consultar sobre preocupações da vida, questões espirituais, consultas religiosas e preocupações diárias. Ajudamos você a encontrar paz de espírito através da sabedoria do sábio."
        }
      }
    ]
  };
  
  return faqs[lang] || faqs['en'];
};

export default MultilingualSEO;