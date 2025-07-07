import React, { useEffect } from 'react';

/**
 * Core Web Vitals パフォーマンス監視コンポーネント
 * LCP, FID, CLS の測定とレポート
 */
const PerformanceMonitor: React.FC = () => {
  useEffect(() => {
    // Web Vitals の測定
    const measureWebVitals = () => {
      // LCP (Largest Contentful Paint) の測定
      const measureLCP = () => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          if (lastEntry && window.gtag) {
            window.gtag('event', 'web_vitals', {
              event_category: 'performance',
              event_label: 'LCP',
              value: Math.round(lastEntry.startTime),
              custom_parameter: 'core_web_vitals'
            });
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
            if (window.gtag) {
              window.gtag('event', 'web_vitals', {
                event_category: 'performance',
                event_label: 'FID',
                value: Math.round(entry.processingStart - entry.startTime),
                custom_parameter: 'core_web_vitals'
              });
            }
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
        let clsValue = 0;
        let clsEntries: any[] = [];
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              clsEntries.push(entry);
            }
          });
        });
        
        try {
          observer.observe({ type: 'layout-shift', buffered: true });
          
          // ページの可視性が変わったときにCLSを報告
          const reportCLS = () => {
            if (window.gtag && clsValue > 0) {
              window.gtag('event', 'web_vitals', {
                event_category: 'performance',
                event_label: 'CLS',
                value: Math.round(clsValue * 1000),
                custom_parameter: 'core_web_vitals'
              });
            }
          };
          
          document.addEventListener('visibilitychange', reportCLS);
          window.addEventListener('beforeunload', reportCLS);
        } catch (e) {
          console.log('CLS measurement not supported');
        }
      };
      
      // 機能サポートチェック
      if ('PerformanceObserver' in window) {
        measureLCP();
        measureFID();
        measureCLS();
      }
    };
    
    // カスタムパフォーマンスメトリクス
    const measureCustomMetrics = () => {
      // Time to Interactive の近似値
      const measureTTI = () => {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navigationTiming && window.gtag) {
              const tti = navigationTiming.domInteractive - navigationTiming.navigationStart;
              window.gtag('event', 'custom_performance', {
                event_category: 'performance',
                event_label: 'TTI',
                value: Math.round(tti),
                custom_parameter: 'custom_metrics'
              });
            }
          }, 100);
        });
      };
      
      // Resource load times
      const measureResourceTiming = () => {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const resources = performance.getEntriesByType('resource');
            let totalResourceTime = 0;
            let cssCount = 0;
            let jsCount = 0;
            
            resources.forEach((resource: any) => {
              totalResourceTime += resource.duration;
              if (resource.name.includes('.css')) cssCount++;
              if (resource.name.includes('.js')) jsCount++;
            });
            
            if (window.gtag) {
              window.gtag('event', 'resource_timing', {
                event_category: 'performance',
                event_label: 'total_resources',
                value: Math.round(totalResourceTime),
                css_files: cssCount,
                js_files: jsCount
              });
            }
          }, 500);
        });
      };
      
      measureTTI();
      measureResourceTiming();
    };
    
    // Page Load Performance の測定
    const measurePageLoad = () => {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigationTiming && window.gtag) {
            window.gtag('event', 'page_load_performance', {
              event_category: 'performance',
              dom_content_loaded: Math.round(navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart),
              load_complete: Math.round(navigationTiming.loadEventEnd - navigationTiming.navigationStart),
              dns_lookup: Math.round(navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart),
              tcp_connection: Math.round(navigationTiming.connectEnd - navigationTiming.connectStart),
              server_response: Math.round(navigationTiming.responseEnd - navigationTiming.requestStart)
            });
          }
        }, 100);
      });
    };
    
    // 測定開始
    measureWebVitals();
    measureCustomMetrics();
    measurePageLoad();
    
    // メモリ使用量の監視（対応ブラウザのみ）
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory;
        if (window.gtag) {
          window.gtag('event', 'memory_usage', {
            event_category: 'performance',
            used_heap: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
            total_heap: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
            heap_limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
          });
        }
      }
    };
    
    // 初期メモリ測定
    setTimeout(monitorMemory, 2000);
    
    // 定期的なメモリ監視
    const memoryInterval = setInterval(monitorMemory, 30000);
    
    return () => {
      clearInterval(memoryInterval);
    };
  }, []);
  
  return null; // このコンポーネントは何も描画しない
};

export default PerformanceMonitor;