/**
 * Backup and Disaster Recovery Service
 * 自動バックアップと災害復旧機能
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream').promises;
const zlib = require('zlib');
const cron = require('node-cron');

class BackupService {
  constructor(config = {}) {
    this.config = {
      backupDir: config.backupDir || path.join(__dirname, '../../backups'),
      retentionDays: config.retentionDays || 30,
      encryptionKey: config.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY,
      compressionLevel: config.compressionLevel || 9,
      maxBackups: config.maxBackups || 100,
      ...config
    };
    
    this.backupJobs = new Map();
    this.restoreInProgress = false;
  }
  
  /**
   * バックアップディレクトリの初期化
   */
  async initialize() {
    try {
      await fs.mkdir(this.config.backupDir, { recursive: true });
      console.log('Backup directory initialized:', this.config.backupDir);
    } catch (error) {
      console.error('Failed to initialize backup directory:', error);
      throw error;
    }
  }
  
  /**
   * データベースのバックアップ作成
   */
  async createBackup(data, metadata = {}) {
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const backupName = `backup_${timestamp.replace(/[:.]/g, '-')}_${backupId}`;
    
    const backupMetadata = {
      id: backupId,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      type: metadata.type || 'manual',
      description: metadata.description || 'Database backup',
      dataSize: JSON.stringify(data).length,
      compressed: true,
      encrypted: !!this.config.encryptionKey
    };
    
    try {
      // データをJSON形式に変換
      const jsonData = JSON.stringify({
        metadata: backupMetadata,
        data: data
      }, null, 2);
      
      // 暗号化（設定されている場合）
      let processedData = jsonData;
      if (this.config.encryptionKey) {
        processedData = this.encryptData(jsonData);
      }
      
      // 圧縮してファイルに保存
      const backupPath = path.join(this.config.backupDir, `${backupName}.backup.gz`);
      await this.compressAndSave(processedData, backupPath);
      
      // メタデータを別ファイルに保存
      const metadataPath = path.join(this.config.backupDir, `${backupName}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(backupMetadata, null, 2));
      
      // 古いバックアップの削除
      await this.cleanupOldBackups();
      
      console.log(`Backup created successfully: ${backupName}`);
      
      return {
        success: true,
        backupId,
        backupName,
        path: backupPath,
        metadata: backupMetadata
      };
      
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }
  
  /**
   * バックアップからの復元
   */
  async restoreBackup(backupId, options = {}) {
    if (this.restoreInProgress) {
      throw new Error('Restore operation already in progress');
    }
    
    this.restoreInProgress = true;
    
    try {
      // バックアップファイルを探す
      const files = await fs.readdir(this.config.backupDir);
      const backupFile = files.find(f => f.includes(backupId) && f.endsWith('.backup.gz'));
      
      if (!backupFile) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      const backupPath = path.join(this.config.backupDir, backupFile);
      
      // 圧縮データを読み込み
      const compressedData = await fs.readFile(backupPath);
      const decompressed = await this.decompress(compressedData);
      
      // 復号化（必要な場合）
      let jsonData = decompressed.toString();
      if (this.config.encryptionKey) {
        jsonData = this.decryptData(jsonData);
      }
      
      const backupData = JSON.parse(jsonData);
      
      // 復元前の確認（オプション）
      if (options.confirmRestore) {
        const confirmed = await options.confirmRestore(backupData.metadata);
        if (!confirmed) {
          throw new Error('Restore cancelled by user');
        }
      }
      
      // 現在のデータをバックアップ（安全のため）
      if (options.createSafetyBackup && options.currentData) {
        await this.createBackup(options.currentData, {
          type: 'pre-restore-safety',
          description: `Safety backup before restoring ${backupId}`
        });
      }
      
      console.log(`Backup restored successfully: ${backupId}`);
      
      return {
        success: true,
        data: backupData.data,
        metadata: backupData.metadata
      };
      
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error(`Restore failed: ${error.message}`);
    } finally {
      this.restoreInProgress = false;
    }
  }
  
  /**
   * バックアップ一覧の取得
   */
  async listBackups(options = {}) {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files.filter(f => f.endsWith('.meta.json'));
      
      const backups = [];
      
      for (const file of backupFiles) {
        const metadataPath = path.join(this.config.backupDir, file);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        
        // フィルタリング
        if (options.type && metadata.type !== options.type) continue;
        if (options.startDate && new Date(metadata.timestamp) < new Date(options.startDate)) continue;
        if (options.endDate && new Date(metadata.timestamp) > new Date(options.endDate)) continue;
        
        backups.push(metadata);
      }
      
      // ソート（新しい順）
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // ページネーション
      const page = options.page || 1;
      const limit = options.limit || 20;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      return {
        backups: backups.slice(start, end),
        total: backups.length,
        page,
        pages: Math.ceil(backups.length / limit)
      };
      
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }
  
  /**
   * 自動バックアップのスケジュール設定
   */
  scheduleBackup(name, cronExpression, getData, metadata = {}) {
    if (this.backupJobs.has(name)) {
      this.backupJobs.get(name).stop();
    }
    
    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Running scheduled backup: ${name}`);
        const data = await getData();
        await this.createBackup(data, {
          type: 'scheduled',
          scheduleName: name,
          ...metadata
        });
      } catch (error) {
        console.error(`Scheduled backup failed: ${name}`, error);
        // TODO: エラー通知
      }
    });
    
    this.backupJobs.set(name, job);
    console.log(`Backup scheduled: ${name} (${cronExpression})`);
    
    return job;
  }
  
  /**
   * デフォルトのバックアップスケジュール
   */
  setupDefaultSchedules(getData) {
    // 日次バックアップ（毎日午前3時）
    this.scheduleBackup('daily', '0 3 * * *', getData, {
      description: 'Daily automatic backup'
    });
    
    // 週次バックアップ（毎週日曜日午前4時）
    this.scheduleBackup('weekly', '0 4 * * 0', getData, {
      description: 'Weekly automatic backup'
    });
    
    // 月次バックアップ（毎月1日午前5時）
    this.scheduleBackup('monthly', '0 5 1 * *', getData, {
      description: 'Monthly automatic backup'
    });
  }
  
  /**
   * バックアップジョブの停止
   */
  stopAllJobs() {
    for (const [name, job] of this.backupJobs) {
      job.stop();
      console.log(`Backup job stopped: ${name}`);
    }
    this.backupJobs.clear();
  }
  
  /**
   * 古いバックアップの削除
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const now = Date.now();
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
      
      const backupGroups = new Map();
      
      // バックアップをグループ化
      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const metadataPath = path.join(this.config.backupDir, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          const baseName = file.replace('.meta.json', '');
          
          if (!backupGroups.has(metadata.type)) {
            backupGroups.set(metadata.type, []);
          }
          
          backupGroups.get(metadata.type).push({
            baseName,
            metadata,
            timestamp: new Date(metadata.timestamp).getTime()
          });
        }
      }
      
      // 各タイプごとに古いバックアップを削除
      for (const [type, backups] of backupGroups) {
        // タイムスタンプでソート（新しい順）
        backups.sort((a, b) => b.timestamp - a.timestamp);
        
        // 保持するバックアップ数を超えた分を削除
        const toDelete = backups.slice(this.config.maxBackups);
        
        // 保持期間を過ぎたバックアップも削除対象に追加
        for (const backup of backups.slice(0, this.config.maxBackups)) {
          if (now - backup.timestamp > retentionMs) {
            toDelete.push(backup);
          }
        }
        
        // 削除実行
        for (const backup of toDelete) {
          const backupPath = path.join(this.config.backupDir, `${backup.baseName}.backup.gz`);
          const metaPath = path.join(this.config.backupDir, `${backup.baseName}.meta.json`);
          
          await fs.unlink(backupPath).catch(() => {});
          await fs.unlink(metaPath).catch(() => {});
          
          console.log(`Deleted old backup: ${backup.baseName}`);
        }
      }
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
  
  /**
   * データの暗号化
   */
  encryptData(data) {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }
    
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }
  
  /**
   * データの復号化
   */
  decryptData(encryptedData) {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }
    
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    
    const data = Buffer.from(encryptedData, 'base64');
    const iv = data.slice(0, 16);
    const authTag = data.slice(16, 32);
    const encrypted = data.slice(32);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  }
  
  /**
   * データの圧縮と保存
   */
  async compressAndSave(data, filePath) {
    const gzip = zlib.createGzip({ level: this.config.compressionLevel });
    const source = Buffer.from(data);
    const destination = createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      gzip.on('error', reject);
      destination.on('error', reject);
      destination.on('finish', resolve);
      
      gzip.end(source);
      gzip.pipe(destination);
    });
  }
  
  /**
   * 圧縮データの展開
   */
  async decompress(compressedData) {
    const gunzip = zlib.createGunzip();
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      gunzip.on('data', chunk => chunks.push(chunk));
      gunzip.on('end', () => resolve(Buffer.concat(chunks)));
      gunzip.on('error', reject);
      
      gunzip.end(compressedData);
    });
  }
  
  /**
   * バックアップの整合性チェック
   */
  async verifyBackup(backupId) {
    try {
      const result = await this.restoreBackup(backupId, {
        confirmRestore: () => false // 実際には復元しない
      });
      
      return {
        valid: true,
        message: 'Backup is valid and can be restored'
      };
    } catch (error) {
      return {
        valid: false,
        message: `Backup verification failed: ${error.message}`
      };
    }
  }
  
  /**
   * 災害復旧シミュレーション
   */
  async testDisasterRecovery(getData) {
    console.log('Starting disaster recovery test...');
    
    const testResults = {
      backupCreation: false,
      backupRestore: false,
      dataIntegrity: false,
      performanceMetrics: {}
    };
    
    try {
      // 1. バックアップ作成テスト
      const startBackup = Date.now();
      const currentData = await getData();
      const backup = await this.createBackup(currentData, {
        type: 'dr-test',
        description: 'Disaster recovery test backup'
      });
      testResults.performanceMetrics.backupTime = Date.now() - startBackup;
      testResults.backupCreation = true;
      
      // 2. バックアップ復元テスト
      const startRestore = Date.now();
      const restored = await this.restoreBackup(backup.backupId);
      testResults.performanceMetrics.restoreTime = Date.now() - startRestore;
      testResults.backupRestore = true;
      
      // 3. データ整合性チェック
      const originalJson = JSON.stringify(currentData);
      const restoredJson = JSON.stringify(restored.data);
      testResults.dataIntegrity = originalJson === restoredJson;
      
      // 4. テスト用バックアップの削除
      const backupPath = path.join(this.config.backupDir, `${backup.backupName}.backup.gz`);
      const metaPath = path.join(this.config.backupDir, `${backup.backupName}.meta.json`);
      await fs.unlink(backupPath).catch(() => {});
      await fs.unlink(metaPath).catch(() => {});
      
      console.log('Disaster recovery test completed:', testResults);
      
      return testResults;
      
    } catch (error) {
      console.error('Disaster recovery test failed:', error);
      testResults.error = error.message;
      return testResults;
    }
  }
}

module.exports = BackupService;