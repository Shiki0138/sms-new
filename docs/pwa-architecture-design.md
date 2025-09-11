# PWA アーキテクチャ設計書

## 🏗️ PWA アーキテクチャ概要

### システム構成図
```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (PWA)                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  App Shell    │  │ Service      │  │  IndexedDB          │   │
│  │  (UI Framework)│  │ Worker       │  │  (Local Storage)    │   │
│  └───────────────┘  └──────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Network Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  REST API     │  │ WebSocket    │  │  Push Notification  │   │
│  │  Client       │  │ Connection   │  │  Service            │   │
│  └───────────────┘  └──────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Backend Services                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  Express.js   │  │ Firebase     │  │  SMS/Push Gateway   │   │
│  │  Server       │  │ Database     │  │  (Twilio/FCM)       │   │
│  └───────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 ディレクトリ構造

```
pwa-salon-app/
├── public/
│   ├── manifest.json          # PWA マニフェスト
│   ├── sw.js                 # Service Worker
│   ├── icons/                # アプリアイコン（各サイズ）
│   └── offline.html          # オフライン時表示ページ
├── src/
│   ├── components/           # UIコンポーネント
│   │   ├── common/          # 汎用コンポーネント
│   │   ├── booking/         # 予約関連
│   │   ├── profile/         # プロフィール関連
│   │   └── navigation/      # ナビゲーション
│   ├── pages/               # ページコンポーネント
│   │   ├── Home.jsx
│   │   ├── Booking.jsx
│   │   ├── History.jsx
│   │   └── Profile.jsx
│   ├── hooks/               # カスタムフック
│   │   ├── useAuth.js
│   │   ├── useOfflineSync.js
│   │   ├── usePushNotification.js
│   │   └── useLocalStorage.js
│   ├── services/            # API・サービス層
│   │   ├── api.js           # API client
│   │   ├── storage.js       # ローカルストレージ
│   │   ├── notifications.js # 通知サービス
│   │   └── sync.js          # データ同期
│   ├── utils/               # ユーティリティ
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── styles/              # スタイル
│   │   ├── globals.css
│   │   ├── components/
│   │   └── pages/
│   ├── App.jsx              # メインアプリコンポーネント
│   └── index.js             # エントリーポイント
├── package.json
├── vite.config.js           # Vite設定
└── vercel.json              # Vercel設定
```

---

## 📄 PWA マニフェスト

```json
// public/manifest.json
{
  "name": "Salon Lumière - 美容室予約アプリ",
  "short_name": "SalonLumiere",
  "description": "美容室Salon Lumièreの公式予約アプリ",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#d4a574",
  "background_color": "#ffffff",
  "lang": "ja",
  "categories": ["lifestyle", "beauty"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png", 
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128", 
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png", 
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384", 
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "新しい予約",
      "short_name": "予約",
      "description": "新しい予約を作成",
      "url": "/booking",
      "icons": [
        {
          "src": "/icons/shortcut-booking.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "予約履歴",
      "short_name": "履歴", 
      "description": "過去の予約を確認",
      "url": "/history",
      "icons": [
        {
          "src": "/icons/shortcut-history.png",
          "sizes": "96x96"
        }
      ]
    }
  ],
  "prefer_related_applications": false,
  "related_applications": []
}
```

---

## 🔧 Service Worker 実装

```javascript
// public/sw.js
const CACHE_NAME = 'salon-lumiere-v1.2.0';
const OFFLINE_URL = '/offline.html';

// キャッシュするリソース
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // CSS・JSファイルは動的に追加
];

// API エンドポイント
const API_CACHE_URLS = [
  '/api/profile',
  '/api/appointments',
  '/api/services'
];

// インストールイベント
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// アクティベーションイベント
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// フェッチイベント（ネットワークリクエスト処理）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API リクエストの処理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 静的リソースの処理
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// API リクエスト処理（Network First戦略）
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // ネットワークから取得を試行
    const response = await fetch(request);
    
    if (response.ok) {
      // 成功時はキャッシュを更新
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, serving from cache:', request.url);
    
    // ネットワーク失敗時はキャッシュから返す
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // キャッシュにもない場合はオフライン応答
    return new Response(
      JSON.stringify({ 
        error: 'オフラインのため、データを取得できません',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 静的リソース処理（Cache First戦略）
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // バックグラウンドでネットワークから更新
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // ネットワークエラーは無視
    });
    
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // HTMLページのリクエストでオフラインの場合
    if (request.headers.get('accept')?.includes('text/html')) {
      return cache.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

// プッシュ通知イベント
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: '新しい通知があります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: '確認',
        icon: '/icons/action-view.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/action-close.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.title = payload.title || 'Salon Lumière';
    options.body = payload.body || options.body;
    options.icon = payload.icon || options.icon;
    options.data = { ...options.data, ...payload.data };
  }

  event.waitUntil(
    self.registration.showNotification('Salon Lumière', options)
  );
});

// 通知クリックイベント
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'view') {
    event.waitUntil(
      clients.openWindow(data.url || '/')
    );
  }
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'appointment-sync') {
    event.waitUntil(syncAppointments());
  }
  
  if (event.tag === 'profile-sync') {
    event.waitUntil(syncProfile());
  }
});

// 予約データの同期
async function syncAppointments() {
  try {
    // IndexedDBから未同期データを取得
    const pendingAppointments = await getPendingAppointments();
    
    for (const appointment of pendingAppointments) {
      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appointment.token}`
          },
          body: JSON.stringify(appointment.data)
        });
        
        if (response.ok) {
          await removePendingAppointment(appointment.id);
          console.log('[SW] Appointment synced:', appointment.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync appointment:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// プロフィールデータの同期
async function syncProfile() {
  try {
    // 実装詳細
    console.log('[SW] Profile sync completed');
  } catch (error) {
    console.error('[SW] Profile sync failed:', error);
  }
}

// IndexedDB操作ヘルパー（実装詳細は別ファイル）
function getPendingAppointments() {
  // IndexedDBから取得
  return Promise.resolve([]);
}

function removePendingAppointment(id) {
  // IndexedDBから削除
  return Promise.resolve();
}
```

---

## 💾 ローカルストレージ戦略

### IndexedDB 設計

```javascript
// src/services/storage.js
import { openDB } from 'idb';

const DB_NAME = 'SalonLumiereDB';
const DB_VERSION = 1;

// データベーススキーマ
const STORES = {
  appointments: {
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'appointmentDate' },
      { name: 'status', keyPath: 'status' },
      { name: 'userId', keyPath: 'userId' }
    ]
  },
  profile: {
    keyPath: 'userId'
  },
  services: {
    keyPath: 'id',
    indexes: [
      { name: 'category', keyPath: 'category' },
      { name: 'active', keyPath: 'active' }
    ]
  },
  syncQueue: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'type', keyPath: 'type' },
      { name: 'timestamp', keyPath: 'timestamp' }
    ]
  },
  settings: {
    keyPath: 'key'
  }
};

// データベース初期化
async function initDB() {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading DB from ${oldVersion} to ${newVersion}`);
      
      // 各ストアの作成
      Object.entries(STORES).forEach(([storeName, config]) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: config.keyPath,
            autoIncrement: config.autoIncrement || false
          });
          
          // インデックスの作成
          if (config.indexes) {
            config.indexes.forEach(({ name, keyPath, unique = false }) => {
              store.createIndex(name, keyPath, { unique });
            });
          }
        }
      });
    }
  });
}

// データアクセス層
class StorageService {
  constructor() {
    this.db = null;
    this.init();
  }

  async init() {
    this.db = await initDB();
  }

  // 予約データの操作
  async saveAppointment(appointment) {
    const tx = this.db.transaction('appointments', 'readwrite');
    await tx.objectStore('appointments').put({
      ...appointment,
      lastUpdated: new Date().toISOString(),
      synced: false
    });
    await tx.done;
  }

  async getAppointments(userId, limit = 50) {
    const tx = this.db.transaction('appointments', 'readonly');
    const store = tx.objectStore('appointments');
    const index = store.index('userId');
    
    const appointments = await index.getAll(userId);
    
    return appointments
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
      .slice(0, limit);
  }

  async getUpcomingAppointments(userId) {
    const now = new Date().toISOString();
    const appointments = await this.getAppointments(userId);
    
    return appointments.filter(apt => 
      apt.appointmentDate >= now && 
      apt.status !== 'cancelled'
    );
  }

  // プロフィールデータの操作
  async saveProfile(profile) {
    const tx = this.db.transaction('profile', 'readwrite');
    await tx.objectStore('profile').put({
      ...profile,
      lastUpdated: new Date().toISOString()
    });
    await tx.done;
  }

  async getProfile(userId) {
    const tx = this.db.transaction('profile', 'readonly');
    return await tx.objectStore('profile').get(userId);
  }

  // 同期キューの操作
  async addToSyncQueue(type, data, userId) {
    const tx = this.db.transaction('syncQueue', 'readwrite');
    await tx.objectStore('syncQueue').add({
      type,
      data,
      userId,
      timestamp: new Date().toISOString(),
      attempts: 0
    });
    await tx.done;
  }

  async getSyncQueue() {
    const tx = this.db.transaction('syncQueue', 'readonly');
    return await tx.objectStore('syncQueue').getAll();
  }

  async removeSyncQueueItem(id) {
    const tx = this.db.transaction('syncQueue', 'readwrite');
    await tx.objectStore('syncQueue').delete(id);
    await tx.done;
  }

  // 設定の操作
  async saveSetting(key, value) {
    const tx = this.db.transaction('settings', 'readwrite');
    await tx.objectStore('settings').put({ key, value });
    await tx.done;
  }

  async getSetting(key, defaultValue = null) {
    const tx = this.db.transaction('settings', 'readonly');
    const result = await tx.objectStore('settings').get(key);
    return result ? result.value : defaultValue;
  }

  // データクリアランス（ログアウト時など）
  async clearUserData(userId) {
    const tx = this.db.transaction(['appointments', 'profile', 'syncQueue'], 'readwrite');
    
    // 予約データの削除
    const appointmentStore = tx.objectStore('appointments');
    const appointmentIndex = appointmentStore.index('userId');
    const appointments = await appointmentIndex.getAllKeys(userId);
    await Promise.all(appointments.map(key => appointmentStore.delete(key)));
    
    // プロフィールデータの削除
    await tx.objectStore('profile').delete(userId);
    
    // 同期キューの削除
    const syncStore = tx.objectStore('syncQueue');
    const syncIndex = syncStore.index('userId');  
    const syncItems = await syncIndex.getAllKeys(userId);
    await Promise.all(syncItems.map(key => syncStore.delete(key)));
    
    await tx.done;
  }

  // ストレージ使用量の確認
  async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    }
    return null;
  }
}

export const storageService = new StorageService();
```

---

## 🔄 オフライン同期システム

```javascript
// src/services/sync.js
import { storageService } from './storage.js';
import { apiClient } from './api.js';

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.registerEventListeners();
    this.schedulePeriodicSync();
  }

  registerEventListeners() {
    // ネットワーク状態の監視
    window.addEventListener('online', () => {
      console.log('[Sync] Back online');
      this.isOnline = true;
      this.performSync();
    });

    window.addEventListener('offline', () => {
      console.log('[Sync] Gone offline');
      this.isOnline = false;
    });

    // バックグラウンド同期の登録
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        this.swRegistration = registration;
      });
    }

    // ページの可視性変更
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.performSync();
      }
    });
  }

  // 定期同期のスケジューリング
  schedulePeriodicSync() {
    setInterval(() => {
      if (this.isOnline && !document.hidden) {
        this.performSync();
      }
    }, 5 * 60 * 1000); // 5分間隔
  }

  // 同期実行
  async performSync() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log('[Sync] Starting sync...');

    try {
      // 1. アップロード同期（ローカル→サーバー）
      await this.syncUploads();
      
      // 2. ダウンロード同期（サーバー→ローカル）
      await this.syncDownloads();
      
      // 3. 最終同期時刻の更新
      await storageService.saveSetting('lastSyncTime', new Date().toISOString());
      
      console.log('[Sync] Sync completed successfully');
      this.dispatchSyncEvent('success');
      
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
      this.dispatchSyncEvent('error', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // アップロード同期
  async syncUploads() {
    const syncQueue = await storageService.getSyncQueue();
    
    for (const item of syncQueue) {
      try {
        let result;
        
        switch (item.type) {
          case 'appointment_create':
            result = await apiClient.post('/appointments', item.data);
            break;
          case 'appointment_update':
            result = await apiClient.put(`/appointments/${item.data.id}`, item.data);
            break;
          case 'appointment_cancel':
            result = await apiClient.delete(`/appointments/${item.data.id}`);
            break;
          case 'profile_update':
            result = await apiClient.put('/profile', item.data);
            break;
          default:
            console.warn('[Sync] Unknown sync type:', item.type);
            continue;
        }

        if (result.ok) {
          await storageService.removeSyncQueueItem(item.id);
          console.log(`[Sync] Synced ${item.type}:`, item.id);
        }
        
      } catch (error) {
        console.error(`[Sync] Failed to sync ${item.type}:`, error);
        
        // リトライ回数を増やす
        item.attempts = (item.attempts || 0) + 1;
        
        // 最大リトライ回数に達した場合は削除
        if (item.attempts >= 3) {
          await storageService.removeSyncQueueItem(item.id);
          console.warn('[Sync] Max retries reached, removing item:', item.id);
        }
      }
    }
  }

  // ダウンロード同期
  async syncDownloads() {
    const userId = await storageService.getSetting('userId');
    if (!userId) return;

    const lastSyncTime = await storageService.getSetting('lastSyncTime');
    
    try {
      // 予約データの同期
      const appointmentsResponse = await apiClient.get(`/appointments`, {
        params: { 
          userId,
          since: lastSyncTime 
        }
      });
      
      if (appointmentsResponse.ok) {
        const appointments = await appointmentsResponse.json();
        for (const appointment of appointments) {
          await storageService.saveAppointment({
            ...appointment,
            synced: true
          });
        }
      }

      // プロフィール同期
      const profileResponse = await apiClient.get('/profile');
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        await storageService.saveProfile(profile);
      }

      // サービス情報の同期
      const servicesResponse = await apiClient.get('/services');
      if (servicesResponse.ok) {
        const services = await servicesResponse.json();
        // サービス情報をストレージに保存
        for (const service of services) {
          await this.saveServiceToStorage(service);
        }
      }

    } catch (error) {
      console.error('[Sync] Download sync failed:', error);
      throw error;
    }
  }

  // バックグラウンド同期の登録
  async registerBackgroundSync(tag = 'appointment-sync') {
    if (this.swRegistration) {
      try {
        await this.swRegistration.sync.register(tag);
        console.log('[Sync] Background sync registered:', tag);
      } catch (error) {
        console.error('[Sync] Background sync registration failed:', error);
      }
    }
  }

  // オフライン操作の保存
  async saveOfflineAction(type, data) {
    const userId = await storageService.getSetting('userId');
    await storageService.addToSyncQueue(type, data, userId);
    
    // バックグラウンド同期を試行
    await this.registerBackgroundSync();
    
    console.log('[Sync] Offline action saved:', type);
  }

  // 同期イベントの配信
  dispatchSyncEvent(type, detail = null) {
    const event = new CustomEvent(`sync-${type}`, {
      detail: {
        timestamp: new Date().toISOString(),
        ...detail
      }
    });
    window.dispatchEvent(event);
  }

  // 同期状態の取得
  async getSyncStatus() {
    const lastSyncTime = await storageService.getSetting('lastSyncTime');
    const syncQueue = await storageService.getSyncQueue();
    
    return {
      lastSyncTime,
      pendingItems: syncQueue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }
}

export const syncService = new SyncService();
```

---

## 📲 プッシュ通知実装

```javascript
// src/services/notifications.js
class NotificationService {
  constructor() {
    this.permission = Notification.permission;
    this.vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // 環境変数から取得
  }

  // 通知許可の要求
  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        await this.subscribeToPush();
      }
      
      return permission;
    }
    return 'unsupported';
  }

  // プッシュ通知の購読
  async subscribeToPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });

        // サーバーに購読情報を送信
        await this.sendSubscriptionToServer(subscription);
        
        return subscription;
      } catch (error) {
        console.error('[Notification] Push subscription failed:', error);
        throw error;
      }
    }
  }

  // ローカル通知の表示
  async showLocalNotification(title, options = {}) {
    if (this.permission === 'granted') {
      const defaultOptions = {
        body: '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        requireInteraction: false,
        silent: false,
        ...options
      };

      return new Notification(title, defaultOptions);
    }
  }

  // 予約リマインダー通知のスケジュール
  async scheduleAppointmentReminder(appointment) {
    const reminderTime = new Date(appointment.appointmentDate);
    reminderTime.setHours(reminderTime.getHours() - 24); // 24時間前

    const now = new Date();
    const delay = reminderTime.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        this.showLocalNotification('予約リマインダー', {
          body: `明日 ${appointment.startTime} からご予約があります`,
          tag: `reminder-${appointment.id}`,
          data: {
            type: 'reminder',
            appointmentId: appointment.id,
            url: '/appointments'
          },
          actions: [
            {
              action: 'view',
              title: '詳細を見る'
            },
            {
              action: 'reschedule',
              title: '変更する'
            }
          ]
        });
      }, delay);
    }
  }

  // バッジカウントの更新
  async updateBadge(count = 0) {
    if ('setAppBadge' in navigator) {
      try {
        if (count > 0) {
          await navigator.setAppBadge(count);
        } else {
          await navigator.clearAppBadge();
        }
      } catch (error) {
        console.error('[Notification] Badge update failed:', error);
      }
    }
  }

  // サーバーに購読情報を送信
  async sendSubscriptionToServer(subscription) {
    const response = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        subscription,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }
  }

  // VAPID キーの変換
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

export const notificationService = new NotificationService();
```

---

## ⚡ パフォーマンス最適化

### Vite設定

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30日
              }
            }
          }
        ]
      },
      manifest: {
        // manifest.jsonの内容をここに配置
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['date-fns', 'framer-motion'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

この PWA アーキテクチャ設計により、オフライン対応、プッシュ通知、高速読み込みを実現した美容室顧客向けアプリを構築できます。