/**
 * SMS System Monitoring Framework
 * Hive-Analyst Performance Monitoring and Metrics Collection
 */

class SystemMonitor {
    constructor(config = {}) {
        this.config = {
            metricsInterval: config.metricsInterval || 60000, // 1 minute
            alertThreshold: config.alertThreshold || 3,
            enableRealTimeMonitoring: config.enableRealTimeMonitoring || true,
            persistMetrics: config.persistMetrics || true,
            ...config
        };
        
        this.metrics = {
            performance: new Map(),
            errors: new Map(),
            business: new Map(),
            system: new Map()
        };
        
        this.alerts = [];
        this.isMonitoring = false;
        
        this.initializeMonitoring();
    }
    
    initializeMonitoring() {
        if (this.config.enableRealTimeMonitoring) {
            this.startRealTimeMonitoring();
        }
        
        // Set up performance observers
        this.setupPerformanceObservers();
        
        // Initialize error tracking
        this.setupErrorTracking();
        
        console.log('🔍 Hive Analyst monitoring framework initialized');
    }
    
    startRealTimeMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectSystemMetrics();
            this.evaluateAlerts();
        }, this.config.metricsInterval);
        
        console.log('📊 Real-time monitoring started');
    }
    
    stopRealTimeMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.isMonitoring = false;
            console.log('📊 Real-time monitoring stopped');
        }
    }
    
    setupPerformanceObservers() {
        // API Response Time Observer
        this.observeAPIPerformance();
        
        // Frontend Performance Observer
        this.observeFrontendPerformance();
        
        // Database Performance Observer
        this.observeDatabasePerformance();
    }
    
    observeAPIPerformance() {
        // Middleware for Express.js to track API performance
        const apiPerformanceMiddleware = (req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.recordMetric('api_response_time', responseTime, {
                    endpoint: req.path,
                    method: req.method,
                    statusCode: res.statusCode
                });
                
                // Check for performance alerts
                if (responseTime > 500) {
                    this.triggerAlert('performance', 'API_SLOW_RESPONSE', {
                        endpoint: req.path,
                        responseTime: responseTime
                    });
                }
            });
            
            next();
        };
        
        // Export middleware for use in Express app
        this.apiPerformanceMiddleware = apiPerformanceMiddleware;
    }
    
    observeFrontendPerformance() {
        if (typeof window !== 'undefined') {
            // Browser environment - measure page load performance
            window.addEventListener('load', () => {
                const perfData = window.performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                
                this.recordMetric('frontend_load_time', loadTime);
                
                // Measure First Contentful Paint
                if ('PerformanceObserver' in window) {
                    const observer = new PerformanceObserver((list) => {
                        list.getEntries().forEach((entry) => {
                            if (entry.name === 'first-contentful-paint') {
                                this.recordMetric('first_contentful_paint', entry.startTime);
                            }
                        });
                    });
                    observer.observe({entryTypes: ['paint']});
                }
            });
        }
    }
    
    observeDatabasePerformance() {
        // Database query performance tracking
        const originalQuery = this.trackDatabaseQueries || (() => {});
        
        this.trackDatabaseQueries = (query, params, callback) => {
            const startTime = Date.now();
            
            const wrappedCallback = (...args) => {
                const queryTime = Date.now() - startTime;
                this.recordMetric('database_query_time', queryTime, {
                    query: query.substring(0, 100) // First 100 chars
                });
                
                if (callback) callback(...args);
            };
            
            return originalQuery(query, params, wrappedCallback);
        };
    }
    
    setupErrorTracking() {
        // Global error handler for unhandled errors
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.recordError('javascript_error', {
                    message: event.error?.message || event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    stack: event.error?.stack
                });
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.recordError('promise_rejection', {
                    reason: event.reason
                });
            });
        }
        
        // Node.js error handling
        if (typeof process !== 'undefined') {
            process.on('uncaughtException', (error) => {
                this.recordError('uncaught_exception', {
                    message: error.message,
                    stack: error.stack
                });
            });
            
            process.on('unhandledRejection', (reason) => {
                this.recordError('unhandled_rejection', {
                    reason: reason
                });
            });
        }
    }
    
    recordMetric(metricName, value, metadata = {}) {
        const timestamp = new Date().toISOString();
        const metric = {
            name: metricName,
            value: value,
            timestamp: timestamp,
            metadata: metadata
        };
        
        if (!this.metrics.performance.has(metricName)) {
            this.metrics.performance.set(metricName, []);
        }
        
        this.metrics.performance.get(metricName).push(metric);
        
        // Keep only last 1000 metrics per type to prevent memory leaks
        const metrics = this.metrics.performance.get(metricName);
        if (metrics.length > 1000) {
            metrics.shift();
        }
        
        // Persist metrics if enabled
        if (this.config.persistMetrics) {
            this.persistMetric(metric);
        }
        
        console.log(`📈 Metric recorded: ${metricName} = ${value}${metadata.endpoint ? ` (${metadata.endpoint})` : ''}`);
    }
    
    recordError(errorType, errorData) {
        const timestamp = new Date().toISOString();
        const error = {
            type: errorType,
            data: errorData,
            timestamp: timestamp
        };
        
        if (!this.metrics.errors.has(errorType)) {
            this.metrics.errors.set(errorType, []);
        }
        
        this.metrics.errors.get(errorType).push(error);
        
        this.triggerAlert('error', errorType, errorData);
        
        console.error(`🚨 Error recorded: ${errorType}`, errorData);
    }
    
    collectSystemMetrics() {
        // Memory usage
        if (typeof process !== 'undefined') {
            const memUsage = process.memoryUsage();
            this.recordMetric('memory_usage_heap', memUsage.heapUsed);
            this.recordMetric('memory_usage_external', memUsage.external);
        }
        
        // CPU usage (if available)
        if (typeof process !== 'undefined' && process.cpuUsage) {
            const cpuUsage = process.cpuUsage();
            this.recordMetric('cpu_usage_user', cpuUsage.user);
            this.recordMetric('cpu_usage_system', cpuUsage.system);
        }
        
        // Event loop lag (Node.js)
        this.measureEventLoopLag();
    }
    
    measureEventLoopLag() {
        if (typeof process === 'undefined') return;
        
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
            this.recordMetric('event_loop_lag', lag);
        });
    }
    
    triggerAlert(category, type, data) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            category: category,
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            severity: this.calculateAlertSeverity(category, type, data)
        };
        
        this.alerts.push(alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }
        
        console.warn(`🚨 Alert triggered: [${alert.severity}] ${category}/${type}`, data);
        
        // Send to external monitoring if configured
        this.sendToExternalMonitoring(alert);
    }
    
    calculateAlertSeverity(category, type, data) {
        // Define severity based on alert type and data
        const severityMap = {
            'API_SLOW_RESPONSE': data.responseTime > 1000 ? 'critical' : 'warning',
            'javascript_error': 'error',
            'promise_rejection': 'error',
            'uncaught_exception': 'critical'
        };
        
        return severityMap[type] || 'info';
    }
    
    evaluateAlerts() {
        // Evaluate system health and trigger alerts if needed
        const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
        
        // Check API response time
        const apiTimes = recentMetrics.filter(m => m.name === 'api_response_time');
        if (apiTimes.length > 0) {
            const avgResponseTime = apiTimes.reduce((sum, m) => sum + m.value, 0) / apiTimes.length;
            if (avgResponseTime > 200) {
                this.triggerAlert('performance', 'API_DEGRADATION', {
                    averageResponseTime: avgResponseTime,
                    sampleSize: apiTimes.length
                });
            }
        }
        
        // Check error rate
        const recentErrors = this.getRecentErrors(5 * 60 * 1000);
        if (recentErrors.length > 5) {
            this.triggerAlert('reliability', 'HIGH_ERROR_RATE', {
                errorCount: recentErrors.length,
                timeframe: '5 minutes'
            });
        }
    }
    
    getRecentMetrics(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        const recent = [];
        
        for (const [name, metrics] of this.metrics.performance) {
            metrics.forEach(metric => {
                if (new Date(metric.timestamp).getTime() > cutoff) {
                    recent.push(metric);
                }
            });
        }
        
        return recent;
    }
    
    getRecentErrors(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        const recent = [];
        
        for (const [type, errors] of this.metrics.errors) {
            errors.forEach(error => {
                if (new Date(error.timestamp).getTime() > cutoff) {
                    recent.push(error);
                }
            });
        }
        
        return recent;
    }
    
    persistMetric(metric) {
        // Store metric in persistent storage (localStorage for browser, file for Node.js)
        if (typeof localStorage !== 'undefined') {
            const key = `sms_metric_${metric.name}_${Date.now()}`;
            localStorage.setItem(key, JSON.stringify(metric));
        }
        
        // In Node.js environment, could write to file or database
        // This would be implemented based on the specific storage requirements
    }
    
    sendToExternalMonitoring(alert) {
        // Placeholder for external monitoring integration
        // Could send to services like DataDog, New Relic, CloudWatch, etc.
        console.log('📡 Sending alert to external monitoring:', alert);
    }
    
    generateReport(timeframe = '24h') {
        const report = {
            generated: new Date().toISOString(),
            timeframe: timeframe,
            summary: this.generateSummary(),
            performance: this.generatePerformanceReport(),
            errors: this.generateErrorReport(),
            alerts: this.generateAlertReport(),
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    generateSummary() {
        const totalMetrics = Array.from(this.metrics.performance.values())
            .reduce((sum, metrics) => sum + metrics.length, 0);
        const totalErrors = Array.from(this.metrics.errors.values())
            .reduce((sum, errors) => sum + errors.length, 0);
        const totalAlerts = this.alerts.length;
        
        return {
            totalMetrics,
            totalErrors,
            totalAlerts,
            monitoringStatus: this.isMonitoring ? 'active' : 'inactive',
            healthScore: this.calculateHealthScore()
        };
    }
    
    generatePerformanceReport() {
        const report = {};
        
        for (const [name, metrics] of this.metrics.performance) {
            if (metrics.length === 0) continue;
            
            const values = metrics.map(m => m.value);
            report[name] = {
                count: values.length,
                average: values.reduce((sum, v) => sum + v, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                latest: values[values.length - 1]
            };
        }
        
        return report;
    }
    
    generateErrorReport() {
        const report = {};
        
        for (const [type, errors] of this.metrics.errors) {
            report[type] = {
                count: errors.length,
                latest: errors[errors.length - 1]
            };
        }
        
        return report;
    }
    
    generateAlertReport() {
        const severityCounts = {};
        this.alerts.forEach(alert => {
            severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
        });
        
        return {
            total: this.alerts.length,
            bySeverity: severityCounts,
            recent: this.alerts.slice(-10) // Last 10 alerts
        };
    }
    
    calculateHealthScore() {
        // Simple health score calculation (0-100)
        let score = 100;
        
        // Deduct points for errors
        const errorCount = Array.from(this.metrics.errors.values())
            .reduce((sum, errors) => sum + errors.length, 0);
        score -= Math.min(errorCount * 2, 30);
        
        // Deduct points for critical alerts
        const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
        score -= Math.min(criticalAlerts * 10, 40);
        
        // Deduct points for poor performance
        const apiMetrics = this.metrics.performance.get('api_response_time') || [];
        if (apiMetrics.length > 0) {
            const avgResponseTime = apiMetrics.slice(-10)
                .reduce((sum, m) => sum + m.value, 0) / Math.min(apiMetrics.length, 10);
            if (avgResponseTime > 500) {
                score -= 20;
            } else if (avgResponseTime > 200) {
                score -= 10;
            }
        }
        
        return Math.max(score, 0);
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        // Performance recommendations
        const apiMetrics = this.metrics.performance.get('api_response_time') || [];
        if (apiMetrics.length > 0) {
            const avgResponseTime = apiMetrics.slice(-10)
                .reduce((sum, m) => sum + m.value, 0) / Math.min(apiMetrics.length, 10);
            if (avgResponseTime > 200) {
                recommendations.push({
                    type: 'performance',
                    priority: avgResponseTime > 500 ? 'high' : 'medium',
                    message: `API response time is ${Math.round(avgResponseTime)}ms. Consider optimizing database queries and adding caching.`
                });
            }
        }
        
        // Error recommendations
        const errorCount = Array.from(this.metrics.errors.values())
            .reduce((sum, errors) => sum + errors.length, 0);
        if (errorCount > 10) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                message: `High error count detected (${errorCount}). Review error logs and implement proper error handling.`
            });
        }
        
        // Memory recommendations
        const memoryMetrics = this.metrics.performance.get('memory_usage_heap') || [];
        if (memoryMetrics.length > 0) {
            const latestMemory = memoryMetrics[memoryMetrics.length - 1].value;
            const memoryMB = latestMemory / (1024 * 1024);
            if (memoryMB > 100) {
                recommendations.push({
                    type: 'resource',
                    priority: 'medium',
                    message: `Memory usage is ${Math.round(memoryMB)}MB. Consider optimizing memory usage or increasing available memory.`
                });
            }
        }
        
        return recommendations;
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemMonitor;
} else if (typeof window !== 'undefined') {
    window.SystemMonitor = SystemMonitor;
}

// Example usage:
/*
const monitor = new SystemMonitor({
    metricsInterval: 30000, // 30 seconds
    enableRealTimeMonitoring: true
});

// In Express.js app:
app.use(monitor.apiPerformanceMiddleware);

// Generate report:
const report = monitor.generateReport();
console.log('System Health Report:', report);
*/