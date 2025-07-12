import React, { useEffect, useRef } from 'react';
import type { PerformanceMetrics, CLSEntry, PerformanceResourceTiming } from '../types/performance';

/**
 * パフォーマンス監視コンポーネント
 * Core Web Vitals とその他のパフォーマンス指標を監視
 */
const PerformanceMonitor: React.FC = () => {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const startTime = performance.now();
    
    const measurePerformance = () => {
      // LCP (Largest Contentful Paint) の測定
      const measureLCP = () => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          if (lastEntry) {
            console.log('LCP:', Math.round(lastEntry.startTime), 'ms');
          }
        });
        
        try {
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          console.log('LCP measurement not supported');
        }
      };
      
      // FID (First Input Delay) の測定
      const measureFID = () => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            console.log('FID:', Math.round(entry.processingStart - entry.startTime), 'ms');
          });
        });
        
        try {
          observer.observe({ type: 'first-input', buffered: true });
        } catch (e) {
          console.log('FID measurement not supported');
        }
      };
      
      // CLS (Cumulative Layout Shift) の測定
      const measureCLS = () => {
        let clsEntries: CLSEntry[] = [];
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries() as CLSEntry[];
          entries.forEach((entry: CLSEntry) => {
            if (!entry.hadRecentInput) {
              clsEntries.push(entry);
            }
          });
          
          // CLS値を計算（最大5秒間のセッション窓）
          const sessionValue = clsEntries.reduce((sum, entry) => sum + entry.value, 0);
          
          if (sessionValue > 0) {
            console.log('CLS:', sessionValue.toFixed(4));
          }
        });
        
        try {
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          console.log('CLS measurement not supported');
        }
      };
      
      // TTFB (Time to First Byte) の測定
      const measureTTFB = () => {
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          const ttfb = navigationTiming.responseStart - navigationTiming.fetchStart;
          console.log('TTFB:', Math.round(ttfb), 'ms');
        }
      };
      
      // FCP (First Contentful Paint) の測定
      const measureFCP = () => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            console.log('FCP:', Math.round(entry.startTime), 'ms');
          });
        });
        
        try {
          observer.observe({ type: 'paint', buffered: true });
        } catch (e) {
          console.log('FCP measurement not supported');
        }
      };
      
      // リソース読み込み時間の測定
      const measureResourceTiming = () => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        if (resources.length > 0) {
          const totalResources = resources.length;
          const totalLoadTime = resources.reduce((sum, resource) => sum + resource.duration, 0);
          const averageLoadTime = totalLoadTime / totalResources;
          
          console.log('Resources loaded:', totalResources);
          console.log('Average load time:', Math.round(averageLoadTime), 'ms');
        }
      };
      
      // ページ読み込み時間の測定
      const measurePageLoadTime = () => {
        window.addEventListener('load', () => {
          const loadTime = performance.now() - startTime;
          console.log('Page load time:', Math.round(loadTime), 'ms');
        });
      };
      
      // 全ての測定を開始
      measureLCP();
      measureFID();
      measureCLS();
      measureTTFB();
      measureFCP();
      measureResourceTiming();
      measurePageLoadTime();
    };

    // DOM読み込み完了後に測定開始
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', measurePerformance);
    } else {
      measurePerformance();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', measurePerformance);
    };
  }, []);

  return null; // このコンポーネントは何も描画しない
};

export default PerformanceMonitor;