const { providerFactory } = require('../providers/provider-factory');
let Queue;
try {
    Queue = require('bull');
} catch (e) {
    console.warn('Bull queue not available - install bull package to enable message queuing');
}
let winston;
try {
    winston = require('winston');
} catch (e) {
    // Fallback to console logging if winston is not available
    winston = {
        createLogger: () => ({
            info: console.log,
            error: console.error,
            warn: console.warn,
            debug: console.debug
        })
    };
}

/**
 * Main SMS Service
 * Handles all SMS operations with provider abstraction, queuing, and retry logic
 */
class SMSService {
  constructor(config = {}) {
    this.config = config;
    this.logger = this.initializeLogger();
    this.smsQueue = null;
    this.bulkQueue = null;
    this.initialized = false;
    
    // Service statistics
    this.stats = {
      messagesSent: 0,
      messagesQueued: 0,
      messagesFailed: 0,
      bulkJobsProcessed: 0,
      startTime: new Date()
    };
  }

  /**
   * Initialize the SMS service
   */
  async initialize() {
    try {
      this.logger.info('Initializing SMS Service...');
      
      // Initialize Redis queues if Bull is available
      if (Queue) {
        await this.initializeQueues();
      } else {
        this.logger.warn('Queuing disabled - Bull package not installed');
      }
      
      // Load providers from configuration
      if (this.config.providers) {
        const results = await providerFactory.loadProvidersFromConfig(this.config.providers);
        const successfulProviders = results.filter(r => r.success).length;
        
        if (successfulProviders === 0) {
          this.logger.warn('No SMS providers available - SMS functionality will be limited');
        }
      }
      
      this.initialized = true;
      this.logger.info('SMS Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SMS Service:', error);
      throw error;
    }
  }

  /**
   * Initialize logging
   */
  initializeLogger() {
    // If winston has format, use it; otherwise use the fallback logger
    if (winston && winston.format && winston.transports) {
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
            filename: this.config.logFile || 'logs/sms-service.log' 
          })
        ]
      });
    } else {
      // Fallback logger implementation
      return winston.createLogger();
    }
  }

  /**
   * Initialize Redis queues for SMS processing
   */
  async initializeQueues() {
    if (!Queue) {
      this.logger.warn('Queue initialization skipped - Bull not available');
      return;
    }
    
    const redisConfig = this.config.redis || {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    };

    try {
      // SMS queue for single messages
      this.smsQueue = new Queue('sms queue', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3,
          backoff: {
            type: 'exponential',
            delay: parseInt(process.env.QUEUE_RETRY_DELAY) || 5000
          }
        }
      });

      // Bulk SMS queue for batch processing
      this.bulkQueue = new Queue('bulk sms queue', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 10000
          }
        }
      });

      // Set up queue processors
      this.setupQueueProcessors();
      
      this.logger.info('SMS queues initialized');
    } catch (error) {
      this.logger.error('Failed to initialize queues:', error);
      // Continue without queuing support
    }
  }

  /**
   * Set up queue processors
   */
  setupQueueProcessors() {
    if (!this.smsQueue || !this.bulkQueue) {
      return;
    }
    
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY) || 5;

    // Process single SMS messages
    this.smsQueue.process(concurrency, async (job) => {
      const { message, options, tenantId, providerName } = job.data;
      
      try {
        this.logger.info(`Processing SMS job ${job.id} for tenant ${tenantId}`);
        
        const provider = providerFactory.getProvider(providerName);
        const result = await provider.sendSMS(message, options);
        
        if (result.success) {
          this.stats.messagesSent++;
          this.logger.info(`SMS sent successfully: ${result.messageId}`);
        } else {
          this.stats.messagesFailed++;
          this.logger.error(`SMS failed: ${result.error}`);
        }
        
        return result;
      } catch (error) {
        this.stats.messagesFailed++;
        this.logger.error(`SMS job ${job.id} failed:`, error);
        throw error;
      }
    });

    // Process bulk SMS messages
    this.bulkQueue.process(2, async (job) => {
      const { messages, options, tenantId, providerName } = job.data;
      
      try {
        this.logger.info(`Processing bulk SMS job ${job.id} with ${messages.length} messages`);
        
        const provider = providerFactory.getProvider(providerName);
        const results = await provider.sendBulkSMS(messages, options);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        
        this.stats.messagesSent += successful;
        this.stats.messagesFailed += failed;
        this.stats.bulkJobsProcessed++;
        
        this.logger.info(`Bulk SMS completed: ${successful} sent, ${failed} failed`);
        
        return {
          success: true,
          results,
          summary: { successful, failed, total: results.length }
        };
      } catch (error) {
        this.stats.messagesFailed += messages.length;
        this.logger.error(`Bulk SMS job ${job.id} failed:`, error);
        throw error;
      }
    });

    // Queue event handlers
    this.smsQueue.on('completed', (job, result) => {
      this.logger.debug(`SMS job ${job.id} completed`);
    });

    this.smsQueue.on('failed', (job, err) => {
      this.logger.error(`SMS job ${job.id} failed:`, err.message);
    });

    this.bulkQueue.on('completed', (job, result) => {
      this.logger.info(`Bulk SMS job ${job.id} completed`);
    });

    this.bulkQueue.on('failed', (job, err) => {
      this.logger.error(`Bulk SMS job ${job.id} failed:`, err.message);
    });
  }

  /**
   * Send a single SMS message
   * @param {Object} params - SMS parameters
   * @returns {Promise<Object>} - Result object
   */
  async sendSMS(params) {
    if (!this.initialized) {
      throw new Error('SMS Service not initialized');
    }

    const {
      to,
      body,
      from = null,
      tenantId,
      providerName = null,
      priority = 'normal',
      scheduledAt = null,
      options = {}
    } = params;

    // Validate required parameters
    if (!to || !body || !tenantId) {
      throw new Error('Missing required parameters: to, body, tenantId');
    }

    const message = { to, body, from };
    const jobData = {
      message,
      options,
      tenantId,
      providerName,
      timestamp: new Date().toISOString()
    };

    try {
      // Add job to queue
      const jobOptions = {
        priority: this.getPriorityValue(priority)
      };

      if (scheduledAt) {
        jobOptions.delay = new Date(scheduledAt).getTime() - Date.now();
      }

      const job = await this.smsQueue.add('send-sms', jobData, jobOptions);
      
      this.stats.messagesQueued++;
      this.logger.info(`SMS job ${job.id} queued for tenant ${tenantId}`);

      return {
        success: true,
        jobId: job.id,
        message: 'SMS queued for processing',
        estimatedProcessingTime: this.getEstimatedProcessingTime()
      };
    } catch (error) {
      this.logger.error('Failed to queue SMS:', error);
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   * @param {Object} params - Bulk SMS parameters
   * @returns {Promise<Object>} - Result object
   */
  async sendBulkSMS(params) {
    if (!this.initialized) {
      throw new Error('SMS Service not initialized');
    }

    const {
      messages,
      tenantId,
      providerName = null,
      batchSize = 50,
      delay = 1000,
      priority = 'normal',
      scheduledAt = null,
      options = {}
    } = params;

    // Validate required parameters
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and cannot be empty');
    }

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Validate message format
    for (const message of messages) {
      if (!message.to || !message.body) {
        throw new Error('Each message must have "to" and "body" properties');
      }
    }

    const jobData = {
      messages,
      options: { ...options, batchSize, delay },
      tenantId,
      providerName,
      timestamp: new Date().toISOString()
    };

    try {
      const jobOptions = {
        priority: this.getPriorityValue(priority)
      };

      if (scheduledAt) {
        jobOptions.delay = new Date(scheduledAt).getTime() - Date.now();
      }

      const job = await this.bulkQueue.add('send-bulk-sms', jobData, jobOptions);
      
      this.stats.messagesQueued += messages.length;
      this.logger.info(`Bulk SMS job ${job.id} queued with ${messages.length} messages`);

      return {
        success: true,
        jobId: job.id,
        messageCount: messages.length,
        message: 'Bulk SMS queued for processing',
        estimatedProcessingTime: this.getEstimatedBulkProcessingTime(messages.length)
      };
    } catch (error) {
      this.logger.error('Failed to queue bulk SMS:', error);
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @param {string} queueType - Queue type ('sms' or 'bulk')
   * @returns {Promise<Object>} - Job status
   */
  async getJobStatus(jobId, queueType = 'sms') {
    const queue = queueType === 'bulk' ? this.bulkQueue : this.smsQueue;
    
    try {
      const job = await queue.getJob(jobId);
      
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const state = await job.getState();
      const progress = job.progress();
      const result = job.returnvalue;

      return {
        success: true,
        jobId,
        state,
        progress,
        result,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        createdAt: new Date(job.timestamp).toISOString(),
        processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get service statistics
   * @returns {Object} - Service statistics
   */
  async getStats() {
    const queueStats = await Promise.all([
      this.smsQueue.getWaiting(),
      this.smsQueue.getActive(),
      this.smsQueue.getCompleted(),
      this.smsQueue.getFailed(),
      this.bulkQueue.getWaiting(),
      this.bulkQueue.getActive(),
      this.bulkQueue.getCompleted(),
      this.bulkQueue.getFailed()
    ]);

    const providersStats = await providerFactory.getProvidersStats();

    return {
      service: {
        ...this.stats,
        uptime: Date.now() - this.stats.startTime.getTime(),
        initialized: this.initialized
      },
      queues: {
        sms: {
          waiting: queueStats[0].length,
          active: queueStats[1].length,
          completed: queueStats[2].length,
          failed: queueStats[3].length
        },
        bulk: {
          waiting: queueStats[4].length,
          active: queueStats[5].length,
          completed: queueStats[6].length,
          failed: queueStats[7].length
        }
      },
      providers: providersStats
    };
  }

  /**
   * Helper method to get priority value for queue
   */
  getPriorityValue(priority) {
    const priorities = { low: 1, normal: 5, high: 10, urgent: 15 };
    return priorities[priority] || 5;
  }

  /**
   * Estimate processing time for single SMS
   */
  getEstimatedProcessingTime() {
    // Basic estimation based on queue length
    return '30-60 seconds';
  }

  /**
   * Estimate processing time for bulk SMS
   */
  getEstimatedBulkProcessingTime(messageCount) {
    const estimatedMinutes = Math.ceil(messageCount / 100);
    return `${estimatedMinutes}-${estimatedMinutes * 2} minutes`;
  }

  /**
   * Shutdown service gracefully
   */
  async shutdown() {
    this.logger.info('Shutting down SMS Service...');
    
    if (this.smsQueue) {
      await this.smsQueue.close();
    }
    
    if (this.bulkQueue) {
      await this.bulkQueue.close();
    }
    
    this.initialized = false;
    this.logger.info('SMS Service shutdown complete');
  }
}

module.exports = SMSService;