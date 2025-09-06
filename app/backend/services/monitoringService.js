/**
 * Real-time Monitoring and Alert Service
 * システム監視とアラート機能
 */

const EventEmitter = require('events');
const os = require('os');
const { performance } = require('perf_hooks');

class MonitoringService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      checkInterval: config.checkInterval || 60000, // 1分
      thresholds: {
        cpu: config.cpuThreshold || 80, // CPU使用率 %
        memory: config.memoryThreshold || 85, // メモリ使用率 %
        errorRate: config.errorRateThreshold || 5, // エラー率 %
        responseTime: config.responseTimeThreshold || 1000, // レスポンスタイム ms
        diskSpace: config.diskSpaceThreshold || 90, // ディスク使用率 %
        ...config.thresholds
      },
      alerts: {
        email: config.alertEmail || process.env.ALERT_EMAIL,
        slack: config.slackWebhook || process.env.SLACK_WEBHOOK,
        sms: config.alertSms || process.env.ALERT_SMS
      }
    };
    
    this.metrics = {
      system: {},
      application: {
        requests: [],
        errors: [],
        performance: []
      },
      alerts: []
    };
    
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }
  
  /**
   * モニタリング開始
   */
  start() {
    if (this.isMonitoring) {
      console.log('Monitoring already running');
      return;
    }
    
    this.isMonitoring = true;
    console.log('Monitoring service started');
    
    // 定期的なシステムチェック
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
    
    // 初回チェック
    this.performHealthCheck();
  }
  
  /**
   * モニタリング停止
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('Monitoring service stopped');
  }
  
  /**
   * ヘルスチェック実行
   */
  async performHealthCheck() {
    const timestamp = new Date();
    const health = {
      timestamp,
      status: 'healthy',
      checks: {}
    };
    
    try {
      // システムメトリクス収集
      health.checks.system = await this.checkSystemMetrics();
      
      // アプリケーションメトリクス
      health.checks.application = this.checkApplicationMetrics();
      
      // データベース接続チェック
      health.checks.database = await this.checkDatabaseConnection();
      
      // 外部サービスチェック
      health.checks.externalServices = await this.checkExternalServices();
      
      // 全体のステータス判定
      health.status = this.determineOverallHealth(health.checks);
      
      // メトリクス保存
      this.saveMetrics(health);
      
      // アラートチェック
      this.checkAlerts(health);
      
      // イベント発行
      this.emit('healthcheck', health);
      
    } catch (error) {
      console.error('Health check failed:', error);
      health.status = 'error';
      health.error = error.message;
      
      this.sendAlert('critical', 'Health check failed', {
        error: error.message,
        timestamp
      });
    }
    
    return health;
  }
  
  /**
   * システムメトリクス収集
   */
  async checkSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const loadAverage = os.loadavg();
    
    // CPU使用率計算
    const cpuUsage = this.calculateCPUUsage(cpus);
    
    // メモリ使用率
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    const metrics = {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        loadAverage: {
          '1min': loadAverage[0],
          '5min': loadAverage[1],
          '15min': loadAverage[2]
        }
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        usage: memoryUsage
      },
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname()
    };
    
    // 閾値チェック
    if (cpuUsage > this.config.thresholds.cpu) {
      metrics.cpu.alert = `CPU usage high: ${cpuUsage.toFixed(2)}%`;
    }
    
    if (memoryUsage > this.config.thresholds.memory) {
      metrics.memory.alert = `Memory usage high: ${memoryUsage.toFixed(2)}%`;
    }
    
    return metrics;
  }
  
  /**
   * アプリケーションメトリクス
   */
  checkApplicationMetrics() {
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5分間のウィンドウ
    
    // 最近のリクエストのみを保持
    this.metrics.application.requests = this.metrics.application.requests
      .filter(r => now - r.timestamp < timeWindow);
    
    this.metrics.application.errors = this.metrics.application.errors
      .filter(e => now - e.timestamp < timeWindow);
    
    const totalRequests = this.metrics.application.requests.length;
    const totalErrors = this.metrics.application.errors.length;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    // 平均レスポンスタイム
    const avgResponseTime = this.metrics.application.requests.length > 0
      ? this.metrics.application.requests.reduce((sum, r) => sum + r.duration, 0) / totalRequests
      : 0;
    
    const metrics = {
      requests: {
        total: totalRequests,
        perMinute: totalRequests / 5,
        avgResponseTime
      },
      errors: {
        total: totalErrors,
        rate: errorRate,
        recent: this.metrics.application.errors.slice(-5)
      }
    };
    
    // 閾値チェック
    if (errorRate > this.config.thresholds.errorRate) {
      metrics.errors.alert = `Error rate high: ${errorRate.toFixed(2)}%`;
    }
    
    if (avgResponseTime > this.config.thresholds.responseTime) {
      metrics.requests.alert = `Response time slow: ${avgResponseTime.toFixed(0)}ms`;
    }
    
    return metrics;
  }
  
  /**
   * データベース接続チェック
   */
  async checkDatabaseConnection() {
    const start = performance.now();
    
    try {
      // TODO: 実際のデータベース接続チェック
      // 今はモックとして成功を返す
      const duration = performance.now() - start;
      
      return {
        status: 'connected',
        responseTime: duration,
        connections: {
          active: 5,
          idle: 10,
          total: 15
        }
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error.message,
        responseTime: performance.now() - start
      };
    }
  }
  
  /**
   * 外部サービスチェック
   */
  async checkExternalServices() {
    const services = {
      twilio: { status: 'unknown', responseTime: 0 },
      openai: { status: 'unknown', responseTime: 0 },
      stripe: { status: 'unknown', responseTime: 0 }
    };
    
    // Twilioチェック
    try {
      const start = performance.now();
      // TODO: 実際のTwilio APIヘルスチェック
      services.twilio.status = 'operational';
      services.twilio.responseTime = performance.now() - start;
    } catch (error) {
      services.twilio.status = 'error';
      services.twilio.error = error.message;
    }
    
    // OpenAIチェック
    try {
      const start = performance.now();
      // TODO: 実際のOpenAI APIヘルスチェック
      services.openai.status = 'operational';
      services.openai.responseTime = performance.now() - start;
    } catch (error) {
      services.openai.status = 'error';
      services.openai.error = error.message;
    }
    
    return services;
  }
  
  /**
   * CPU使用率計算
   */
  calculateCPUUsage(cpus) {
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return usage;
  }
  
  /**
   * 全体のヘルスステータス判定
   */
  determineOverallHealth(checks) {
    let hasError = false;
    let hasWarning = false;
    
    // システムチェック
    if (checks.system.cpu?.alert || checks.system.memory?.alert) {
      hasWarning = true;
    }
    
    // アプリケーションチェック
    if (checks.application.errors?.alert || checks.application.requests?.alert) {
      hasWarning = true;
    }
    
    // データベースチェック
    if (checks.database.status !== 'connected') {
      hasError = true;
    }
    
    // 外部サービスチェック
    for (const service in checks.externalServices) {
      if (checks.externalServices[service].status === 'error') {
        hasWarning = true;
      }
    }
    
    if (hasError) return 'unhealthy';
    if (hasWarning) return 'degraded';
    return 'healthy';
  }
  
  /**
   * メトリクス保存
   */
  saveMetrics(health) {
    // システムメトリクスの履歴保存（最大1000件）
    if (!this.metrics.history) {
      this.metrics.history = [];
    }
    
    this.metrics.history.push(health);
    
    if (this.metrics.history.length > 1000) {
      this.metrics.history = this.metrics.history.slice(-1000);
    }
    
    // 最新のメトリクスを保存
    this.metrics.latest = health;
  }
  
  /**
   * アラートチェック
   */
  checkAlerts(health) {
    const alerts = [];
    
    // CPUアラート
    if (health.checks.system.cpu?.alert) {
      alerts.push({
        level: 'warning',
        type: 'cpu',
        message: health.checks.system.cpu.alert,
        value: health.checks.system.cpu.usage
      });
    }
    
    // メモリアラート
    if (health.checks.system.memory?.alert) {
      alerts.push({
        level: 'warning',
        type: 'memory',
        message: health.checks.system.memory.alert,
        value: health.checks.system.memory.usage
      });
    }
    
    // エラー率アラート
    if (health.checks.application.errors?.alert) {
      alerts.push({
        level: 'critical',
        type: 'error_rate',
        message: health.checks.application.errors.alert,
        value: health.checks.application.errors.rate
      });
    }
    
    // レスポンスタイムアラート
    if (health.checks.application.requests?.alert) {
      alerts.push({
        level: 'warning',
        type: 'response_time',
        message: health.checks.application.requests.alert,
        value: health.checks.application.requests.avgResponseTime
      });
    }
    
    // データベース接続アラート
    if (health.checks.database.status !== 'connected') {
      alerts.push({
        level: 'critical',
        type: 'database',
        message: 'Database connection lost',
        error: health.checks.database.error
      });
    }
    
    // アラート送信
    alerts.forEach(alert => {
      this.sendAlert(alert.level, alert.message, alert);
    });
  }
  
  /**
   * アラート送信
   */
  async sendAlert(level, message, details) {
    const alert = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      message,
      details,
      notified: false
    };
    
    // アラート履歴に追加
    this.metrics.alerts.push(alert);
    
    // 重複アラートのチェック（5分以内の同じアラートは送信しない）
    const recentAlerts = this.metrics.alerts.filter(a => 
      Date.now() - a.timestamp < 5 * 60 * 1000 &&
      a.message === message &&
      a.notified
    );
    
    if (recentAlerts.length > 0) {
      console.log('Duplicate alert suppressed:', message);
      return;
    }
    
    // アラート送信
    console.log(`[ALERT] ${level.toUpperCase()}: ${message}`, details);
    
    // イベント発行
    this.emit('alert', alert);
    
    // 通知送信
    if (level === 'critical') {
      // TODO: Email/SMS/Slack通知の実装
      // await this.sendEmailAlert(alert);
      // await this.sendSmsAlert(alert);
      // await this.sendSlackAlert(alert);
    }
    
    alert.notified = true;
    
    // アラート履歴の制限（最大100件）
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }
  }
  
  /**
   * リクエスト記録
   */
  recordRequest(method, path, duration, statusCode) {
    this.metrics.application.requests.push({
      timestamp: Date.now(),
      method,
      path,
      duration,
      statusCode
    });
  }
  
  /**
   * エラー記録
   */
  recordError(error, context = {}) {
    this.metrics.application.errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context
    });
  }
  
  /**
   * カスタムメトリクス記録
   */
  recordMetric(name, value, tags = {}) {
    if (!this.metrics.custom) {
      this.metrics.custom = {};
    }
    
    if (!this.metrics.custom[name]) {
      this.metrics.custom[name] = [];
    }
    
    this.metrics.custom[name].push({
      timestamp: Date.now(),
      value,
      tags
    });
    
    // 古いデータの削除（1時間以上前）
    const cutoff = Date.now() - 60 * 60 * 1000;
    this.metrics.custom[name] = this.metrics.custom[name]
      .filter(m => m.timestamp > cutoff);
  }
  
  /**
   * ダッシュボード用データ取得
   */
  getDashboardData() {
    const latest = this.metrics.latest || {};
    const history = this.metrics.history || [];
    
    return {
      current: {
        status: latest.status || 'unknown',
        timestamp: latest.timestamp,
        system: latest.checks?.system || {},
        application: latest.checks?.application || {},
        database: latest.checks?.database || {},
        services: latest.checks?.externalServices || {}
      },
      trends: {
        cpu: history.slice(-60).map(h => ({
          timestamp: h.timestamp,
          value: h.checks?.system?.cpu?.usage || 0
        })),
        memory: history.slice(-60).map(h => ({
          timestamp: h.timestamp,
          value: h.checks?.system?.memory?.usage || 0
        })),
        requests: history.slice(-60).map(h => ({
          timestamp: h.timestamp,
          value: h.checks?.application?.requests?.perMinute || 0
        })),
        errors: history.slice(-60).map(h => ({
          timestamp: h.timestamp,
          value: h.checks?.application?.errors?.rate || 0
        }))
      },
      alerts: this.metrics.alerts.slice(-20),
      uptime: this.calculateUptime()
    };
  }
  
  /**
   * アップタイム計算
   */
  calculateUptime() {
    if (!this.metrics.history || this.metrics.history.length === 0) {
      return { percentage: 100, duration: 0 };
    }
    
    const total = this.metrics.history.length;
    const healthy = this.metrics.history.filter(h => h.status === 'healthy').length;
    const percentage = (healthy / total) * 100;
    
    const firstCheck = this.metrics.history[0].timestamp;
    const duration = Date.now() - new Date(firstCheck).getTime();
    
    return {
      percentage,
      duration,
      since: firstCheck
    };
  }
}

module.exports = MonitoringService;