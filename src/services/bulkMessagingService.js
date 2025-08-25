const { BulkMessageJob, Customer, Message } = require('../models');
const multiChannelMessagingService = require('./multiChannelMessagingService');
const { Op } = require('sequelize');

class BulkMessagingService {
  constructor() {
    this.processingJobs = new Map();
    this.batchSize = 50; // Process 50 messages at a time
  }

  // Create a new bulk message job
  async createBulkJob(userId, jobData) {
    try {
      const { name, channels, recipientFilter, messageContent, scheduledAt } = jobData;

      // Get recipient count based on filter
      const recipientCount = await this.getRecipientCount(userId, recipientFilter, channels);

      const job = await BulkMessageJob.create({
        userId,
        name,
        channels,
        recipientFilter,
        recipientCount,
        messageContent,
        scheduledAt,
        status: scheduledAt ? 'scheduled' : 'draft'
      });

      return job;
    } catch (error) {
      console.error('Failed to create bulk job:', error);
      throw error;
    }
  }

  // Get count of recipients based on filter
  async getRecipientCount(userId, filter, channels) {
    const where = { userId, isActive: true };

    // Apply tag filter
    if (filter.tags && filter.tags.length > 0) {
      where.tags = { [Op.overlap]: filter.tags };
    }

    // Apply channel availability filter
    const channelConditions = [];
    for (const channel of channels) {
      const condition = {};
      condition[`channelPreferences.${channel}`] = true;

      switch (channel) {
        case 'sms':
          condition.phoneNumber = { [Op.not]: null };
          break;
        case 'email':
          condition.email = { [Op.not]: null };
          break;
        case 'line':
          condition.lineUserId = { [Op.not]: null };
          break;
        case 'instagram':
          condition.instagramUserId = { [Op.not]: null };
          break;
      }
      channelConditions.push(condition);
    }

    if (channelConditions.length > 0) {
      where[Op.or] = channelConditions;
    }

    // Apply custom query if provided
    if (filter.customQuery) {
      Object.assign(where, filter.customQuery);
    }

    const count = await Customer.count({ where });
    return count;
  }

  // Get recipients based on filter
  async getRecipients(userId, filter, channels, limit, offset) {
    const where = { userId, isActive: true };

    // Apply filters (same as getRecipientCount)
    if (filter.tags && filter.tags.length > 0) {
      where.tags = { [Op.overlap]: filter.tags };
    }

    const channelConditions = [];
    for (const channel of channels) {
      const condition = {};
      condition[`channelPreferences.${channel}`] = true;

      switch (channel) {
        case 'sms':
          condition.phoneNumber = { [Op.not]: null };
          break;
        case 'email':
          condition.email = { [Op.not]: null };
          break;
        case 'line':
          condition.lineUserId = { [Op.not]: null };
          break;
        case 'instagram':
          condition.instagramUserId = { [Op.not]: null };
          break;
      }
      channelConditions.push(condition);
    }

    if (channelConditions.length > 0) {
      where[Op.or] = channelConditions;
    }

    if (filter.customQuery) {
      Object.assign(where, filter.customQuery);
    }

    const recipients = await Customer.findAll({
      where,
      limit,
      offset,
      attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'lineUserId', 'instagramUserId', 'channelPreferences', 'preferredChannel']
    });

    return recipients;
  }

  // Process a bulk message job
  async processBulkJob(jobId) {
    try {
      const job = await BulkMessageJob.findByPk(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.status !== 'draft' && job.status !== 'scheduled') {
        throw new Error('Job cannot be processed in current status');
      }

      // Update job status
      await job.update({
        status: 'processing',
        startedAt: new Date()
      });

      // Store in processing map
      this.processingJobs.set(jobId, {
        job,
        processed: 0,
        sent: 0,
        failed: 0,
        cancelled: false
      });

      // Initialize messaging service
      await multiChannelMessagingService.initialize(job.userId);

      // Process in batches
      let offset = 0;
      const statistics = {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0
      };

      while (offset < job.recipientCount && !this.processingJobs.get(jobId).cancelled) {
        const recipients = await this.getRecipients(
          job.userId,
          job.recipientFilter,
          job.channels,
          this.batchSize,
          offset
        );

        if (recipients.length === 0) break;

        // Process batch
        const batchResults = await this.processBatch(job, recipients);
        
        // Update statistics
        statistics.total += batchResults.total;
        statistics.sent += batchResults.sent;
        statistics.failed += batchResults.failed;

        // Update job progress
        await job.update({ statistics });

        offset += this.batchSize;

        // Add delay between batches to avoid rate limits
        await this.delay(1000);
      }

      // Finalize job
      const finalStatus = this.processingJobs.get(jobId).cancelled ? 'cancelled' : 'completed';
      await job.update({
        status: finalStatus,
        completedAt: new Date(),
        statistics
      });

      // Clean up
      this.processingJobs.delete(jobId);

      return job;
    } catch (error) {
      console.error('Failed to process bulk job:', error);
      
      // Update job with error
      await BulkMessageJob.update(
        {
          status: 'failed',
          failureReason: error.message,
          completedAt: new Date()
        },
        { where: { id: jobId } }
      );

      // Clean up
      this.processingJobs.delete(jobId);
      
      throw error;
    }
  }

  // Process a batch of recipients
  async processBatch(job, recipients) {
    const results = {
      total: 0,
      sent: 0,
      failed: 0
    };

    const sendPromises = [];

    for (const recipient of recipients) {
      // Determine best channel for recipient
      const channel = this.selectBestChannel(recipient, job.channels);
      if (!channel) continue;

      results.total++;

      // Get channel-specific content
      const content = job.messageContent[channel];
      if (!content) continue;

      // Create send promise
      const sendPromise = multiChannelMessagingService
        .sendMessage(job.userId, recipient.id, channel, content, { bulkJobId: job.id })
        .then(() => {
          results.sent++;
        })
        .catch((error) => {
          console.error(`Failed to send ${channel} to ${recipient.id}:`, error);
          results.failed++;
        });

      sendPromises.push(sendPromise);
    }

    // Wait for all messages in batch to complete
    await Promise.all(sendPromises);

    return results;
  }

  // Select best channel for recipient
  selectBestChannel(recipient, availableChannels) {
    // First try preferred channel
    if (availableChannels.includes(recipient.preferredChannel) &&
        recipient.channelPreferences[recipient.preferredChannel] &&
        this.hasChannelIdentifier(recipient, recipient.preferredChannel)) {
      return recipient.preferredChannel;
    }

    // Try other channels in order
    for (const channel of availableChannels) {
      if (recipient.channelPreferences[channel] &&
          this.hasChannelIdentifier(recipient, channel)) {
        return channel;
      }
    }

    return null;
  }

  // Check if recipient has identifier for channel
  hasChannelIdentifier(recipient, channel) {
    switch (channel) {
      case 'sms':
        return !!recipient.phoneNumber;
      case 'email':
        return !!recipient.email;
      case 'line':
        return !!recipient.lineUserId;
      case 'instagram':
        return !!recipient.instagramUserId;
      default:
        return false;
    }
  }

  // Cancel a running job
  async cancelJob(jobId) {
    const processingJob = this.processingJobs.get(jobId);
    if (processingJob) {
      processingJob.cancelled = true;
    }

    await BulkMessageJob.update(
      { status: 'cancelled', completedAt: new Date() },
      { where: { id: jobId, status: 'processing' } }
    );
  }

  // Get job status
  async getJobStatus(jobId) {
    const job = await BulkMessageJob.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const processingInfo = this.processingJobs.get(jobId);
    
    return {
      job,
      isProcessing: !!processingInfo,
      progress: processingInfo ? {
        processed: processingInfo.processed,
        total: job.recipientCount,
        percentage: Math.round((processingInfo.processed / job.recipientCount) * 100)
      } : null
    };
  }

  // Schedule job processing
  async scheduleJobs() {
    // Find jobs that need to be processed
    const now = new Date();
    const scheduledJobs = await BulkMessageJob.findAll({
      where: {
        status: 'scheduled',
        scheduledAt: { [Op.lte]: now }
      }
    });

    for (const job of scheduledJobs) {
      // Process job asynchronously
      this.processBulkJob(job.id).catch(error => {
        console.error(`Failed to process scheduled job ${job.id}:`, error);
      });
    }
  }

  // Preview message for specific recipients
  async previewMessage(userId, jobData, sampleSize = 5) {
    const { channels, recipientFilter, messageContent } = jobData;

    // Get sample recipients
    const recipients = await this.getRecipients(userId, recipientFilter, channels, sampleSize, 0);

    const previews = [];
    for (const recipient of recipients) {
      const channel = this.selectBestChannel(recipient, channels);
      if (!channel) continue;

      const content = messageContent[channel];
      const preview = {
        recipient: {
          id: recipient.id,
          name: `${recipient.firstName} ${recipient.lastName}`,
          channel
        },
        message: this.personalizeMessage(content, recipient)
      };

      previews.push(preview);
    }

    return previews;
  }

  // Personalize message content
  personalizeMessage(content, recipient) {
    let personalizedContent = content;

    // Replace placeholders
    const replacements = {
      '{{firstName}}': recipient.firstName || '',
      '{{lastName}}': recipient.lastName || '',
      '{{fullName}}': `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim()
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      if (typeof personalizedContent === 'string') {
        personalizedContent = personalizedContent.replace(new RegExp(placeholder, 'g'), value);
      } else if (typeof personalizedContent === 'object') {
        // Handle email content object
        if (personalizedContent.subject) {
          personalizedContent.subject = personalizedContent.subject.replace(new RegExp(placeholder, 'g'), value);
        }
        if (personalizedContent.text) {
          personalizedContent.text = personalizedContent.text.replace(new RegExp(placeholder, 'g'), value);
        }
        if (personalizedContent.html) {
          personalizedContent.html = personalizedContent.html.replace(new RegExp(placeholder, 'g'), value);
        }
      }
    }

    return personalizedContent;
  }

  // Get bulk job history
  async getJobHistory(userId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const jobs = await BulkMessageJob.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return jobs;
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BulkMessagingService();
module.exports.BulkMessagingService = BulkMessagingService;