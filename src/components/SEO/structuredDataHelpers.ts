/**
 * Helper functions for creating structured data schemas
 */

import type { FAQItem, WebApplicationSchema, FAQSchema } from '../../types/seo';

const BASE_URL = 'https://www.sage-love.com';

export const getLocalizedText = (key: string, lang: string): string => {
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

export const getLocalizedFeatures = (lang: string): string[] => {
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

export const getLocalizedFAQs = (lang: string): FAQItem[] => {
  const faqs: { [lang: string]: FAQItem[] } = {
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

export const createWebApplicationSchema = (appName: string, description: string, currentLang: string): WebApplicationSchema => {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": appName,
    "alternateName": currentLang === 'ja' ? "Sage's Love AI" : appName,
    "description": description,
    "url": BASE_URL,
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
        "url": `${BASE_URL}/assets/logo.png`
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
};

export const createFAQSchema = (currentLang: string): FAQSchema => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": getLocalizedFAQs(currentLang)
  };
};