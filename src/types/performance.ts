/**
 * Performance monitoring related types
 */

export interface CLSEntry {
  value: number;
  sources?: Array<{
    element?: Element;
    currentRect?: DOMRect;
    previousRect?: DOMRect;
  }>;
  hadRecentInput?: boolean;
}

export interface PerformanceResourceTiming {
  name: string;
  duration: number;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  initiatorType?: string;
  responseStart?: number;
  responseEnd?: number;
}

export interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
  ttfb?: number;
  pageLoadTime?: number;
  resourcesLoaded?: number;
}

export interface PerformanceData {
  metrics: PerformanceMetrics;
  timestamp: number;
  url: string;
  userAgent: string;
}