# パフォーマンス最適化仕様書

## 🚀 パフォーマンス目標設定

### Core Web Vitals 目標値
| メトリクス | 目標値 | 現在の業界標準 | 美容室アプリ最適値 |
|-----------|--------|---------------|------------------|
| **LCP (Largest Contentful Paint)** | ≤ 1.2秒 | ≤ 2.5秒 | ≤ 1.0秒 |
| **FID (First Input Delay)** | ≤ 50ms | ≤ 100ms | ≤ 30ms |
| **CLS (Cumulative Layout Shift)** | ≤ 0.05 | ≤ 0.1 | ≤ 0.03 |
| **TTFB (Time to First Byte)** | ≤ 200ms | ≤ 600ms | ≤ 150ms |
| **FCP (First Contentful Paint)** | ≤ 800ms | ≤ 1.8秒 | ≤ 600ms |

### モバイル固有パフォーマンス目標
| 指標 | 目標値 | 説明 |
|------|--------|------|
| **初回読み込み** | ≤ 2秒 | アプリ初回起動時間 |
| **画面遷移** | ≤ 200ms | ページ間の遷移時間 |
| **タップ応答** | ≤ 16ms | UI要素へのタップ応答 |
| **スクロール性能** | 60 FPS | スムーズなスクロール |
| **メモリ使用量** | ≤ 50MB | 低メモリデバイス対応 |

---

## ⚡ 読み込み速度最適化

### 1. Critical Resource Optimization

#### Critical CSS インライン化
```html
<!-- critical.css を直接HTML内に埋め込み -->
<style>
/* Above-the-fold critical styles */
:root {
  --primary: #d4a574;
  --bg: #ffffff;
  --text: #1e293b;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>

<!-- 非クリティカルCSSは非同期読み込み -->
<link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles/main.css"></noscript>
```

#### JavaScript Code Splitting
```javascript
// main.js - 必要最小限のコア機能
import { initializeApp } from './core/app.js';
import { setupRouter } from './core/router.js';

// 動的インポートで機能別分割
const loadBookingFlow = () => import('./features/booking/index.js');
const loadProfileModule = () => import('./features/profile/index.js');
const loadNotifications = () => import('./features/notifications/index.js');

const appConfig = {
  routes: [
    {
      path: '/booking',
      loader: loadBookingFlow,
      preload: 'visible' // ユーザーが見える前にプリロード
    },
    {
      path: '/profile',
      loader: loadProfileModule,
      preload: 'interaction' // インタラクション時にプリロード
    },
    {
      path: '/notifications',
      loader: loadNotifications,
      preload: 'idle' // アイドル時にプリロード
    }
  ]
};

initializeApp(appConfig);
```

#### Resource Hints 戦略的活用
```html
<!-- DNS prefetch for external domains -->
<link rel="dns-prefetch" href="//api.salonlumiere.com">
<link rel="dns-prefetch" href="//cdn.jsdelivr.net">

<!-- Preconnect to critical origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://api.salonlumiere.com" crossorigin>

<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/booking">
<link rel="prefetch" href="/history">

<!-- Preload critical resources -->
<link rel="preload" href="/fonts/NotoSansJP-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/api/profile" as="fetch" crossorigin>
```

### 2. Service Worker キャッシュ戦略

```javascript
// sw-advanced.js - 高度なキャッシュ戦略
const CACHE_CONFIG = {
  // ランタイムキャッシュ設定
  runtimeCaching: [
    {
      urlPattern: /\/api\/appointments/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'appointments-api',
        networkTimeoutSeconds: 3,
        cacheableResponse: {
          statuses: [0, 200]
        },
        broadcastUpdate: {
          channelName: 'data-updates'
        }
      }
    },
    {
      urlPattern: /\/api\/services/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'services-api',
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    {
      urlPattern: /\.(png|jpg|jpeg|webp|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30日
        },
        plugins: [{
          cacheWillUpdate: async ({ response }) => {
            // 画像の品質チェック
            return response.status === 200 && 
                   response.headers.get('content-type')?.startsWith('image/');
          }
        }]
      }
    }
  ]
};

// 高度なプリキャッシュ戦略
class AdvancedPrecacheController {
  constructor() {
    this.precacheManifest = [
      // アプリシェル
      { url: '/', revision: '1.0.0' },
      { url: '/offline.html', revision: '1.0.0' },
      
      // 重要なアセット
      { url: '/styles/critical.css', revision: '1.0.0' },
      { url: '/scripts/core.js', revision: '1.0.0' },
      
      // フォント
      { url: '/fonts/NotoSansJP-Regular.woff2', revision: '1.0.0' }
    ];
    
    this.setupPrecaching();
  }

  async setupPrecaching() {
    // 段階的プリキャッシュ（重要度順）
    const criticalResources = this.precacheManifest.filter(r => r.critical);
    const normalResources = this.precacheManifest.filter(r => !r.critical);
    
    // 重要なリソースを最初にキャッシュ
    await this.precacheResources(criticalResources);
    
    // アイドル時間に残りをキャッシュ
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.precacheResources(normalResources);
      });
    } else {
      setTimeout(() => this.precacheResources(normalResources), 100);
    }
  }

  async precacheResources(resources) {
    const cache = await caches.open('precache-v1');
    const requests = resources.map(r => new Request(r.url));
    
    try {
      await cache.addAll(requests);
      console.log(`[SW] Precached ${resources.length} resources`);
    } catch (error) {
      console.error('[SW] Precaching failed:', error);
      // 個別にリトライ
      await this.precacheIndividually(cache, resources);
    }
  }
}
```

---

## 🎨 レンダリング最適化

### 1. Virtual DOM 最適化

```javascript
// Virtual DOM パフォーマンス最適化
class OptimizedVirtualDOM {
  constructor() {
    this.renderQueue = [];
    this.isRenderScheduled = false;
    this.recycledNodes = new Map(); // ノードプール
  }

  // バッチレンダリング
  scheduleRender(component) {
    this.renderQueue.push(component);
    
    if (!this.isRenderScheduled) {
      this.isRenderScheduled = true;
      
      // フレーム開始時にレンダリング実行
      requestAnimationFrame(() => {
        this.flushRenderQueue();
        this.isRenderScheduled = false;
      });
    }
  }

  flushRenderQueue() {
    // 優先度順でソート
    this.renderQueue.sort((a, b) => b.priority - a.priority);
    
    const startTime = performance.now();
    const FRAME_BUDGET = 16; // 16ms budget per frame
    
    while (this.renderQueue.length > 0) {
      const elapsed = performance.now() - startTime;
      
      // フレーム予算を超えた場合は次のフレームに
      if (elapsed > FRAME_BUDGET) {
        requestAnimationFrame(() => {
          this.flushRenderQueue();
        });
        return;
      }
      
      const component = this.renderQueue.shift();
      this.renderComponent(component);
    }
  }

  // メモ化レンダリング
  renderComponent(component) {
    const memoKey = this.generateMemoKey(component);
    
    if (this.shouldSkipRender(component, memoKey)) {
      return component.cachedOutput;
    }
    
    const output = component.render();
    component.cachedOutput = output;
    component.lastMemoKey = memoKey;
    
    return output;
  }

  shouldSkipRender(component, memoKey) {
    return component.lastMemoKey === memoKey &&
           !component.forceUpdate;
  }
}

// React/Vueコンポーネントの最適化例
const OptimizedAppointmentCard = React.memo(({ appointment }) => {
  const { date, time, services, staff } = appointment;
  
  // 複雑な計算のメモ化
  const formattedServices = useMemo(() => 
    services.map(service => ({
      ...service,
      displayName: formatServiceName(service)
    }))
  , [services]);

  // コールバックのメモ化
  const handleCardClick = useCallback(() => {
    analytics.track('appointment_card_clicked', {
      appointmentId: appointment.id,
      timestamp: Date.now()
    });
    
    navigation.navigate('appointment-detail', { 
      appointmentId: appointment.id 
    });
  }, [appointment.id, navigation]);

  return (
    <div className="appointment-card" onClick={handleCardClick}>
      <div className="appointment-date">{date}</div>
      <div className="appointment-time">{time}</div>
      <div className="appointment-services">
        {formattedServices.map(service => (
          <ServiceChip key={service.id} service={service} />
        ))}
      </div>
      <div className="appointment-staff">{staff.name}</div>
    </div>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数
  return prevProps.appointment.id === nextProps.appointment.id &&
         prevProps.appointment.lastModified === nextProps.appointment.lastModified;
});
```

### 2. CSS パフォーマンス最適化

```css
/* GPU加速を活用したアニメーション */
.smooth-transition {
  /* transform と opacity のみを使用（GPU加速） */
  transform: translateZ(0); /* レイヤー作成を強制 */
  will-change: transform, opacity;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* レイアウト再計算を避ける */
.fade-in {
  opacity: 0;
  transform: translate3d(0, 20px, 0);
  animation: fadeInUp 0.5s ease-out forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

/* contain プロパティでレンダリング最適化 */
.appointment-card {
  contain: layout style paint;
  /* この要素内の変更が外部に影響しないことを保証 */
}

.scrollable-list {
  contain: strict;
  /* 最大の封じ込めレベル */
  height: 100vh;
  overflow-y: auto;
}

/* content-visibility で遅延レンダリング */
.offscreen-content {
  content-visibility: auto;
  contain-intrinsic-size: 0 300px; /* 推定サイズ */
}

/* CSS Grid の最適化 */
.appointment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  /* subgrid 使用可能時の最適化 */
  grid-template-rows: subgrid;
}
```

### 3. 画像最適化戦略

```javascript
// 高度な画像最適化システム
class AdvancedImageOptimizer {
  constructor() {
    this.lazyImages = new Set();
    this.imageCache = new Map();
    this.intersection Observer = this.createIntersectionObserver();
    this.networkQuality = this.detectNetworkQuality();
  }

  // 適応的画像読み込み
  optimizeImage(imageElement, options = {}) {
    const {
      sizes = '(max-width: 768px) 100vw, 50vw',
      quality = 'auto',
      format = 'auto',
      lazy = true
    } = options;

    // ネットワーク品質に基づく品質調整
    const adjustedQuality = this.adjustQualityForNetwork(quality);
    
    // デバイス特性に基づくフォーマット選択
    const optimalFormat = this.selectOptimalFormat(format);
    
    // レスポンシブ画像の生成
    const srcSet = this.generateSrcSet(imageElement.src, {
      quality: adjustedQuality,
      format: optimalFormat
    });

    imageElement.setAttribute('srcset', srcSet);
    imageElement.setAttribute('sizes', sizes);
    
    if (lazy) {
      this.setupLazyLoading(imageElement);
    }
  }

  generateSrcSet(originalSrc, options) {
    const breakpoints = [320, 640, 768, 1024, 1280, 1920];
    const { quality, format } = options;
    
    return breakpoints.map(width => {
      const optimizedUrl = this.buildOptimizedUrl(originalSrc, {
        width,
        quality,
        format
      });
      return `${optimizedUrl} ${width}w`;
    }).join(', ');
  }

  buildOptimizedUrl(src, params) {
    // Cloudinary/ImageKit風のURL生成
    const baseUrl = src.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    const { width, quality, format } = params;
    
    return `${baseUrl}/w_${width},q_${quality},f_${format}.${format}`;
  }

  // ネットワーク品質検出
  detectNetworkQuality() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      // 接続タイプに基づく品質調整
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return 'low';
      } else if (connection.effectiveType === '3g') {
        return 'medium';
      } else {
        return 'high';
      }
    }
    
    return 'medium'; // デフォルト
  }

  adjustQualityForNetwork(baseQuality) {
    const qualityMap = {
      low: { auto: 40, high: 60, medium: 50, low: 30 },
      medium: { auto: 70, high: 80, medium: 70, low: 50 },
      high: { auto: 80, high: 90, medium: 80, low: 60 }
    };
    
    return qualityMap[this.networkQuality][baseQuality] || 70;
  }

  // WebP/AVIF サポート検出
  selectOptimalFormat(preferredFormat) {
    if (preferredFormat !== 'auto') {
      return preferredFormat;
    }
    
    // モダンフォーマットサポートチェック
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    if (canvas.toDataURL('image/avif').startsWith('data:image/avif')) {
      return 'avif';
    } else if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
      return 'webp';
    } else {
      return 'jpg';
    }
  }

  // 高度な遅延読み込み
  setupLazyLoading(imageElement) {
    imageElement.loading = 'lazy'; // ブラウザネイティブサポート
    
    // IntersectionObserver による高度な制御
    this.intersectionObserver.observe(imageElement);
    this.lazyImages.add(imageElement);
    
    // プレースホルダー画像の設定
    this.setPlaceholder(imageElement);
  }

  setPlaceholder(imageElement) {
    // LQIP (Low Quality Image Placeholder) の生成
    const lqip = this.generateLQIP(imageElement.src);
    imageElement.style.backgroundImage = `url(${lqip})`;
    imageElement.style.backgroundSize = 'cover';
    imageElement.style.backgroundPosition = 'center';
  }

  generateLQIP(src) {
    // 極小サイズの画像URL生成（10x10px程度）
    return this.buildOptimizedUrl(src, {
      width: 10,
      quality: 20,
      format: 'jpg'
    });
  }
}
```

---

## 💾 メモリ管理最適化

### 1. メモリリーク対策

```javascript
// メモリ管理システム
class MemoryManager {
  constructor() {
    this.activeObservers = new Set();
    this.activeTimers = new Set();
    this.eventListeners = new Map();
    this.componentCleanup = new WeakMap();
    
    this.setupMemoryMonitoring();
  }

  // メモリ監視
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 80) {
          console.warn('[Memory] High memory usage detected:', usagePercent.toFixed(2) + '%');
          this.performGarbageCollection();
        }
      }, 30000); // 30秒間隔でチェック
    }
  }

  // ガベージコレクション実行
  performGarbageCollection() {
    // WeakMap/WeakSet のクリーンアップ
    this.cleanupWeakReferences();
    
    // 不要なキャッシュをクリア
    this.clearStaleCache();
    
    // DOM参照のクリーンアップ
    this.cleanupDOMReferences();
    
    console.log('[Memory] Garbage collection performed');
  }

  // コンポーネントのメモリ管理
  registerComponent(component) {
    const cleanup = [];
    
    // タイマーの管理
    const originalSetTimeout = component.setTimeout?.bind(component) || setTimeout;
    component.setTimeout = (fn, delay) => {
      const timerId = originalSetTimeout(fn, delay);
      cleanup.push(() => clearTimeout(timerId));
      this.activeTimers.add(timerId);
      return timerId;
    };

    // イベントリスナーの管理
    const originalAddEventListener = component.addEventListener?.bind(component);
    if (originalAddEventListener) {
      component.addEventListener = (event, handler, options) => {
        originalAddEventListener(event, handler, options);
        cleanup.push(() => component.removeEventListener(event, handler, options));
      };
    }

    // Observer の管理
    const originalObserve = component.observe?.bind(component);
    if (originalObserve) {
      component.observe = (target, callback, options) => {
        const observer = originalObserve(target, callback, options);
        cleanup.push(() => observer.disconnect());
        this.activeObservers.add(observer);
        return observer;
      };
    }

    this.componentCleanup.set(component, cleanup);
  }

  // コンポーネントクリーンアップ
  unregisterComponent(component) {
    const cleanup = this.componentCleanup.get(component);
    if (cleanup) {
      cleanup.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (error) {
          console.error('[Memory] Cleanup error:', error);
        }
      });
      this.componentCleanup.delete(component);
    }
  }

  // キャッシュサイズ制限
  createBoundedCache(maxSize = 100) {
    return new class BoundedCache extends Map {
      constructor(maxSize) {
        super();
        this.maxSize = maxSize;
      }

      set(key, value) {
        if (this.size >= this.maxSize) {
          // LRU: 最も古いエントリを削除
          const firstKey = this.keys().next().value;
          this.delete(firstKey);
        }
        return super.set(key, value);
      }
    }(maxSize);
  }
}

// React Hook での使用例
function useMemoryEfficient(data) {
  const [processedData, setProcessedData] = useState(null);
  const processingRef = useRef(false);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    // メモリ効率的な非同期処理
    if (!processingRef.current && data && !cacheRef.current.has(data.id)) {
      processingRef.current = true;
      
      // Web Worker での処理（メインスレッドをブロックしない）
      const worker = new Worker('/workers/data-processor.js');
      
      worker.postMessage({ data });
      
      worker.onmessage = (e) => {
        const result = e.data;
        setProcessedData(result);
        cacheRef.current.set(data.id, result);
        
        // キャッシュサイズ制限
        if (cacheRef.current.size > 50) {
          const firstKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(firstKey);
        }
        
        worker.terminate(); // Workerを終了してメモリを解放
        processingRef.current = false;
      };
    }

    return () => {
      if (processingRef.current) {
        // 処理中の場合はWorkerを終了
        processingRef.current = false;
      }
    };
  }, [data]);

  return processedData;
}
```

### 2. Web Workers 活用

```javascript
// data-processor.js (Web Worker)
class DataProcessor {
  constructor() {
    this.cache = new Map();
  }

  processAppointmentData(appointments) {
    return appointments.map(appointment => {
      // 重い計算処理
      const enrichedData = {
        ...appointment,
        formattedDate: this.formatDate(appointment.date),
        totalDuration: this.calculateTotalDuration(appointment.services),
        priceBreakdown: this.calculatePriceBreakdown(appointment.services),
        recommendations: this.generateRecommendations(appointment)
      };

      return enrichedData;
    });
  }

  // 日付フォーマット処理
  formatDate(dateString) {
    const date = new Date(dateString);
    return {
      display: date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      }),
      iso: date.toISOString(),
      timestamp: date.getTime()
    };
  }

  // サービス時間計算
  calculateTotalDuration(services) {
    return services.reduce((total, service) => {
      return total + (service.duration || 0);
    }, 0);
  }

  // 料金計算
  calculatePriceBreakdown(services) {
    const breakdown = {
      subtotal: 0,
      tax: 0,
      discounts: 0,
      total: 0
    };

    services.forEach(service => {
      breakdown.subtotal += service.price;
      
      if (service.discount) {
        breakdown.discounts += service.discount;
      }
    });

    breakdown.tax = Math.floor(breakdown.subtotal * 0.1);
    breakdown.total = breakdown.subtotal + breakdown.tax - breakdown.discounts;

    return breakdown;
  }
}

// Worker メッセージハンドリング
const processor = new DataProcessor();

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'processAppointments':
        result = processor.processAppointmentData(data);
        break;
      case 'calculateStats':
        result = processor.calculateStats(data);
        break;
      default:
        throw new Error(`Unknown processing type: ${type}`);
    }

    self.postMessage({
      success: true,
      result,
      processingTime: performance.now() - startTime
    });
    
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
```

---

## 📊 パフォーマンス監視・分析

### 1. リアルタイム監視システム

```javascript
// パフォーマンス監視ダッシュボード
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      navigation: [],
      resources: [],
      userInteractions: [],
      errors: []
    };
    
    this.thresholds = {
      lcp: 1200, // ms
      fid: 50,   // ms
      cls: 0.05,
      ttfb: 200  // ms
    };

    this.setupObservers();
  }

  setupObservers() {
    // Performance Observer の設定
    if ('PerformanceObserver' in window) {
      // Navigation timing
      new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordNavigationMetric(entry);
        });
      }).observe({ entryTypes: ['navigation'] });

      // Resource timing
      new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordResourceMetric(entry);
        });
      }).observe({ entryTypes: ['resource'] });

      // User interaction timing
      new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordInteractionMetric(entry);
        });
      }).observe({ entryTypes: ['event'] });

      // Layout shift
      new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordLayoutShift(entry);
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }

    // Web Vitals 監視
    this.setupWebVitalsMonitoring();
  }

  setupWebVitalsMonitoring() {
    // LCP (Largest Contentful Paint)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      const lcp = lastEntry.startTime;
      this.recordWebVital('LCP', lcp, lcp > this.thresholds.lcp);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay)
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach(entry => {
        if (entry.name === 'first-input') {
          const fid = entry.processingStart - entry.startTime;
          this.recordWebVital('FID', fid, fid > this.thresholds.fid);
        }
      });
    }).observe({ entryTypes: ['event'] });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      this.recordWebVital('CLS', clsValue, clsValue > this.thresholds.cls);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  recordWebVital(name, value, isOverThreshold) {
    const metric = {
      name,
      value,
      isOverThreshold,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.metrics.webVitals = this.metrics.webVitals || [];
    this.metrics.webVitals.push(metric);

    // 閾値超過時のアラート
    if (isOverThreshold) {
      this.sendAlert(metric);
    }

    // サーバーに送信（バッチ処理）
    this.queueMetricForUpload(metric);
  }

  // パフォーマンス問題の自動検出
  detectPerformanceIssues() {
    const issues = [];
    const recent = this.getRecentMetrics(5 * 60 * 1000); // 直近5分

    // レンダリングブロッキング検出
    const blockingResources = recent.resources.filter(r => 
      r.renderBlockingStatus === 'blocking' && r.duration > 100
    );
    
    if (blockingResources.length > 0) {
      issues.push({
        type: 'render_blocking',
        severity: 'high',
        resources: blockingResources,
        recommendation: 'リソースの最適化または非同期読み込みを検討'
      });
    }

    // メモリリーク検出
    if ('memory' in performance) {
      const memoryTrend = this.analyzeMemoryTrend();
      if (memoryTrend.isIncreasing && memoryTrend.rate > 1048576) { // 1MB/min
        issues.push({
          type: 'memory_leak',
          severity: 'medium',
          trend: memoryTrend,
          recommendation: 'メモリリークの可能性があります'
        });
      }
    }

    return issues;
  }

  // パフォーマンスレポート生成
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      webVitals: this.calculateWebVitalsAverages(),
      resourceAnalysis: this.analyzeResourcePerformance(),
      userExperience: this.analyzeUserExperience(),
      issues: this.detectPerformanceIssues(),
      recommendations: []
    };

    // 推奨事項の生成
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  generateRecommendations(report) {
    const recommendations = [];

    // LCP が遅い場合
    if (report.webVitals.LCP > this.thresholds.lcp) {
      recommendations.push({
        metric: 'LCP',
        issue: 'Largest Contentful Paint が遅い',
        solutions: [
          'クリティカルリソースのプリロード',
          '画像の最適化',
          'サーバーレスポンス時間の改善'
        ]
      });
    }

    // FID が遅い場合
    if (report.webVitals.FID > this.thresholds.fid) {
      recommendations.push({
        metric: 'FID',
        issue: 'First Input Delay が長い',
        solutions: [
          'JavaScriptの実行時間短縮',
          'Web Workers の活用',
          'コードスプリッティング'
        ]
      });
    }

    // CLS が高い場合
    if (report.webVitals.CLS > this.thresholds.cls) {
      recommendations.push({
        metric: 'CLS',
        issue: 'Cumulative Layout Shift が大きい',
        solutions: [
          '画像・動画のサイズ指定',
          'フォント読み込みの最適化',
          '動的コンテンツの事前領域確保'
        ]
      });
    }

    return recommendations;
  }
}

// 使用例
const performanceMonitor = new PerformanceMonitor();

// 定期レポート生成
setInterval(() => {
  const report = performanceMonitor.generatePerformanceReport();
  
  // 開発環境ではコンソールに表示
  if (process.env.NODE_ENV === 'development') {
    console.table(report.webVitals);
    console.log('Performance Issues:', report.issues);
  }
  
  // 本番環境では分析サーバーに送信
  if (process.env.NODE_ENV === 'production') {
    analytics.track('performance_report', report);
  }
}, 5 * 60 * 1000); // 5分間隔
```

### 2. A/B テスト用パフォーマンス比較

```javascript
// パフォーマンスA/Bテスト
class PerformanceABTest {
  constructor() {
    this.variants = new Map();
    this.currentVariant = null;
    this.metrics = new Map();
  }

  // バリアント定義
  defineVariants(testId, variants) {
    this.variants.set(testId, {
      id: testId,
      variants: variants.map(v => ({
        ...v,
        metrics: {
          lcp: [],
          fid: [],
          cls: [],
          customMetrics: []
        }
      }))
    });
  }

  // ユーザーへのバリアント割り当て
  assignVariant(testId, userId) {
    const test = this.variants.get(testId);
    if (!test) return null;

    // ハッシュベースの一貫した割り当て
    const hash = this.hashString(userId + testId);
    const variantIndex = hash % test.variants.length;
    
    this.currentVariant = test.variants[variantIndex];
    return this.currentVariant;
  }

  // パフォーマンスメトリクスの記録
  recordMetric(metricName, value) {
    if (!this.currentVariant) return;

    this.currentVariant.metrics[metricName] = 
      this.currentVariant.metrics[metricName] || [];
    
    this.currentVariant.metrics[metricName].push({
      value,
      timestamp: Date.now(),
      url: location.pathname,
      userAgent: navigator.userAgent
    });
  }

  // A/Bテスト結果の分析
  analyzeTest(testId) {
    const test = this.variants.get(testId);
    if (!test) return null;

    const analysis = {
      testId,
      variants: test.variants.map(variant => ({
        id: variant.id,
        name: variant.name,
        sampleSize: this.calculateSampleSize(variant),
        metrics: {
          lcp: this.calculateStats(variant.metrics.lcp),
          fid: this.calculateStats(variant.metrics.fid),
          cls: this.calculateStats(variant.metrics.cls)
        }
      }))
    };

    // 統計的有意性の計算
    analysis.significance = this.calculateStatisticalSignificance(analysis);
    
    return analysis;
  }

  calculateStatisticalSignificance(analysis) {
    const { variants } = analysis;
    if (variants.length !== 2) return null;

    const [controlGroup, testGroup] = variants;
    const significance = {};

    ['lcp', 'fid', 'cls'].forEach(metric => {
      const control = controlGroup.metrics[metric];
      const test = testGroup.metrics[metric];
      
      if (control.count > 30 && test.count > 30) {
        const tStat = this.calculateTTest(control, test);
        significance[metric] = {
          tStatistic: tStat,
          pValue: this.calculatePValue(tStat),
          isSignificant: Math.abs(tStat) > 1.96, // 95% 信頼水準
          improvement: ((control.mean - test.mean) / control.mean) * 100
        };
      }
    });

    return significance;
  }
}
```

この包括的なパフォーマンス最適化仕様により、美容室アプリは業界最高水準の速度と応答性を実現し、ユーザーエクスペリエンスを大幅に向上させることができます。