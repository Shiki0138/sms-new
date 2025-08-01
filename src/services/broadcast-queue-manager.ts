/**
 * Broadcast Queue Manager
 * Distributed queue system for handling large-scale message delivery
 * with priority handling, rate limiting, and failure recovery
 */

import { supabase } from '../lib/supabase';
import { addMinutes, addSeconds, parseISO } from 'date-fns';

export interface QueueConfiguration {
  maxConcurrentJobs: number;
  defaultPriority: number;
  retryAttempts: number;
  retryBackoffMs: number;
  batchSize: number;
  processingTimeoutMs: number;
  channelRateLimits: Record<string, {
    messagesPerMinute: number;
    burstLimit: number;
  }>;
  priorityWeights: Record<string, number>;
}

export interface QueueJob {
  id: string;
  tenant_id: string;
  broadcast_id: string;
  customer_id: string;
  channel: string;
  content: string;
  subject?: string;
  priority: number;
  scheduled_for: string;
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'rate_limited';
  error_message?: string;
  processing_node?: string;
  created_at: string;
  processed_at?: string;
  metadata?: Record<string, any>;
}

export interface QueueMetrics {
  total_jobs: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  rate_limited_jobs: number;
  average_processing_time_ms: number;
  throughput_per_minute: number;
  channel_metrics: Record<string, {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    success_rate: number;
    avg_processing_time_ms: number;
  }>;
}

export interface RateLimiter {
  channel: string;
  current_count: number;
  burst_count: number;
  reset_time: string;
  burst_reset_time: string;
  blocked_until?: string;
}

export class BroadcastQueueManager {
  private tenantId: string;
  private config: QueueConfiguration;
  private isProcessing: boolean = false;
  private processingNode: string;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private lastMetricsUpdate: number = 0;
  private metricsCache?: QueueMetrics;

  constructor(tenantId: string, config?: Partial<QueueConfiguration>) {
    this.tenantId = tenantId;
    this.processingNode = `node-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    this.config = {
      maxConcurrentJobs: 10,
      defaultPriority: 5,
      retryAttempts: 3,
      retryBackoffMs: 5000,
      batchSize: 50,
      processingTimeoutMs: 300000, // 5 minutes
      channelRateLimits: {
        line: { messagesPerMinute: 100, burstLimit: 500 },
        instagram: { messagesPerMinute: 50, burstLimit: 200 },
        sms: { messagesPerMinute: 60, burstLimit: 300 },
        email: { messagesPerMinute: 200, burstLimit: 1000 },
      },
      priorityWeights: {
        urgent: 10,
        high: 8,
        normal: 5,
        low: 2,
        bulk: 1,
      },
      ...config,
    };

    this.initializeRateLimiters();
  }

  /**
   * Initialize rate limiters for all channels
   */
  private initializeRateLimiters(): void {
    Object.entries(this.config.channelRateLimits).forEach(([channel, limits]) => {
      this.rateLimiters.set(channel, {
        channel,
        current_count: 0,
        burst_count: 0,
        reset_time: addMinutes(new Date(), 1).toISOString(),
        burst_reset_time: addMinutes(new Date(), 5).toISOString(),
      });
    });
  }

  /**
   * Add jobs to the queue
   */
  async enqueueJobs(jobs: Omit<QueueJob, 'id' | 'tenant_id' | 'created_at' | 'status' | 'retry_count'>[]): Promise<string[]> {
    const jobsToInsert = jobs.map(job => ({
      ...job,
      id: crypto.randomUUID(),
      tenant_id: this.tenantId,
      status: 'pending' as const,
      retry_count: 0,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('broadcast_queue')
      .insert(jobsToInsert)
      .select('id');

    if (error) throw error;

    return data?.map(d => d.id) || [];
  }

  /**
   * Start processing the queue
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log(`Queue processor started on node: ${this.processingNode}`);

    try {
      while (this.isProcessing) {
        await this.processNextBatch();
        await this.cleanupStaleJobs();
        await this.updateRateLimiters();
        
        // Short delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      console.log('Queue processing stopped');
    }
  }

  /**
   * Stop processing the queue
   */
  async stopProcessing(): Promise<void> {
    this.isProcessing = false;
    
    // Mark any jobs being processed by this node as pending again
    await supabase
      .from('broadcast_queue')
      .update({ 
        status: 'pending',
        processing_node: null,
        error_message: 'Processing interrupted - node shutdown'
      })
      .eq('tenant_id', this.tenantId)
      .eq('processing_node', this.processingNode)
      .eq('status', 'processing');
  }

  /**
   * Process next batch of jobs
   */
  private async processNextBatch(): Promise<void> {
    // Get available jobs considering rate limits
    const availableJobs = await this.getAvailableJobs();
    
    if (availableJobs.length === 0) return;

    // Process jobs concurrently
    const processingPromises = availableJobs.map(job => 
      this.processJob(job).catch(error => {
        console.error(`Error processing job ${job.id}:`, error);
        return this.markJobFailed(job, error.message);
      })
    );

    await Promise.allSettled(processingPromises);
  }

  /**
   * Get jobs that can be processed based on rate limits and priorities
   */
  private async getAvailableJobs(): Promise<QueueJob[]> {
    const now = new Date().toISOString();
    
    // Get pending jobs ordered by priority and scheduled time
    const { data: pendingJobs, error } = await supabase
      .from('broadcast_queue')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('priority', { ascending: false })
      .order('scheduled_for')
      .limit(this.config.batchSize);

    if (error) throw error;
    if (!pendingJobs) return [];

    // Filter jobs based on rate limits
    const availableJobs: QueueJob[] = [];
    const channelCounts: Record<string, number> = {};

    for (const job of pendingJobs) {
      const rateLimiter = this.rateLimiters.get(job.channel);
      if (!rateLimiter) continue;

      // Check if channel is temporarily blocked
      if (rateLimiter.blocked_until && new Date(rateLimiter.blocked_until) > new Date()) {
        continue;
      }

      const currentChannelCount = channelCounts[job.channel] || 0;
      const remainingCapacity = this.getRemainingCapacity(job.channel);

      if (currentChannelCount < remainingCapacity) {
        availableJobs.push(job);
        channelCounts[job.channel] = currentChannelCount + 1;
      }
    }

    return availableJobs.slice(0, this.config.maxConcurrentJobs);
  }

  /**
   * Get remaining capacity for a channel based on rate limits
   */
  private getRemainingCapacity(channel: string): number {
    const rateLimiter = this.rateLimiters.get(channel);
    const channelLimits = this.config.channelRateLimits[channel];
    
    if (!rateLimiter || !channelLimits) return 0;

    return Math.max(0, channelLimits.messagesPerMinute - rateLimiter.current_count);
  }

  /**
   * Process individual job
   */
  private async processJob(job: QueueJob): Promise<void> {
    // Mark job as processing
    await supabase
      .from('broadcast_queue')
      .update({
        status: 'processing',
        processing_node: this.processingNode,
        processed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    try {
      // Simulate processing time and success/failure
      await this.executeJobLogic(job);

      // Mark job as completed
      await supabase
        .from('broadcast_queue')
        .update({
          status: 'sent',
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Update rate limiter
      this.incrementRateLimit(job.channel);

      // Record successful delivery
      await this.recordDeliveryResult(job, 'sent');

    } catch (error) {
      await this.handleJobError(job, error as Error);
    }
  }

  /**
   * Execute the actual job logic (sending message)
   */
  private async executeJobLogic(job: QueueJob): Promise<void> {
    // This would integrate with the actual channel services
    // For now, simulate processing with random success/failure
    
    const processingTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Simulated delivery failure');
    }

    // Log successful processing
    console.log(`Job ${job.id} processed successfully via ${job.channel}`);
  }

  /**
   * Handle job processing error
   */
  private async handleJobError(job: QueueJob, error: Error): Promise<void> {
    const newRetryCount = job.retry_count + 1;
    
    if (newRetryCount < job.max_retries) {
      // Schedule retry with exponential backoff
      const retryDelay = this.config.retryBackoffMs * Math.pow(2, newRetryCount);
      const retryTime = addSeconds(new Date(), Math.floor(retryDelay / 1000));

      await supabase
        .from('broadcast_queue')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          scheduled_for: retryTime.toISOString(),
          error_message: error.message,
          processing_node: null,
        })
        .eq('id', job.id);
    } else {
      // Mark as permanently failed
      await this.markJobFailed(job, error.message);
    }
  }

  /**
   * Mark job as permanently failed
   */
  private async markJobFailed(job: QueueJob, errorMessage: string): Promise<void> {
    await supabase
      .from('broadcast_queue')
      .update({
        status: 'failed',
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Record failed delivery
    await this.recordDeliveryResult(job, 'failed', errorMessage);
  }

  /**
   * Record delivery result for analytics
   */
  private async recordDeliveryResult(
    job: QueueJob, 
    status: 'sent' | 'failed', 
    errorMessage?: string
  ): Promise<void> {
    await supabase
      .from('broadcast_delivery_results')
      .insert({
        tenant_id: this.tenantId,
        broadcast_id: job.broadcast_id,
        customer_id: job.customer_id,
        channel: job.channel,
        status,
        message_queue_id: job.id,
        error_message: errorMessage,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Update rate limiters
   */
  private async updateRateLimiters(): Promise<void> {
    const now = new Date();

    this.rateLimiters.forEach((limiter, channel) => {
      // Reset minute counter
      if (new Date(limiter.reset_time) <= now) {
        limiter.current_count = 0;
        limiter.reset_time = addMinutes(now, 1).toISOString();
      }

      // Reset burst counter
      if (new Date(limiter.burst_reset_time) <= now) {
        limiter.burst_count = 0;
        limiter.burst_reset_time = addMinutes(now, 5).toISOString();
        limiter.blocked_until = undefined;
      }
    });
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(channel: string): void {
    const limiter = this.rateLimiters.get(channel);
    const limits = this.config.channelRateLimits[channel];
    
    if (!limiter || !limits) return;

    limiter.current_count++;
    limiter.burst_count++;

    // Check if burst limit exceeded
    if (limiter.burst_count >= limits.burstLimit) {
      limiter.blocked_until = addMinutes(new Date(), 5).toISOString();
    }
  }

  /**
   * Clean up stale jobs that have been processing too long
   */
  private async cleanupStaleJobs(): Promise<void> {
    const staleTime = addMinutes(new Date(), -Math.floor(this.config.processingTimeoutMs / 60000));

    await supabase
      .from('broadcast_queue')
      .update({
        status: 'pending',
        processing_node: null,
        error_message: 'Processing timeout - marked for retry',
      })
      .eq('tenant_id', this.tenantId)
      .eq('status', 'processing')
      .lt('processed_at', staleTime.toISOString());
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const now = Date.now();
    
    // Use cached metrics if updated recently
    if (this.metricsCache && (now - this.lastMetricsUpdate) < 30000) { // 30 seconds cache
      return this.metricsCache;
    }

    // Fetch current queue stats
    const { data: queueStats, error } = await supabase
      .from('broadcast_queue')
      .select('status, channel, created_at, processed_at')
      .eq('tenant_id', this.tenantId)
      .gte('created_at', addMinutes(new Date(), -60).toISOString()); // Last hour

    if (error) throw error;

    const stats = queueStats || [];
    
    // Calculate overall metrics
    const totalJobs = stats.length;
    const pendingJobs = stats.filter(s => s.status === 'pending').length;
    const processingJobs = stats.filter(s => s.status === 'processing').length;
    const completedJobs = stats.filter(s => s.status === 'sent').length;
    const failedJobs = stats.filter(s => s.status === 'failed').length;
    const rateLimitedJobs = stats.filter(s => s.status === 'rate_limited').length;

    // Calculate processing times
    const processingTimes = stats
      .filter(s => s.processed_at && s.created_at)
      .map(s => new Date(s.processed_at!).getTime() - new Date(s.created_at).getTime());

    const avgProcessingTime = processingTimes.length > 0 ?
      processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0;

    // Calculate throughput (completed jobs per minute)
    const throughput = completedJobs; // Already filtered to last hour

    // Calculate channel-specific metrics
    const channelMetrics: Record<string, any> = {};
    const channels = ['line', 'instagram', 'sms', 'email'];

    channels.forEach(channel => {
      const channelStats = stats.filter(s => s.channel === channel);
      const channelPending = channelStats.filter(s => s.status === 'pending').length;
      const channelProcessing = channelStats.filter(s => s.status === 'processing').length;
      const channelCompleted = channelStats.filter(s => s.status === 'sent').length;
      const channelFailed = channelStats.filter(s => s.status === 'failed').length;
      
      const channelProcessingTimes = channelStats
        .filter(s => s.processed_at && s.created_at)
        .map(s => new Date(s.processed_at!).getTime() - new Date(s.created_at).getTime());

      channelMetrics[channel] = {
        pending: channelPending,
        processing: channelProcessing,
        completed: channelCompleted,
        failed: channelFailed,
        success_rate: (channelCompleted + channelFailed) > 0 ? 
          (channelCompleted / (channelCompleted + channelFailed)) * 100 : 0,
        avg_processing_time_ms: channelProcessingTimes.length > 0 ?
          channelProcessingTimes.reduce((sum, time) => sum + time, 0) / channelProcessingTimes.length : 0,
      };
    });

    this.metricsCache = {
      total_jobs: totalJobs,
      pending_jobs: pendingJobs,
      processing_jobs: processingJobs,
      completed_jobs: completedJobs,
      failed_jobs: failedJobs,
      rate_limited_jobs: rateLimitedJobs,
      average_processing_time_ms: avgProcessingTime,
      throughput_per_minute: throughput,
      channel_metrics: channelMetrics,
    };

    this.lastMetricsUpdate = now;
    return this.metricsCache;
  }

  /**
   * Get rate limiter status
   */
  getRateLimiterStatus(): Record<string, RateLimiter> {
    const status: Record<string, RateLimiter> = {};
    this.rateLimiters.forEach((limiter, channel) => {
      status[channel] = { ...limiter };
    });
    return status;
  }

  /**
   * Pause processing for a specific channel
   */
  async pauseChannel(channel: string, durationMinutes: number = 10): Promise<void> {
    const limiter = this.rateLimiters.get(channel);
    if (!limiter) return;

    limiter.blocked_until = addMinutes(new Date(), durationMinutes).toISOString();

    // Mark pending jobs for this channel as rate limited
    await supabase
      .from('broadcast_queue')
      .update({ status: 'rate_limited' })
      .eq('tenant_id', this.tenantId)
      .eq('channel', channel)
      .eq('status', 'pending');
  }

  /**
   * Resume processing for a specific channel
   */
  async resumeChannel(channel: string): Promise<void> {
    const limiter = this.rateLimiters.get(channel);
    if (!limiter) return;

    limiter.blocked_until = undefined;

    // Mark rate limited jobs as pending again
    await supabase
      .from('broadcast_queue')
      .update({ status: 'pending' })
      .eq('tenant_id', this.tenantId)
      .eq('channel', channel)
      .eq('status', 'rate_limited');
  }

  /**
   * Cancel all pending jobs for a broadcast
   */
  async cancelBroadcast(broadcastId: string): Promise<number> {
    const { data, error } = await supabase
      .from('broadcast_queue')
      .update({ status: 'cancelled' })
      .eq('tenant_id', this.tenantId)
      .eq('broadcast_id', broadcastId)
      .in('status', ['pending', 'rate_limited'])
      .select('id');

    if (error) throw error;

    return data?.length || 0;
  }

  /**
   * Reschedule failed jobs
   */
  async rescheduleFailedJobs(broadcastId: string, newScheduledTime?: string): Promise<number> {
    const scheduledFor = newScheduledTime || new Date().toISOString();

    const { data, error } = await supabase
      .from('broadcast_queue')
      .update({
        status: 'pending',
        retry_count: 0,
        scheduled_for: scheduledFor,
        error_message: null,
        processing_node: null,
      })
      .eq('tenant_id', this.tenantId)
      .eq('broadcast_id', broadcastId)
      .eq('status', 'failed')
      .select('id');

    if (error) throw error;

    return data?.length || 0;
  }

  /**
   * Get detailed job status for a broadcast
   */
  async getBroadcastJobStatus(broadcastId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    cancelled: number;
    rate_limited: number;
    jobs: QueueJob[];
  }> {
    const { data: jobs, error } = await supabase
      .from('broadcast_queue')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('broadcast_id', broadcastId)
      .order('created_at');

    if (error) throw error;

    const jobStats = jobs || [];
    
    return {
      total: jobStats.length,
      pending: jobStats.filter(j => j.status === 'pending').length,
      processing: jobStats.filter(j => j.status === 'processing').length,
      sent: jobStats.filter(j => j.status === 'sent').length,
      failed: jobStats.filter(j => j.status === 'failed').length,
      cancelled: jobStats.filter(j => j.status === 'cancelled').length,
      rate_limited: jobStats.filter(j => j.status === 'rate_limited').length,
      jobs: jobStats,
    };
  }
}