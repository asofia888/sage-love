/**
 * SEO and structured data related types
 */

export interface FAQItem {
  "@type": "Question";
  name: string;
  acceptedAnswer: {
    "@type": "Answer";
    text: string;
  };
}

export interface WebApplicationSchema {
  "@context": string;
  "@type": string;
  name: string;
  alternateName?: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  inLanguage: string;
  offers: {
    "@type": string;
    price: string;
    priceCurrency: string;
    availability: string;
  };
  publisher: {
    "@type": string;
    name: string;
    logo: {
      "@type": string;
      url: string;
    };
  };
  serviceType: string;
  availableLanguage: string[];
  audience: {
    "@type": string;
    audienceType: string;
  };
  aggregateRating: {
    "@type": string;
    ratingValue: string;
    bestRating: string;
    worstRating: string;
    ratingCount: string;
  };
  featureList: string[];
}

export interface FAQSchema {
  "@context": string;
  "@type": string;
  mainEntity: FAQItem[];
}