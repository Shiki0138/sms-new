# オフラインファースト データ管理戦略

## 🔄 オフラインファースト設計理念

### 設計原則
```
1️⃣ Local First - ローカルデータを第一優先
   ├── 即座にレスポンス
   ├── ネットワーク状態に依存しない
   └── ユーザーエクスペリエンスの一貫性

2️⃣ Sync When Connected - 接続時に同期
   ├── バックグラウンド同期
   ├── 衝突検出・解決
   └── 差分同期による効率化

3️⃣ Conflict Resolution - 競合解決戦略
   ├── 最終更新時刻ベース
   ├── ユーザー選択による解決
   └── サーバー権威モデル
```

---

## 💾 データ階層設計

### ストレージ階層
```
┌─────────────────────────────────────┐
│             Memory Cache            │ ← 最高速アクセス
├─────────────────────────────────────┤
│            IndexedDB               │ ← メインストレージ
├─────────────────────────────────────┤
│           Web Storage              │ ← 設定・軽量データ
├─────────────────────────────────────┤
│         Service Worker             │ ← キャッシュ管理
└─────────────────────────────────────┘
```

### データカテゴリー分類

| カテゴリー | ストレージ | TTL | 同期頻度 | 競合解決 |
|-----------|-----------|-----|---------|----------|
| 🔐 認証情報 | Secure Storage | 24h | 即座 | Server Win |
| 👤 プロフィール | IndexedDB | - | リアルタイム | User Choice |
| 📅 予約データ | IndexedDB | - | リアルタイム | Timestamp |
| 🎯 設定・好み | LocalStorage | - | 日次 | Client Win |
| 📊 キャッシュ | Memory + SW | 1h | 必要時 | Server Win |
| 📱 UI状態 | SessionStorage | Session | なし | Client Win |

---

## 🗃️ IndexedDB スキーマ設計

### 1. メインデータベース構造

```javascript
// データベーススキーマ定義
const DB_SCHEMA = {
  name: 'SalonLumiereDB',
  version: 3,
  stores: {
    // ユーザープロフィール
    profiles: {
      keyPath: 'userId',
      autoIncrement: false,
      indexes: [
        { name: 'email', keyPath: 'email', unique: true },
        { name: 'phoneNumber', keyPath: 'phoneNumber', unique: true },
        { name: 'lastModified', keyPath: 'lastModified' }
      ]
    },

    // 予約データ
    appointments: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'userId', keyPath: 'userId' },
        { name: 'appointmentDate', keyPath: 'appointmentDate' },
        { name: 'status', keyPath: 'status' },
        { name: 'lastModified', keyPath: 'lastModified' },
        { name: 'syncStatus', keyPath: 'syncStatus' }
      ]
    },

    // サービス情報（参照データ）
    services: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'category', keyPath: 'category' },
        { name: 'active', keyPath: 'active' },
        { name: 'lastUpdated', keyPath: 'lastUpdated' }
      ]
    },

    // スタッフ情報（参照データ）
    staff: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'active', keyPath: 'active' },
        { name: 'specialties', keyPath: 'specialties', multiEntry: true }
      ]
    },

    // 同期キュー
    syncQueue: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'type', keyPath: 'type' },
        { name: 'priority', keyPath: 'priority' },
        { name: 'createdAt', keyPath: 'createdAt' },
        { name: 'retryCount', keyPath: 'retryCount' }
      ]
    },

    // 競合解決データ
    conflicts: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'entityType', keyPath: 'entityType' },
        { name: 'entityId', keyPath: 'entityId' },
        { name: 'createdAt', keyPath: 'createdAt' }
      ]
    },

    // メタデータ・設定
    metadata: {
      keyPath: 'key',
      autoIncrement: false
    }
  }
};
```

### 2. データアクセス層実装

```javascript
// 統合データアクセス層
class OfflineDataManager {
  constructor() {
    this.db = null;
    this.memoryCache = new Map();
    this.cacheExpiry = new Map();
    this.syncInProgress = new Set();
    this.conflictHandlers = new Map();
    
    this.initializeDatabase();
    this.setupConflictResolvers();
  }

  async initializeDatabase() {
    this.db = await openDB(DB_SCHEMA.name, DB_SCHEMA.version, {
      upgrade: this.handleDatabaseUpgrade.bind(this)
    });
  }

  // データ取得（キャッシュファースト）
  async getData(storeName, key, options = {}) {
    const { useCache = true, forceFresh = false } = options;
    const cacheKey = `${storeName}:${key}`;

    // メモリキャッシュから取得
    if (useCache && !forceFresh && this.isValidCache(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    // IndexedDBから取得
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const data = await store.get(key);

    // キャッシュに保存
    if (data && useCache) {
      this.setCache(cacheKey, data);
    }

    return data;
  }

  // データ保存（楽観的更新）
  async saveData(storeName, data, options = {}) {
    const { 
      sync = true, 
      optimistic = true,
      conflictResolution = 'timestamp' 
    } = options;

    // 楽観的更新：即座にローカル保存
    if (optimistic) {
      await this.saveToLocal(storeName, data);
      
      // UIに反映（即座にレスポンス）
      this.notifyDataChange(storeName, data);
    }

    // 同期キューに追加
    if (sync) {
      await this.addToSyncQueue({
        operation: 'update',
        storeName,
        data,
        conflictResolution,
        createdAt: new Date().toISOString(),
        retryCount: 0
      });
    }

    return data;
  }

  // ローカル保存
  async saveToLocal(storeName, data) {
    const enrichedData = {
      ...data,
      lastModified: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.put(enrichedData);
    await tx.done;

    // メモリキャッシュも更新
    const cacheKey = `${storeName}:${data.id || data[store.keyPath]}`;
    this.setCache(cacheKey, enrichedData);
  }

  // 削除処理（論理削除）
  async deleteData(storeName, key, options = {}) {
    const { hardDelete = false, sync = true } = options;

    if (hardDelete) {
      // 物理削除
      const tx = this.db.transaction(storeName, 'readwrite');
      await tx.objectStore(storeName).delete(key);
      this.clearCache(`${storeName}:${key}`);
    } else {
      // 論理削除（削除マーク）
      const data = await this.getData(storeName, key);
      if (data) {
        await this.saveData(storeName, {
          ...data,
          deleted: true,
          deletedAt: new Date().toISOString()
        }, { sync });
      }
    }
  }

  // 複合クエリサポート
  async queryData(storeName, queryOptions = {}) {
    const {
      index,
      range,
      direction = 'next',
      limit,
      filter,
      sortBy
    } = queryOptions;

    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    let cursor;
    if (index) {
      const indexStore = store.index(index);
      cursor = range ? 
        indexStore.openCursor(range, direction) : 
        indexStore.openCursor(null, direction);
    } else {
      cursor = store.openCursor(null, direction);
    }

    const results = [];
    let count = 0;

    await cursor.iterate((cursor, value) => {
      // 削除マークされたデータをスキップ
      if (value.deleted) {
        return;
      }

      // カスタムフィルタ適用
      if (filter && !filter(value)) {
        return;
      }

      results.push(value);
      count++;

      // 制限チェック
      if (limit && count >= limit) {
        return false; // 反復停止
      }
    });

    // ソート処理
    if (sortBy) {
      results.sort((a, b) => {
        const aVal = this.getNestedValue(a, sortBy.field);
        const bVal = this.getNestedValue(b, sortBy.field);
        
        if (sortBy.direction === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }

    return results;
  }

  // メモリキャッシュ管理
  setCache(key, data, ttl = 300000) { // 5分のTTL
    this.memoryCache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  isValidCache(key) {
    if (!this.memoryCache.has(key)) {
      return false;
    }
    
    const expiry = this.cacheExpiry.get(key);
    if (Date.now() > expiry) {
      this.clearCache(key);
      return false;
    }
    
    return true;
  }

  clearCache(key) {
    this.memoryCache.delete(key);
    this.cacheExpiry.delete(key);
  }
}
```

---

## 🔄 データ同期システム

### 1. 同期戦略実装

```javascript
// 高度な同期システム
class AdvancedSyncEngine {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.syncStrategies = new Map();
    this.conflictResolvers = new Map();
    this.syncMetrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      conflicts: 0,
      errors: 0
    };
    
    this.initializeSyncStrategies();
    this.setupPeriodicSync();
  }

  initializeSyncStrategies() {
    // 予約データ同期戦略
    this.syncStrategies.set('appointments', {
      direction: 'bidirectional',
      conflictResolution: 'user_choice',
      batchSize: 10,
      priority: 'high'
    });

    // プロフィールデータ同期戦略
    this.syncStrategies.set('profiles', {
      direction: 'bidirectional', 
      conflictResolution: 'merge',
      batchSize: 5,
      priority: 'medium'
    });

    // 参照データ同期戦略
    this.syncStrategies.set('services', {
      direction: 'server_to_client',
      conflictResolution: 'server_wins',
      batchSize: 50,
      priority: 'low'
    });
  }

  // メインの同期プロセス
  async performSync(options = {}) {
    const { force = false, storeName = null } = options;
    
    if (this.isSyncInProgress() && !force) {
      console.log('[Sync] Sync already in progress, skipping');
      return;
    }

    try {
      this.setSyncStatus('in_progress');
      console.log('[Sync] Starting comprehensive sync...');

      // 1. 接続状態確認
      if (!navigator.onLine) {
        throw new Error('No network connection');
      }

      // 2. サーバー健康状態確認
      await this.checkServerHealth();

      // 3. 同期順序決定（依存関係順）
      const syncOrder = storeName ? [storeName] : this.determineSyncOrder();

      // 4. 各ストアを順次同期
      for (const store of syncOrder) {
        await this.syncStore(store);
      }

      // 5. 競合解決
      await this.resolveConflicts();

      // 6. 同期完了通知
      this.notifySyncComplete();
      
      this.syncMetrics.successfulSyncs++;
      console.log('[Sync] Sync completed successfully');
      
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
      this.syncMetrics.errors++;
      this.handleSyncError(error);
    } finally {
      this.setSyncStatus('idle');
    }
  }

  // ストア別同期実装
  async syncStore(storeName) {
    const strategy = this.syncStrategies.get(storeName);
    if (!strategy) {
      console.warn(`[Sync] No strategy defined for store: ${storeName}`);
      return;
    }

    console.log(`[Sync] Syncing ${storeName}...`);

    switch (strategy.direction) {
      case 'bidirectional':
        await this.bidirectionalSync(storeName, strategy);
        break;
      case 'server_to_client':
        await this.serverToClientSync(storeName, strategy);
        break;
      case 'client_to_server':
        await this.clientToServerSync(storeName, strategy);
        break;
    }
  }

  // 双方向同期
  async bidirectionalSync(storeName, strategy) {
    // 1. ローカル変更をサーバーに送信
    await this.pushLocalChanges(storeName, strategy);
    
    // 2. サーバーから変更を取得
    await this.pullServerChanges(storeName, strategy);
  }

  // ローカル変更のプッシュ
  async pushLocalChanges(storeName, strategy) {
    const pendingChanges = await this.dataManager.queryData('syncQueue', {
      index: 'type',
      range: IDBKeyRange.only(storeName),
      filter: (item) => item.retryCount < 3
    });

    const batches = this.createBatches(pendingChanges, strategy.batchSize);

    for (const batch of batches) {
      try {
        const response = await this.sendBatchToServer(batch);
        
        if (response.ok) {
          await this.markSyncItemsAsCompleted(batch);
        } else if (response.status === 409) {
          // 競合検出
          await this.handleConflictResponse(response, batch);
        }
      } catch (error) {
        await this.incrementRetryCount(batch);
        console.error('[Sync] Batch sync failed:', error);
      }
    }
  }

  // サーバー変更のプル
  async pullServerChanges(storeName, strategy) {
    const lastSync = await this.dataManager.getData('metadata', `lastSync:${storeName}`);
    const since = lastSync?.timestamp || new Date(0).toISOString();

    const response = await fetch(`/api/${storeName}/changes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'If-Modified-Since': since
      }
    });

    if (response.ok) {
      const changes = await response.json();
      
      for (const change of changes) {
        await this.applyServerChange(storeName, change, strategy);
      }

      // 最後の同期時刻を更新
      await this.dataManager.saveData('metadata', {
        key: `lastSync:${storeName}`,
        timestamp: new Date().toISOString()
      }, { sync: false });
    }
  }

  // サーバー変更の適用
  async applyServerChange(storeName, change, strategy) {
    const existing = await this.dataManager.getData(storeName, change.id);
    
    if (!existing) {
      // 新規データ
      await this.dataManager.saveToLocal(storeName, {
        ...change,
        syncStatus: 'synced'
      });
    } else {
      // 競合チェック
      if (this.hasConflict(existing, change)) {
        await this.recordConflict(storeName, existing, change, strategy);
      } else {
        // 競合なし、サーバーバージョンで更新
        await this.dataManager.saveToLocal(storeName, {
          ...change,
          syncStatus: 'synced'
        });
      }
    }
  }

  // 競合検出
  hasConflict(local, server) {
    // 両方とも未同期の場合は競合
    if (local.syncStatus === 'pending' && server.lastModified) {
      const localTime = new Date(local.lastModified).getTime();
      const serverTime = new Date(server.lastModified).getTime();
      
      // 5秒以内の差は同じタイミングの更新とみなす
      return Math.abs(localTime - serverTime) > 5000;
    }
    
    return false;
  }

  // 競合記録
  async recordConflict(storeName, localData, serverData, strategy) {
    const conflict = {
      id: this.generateConflictId(),
      entityType: storeName,
      entityId: localData.id,
      localData,
      serverData,
      strategy: strategy.conflictResolution,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    await this.dataManager.saveToLocal('conflicts', conflict);
    this.syncMetrics.conflicts++;
    
    console.log(`[Sync] Conflict recorded for ${storeName}:${localData.id}`);
  }
}
```

### 2. 競合解決システム

```javascript
// 競合解決エンジン
class ConflictResolutionEngine {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.resolvers = new Map();
    this.setupDefaultResolvers();
  }

  setupDefaultResolvers() {
    // タイムスタンプベース解決
    this.resolvers.set('timestamp', (local, server) => {
      const localTime = new Date(local.lastModified).getTime();
      const serverTime = new Date(server.lastModified).getTime();
      
      return serverTime > localTime ? server : local;
    });

    // サーバー優先
    this.resolvers.set('server_wins', (local, server) => server);

    // クライアント優先
    this.resolvers.set('client_wins', (local, server) => local);

    // マージ戦略
    this.resolvers.set('merge', (local, server) => {
      return this.mergeObjects(local, server);
    });

    // ユーザー選択（UI表示）
    this.resolvers.set('user_choice', async (local, server) => {
      return await this.showConflictResolutionUI(local, server);
    });
  }

  // 自動競合解決
  async resolveConflict(conflict) {
    const { localData, serverData, strategy } = conflict;
    const resolver = this.resolvers.get(strategy);
    
    if (!resolver) {
      console.error(`[Conflict] Unknown resolution strategy: ${strategy}`);
      return null;
    }

    try {
      const resolved = await resolver(localData, serverData);
      
      // 解決済みデータを保存
      await this.dataManager.saveToLocal(conflict.entityType, {
        ...resolved,
        syncStatus: 'synced',
        resolvedAt: new Date().toISOString()
      });

      // 競合記録を削除
      await this.dataManager.deleteData('conflicts', conflict.id, { 
        hardDelete: true 
      });

      console.log(`[Conflict] Resolved conflict for ${conflict.entityType}:${conflict.entityId}`);
      return resolved;
      
    } catch (error) {
      console.error('[Conflict] Resolution failed:', error);
      return null;
    }
  }

  // オブジェクトマージ
  mergeObjects(local, server) {
    const merged = { ...server };
    
    // 特定フィールドはローカル優先
    const clientPriorityFields = [
      'preferences', 
      'notificationSettings',
      'uiSettings'
    ];
    
    clientPriorityFields.forEach(field => {
      if (local[field] !== undefined) {
        merged[field] = local[field];
      }
    });

    // 配列フィールドはマージ
    const arrayFields = ['tags', 'categories'];
    arrayFields.forEach(field => {
      if (local[field] && server[field]) {
        merged[field] = [...new Set([...server[field], ...local[field]])];
      }
    });

    return merged;
  }

  // 競合解決UI表示
  async showConflictResolutionUI(local, server) {
    return new Promise((resolve) => {
      const modal = this.createConflictModal(local, server);
      modal.onResolve = resolve;
      modal.show();
    });
  }

  createConflictModal(local, server) {
    // React/Vueコンポーネントとして実装
    return {
      show: () => {
        // モーダル表示ロジック
        console.log('[Conflict] Showing resolution UI');
      },
      onResolve: null
    };
  }
}
```

---

## 📊 同期状態管理・監視

### 1. 同期状態トラッキング

```javascript
// 同期状態管理システム
class SyncStateManager {
  constructor() {
    this.state = {
      status: 'idle', // idle, syncing, error
      progress: 0,
      currentStore: null,
      lastSync: null,
      errors: [],
      conflicts: []
    };
    
    this.listeners = new Set();
    this.setupConnectionMonitoring();
  }

  // 接続状態監視
  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      this.updateState({ networkStatus: 'online' });
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.updateState({ networkStatus: 'offline' });
    });

    // 接続品質監視
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.updateState({
          connectionType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink
        });
      });
    }
  }

  // 状態更新
  updateState(updates) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // リスナーに通知
    this.listeners.forEach(listener => {
      listener(this.state, prevState);
    });
  }

  // 状態監視リスナー登録
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 同期進捗更新
  updateSyncProgress(current, total, storeName) {
    const progress = total > 0 ? Math.round((current / total) * 100) : 0;
    
    this.updateState({
      progress,
      currentStore: storeName,
      status: 'syncing'
    });
  }

  // エラー記録
  recordError(error, context) {
    const errorRecord = {
      id: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    this.updateState({
      errors: [...this.state.errors, errorRecord].slice(-10) // 最新10件のみ保持
    });
  }

  // 同期完了
  markSyncComplete() {
    this.updateState({
      status: 'idle',
      progress: 100,
      currentStore: null,
      lastSync: new Date().toISOString()
    });
  }
}
```

### 2. パフォーマンス監視

```javascript
// 同期パフォーマンス監視
class SyncPerformanceMonitor {
  constructor() {
    this.metrics = {
      syncTimes: [],
      dataTransferred: [],
      errorRates: [],
      conflictRates: []
    };
  }

  // 同期パフォーマンス測定開始
  startSyncMeasurement(syncId) {
    const measurement = {
      id: syncId,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      networkStart: navigator.onLine ? performance.now() : null
    };

    this.activeMeasurements.set(syncId, measurement);
  }

  // 同期パフォーマンス測定終了
  endSyncMeasurement(syncId, results) {
    const measurement = this.activeMeasurements.get(syncId);
    if (!measurement) return;

    const endTime = performance.now();
    const duration = endTime - measurement.startTime;
    const memoryDelta = this.getMemoryUsage() - measurement.startMemory;

    const performanceData = {
      syncId,
      duration,
      memoryDelta,
      itemsSynced: results.itemsSynced,
      bytesTransferred: results.bytesTransferred,
      errors: results.errors,
      conflicts: results.conflicts,
      timestamp: new Date().toISOString()
    };

    // メトリクス記録
    this.recordMetrics(performanceData);
    
    // 異常検出
    this.detectAnomalies(performanceData);
    
    this.activeMeasurements.delete(syncId);
  }

  // メトリクス記録
  recordMetrics(data) {
    this.metrics.syncTimes.push({
      duration: data.duration,
      itemCount: data.itemsSynced,
      timestamp: data.timestamp
    });

    this.metrics.dataTransferred.push({
      bytes: data.bytesTransferred,
      timestamp: data.timestamp
    });

    // 配列サイズ制限（メモリ効率）
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].length > 100) {
        this.metrics[key] = this.metrics[key].slice(-100);
      }
    });
  }

  // パフォーマンス分析
  analyzePerformance() {
    const analysis = {
      averageSyncTime: this.calculateAverage(this.metrics.syncTimes, 'duration'),
      syncTimeVariance: this.calculateVariance(this.metrics.syncTimes, 'duration'),
      throughput: this.calculateThroughput(),
      errorRate: this.calculateErrorRate(),
      recommendations: []
    };

    // 推奨事項生成
    if (analysis.averageSyncTime > 10000) { // 10秒以上
      analysis.recommendations.push({
        type: 'performance',
        message: '同期時間が長すぎます。バッチサイズを調整することを検討してください。'
      });
    }

    if (analysis.errorRate > 0.05) { // 5%以上
      analysis.recommendations.push({
        type: 'reliability',
        message: 'エラー率が高いです。ネットワーク接続やサーバー状態を確認してください。'
      });
    }

    return analysis;
  }

  // メモリ使用量取得
  getMemoryUsage() {
    if ('memory' in performance) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }
}
```

---

## 🛠️ 運用・メンテナンス

### 1. データクリーンアップ

```javascript
// データクリーンアップシステム
class DataMaintenanceService {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.cleanupSchedule = [
      { task: 'expiredData', interval: 24 * 60 * 60 * 1000 }, // 日次
      { task: 'orphanedRecords', interval: 7 * 24 * 60 * 60 * 1000 }, // 週次
      { task: 'largeTables', interval: 30 * 24 * 60 * 60 * 1000 } // 月次
    ];

    this.scheduleCleanupTasks();
  }

  scheduleCleanupTasks() {
    this.cleanupSchedule.forEach(({ task, interval }) => {
      setInterval(() => {
        this.runCleanupTask(task);
      }, interval);
    });
  }

  async runCleanupTask(taskType) {
    console.log(`[Maintenance] Running cleanup task: ${taskType}`);
    
    try {
      switch (taskType) {
        case 'expiredData':
          await this.cleanExpiredData();
          break;
        case 'orphanedRecords':
          await this.cleanOrphanedRecords();
          break;
        case 'largeTables':
          await this.optimizeLargeTables();
          break;
      }
    } catch (error) {
      console.error(`[Maintenance] Cleanup task ${taskType} failed:`, error);
    }
  }

  // 期限切れデータのクリーンアップ
  async cleanExpiredData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 古い同期キューエントリを削除
    const oldSyncItems = await this.dataManager.queryData('syncQueue', {
      index: 'createdAt',
      range: IDBKeyRange.upperBound(thirtyDaysAgo.toISOString()),
      filter: (item) => item.retryCount >= 3 // 失敗したアイテムのみ
    });

    for (const item of oldSyncItems) {
      await this.dataManager.deleteData('syncQueue', item.id, { hardDelete: true });
    }

    console.log(`[Maintenance] Cleaned ${oldSyncItems.length} expired sync items`);
  }

  // 孤立レコードのクリーンアップ
  async cleanOrphanedRecords() {
    // 削除マークされたレコードを物理削除
    const stores = ['appointments', 'profiles'];
    let totalCleaned = 0;

    for (const storeName of stores) {
      const deletedRecords = await this.dataManager.queryData(storeName, {
        filter: (item) => item.deleted && 
          new Date(item.deletedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      });

      for (const record of deletedRecords) {
        await this.dataManager.deleteData(storeName, record.id, { 
          hardDelete: true, 
          sync: false 
        });
      }

      totalCleaned += deletedRecords.length;
    }

    console.log(`[Maintenance] Cleaned ${totalCleaned} orphaned records`);
  }

  // 大きなテーブルの最適化
  async optimizeLargeTables() {
    const usage = await this.dataManager.getStorageUsage();
    
    if (usage && usage.usagePercentage > 80) {
      console.log('[Maintenance] Storage usage high, optimizing...');
      
      // キャッシュクリア
      this.dataManager.memoryCache.clear();
      this.dataManager.cacheExpiry.clear();
      
      // 古いメタデータ削除
      await this.cleanOldMetadata();
      
      // インデックス再構築（必要に応じて）
      await this.rebuildIndexes();
    }
  }

  // ストレージ使用量レポート
  async generateStorageReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalUsage: 0,
      storeBreakdown: {},
      recommendations: []
    };

    const stores = ['appointments', 'profiles', 'services', 'syncQueue', 'conflicts'];
    
    for (const storeName of stores) {
      const items = await this.dataManager.queryData(storeName);
      const size = this.estimateSize(items);
      
      report.storeBreakdown[storeName] = {
        itemCount: items.length,
        estimatedSize: size
      };
      
      report.totalUsage += size;
    }

    // 推奨事項生成
    if (report.storeBreakdown.syncQueue.itemCount > 100) {
      report.recommendations.push({
        type: 'cleanup',
        message: '同期キューに大量のアイテムがあります。失敗したアイテムを確認してください。'
      });
    }

    return report;
  }

  estimateSize(items) {
    return items.reduce((total, item) => {
      return total + JSON.stringify(item).length;
    }, 0);
  }
}
```

このオフラインファーストのデータ管理戦略により、ネットワーク接続に依存しない堅牢で高性能な美容室アプリを実現できます。ユーザーは常に即座にレスポンスを得られ、データの整合性も保たれます。