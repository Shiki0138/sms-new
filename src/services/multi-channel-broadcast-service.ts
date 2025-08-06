/**
 * Multi-Channel Broadcast Service
 * Unified service for broadcasting messages across LINE, Instagram, SMS, and Email channels
 * with advanced segmentation, queuing, and analytics capabilities
 */

import { supabase } from '../lib/supabase';
import { LineApiService } from './line-api';
import { InstagramApiService } from './instagram-api';
import { EmailApiService } from './email-api';
import { format, addMinutes, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

// Type definitions for the multi-channel system
export interface ChannelConfig {
  line?: {
    channelAccessToken: string;
    channelSecret: string;
    enabled: boolean;
    rateLimitPerMinute: number;
  };
  instagram?: {
    accessToken: string;
    appId: string;
    appSecret: string;
    enabled: boolean;
    rateLimitPerMinute: number;
  };
  sms?: {
    provider: 'twilio' | 'aws-sns';
    credentials: Record<string, string>;
    enabled: boolean;
    rateLimitPerMinute: number;
  };
  email?: {
    provider: 'smtp' | 'sendgrid' | 'aws-ses';
    credentials: Record<string, string>;
    enabled: boolean;
    rateLimitPerMinute: number;
  };
}

export interface BroadcastMessage {
  id?: string;
  campaign_id?: string;
  subject?: string;
  content: string;
  template_variables?: Record<string, any>;
  channel_priorities: ChannelType[];
  target_segments: string[];
  scheduled_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface ChannelDeliveryResult {
  channel: ChannelType;
  customer_id: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  message_id?: string;
  error_message?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  cost?: number;
}

export interface BroadcastResult {
  broadcast_id: string;
  total_recipients: number;
  queued_messages: number;
  channel_breakdown: Record<ChannelType, number>;
  estimated_completion: string;
  cost_estimate: number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  conditions: SegmentConditions;
  customer_count: number;
}

export interface SegmentConditions {
  age_range?: { min?: number; max?: number };
  gender?: 'male' | 'female' | 'other';
  visit_frequency?: { operator: '>=' | '<=' | '=' | 'between'; value: number; period: 'week' | 'month' | 'year' };
  last_visit?: { operator: '>=' | '<=' | '=' | 'between'; value: number; unit: 'days' | 'weeks' | 'months' };
  total_spent?: { operator: '>=' | '<=' | '=' | 'between'; value: number };
  favorite_services?: string[];
  contact_preferences?: ChannelType[];
  tags?: string[];
  location?: { prefecture?: string; city?: string; radius_km?: number };
  opt_in_status?: Record<ChannelType, boolean>;
}

export interface MessageQueue {
  id: string;
  broadcast_id: string;
  customer_id: string;
  channel: ChannelType;
  content: string;
  subject?: string;
  priority: number;
  scheduled_for: string;
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
  processing_node?: string;
  created_at: string;
  processed_at?: string;
}

export interface BroadcastAnalytics {
  broadcast_id: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_opened: number;
  messages_clicked: number;
  messages_failed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  channel_performance: Record<ChannelType, ChannelAnalytics>;
  cost_breakdown: Record<ChannelType, number>;
  total_cost: number;
  processing_time_ms: number;
  created_at: string;
  completed_at?: string;
}

export interface ChannelAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
  cost: number;
  average_delivery_time_ms: number;
}

export type ChannelType = 'line' | 'instagram' | 'sms' | 'email';

export class MultiChannelBroadcastService {
  private tenantId: string;
  private config: ChannelConfig;
  private lineService?: LineApiService;
  private instagramService?: InstagramApiService;
  private emailService?: EmailApiService;
  private channelAdapters: Map<ChannelType, any>;
  private rateLimiters: Map<ChannelType, { count: number; resetTime: number }>;

  constructor(tenantId: string, config: ChannelConfig) {
    this.tenantId = tenantId;
    this.config = config;
    this.channelAdapters = new Map();
    this.rateLimiters = new Map();
    this.initializeChannels();
  }

  /**
   * Initialize all enabled channels
   */
  private initializeChannels(): void {
    // Initialize LINE service
    if (this.config.line?.enabled && this.config.line.channelAccessToken) {
      this.lineService = new LineApiService({
        channelAccessToken: this.config.line.channelAccessToken,
        channelSecret: this.config.line.channelSecret,
      });
      this.channelAdapters.set('line', this.lineService);
    }

    // Initialize Instagram service
    if (this.config.instagram?.enabled && this.config.instagram.accessToken) {
      this.instagramService = new InstagramApiService({
        api_credentials: {
          access_token: this.config.instagram.accessToken,
          app_id: this.config.instagram.appId,
          app_secret: this.config.instagram.appSecret,
        },
      } as any);
      this.channelAdapters.set('instagram', this.instagramService);
    }

    // Initialize Email service
    if (this.config.email?.enabled) {
      this.emailService = new EmailApiService({
        api_credentials: this.config.email.credentials,
      } as any);
      this.channelAdapters.set('email', this.emailService);
    }

    // Initialize SMS service (via existing SMS service)
    if (this.config.sms?.enabled) {
      // SMS service will be integrated via the existing SMS service
      this.channelAdapters.set('sms', { 
        sendSMS: this.sendSMSMessage.bind(this) 
      });
    }

    // Initialize rate limiters
    Object.keys(this.config).forEach(channel => {
      this.rateLimiters.set(channel as ChannelType, { count: 0, resetTime: Date.now() + 60000 });
    });
  }

  /**
   * Create and execute a broadcast campaign
   */
  async createBroadcast(message: BroadcastMessage): Promise<BroadcastResult> {
    const broadcastId = crypto.randomUUID();
    
    try {
      // Get target customers based on segments
      const targetCustomers = await this.getTargetCustomers(message.target_segments);
      
      if (targetCustomers.length === 0) {
        throw new Error('No customers found matching the specified segments');
      }

      // Create broadcast record
      const { error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          id: broadcastId,
          tenant_id: this.tenantId,
          campaign_id: message.campaign_id,
          subject: message.subject,
          content: message.content,
          template_variables: message.template_variables || {},
          channel_priorities: message.channel_priorities,
          target_segments: message.target_segments,
          total_recipients: targetCustomers.length,
          scheduled_at: message.scheduled_at || new Date().toISOString(),
          expires_at: message.expires_at,
          metadata: message.metadata || {},
          status: 'queued',
          created_at: new Date().toISOString(),
        });

      if (broadcastError) throw broadcastError;

      // Queue messages for each customer across priority channels
      const queuedMessages = await this.queueMessagesForCustomers(
        broadcastId,
        targetCustomers,
        message
      );

      // Calculate cost estimate
      const costEstimate = this.calculateCostEstimate(queuedMessages);

      // Estimate completion time
      const estimatedCompletion = this.calculateEstimatedCompletion(queuedMessages.length);

      // Start processing messages
      this.processMessageQueue(broadcastId);

      return {
        broadcast_id: broadcastId,
        total_recipients: targetCustomers.length,
        queued_messages: queuedMessages.length,
        channel_breakdown: this.getChannelBreakdown(queuedMessages),
        estimated_completion: estimatedCompletion,
        cost_estimate: costEstimate,
      };

    } catch (error) {
      console.error('Broadcast creation failed:', error);
      throw error;
    }
  }

  /**
   * Get target customers based on segment conditions
   */
  private async getTargetCustomers(segmentIds: string[]): Promise<any[]> {
    const customers: any[] = [];
    
    for (const segmentId of segmentIds) {
      // Get segment definition
      const { data: segment, error: segmentError } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('id', segmentId)
        .eq('tenant_id', this.tenantId)
        .single();

      if (segmentError) continue;

      // Apply segment conditions to get customers
      const segmentCustomers = await this.applySegmentConditions(segment.conditions);
      customers.push(...segmentCustomers);
    }

    // Remove duplicates
    const uniqueCustomers = customers.filter((customer, index, self) => 
      index === self.findIndex(c => c.id === customer.id)
    );

    return uniqueCustomers;
  }

  /**
   * Apply segment conditions to filter customers
   */
  private async applySegmentConditions(conditions: SegmentConditions): Promise<any[]> {
    let query = supabase
      .from('customers')
      .select(`
        *,
        customer_message_preferences!inner(*)
      `)
      .eq('tenant_id', this.tenantId);

    // Apply age range filter
    if (conditions.age_range) {
      if (conditions.age_range.min) {
        const maxBirthDate = new Date();
        maxBirthDate.setFullYear(maxBirthDate.getFullYear() - conditions.age_range.min);
        query = query.lte('birth_date', maxBirthDate.toISOString());
      }
      if (conditions.age_range.max) {
        const minBirthDate = new Date();
        minBirthDate.setFullYear(minBirthDate.getFullYear() - conditions.age_range.max);
        query = query.gte('birth_date', minBirthDate.toISOString());
      }
    }

    // Apply gender filter
    if (conditions.gender) {
      query = query.eq('gender', conditions.gender);
    }

    const { data: customers, error } = await query;
    if (error) throw error;

    // Apply more complex filters in-memory
    let filteredCustomers = customers || [];

    // Filter by visit frequency (requires reservation data)
    if (conditions.visit_frequency) {
      filteredCustomers = await this.filterByVisitFrequency(
        filteredCustomers, 
        conditions.visit_frequency
      );
    }

    // Filter by last visit
    if (conditions.last_visit) {
      filteredCustomers = await this.filterByLastVisit(
        filteredCustomers,
        conditions.last_visit
      );
    }

    // Filter by total spent
    if (conditions.total_spent) {
      filteredCustomers = await this.filterByTotalSpent(
        filteredCustomers,
        conditions.total_spent
      );
    }

    // Filter by opt-in status
    if (conditions.opt_in_status) {
      filteredCustomers = this.filterByOptInStatus(
        filteredCustomers,
        conditions.opt_in_status
      );
    }

    return filteredCustomers;
  }

  /**
   * Filter customers by visit frequency
   */
  private async filterByVisitFrequency(
    customers: any[], 
    condition: { operator: string; value: number; period: string }
  ): Promise<any[]> {
    const filtered: any[] = [];
    
    for (const customer of customers) {
      const visitCount = await this.getCustomerVisitCount(customer.id, condition.period);
      
      switch (condition.operator) {
        case '>=':
          if (visitCount >= condition.value) filtered.push(customer);
          break;
        case '<=':
          if (visitCount <= condition.value) filtered.push(customer);
          break;
        case '=':
          if (visitCount === condition.value) filtered.push(customer);
          break;
      }
    }
    
    return filtered;
  }

  /**
   * Filter customers by last visit
   */
  private async filterByLastVisit(
    customers: any[],
    condition: { operator: string; value: number; unit: string }
  ): Promise<any[]> {
    const filtered: any[] = [];
    const cutoffDate = new Date();
    
    switch (condition.unit) {
      case 'days':
        cutoffDate.setDate(cutoffDate.getDate() - condition.value);
        break;
      case 'weeks':
        cutoffDate.setDate(cutoffDate.getDate() - (condition.value * 7));
        break;
      case 'months':
        cutoffDate.setMonth(cutoffDate.getMonth() - condition.value);
        break;
    }

    for (const customer of customers) {
      const lastVisit = await this.getCustomerLastVisit(customer.id);
      
      if (lastVisit) {
        const lastVisitDate = new Date(lastVisit);
        
        switch (condition.operator) {
          case '>=':
            if (lastVisitDate >= cutoffDate) filtered.push(customer);
            break;
          case '<=':
            if (lastVisitDate <= cutoffDate) filtered.push(customer);
            break;
        }
      }
    }
    
    return filtered;
  }

  /**
   * Filter customers by total spent
   */
  private async filterByTotalSpent(
    customers: any[],
    condition: { operator: string; value: number }
  ): Promise<any[]> {
    const filtered: any[] = [];
    
    for (const customer of customers) {
      const totalSpent = await this.getCustomerTotalSpent(customer.id);
      
      switch (condition.operator) {
        case '>=':
          if (totalSpent >= condition.value) filtered.push(customer);
          break;
        case '<=':
          if (totalSpent <= condition.value) filtered.push(customer);
          break;
        case '=':
          if (totalSpent === condition.value) filtered.push(customer);
          break;
      }
    }
    
    return filtered;
  }

  /**
   * Filter customers by opt-in status
   */
  private filterByOptInStatus(
    customers: any[],
    optInStatus: Record<ChannelType, boolean>
  ): any[] {
    return customers.filter(customer => {
      // Check if customer has opted in for at least one required channel
      const preferences = customer.customer_message_preferences || [];
      
      for (const [channel, required] of Object.entries(optInStatus)) {
        if (required) {
          const pref = preferences.find((p: any) => p.channel_type === channel);
          if (!pref || !pref.is_opted_in) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  /**
   * Queue messages for all target customers
   */
  private async queueMessagesForCustomers(
    broadcastId: string,
    customers: any[],
    message: BroadcastMessage
  ): Promise<MessageQueue[]> {
    const queuedMessages: MessageQueue[] = [];
    
    for (const customer of customers) {
      // Get customer preferences
      const { data: preferences } = await supabase
        .from('customer_message_preferences')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('tenant_id', this.tenantId);

      // Determine optimal channel based on priorities and preferences
      const optimalChannel = this.getOptimalChannel(
        customer,
        message.channel_priorities,
        preferences || []
      );

      if (optimalChannel) {
        // Process template variables
        const processedContent = await this.processTemplateVariables(
          message.content,
          customer,
          message.template_variables || {}
        );

        const processedSubject = message.subject ? 
          await this.processTemplateVariables(
            message.subject,
            customer,
            message.template_variables || {}
          ) : undefined;

        // Create queue item
        const queueItem: Omit<MessageQueue, 'id' | 'created_at'> = {
          broadcast_id: broadcastId,
          customer_id: customer.id,
          channel: optimalChannel,
          content: processedContent,
          subject: processedSubject,
          priority: this.calculateMessagePriority(optimalChannel, customer),
          scheduled_for: message.scheduled_at || new Date().toISOString(),
          retry_count: 0,
          max_retries: 3,
          status: 'pending',
          processing_node: null,
        };

        // Insert into queue
        const { data: inserted, error } = await supabase
          .from('message_queue')
          .insert({
            ...queueItem,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && inserted) {
          queuedMessages.push(inserted);
        }
      }
    }

    return queuedMessages;
  }

  /**
   * Determine optimal channel for customer
   */
  private getOptimalChannel(
    customer: any,
    channelPriorities: ChannelType[],
    preferences: any[]
  ): ChannelType | null {
    for (const channel of channelPriorities) {
      // Check if channel is enabled
      if (!this.channelAdapters.has(channel)) continue;

      // Check customer preference
      const pref = preferences.find(p => p.channel_type === channel);
      if (pref && !pref.is_opted_in) continue;

      // Check if customer has contact info for this channel
      if (!this.hasContactInfoForChannel(customer, channel)) continue;

      // Check rate limits
      if (!this.checkRateLimit(channel)) continue;

      return channel;
    }

    return null;
  }

  /**
   * Check if customer has contact info for channel
   */
  private hasContactInfoForChannel(customer: any, channel: ChannelType): boolean {
    switch (channel) {
      case 'line':
        return !!customer.line_user_id;
      case 'instagram':
        return !!customer.instagram_user_id;
      case 'email':
        return !!customer.email;
      case 'sms':
        return !!customer.phone_number;
      default:
        return false;
    }
  }

  /**
   * Check rate limit for channel
   */
  private checkRateLimit(channel: ChannelType): boolean {
    const rateLimiter = this.rateLimiters.get(channel);
    if (!rateLimiter) return true;

    const now = Date.now();
    
    // Reset counter if minute has passed
    if (now >= rateLimiter.resetTime) {
      rateLimiter.count = 0;
      rateLimiter.resetTime = now + 60000;
    }

    const channelConfig = this.config[channel];
    const limit = channelConfig?.rateLimitPerMinute || 60;

    return rateLimiter.count < limit;
  }

  /**
   * Process template variables in content
   */
  private async processTemplateVariables(
    content: string,
    customer: any,
    variables: Record<string, any>
  ): Promise<string> {
    let processed = content;

    // Replace customer variables
    processed = processed.replace(/\{\{customer_name\}\}/g, customer.name || '');
    processed = processed.replace(/\{\{customer_phone\}\}/g, customer.phone_number || '');
    processed = processed.replace(/\{\{customer_email\}\}/g, customer.email || '');

    // Replace custom variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    // Replace reservation variables if available
    const upcomingReservation = await this.getCustomerUpcomingReservation(customer.id);
    if (upcomingReservation) {
      processed = processed.replace(/\{\{appointment_date\}\}/g, 
        format(parseISO(upcomingReservation.start_time), 'M月d日(E)', { locale: ja }));
      processed = processed.replace(/\{\{appointment_time\}\}/g,
        format(parseISO(upcomingReservation.start_time), 'HH:mm'));
      processed = processed.replace(/\{\{service_name\}\}/g, 
        upcomingReservation.menu_content || '');
    }

    return processed;
  }

  /**
   * Process message queue
   */
  private async processMessageQueue(broadcastId: string): Promise<void> {
    const batchSize = 50;
    let hasMore = true;

    while (hasMore) {
      // Get pending messages
      const { data: messages, error } = await supabase
        .from('message_queue')
        .select('*')
        .eq('broadcast_id', broadcastId)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at')
        .limit(batchSize);

      if (error || !messages || messages.length === 0) {
        hasMore = false;
        continue;
      }

      // Process messages in parallel
      const processingPromises = messages.map(message => 
        this.processMessage(message)
      );

      await Promise.allSettled(processingPromises);

      // Check if we processed fewer than batch size
      hasMore = messages.length === batchSize;

      // Add delay to prevent overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update broadcast status
    await this.updateBroadcastStatus(broadcastId);
  }

  /**
   * Process individual message
   */
  private async processMessage(message: MessageQueue): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('message_queue')
        .update({ 
          status: 'processing',
          processing_node: process.env.NODE_ENV || 'development'
        })
        .eq('id', message.id);

      // Get customer info
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', message.customer_id)
        .single();

      if (!customer) throw new Error('Customer not found');

      // Send message via appropriate channel
      const result = await this.sendViaChannel(message, customer);

      // Update queue item
      await supabase
        .from('message_queue')
        .update({
          status: result.success ? 'sent' : 'failed',
          error_message: result.error,
          processed_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      // Record delivery result
      await this.recordDeliveryResult(message, result);

      // Update rate limiter
      const rateLimiter = this.rateLimiters.get(message.channel);
      if (rateLimiter) {
        rateLimiter.count++;
      }

    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error);
      await this.handleMessageError(message, error);
    }
  }

  /**
   * Send message via specific channel
   */
  private async sendViaChannel(
    message: MessageQueue, 
    customer: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const adapter = this.channelAdapters.get(message.channel);
    if (!adapter) {
      return { success: false, error: 'Channel adapter not found' };
    }

    try {
      switch (message.channel) {
        case 'line':
          await adapter.sendTextMessage(customer.line_user_id, message.content);
          return { success: true };

        case 'instagram':
          await adapter.sendDirectMessage(customer.instagram_user_id, message.content);
          return { success: true };

        case 'email':
          await adapter.sendEmail(
            customer.email,
            message.subject || 'お知らせ',
            message.content
          );
          return { success: true };

        case 'sms':
          const result = await adapter.sendSMS({
            to: customer.phone_number,
            body: message.content,
          });
          return { success: true, messageId: result.messageId };

        default:
          return { success: false, error: 'Unsupported channel' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * SMS message sending via existing SMS service
   */
  private async sendSMSMessage(params: { to: string; body: string }): Promise<any> {
    // Integration with existing SMS service
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.to,
        body: params.body,
        tenantId: this.tenantId,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Record delivery result for analytics
   */
  private async recordDeliveryResult(
    message: MessageQueue,
    result: { success: boolean; messageId?: string; error?: string }
  ): Promise<void> {
    const deliveryResult: Omit<ChannelDeliveryResult, 'delivered_at' | 'opened_at' | 'clicked_at'> = {
      channel: message.channel,
      customer_id: message.customer_id,
      status: result.success ? 'sent' : 'failed',
      message_id: result.messageId,
      error_message: result.error,
    };

    await supabase
      .from('broadcast_delivery_results')
      .insert({
        ...deliveryResult,
        broadcast_id: message.broadcast_id,
        message_queue_id: message.id,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Handle message processing error
   */
  private async handleMessageError(message: MessageQueue, error: any): Promise<void> {
    const newRetryCount = message.retry_count + 1;
    const shouldRetry = newRetryCount < message.max_retries;

    if (shouldRetry) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s...
      const retryTime = new Date(Date.now() + retryDelay);

      await supabase
        .from('message_queue')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          scheduled_for: retryTime.toISOString(),
          error_message: (error as Error).message,
        })
        .eq('id', message.id);
    } else {
      // Mark as failed
      await supabase
        .from('message_queue')
        .update({
          status: 'failed',
          retry_count: newRetryCount,
          error_message: (error as Error).message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', message.id);
    }
  }

  /**
   * Update broadcast status based on queue completion
   */
  private async updateBroadcastStatus(broadcastId: string): Promise<void> {
    const { data: queueStats } = await supabase
      .from('message_queue')
      .select('status')
      .eq('broadcast_id', broadcastId);

    if (!queueStats) return;

    const totalMessages = queueStats.length;
    const completedMessages = queueStats.filter(q => 
      q.status === 'sent' || q.status === 'failed'
    ).length;

    const status = completedMessages === totalMessages ? 'completed' : 'processing';

    await supabase
      .from('broadcasts')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', broadcastId);
  }

  /**
   * Get broadcast analytics
   */
  async getBroadcastAnalytics(broadcastId: string): Promise<BroadcastAnalytics> {
    // Get broadcast info
    const { data: broadcast } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    // Get delivery results
    const { data: results } = await supabase
      .from('broadcast_delivery_results')
      .select('*')
      .eq('broadcast_id', broadcastId);

    if (!results) {
      throw new Error('No delivery results found');
    }

    // Calculate metrics
    const totalRecipients = broadcast.total_recipients;
    const messagesSent = results.filter(r => r.status === 'sent').length;
    const messagesDelivered = results.filter(r => r.status === 'delivered').length;
    const messagesOpened = results.filter(r => r.status === 'opened').length;
    const messagesClicked = results.filter(r => r.status === 'clicked').length;
    const messagesFailed = results.filter(r => r.status === 'failed').length;

    // Calculate rates
    const deliveryRate = messagesSent > 0 ? (messagesDelivered / messagesSent) * 100 : 0;
    const openRate = messagesDelivered > 0 ? (messagesOpened / messagesDelivered) * 100 : 0;
    const clickRate = messagesOpened > 0 ? (messagesClicked / messagesOpened) * 100 : 0;
    const bounceRate = messagesSent > 0 ? (results.filter(r => r.status === 'bounced').length / messagesSent) * 100 : 0;

    // Calculate channel performance
    const channelPerformance: Record<ChannelType, ChannelAnalytics> = {} as any;
    const channels: ChannelType[] = ['line', 'instagram', 'sms', 'email'];

    channels.forEach(channel => {
      const channelResults = results.filter(r => r.channel === channel);
      channelPerformance[channel] = {
        sent: channelResults.filter(r => r.status === 'sent').length,
        delivered: channelResults.filter(r => r.status === 'delivered').length,
        opened: channelResults.filter(r => r.status === 'opened').length,
        clicked: channelResults.filter(r => r.status === 'clicked').length,
        failed: channelResults.filter(r => r.status === 'failed').length,
        bounced: channelResults.filter(r => r.status === 'bounced').length,
        cost: channelResults.reduce((sum, r) => sum + (r.cost || 0), 0),
        average_delivery_time_ms: 0, // Would need to calculate from timing data
      };
    });

    // Calculate cost breakdown
    const costBreakdown: Record<ChannelType, number> = {} as any;
    channels.forEach(channel => {
      costBreakdown[channel] = channelPerformance[channel].cost;
    });

    const totalCost = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0);

    return {
      broadcast_id: broadcastId,
      total_recipients: totalRecipients,
      messages_sent: messagesSent,
      messages_delivered: messagesDelivered,
      messages_opened: messagesOpened,
      messages_clicked: messagesClicked,
      messages_failed: messagesFailed,
      delivery_rate: deliveryRate,
      open_rate: openRate,
      click_rate: clickRate,
      bounce_rate: bounceRate,
      channel_performance: channelPerformance,
      cost_breakdown: costBreakdown,
      total_cost: totalCost,
      processing_time_ms: broadcast.completed_at ? 
        new Date(broadcast.completed_at).getTime() - new Date(broadcast.created_at).getTime() : 0,
      created_at: broadcast.created_at,
      completed_at: broadcast.completed_at,
    };
  }

  // Helper methods

  private calculateMessagePriority(channel: ChannelType, customer: any): number {
    // Higher priority for VIP customers, urgent messages, etc.
    let priority = 5; // Default priority

    // VIP customers get higher priority
    if (customer.is_vip) priority += 3;

    // Channel-specific priorities
    switch (channel) {
      case 'sms': priority += 2; break; // SMS is more urgent
      case 'line': priority += 1; break;
      default: break;
    }

    return Math.min(priority, 10); // Max priority is 10
  }

  private calculateCostEstimate(messages: MessageQueue[]): number {
    const costPerMessage = {
      line: 0, // Free
      instagram: 0, // Free
      sms: 0.05, // $0.05 per SMS
      email: 0.001, // $0.001 per email
    };

    return messages.reduce((total, message) => {
      return total + (costPerMessage[message.channel] || 0);
    }, 0);
  }

  private calculateEstimatedCompletion(messageCount: number): string {
    // Estimate based on rate limits and processing capacity
    const messagesPerMinute = 100; // Conservative estimate
    const estimatedMinutes = Math.ceil(messageCount / messagesPerMinute);
    
    const completionTime = new Date();
    completionTime.setMinutes(completionTime.getMinutes() + estimatedMinutes);
    
    return completionTime.toISOString();
  }

  private getChannelBreakdown(messages: MessageQueue[]): Record<ChannelType, number> {
    const breakdown: Record<ChannelType, number> = {
      line: 0,
      instagram: 0,
      sms: 0,
      email: 0,
    };

    messages.forEach(message => {
      breakdown[message.channel]++;
    });

    return breakdown;
  }

  // Data fetching helper methods

  private async getCustomerVisitCount(customerId: string, period: string): Promise<number> {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('customer_id', customerId)
      .eq('tenant_id', this.tenantId)
      .gte('start_time', startDate.toISOString())
      .eq('status', 'completed');

    return data?.length || 0;
  }

  private async getCustomerLastVisit(customerId: string): Promise<string | null> {
    const { data } = await supabase
      .from('reservations')
      .select('end_time')
      .eq('customer_id', customerId)
      .eq('tenant_id', this.tenantId)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(1)
      .single();

    return data?.end_time || null;
  }

  private async getCustomerTotalSpent(customerId: string): Promise<number> {
    const { data } = await supabase
      .from('reservations')
      .select('price')
      .eq('customer_id', customerId)
      .eq('tenant_id', this.tenantId)
      .eq('status', 'completed');

    return data?.reduce((sum, reservation) => sum + (reservation.price || 0), 0) || 0;
  }

  private async getCustomerUpcomingReservation(customerId: string): Promise<any | null> {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('tenant_id', this.tenantId)
      .gte('start_time', new Date().toISOString())
      .order('start_time')
      .limit(1)
      .single();

    return data;
  }
}