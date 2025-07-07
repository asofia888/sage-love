import React, { useEffect } from 'react';

interface PerformanceMonitorProps {
  memoryStats?: {
    totalMessages: number;
    memoryUsage: number;
    isNearLimit: boolean;
  };
}

/**
 * 拡張パフォーマンス監視コンポーネント
 * Core Web Vitals + メモリ使用量 + チャット履歴監視
 */
const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ memoryStats }) => {
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

  // チャット履歴とメモリ統計の監視
  useEffect(() => {
    if (!memoryStats) return;

    const { totalMessages, memoryUsage, isNearLimit } = memoryStats;

    // メモリ使用量の定期チェック
    const checkMemoryUsage = () => {
      if (window.gtag) {
        window.gtag('event', 'chat_memory_stats', {
          event_category: 'performance',
          total_messages: totalMessages,
          memory_usage_bytes: memoryUsage,
          memory_usage_mb: Math.round(memoryUsage / 1024 / 1024 * 100) / 100,
          is_near_limit: isNearLimit
        });
      }

      // メモリ使用量が制限に近い場合の警告
      if (isNearLimit) {
        console.warn(`Chat memory usage is near limit: ${Math.round(memoryUsage / 1024)} KB (${totalMessages} messages)`);
        
        if (window.gtag) {
          window.gtag('event', 'memory_limit_warning', {
            event_category: 'performance',
            memory_usage: memoryUsage,
            message_count: totalMessages
          });
        }
      }

      // DOM ノード数の監視
      const domNodeCount = document.querySelectorAll('*').length;
      if (domNodeCount > 2000) { // 2000ノード以上で警告
        console.warn(`High DOM node count: ${domNodeCount}`);
        
        if (window.gtag) {
          window.gtag('event', 'high_dom_node_count', {
            event_category: 'performance',
            node_count: domNodeCount,
            message_count: totalMessages
          });
        }
      }
    };

    // 初回チェック
    checkMemoryUsage();

    // メッセージ数が多い場合は監視頻度を上げる
    const checkInterval = totalMessages > 50 ? 30000 : 60000; // 30秒 or 60秒
    const memoryCheckInterval = setInterval(checkMemoryUsage, checkInterval);

    return () => {
      clearInterval(memoryCheckInterval);
    };
  }, [memoryStats]);

  // レンダリングパフォーマンスの監視
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) { // 1秒ごと
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 30) { // 30FPS以下で警告
          console.warn(`Low FPS detected: ${fps}`);
          
          if (window.gtag) {
            window.gtag('event', 'low_fps_detected', {
              event_category: 'performance',
              fps: fps,
              message_count: memoryStats?.totalMessages || 0
            });
          }
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [memoryStats?.totalMessages]);
  
  return null; // このコンポーネントは何も描画しない
};

export default PerformanceMonitor;