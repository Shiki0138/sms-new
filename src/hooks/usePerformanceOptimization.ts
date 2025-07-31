import { useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
}

export function usePerformanceOptimization() {
  const metricsRef = useRef<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
  });

  // 画像の遅延読み込み
  const lazyLoadImages = useCallback(() => {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.add('fade-in');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      const images = document.querySelectorAll('img[data-src]');
      images.forEach((img) => imageObserver.observe(img));

      return () => {
        images.forEach((img) => imageObserver.unobserve(img));
      };
    }
  }, []);

  // Service Workerの登録（PWA対応）
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }, []);

  // リソースのプリフェッチ
  const prefetchResources = useCallback(() => {
    const links = [
      '/reservations',
      '/customers',
      '/messages',
    ];

    links.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);

  // パフォーマンス測定
  const measurePerformance = useCallback(() => {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        metricsRef.current.loadTime = navigation.loadEventEnd - navigation.fetchStart;
        metricsRef.current.renderTime = navigation.domComplete - navigation.domLoading;
      }

      // 初回インタラクションまでの時間を測定
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            metricsRef.current.interactionTime = entries[0].startTime;
          }
        });

        observer.observe({ entryTypes: ['first-input'] });
        
        return () => observer.disconnect();
      }
    }
  }, []);

  // メモリ使用量の監視
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('High memory usage detected');
          // メモリ削減のアクション
          if ('gc' in window) {
            (window as any).gc();
          }
        }
      };

      const interval = setInterval(checkMemory, 30000); // 30秒ごとにチェック
      return () => clearInterval(interval);
    }
  }, []);

  // アニメーションの最適化
  const optimizeAnimations = useCallback(() => {
    // ユーザーの設定に基づいてアニメーションを調整
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }

    // 低スペックデバイスでの対応
    const isLowEndDevice = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2;
    
    if (isLowEndDevice) {
      document.documentElement.classList.add('low-end-device');
    }
  }, []);

  // キャッシュストラテジー
  const setupCacheStrategy = useCallback(() => {
    // IndexedDBを使用したキャッシュ
    const dbName = 'salon-cache';
    const storeName = 'api-responses';
    
    const openDB = () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'url' });
          }
        };
      });
    };

    const cacheResponse = async (url: string, data: any) => {
      try {
        const db = await openDB();
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        store.put({
          url,
          data,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Cache write error:', error);
      }
    };

    const getCachedResponse = async (url: string, maxAge = 5 * 60 * 1000) => {
      try {
        const db = await openDB();
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(url);
        
        return new Promise((resolve) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result && Date.now() - result.timestamp < maxAge) {
              resolve(result.data);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        });
      } catch (error) {
        console.error('Cache read error:', error);
        return null;
      }
    };

    // グローバルに公開
    (window as any).salonCache = { cacheResponse, getCachedResponse };
  }, []);

  useEffect(() => {
    // 各最適化処理を実行
    const cleanups: (() => void)[] = [];

    cleanups.push(lazyLoadImages() || (() => {}));
    cleanups.push(measurePerformance() || (() => {}));
    cleanups.push(monitorMemory() || (() => {}));
    
    registerServiceWorker();
    prefetchResources();
    optimizeAnimations();
    setupCacheStrategy();

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [
    lazyLoadImages,
    measurePerformance,
    monitorMemory,
    registerServiceWorker,
    prefetchResources,
    optimizeAnimations,
    setupCacheStrategy,
  ]);

  return {
    metrics: metricsRef.current,
  };
}