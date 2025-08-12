const winston = require('winston');

/**
 * Analytics Service for SMS tracking and metrics
 */
class AnalyticsService {
  constructor(config = {}) {
    this.config = config;
    this.logger = this.initializeLogger();
    this.metrics = new Map(); // In-memory storage for demo
    this.initialized = false;
  }

  /**
   * Initialize logging
   */
  initializeLogger() {
    return winston.createLogger({
      level: this.config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: this.config.logFile || 'logs/analytics.log' 
        })
      ]
    });
  }

  /**
   * Initialize the analytics service
   */
  async initialize() {
    try {
      this.logger.info('Initializing Analytics Service...');
      
      // TODO: Initialize database connection for persistent storage
      // TODO: Set up metrics aggregation jobs
      
      this.initialized = true;
      this.logger.info('Analytics Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Analytics Service:', error);
      throw error;
    }
  }

  /**
   * Track SMS event
   */
  async trackSMSEvent(eventData) {
    try {
      const {
        eventType, // 'queued', 'sent', 'delivered', 'failed', 'bounced'
        jobId,
        tenantId,
        messageId,
        provider,
        to,
        from,
        messageLength,
        cost,
        timestamp = new Date(),
        metadata = {}
      } = eventData;

      const event = {
        id: this.generateEventId(),
        eventType,
        jobId,
        tenantId,
        messageId,
        provider,
        to: this.hashPhoneNumber(to), // Hash for privacy
        from,
        messageLength,
        cost,
        timestamp,
        metadata,
        createdAt: new Date()
      };

      // Store event (in-memory for demo, should be database in production)
      if (!this.metrics.has(tenantId)) {
        this.metrics.set(tenantId, {
          events: [],
          summary: {
            totalSent: 0,
            totalFailed: 0,
            totalQueued: 0,
            totalCost: 0,
            providers: {},
            dailyStats: {}
          }
        });
      }

      const tenantMetrics = this.metrics.get(tenantId);
      tenantMetrics.events.push(event);
      this.updateSummary(tenantId, event);

      this.logger.info(`SMS event tracked: ${eventType} for tenant ${tenantId}`);
      return { success: true, eventId: event.id };
    } catch (error) {
      this.logger.error('Failed to track SMS event:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a tenant
   */
  async getAnalytics(tenantId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        provider = null,
        eventType = null,
        groupBy = 'day' // day, hour, month
      } = options;

      const tenantMetrics = this.metrics.get(tenantId);
      
      if (!tenantMetrics) {
        return {
          success: true,
          data: this.getEmptyAnalytics(startDate, endDate)
        };
      }

      // Filter events by date range and criteria
      const filteredEvents = tenantMetrics.events.filter(event => {
        const eventDate = new Date(event.timestamp);
        let matches = eventDate >= startDate && eventDate <= endDate;
        
        if (provider) matches = matches && event.provider === provider;
        if (eventType) matches = matches && event.eventType === eventType;
        
        return matches;
      });

      // Generate analytics data
      const analytics = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: this.calculateSummary(filteredEvents),
        breakdown: this.generateBreakdown(filteredEvents, groupBy),
        providers: this.getProviderStats(filteredEvents),
        trends: this.calculateTrends(filteredEvents, groupBy)
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      this.logger.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(tenantId) {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const tenantMetrics = this.metrics.get(tenantId);
      
      if (!tenantMetrics) {
        return {
          success: true,
          data: {
            lastHour: { sent: 0, failed: 0, queued: 0 },
            last24Hours: { sent: 0, failed: 0, queued: 0 },
            currentQueue: { size: 0, processing: 0 }
          }
        };
      }

      const last24HourEvents = tenantMetrics.events.filter(
        event => new Date(event.timestamp) >= last24Hours
      );
      
      const lastHourEvents = tenantMetrics.events.filter(
        event => new Date(event.timestamp) >= lastHour
      );

      return {
        success: true,
        data: {
          lastHour: this.calculateSummary(lastHourEvents),
          last24Hours: this.calculateSummary(last24HourEvents),
          currentQueue: await this.getQueueMetrics(tenantId),
          timestamp: now.toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Generate delivery report
   */
  async generateDeliveryReport(tenantId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        format = 'json' // json, csv
      } = options;

      const analytics = await this.getAnalytics(tenantId, { startDate, endDate });
      
      if (format === 'csv') {
        return {
          success: true,
          data: this.formatAsCSV(analytics.data),
          contentType: 'text/csv',
          filename: `sms-report-${tenantId}-${startDate.toISOString().split('T')[0]}.csv`
        };
      }

      return {
        success: true,
        data: {
          ...analytics.data,
          report: {
            generatedAt: new Date().toISOString(),
            tenantId,
            reportType: 'delivery',
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate delivery report:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  hashPhoneNumber(phoneNumber) {
    // Simple hash for privacy - in production, use proper hashing
    return phoneNumber ? phoneNumber.slice(-4).padStart(phoneNumber.length, '*') : '';
  }

  updateSummary(tenantId, event) {
    const tenantMetrics = this.metrics.get(tenantId);
    const summary = tenantMetrics.summary;

    switch (event.eventType) {
      case 'sent':
        summary.totalSent++;
        break;
      case 'failed':
        summary.totalFailed++;
        break;
      case 'queued':
        summary.totalQueued++;
        break;
    }

    if (event.cost) {
      summary.totalCost += event.cost;
    }

    // Provider stats
    if (!summary.providers[event.provider]) {
      summary.providers[event.provider] = { sent: 0, failed: 0, cost: 0 };
    }
    
    if (event.eventType === 'sent') {
      summary.providers[event.provider].sent++;
    } else if (event.eventType === 'failed') {
      summary.providers[event.provider].failed++;
    }
    
    if (event.cost) {
      summary.providers[event.provider].cost += event.cost;
    }
  }

  calculateSummary(events) {
    return events.reduce((summary, event) => {
      switch (event.eventType) {
        case 'sent':
          summary.sent++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'queued':
          summary.queued++;
          break;
        case 'delivered':
          summary.delivered++;
          break;
      }
      
      if (event.cost) {
        summary.totalCost += event.cost;
      }
      
      return summary;
    }, { sent: 0, failed: 0, queued: 0, delivered: 0, totalCost: 0 });
  }

  generateBreakdown(events, groupBy) {
    const breakdown = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      let key;
      
      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!breakdown[key]) {
        breakdown[key] = { sent: 0, failed: 0, queued: 0, delivered: 0 };
      }
      
      breakdown[key][event.eventType]++;
    });
    
    return breakdown;
  }

  getProviderStats(events) {
    const providers = {};
    
    events.forEach(event => {
      if (!providers[event.provider]) {
        providers[event.provider] = {
          sent: 0,
          failed: 0,
          totalCost: 0,
          averageDeliveryTime: 0
        };
      }
      
      if (event.eventType === 'sent') {
        providers[event.provider].sent++;
      } else if (event.eventType === 'failed') {
        providers[event.provider].failed++;
      }
      
      if (event.cost) {
        providers[event.provider].totalCost += event.cost;
      }
    });
    
    return providers;
  }

  calculateTrends(events, groupBy) {
    // Calculate week-over-week or day-over-day trends
    const breakdown = this.generateBreakdown(events, groupBy);
    const keys = Object.keys(breakdown).sort();
    
    if (keys.length < 2) return {};
    
    const current = breakdown[keys[keys.length - 1]];
    const previous = breakdown[keys[keys.length - 2]];
    
    return {
      sent: this.calculatePercentageChange(previous.sent, current.sent),
      failed: this.calculatePercentageChange(previous.failed, current.failed),
      period: groupBy
    };
  }

  calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
  }

  getEmptyAnalytics(startDate, endDate) {
    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: { sent: 0, failed: 0, queued: 0, delivered: 0, totalCost: 0 },
      breakdown: {},
      providers: {},
      trends: {}
    };
  }

  async getQueueMetrics(tenantId) {
    // TODO: Integrate with actual queue metrics
    return { size: 0, processing: 0 };
  }

  formatAsCSV(data) {
    // Simple CSV formatter - in production, use proper CSV library
    let csv = 'Date,Sent,Failed,Queued,Delivered,Cost\n';
    
    Object.entries(data.breakdown).forEach(([date, stats]) => {
      csv += `${date},${stats.sent},${stats.failed},${stats.queued},${stats.delivered || 0},${stats.totalCost || 0}\n`;
    });
    
    return csv;
  }
}

module.exports = AnalyticsService;