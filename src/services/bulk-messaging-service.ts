// Comprehensive Bulk Messaging Service
import { supabase } from '../lib/supabase';
import { format, addMinutes, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Campaign,
  CampaignMessage,
  CustomerSegment,
  MessageTemplate,
  ReminderRule,
  CustomerMessagePreference,
  BulkMessageRequest,
  CampaignAnalytics,
  MessagePreview,
  SchedulingOptions,
  MessageQueueItem,
  OptInOutRequest,
  BulkPreferenceUpdateRequest,
  DEFAULT_TEMPLATE_VARIABLES,
} from '../types/bulk-messaging';
import { Customer } from '../types/customer';
import { Reservation } from '../types/reservation';

export class BulkMessagingService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // =====================================
  // Message Templates
  // =====================================

  async getMessageTemplates(category?: string): Promise<MessageTemplate[]> {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createMessageTemplate(template: Omit<MessageTemplate, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<MessageTemplate> {
    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        ...template,
        tenant_id: this.tenantId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMessageTemplate(id: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const { data, error } = await supabase
      .from('message_templates')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =====================================
  // Customer Preferences Management
  // =====================================

  async getCustomerPreferences(customerId: string): Promise<CustomerMessagePreference[]> {
    const { data, error } = await supabase
      .from('customer_message_preferences')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('customer_id', customerId);

    if (error) throw error;
    return data || [];
  }

  async updateCustomerPreference(request: OptInOutRequest): Promise<CustomerMessagePreference> {
    const existing = await this.getCustomerPreference(request.customer_id, request.channel_type);

    if (existing) {
      // Update existing preference
      const updates: any = {
        is_opted_in: request.is_opted_in,
        ...request.preferences,
      };

      if (!request.is_opted_in) {
        updates.opt_out_date = new Date().toISOString();
        updates.opt_out_reason = request.reason;
      } else {
        updates.opt_in_date = new Date().toISOString();
        updates.opt_out_date = null;
        updates.opt_out_reason = null;
      }

      const { data, error } = await supabase
        .from('customer_message_preferences')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new preference
      const { data, error } = await supabase
        .from('customer_message_preferences')
        .insert({
          tenant_id: this.tenantId,
          customer_id: request.customer_id,
          channel_type: request.channel_type,
          is_opted_in: request.is_opted_in,
          opt_out_reason: request.reason,
          ...request.preferences,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  async bulkUpdatePreferences(request: BulkPreferenceUpdateRequest): Promise<number> {
    let updatedCount = 0;

    for (const customerId of request.customer_ids) {
      const channelTypes = request.channel_types || ['line', 'email', 'sms'];
      
      for (const channelType of channelTypes) {
        try {
          await this.updateCustomerPreference({
            customer_id: customerId,
            channel_type: channelType as any,
            is_opted_in: request.updates.is_opted_in ?? true,
            preferences: request.updates,
          });
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update preference for ${customerId}/${channelType}:`, error);
        }
      }
    }

    return updatedCount;
  }

  private async getCustomerPreference(customerId: string, channelType: string): Promise<CustomerMessagePreference | null> {
    const { data, error } = await supabase
      .from('customer_message_preferences')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('customer_id', customerId)
      .eq('channel_type', channelType)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // =====================================
  // Customer Segmentation
  // =====================================

  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const { data, error } = await supabase
      .from('customer_segments')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Calculate customer counts for each segment
    const segmentsWithCounts = await Promise.all(
      (data || []).map(async (segment) => {
        const customerCount = await this.getSegmentCustomerCount(segment);
        return { ...segment, customer_count: customerCount };
      })
    );

    return segmentsWithCounts;
  }

  async createCustomerSegment(segment: Omit<CustomerSegment, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<CustomerSegment> {
    const { data, error } = await supabase
      .from('customer_segments')
      .insert({
        ...segment,
        tenant_id: this.tenantId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCustomersBySegment(segmentId: string): Promise<Customer[]> {
    const { data: segment, error: segmentError } = await supabase
      .from('customer_segments')
      .select('*')
      .eq('id', segmentId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (segmentError) throw segmentError;

    if (segment.segment_type === 'static') {
      // Return specific customers
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('id', segment.customer_ids);

      if (error) throw error;
      return data || [];
    } else {
      // Dynamic segment - apply conditions
      return this.getCustomersByConditions(segment.conditions);
    }
  }

  private async getCustomersByConditions(conditions: any): Promise<Customer[]> {
    // Handle special "all" condition
    if (conditions.all === true) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', this.tenantId);

      if (error) throw error;
      return data || [];
    }

    // TODO: Implement complex condition parsing
    // For now, handle common conditions
    let query = supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', this.tenantId);

    // Visit frequency condition
    if (conditions.visit_frequency) {
      // This would require a join with reservations table
      // For now, return all customers
    }

    // First visit condition
    if (conditions.first_visit) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - conditions.first_visit.value);
      
      if (conditions.first_visit.operator === '<=') {
        query = query.gte('created_at', daysAgo.toISOString());
      }
    }

    // Last visit condition
    if (conditions.last_visit) {
      // This would require a subquery with reservations
      // For now, simplified implementation
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async getSegmentCustomerCount(segment: CustomerSegment): Promise<number> {
    const customers = await this.getCustomersBySegment(segment.id);
    return customers.length;
  }

  // =====================================
  // Campaign Management
  // =====================================

  async createCampaign(request: BulkMessageRequest): Promise<Campaign> {
    // Calculate total recipients
    const targetCustomers = await this.getTargetCustomers(request.target_segments, request.target_filters);
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: this.tenantId,
        name: request.campaign_name,
        description: request.description,
        campaign_type: 'one_time',
        status: request.scheduled_at ? 'scheduled' : 'draft',
        template_id: request.template_id,
        subject: request.subject,
        content: request.content,
        target_segments: request.target_segments,
        target_filters: request.target_filters || {},
        send_channels: request.send_channels,
        scheduled_at: request.scheduled_at,
        total_recipients: targetCustomers.length,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async sendCampaign(campaignId: string, options?: SchedulingOptions): Promise<void> {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (campaignError) throw campaignError;

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({
        status: 'active',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Get target customers
    const targetCustomers = await this.getTargetCustomers(
      campaign.target_segments,
      campaign.target_filters
    );

    // Queue messages for each customer
    const batchSize = options?.batch_size || 100;
    const batchDelay = options?.batch_delay_minutes || 1;

    for (let i = 0; i < targetCustomers.length; i += batchSize) {
      const batch = targetCustomers.slice(i, i + batchSize);
      const scheduledFor = options?.send_immediately 
        ? new Date()
        : addMinutes(new Date(), i / batchSize * batchDelay);

      await this.queueCampaignMessages(campaign, batch, scheduledFor, options);
    }
  }

  private async queueCampaignMessages(
    campaign: Campaign,
    customers: Customer[],
    scheduledFor: Date,
    options?: SchedulingOptions
  ): Promise<void> {
    const messageQueueItems: Omit<MessageQueueItem, 'id' | 'created_at'>[] = [];

    for (const customer of customers) {
      // Check customer preferences
      const preferences = await this.getCustomerPreferences(customer.id);
      
      for (const channel of campaign.send_channels) {
        const pref = preferences.find(p => p.channel_type === channel);
        
        // Skip if customer opted out or doesn't want this type of message
        if (pref && (!pref.is_opted_in || !pref.receive_campaigns)) {
          continue;
        }

        // Calculate optimal send time if requested
        let sendTime = scheduledFor;
        if (options?.optimal_send_time && pref) {
          sendTime = this.calculateOptimalSendTime(scheduledFor, pref);
        }

        // Fill template variables
        const content = await this.fillTemplateVariables(
          campaign.content || '',
          customer,
          undefined,
          campaign
        );

        const subject = campaign.subject ? 
          await this.fillTemplateVariables(campaign.subject, customer, undefined, campaign) : 
          undefined;

        messageQueueItems.push({
          tenant_id: this.tenantId,
          customer_id: customer.id,
          campaign_id: campaign.id,
          channel_type: channel,
          priority: 5,
          scheduled_for: sendTime.toISOString(),
          content,
          subject,
          metadata: {
            campaign_name: campaign.name,
            customer_name: customer.name,
          },
          status: 'pending',
          retry_count: 0,
          max_retries: 3,
          processed_at: null,
        });

        // Create campaign message record
        await supabase.from('campaign_messages').insert({
          tenant_id: this.tenantId,
          campaign_id: campaign.id,
          customer_id: customer.id,
          channel_type: channel,
          status: 'pending',
        });

        // Only send via first available channel
        break;
      }
    }

    // Bulk insert to message queue
    if (messageQueueItems.length > 0) {
      const { error } = await supabase
        .from('message_queue')
        .insert(messageQueueItems);

      if (error) throw error;
    }
  }

  private calculateOptimalSendTime(baseTime: Date, preference: CustomerMessagePreference): Date {
    const preferredStart = parseISO(`2000-01-01T${preference.preferred_time_start}`);
    const preferredEnd = parseISO(`2000-01-01T${preference.preferred_time_end}`);
    
    let optimalTime = new Date(baseTime);
    const baseHour = optimalTime.getHours();
    const baseMinute = optimalTime.getMinutes();
    
    const currentTime = parseISO(`2000-01-01T${baseHour.toString().padStart(2, '0')}:${baseMinute.toString().padStart(2, '0')}`);
    
    // If current time is before preferred window, schedule for start of window
    if (currentTime < preferredStart) {
      optimalTime.setHours(preferredStart.getHours(), preferredStart.getMinutes());
    }
    // If current time is after preferred window, schedule for next day's start
    else if (currentTime > preferredEnd) {
      optimalTime.setDate(optimalTime.getDate() + 1);
      optimalTime.setHours(preferredStart.getHours(), preferredStart.getMinutes());
    }
    // Otherwise, send at current time
    
    return optimalTime;
  }

  private async getTargetCustomers(
    segmentIds: string[],
    filters?: Record<string, any>
  ): Promise<Customer[]> {
    const customerMap = new Map<string, Customer>();

    // Get customers from each segment
    for (const segmentId of segmentIds) {
      const customers = await this.getCustomersBySegment(segmentId);
      customers.forEach(c => customerMap.set(c.id, c));
    }

    let customers = Array.from(customerMap.values());

    // Apply additional filters if provided
    if (filters) {
      // TODO: Implement additional filtering logic
    }

    return customers;
  }

  // =====================================
  // Reminder System
  // =====================================

  async getReminderRules(): Promise<ReminderRule[]> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .select(`
        *,
        template:message_templates(*)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .order('trigger_type')
      .order('trigger_timing');

    if (error) throw error;
    return data || [];
  }

  async createReminderRule(rule: Omit<ReminderRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<ReminderRule> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .insert({
        ...rule,
        tenant_id: this.tenantId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateReminderRule(id: string, updates: Partial<ReminderRule>): Promise<ReminderRule> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async processReminders(): Promise<number> {
    const rules = await this.getReminderRules();
    let processedCount = 0;

    for (const rule of rules) {
      try {
        const count = await this.processReminderRule(rule);
        processedCount += count;
      } catch (error) {
        console.error(`Error processing reminder rule ${rule.id}:`, error);
      }
    }

    return processedCount;
  }

  private async processReminderRule(rule: ReminderRule): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    switch (rule.trigger_type) {
      case 'before_appointment':
        processedCount = await this.processBeforeAppointmentReminders(rule, now);
        break;
      case 'after_appointment':
        processedCount = await this.processAfterAppointmentReminders(rule, now);
        break;
      case 'no_visit':
        processedCount = await this.processNoVisitReminders(rule, now);
        break;
      case 'birthday':
        processedCount = await this.processBirthdayReminders(rule, now);
        break;
    }

    return processedCount;
  }

  private async processBeforeAppointmentReminders(rule: ReminderRule, now: Date): Promise<number> {
    const targetTime = addMinutes(now, rule.trigger_timing);
    const startOfTargetDay = startOfDay(targetTime);
    const endOfTargetDay = endOfDay(targetTime);

    // Get reservations for the target time
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers!customer_id(*)
      `)
      .eq('tenant_id', this.tenantId)
      .gte('start_time', startOfTargetDay.toISOString())
      .lt('start_time', endOfTargetDay.toISOString())
      .eq('status', 'confirmed');

    if (error) throw error;

    let processedCount = 0;

    for (const reservation of reservations || []) {
      // Check if reminder already sent
      const { data: existing } = await supabase
        .from('sent_reminders')
        .select('id')
        .eq('reminder_rule_id', rule.id)
        .eq('reservation_id', reservation.id)
        .single();

      if (!existing) {
        await this.sendReminder(rule, reservation.customer, reservation);
        processedCount++;
      }
    }

    return processedCount;
  }

  private async processAfterAppointmentReminders(rule: ReminderRule, now: Date): Promise<number> {
    const targetTime = addMinutes(now, -rule.trigger_timing);
    const startOfTargetDay = startOfDay(targetTime);
    const endOfTargetDay = endOfDay(targetTime);

    // Get completed reservations
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers!customer_id(*)
      `)
      .eq('tenant_id', this.tenantId)
      .gte('end_time', startOfTargetDay.toISOString())
      .lt('end_time', endOfTargetDay.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    let processedCount = 0;

    for (const reservation of reservations || []) {
      // Check if reminder already sent
      const { data: existing } = await supabase
        .from('sent_reminders')
        .select('id')
        .eq('reminder_rule_id', rule.id)
        .eq('reservation_id', reservation.id)
        .single();

      if (!existing) {
        await this.sendReminder(rule, reservation.customer, reservation);
        processedCount++;
      }
    }

    return processedCount;
  }

  private async processNoVisitReminders(rule: ReminderRule, now: Date): Promise<number> {
    // Get customers who haven't visited in X days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - rule.trigger_timing / 1440); // Convert minutes to days

    // This would require a complex query to find customers without recent reservations
    // For now, return 0
    return 0;
  }

  private async processBirthdayReminders(rule: ReminderRule, now: Date): Promise<number> {
    // Get customers with birthdays
    // This would require birthday field in customer table
    // For now, return 0
    return 0;
  }

  private async sendReminder(
    rule: ReminderRule,
    customer: Customer,
    reservation?: Reservation
  ): Promise<void> {
    // Get customer preferences
    const preferences = await this.getCustomerPreferences(customer.id);

    for (const channel of rule.send_channels) {
      const pref = preferences.find(p => p.channel_type === channel);
      
      // Skip if customer opted out or doesn't want reminders
      if (pref && (!pref.is_opted_in || !pref.receive_reminders)) {
        continue;
      }

      // Get template
      let content = '';
      if (rule.template_id && rule.template) {
        content = rule.template.content;
      }

      // Fill template variables
      content = await this.fillTemplateVariables(content, customer, reservation);

      // Queue the reminder
      await supabase.from('message_queue').insert({
        tenant_id: this.tenantId,
        customer_id: customer.id,
        reminder_rule_id: rule.id,
        channel_type: channel,
        priority: 7, // Higher priority for reminders
        scheduled_for: new Date().toISOString(),
        content,
        metadata: {
          reminder_type: rule.trigger_type,
          customer_name: customer.name,
          reservation_id: reservation?.id,
        },
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      });

      // Record sent reminder
      await supabase.from('sent_reminders').insert({
        tenant_id: this.tenantId,
        reminder_rule_id: rule.id,
        customer_id: customer.id,
        reservation_id: reservation?.id,
        channel_type: channel,
        sent_at: new Date().toISOString(),
        status: 'sent',
      });

      // Only send via first available channel
      break;
    }
  }

  // =====================================
  // Template System
  // =====================================

  async fillTemplateVariables(
    template: string,
    customer: Customer,
    reservation?: Reservation,
    campaign?: Campaign
  ): Promise<string> {
    let filled = template;

    // Customer variables
    filled = filled.replace(/\{customer_name\}/g, customer.name);
    filled = filled.replace(/\{customer_phone\}/g, customer.phone_number || '');
    filled = filled.replace(/\{customer_email\}/g, customer.email || '');
    
    // Calculate visit count (would need actual query)
    filled = filled.replace(/\{visit_count\}/g, '1');
    
    // Reservation variables
    if (reservation) {
      filled = filled.replace(/\{date\}/g, format(parseISO(reservation.start_time), 'M月d日(E)', { locale: ja }));
      filled = filled.replace(/\{time\}/g, format(parseISO(reservation.start_time), 'HH:mm'));
      filled = filled.replace(/\{menu\}/g, reservation.menu_content || '');
      filled = filled.replace(/\{staff_name\}/g, reservation.staff_name || 'スタッフ');
    }

    // Salon variables (would need to fetch from tenant)
    filled = filled.replace(/\{salon_name\}/g, 'ビューティーサロン');
    filled = filled.replace(/\{salon_address\}/g, '東京都渋谷区...');
    filled = filled.replace(/\{salon_phone\}/g, '03-1234-5678');

    return filled;
  }

  async previewMessage(
    templateId: string,
    customerIds: string[],
    reservationId?: string
  ): Promise<MessagePreview[]> {
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    const previews: MessagePreview[] = [];

    for (const customerId of customerIds.slice(0, 5)) { // Limit to 5 previews
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) continue;

      let reservation;
      if (reservationId) {
        const { data } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .single();
        reservation = data;
      }

      const content = await this.fillTemplateVariables(
        template.content,
        customer,
        reservation
      );

      const subject = template.subject ? 
        await this.fillTemplateVariables(template.subject, customer, reservation) :
        undefined;

      previews.push({
        customer_id: customer.id,
        customer_name: customer.name,
        channel_type: 'line', // Default preview channel
        subject,
        content,
        variables_used: this.extractUsedVariables(template.content),
      });
    }

    return previews;
  }

  private extractUsedVariables(template: string): Record<string, string> {
    const used: Record<string, string> = {};
    const matches = template.match(/\{([^}]+)\}/g) || [];

    matches.forEach(match => {
      const varName = match.slice(1, -1);
      const variable = DEFAULT_TEMPLATE_VARIABLES.find(v => v.name === varName);
      if (variable) {
        used[varName] = variable.description;
      }
    });

    return used;
  }

  // =====================================
  // Campaign Analytics
  // =====================================

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (campaignError) throw campaignError;

    // Get campaign messages
    const { data: messages, error: messagesError } = await supabase
      .from('campaign_messages')
      .select('*')
      .eq('campaign_id', campaignId);

    if (messagesError) throw messagesError;

    const totalMessages = messages?.length || 0;
    const sentMessages = messages?.filter(m => m.status !== 'pending').length || 0;
    const deliveredMessages = messages?.filter(m => m.status === 'delivered').length || 0;
    const failedMessages = messages?.filter(m => m.status === 'failed').length || 0;

    // Calculate channel stats
    const channelStats = campaign.send_channels.map(channel => {
      const channelMessages = messages?.filter(m => m.channel_type === channel) || [];
      return {
        channel,
        sent: channelMessages.filter(m => m.sent_at).length,
        delivered: channelMessages.filter(m => m.delivered_at).length,
        opened: channelMessages.filter(m => m.read_at).length,
        clicked: channelMessages.filter(m => m.clicked_at).length,
        failed: channelMessages.filter(m => m.status === 'failed').length,
      };
    });

    return {
      campaign_id: campaignId,
      total_recipients: campaign.total_recipients,
      sent_count: sentMessages,
      delivered_count: deliveredMessages,
      delivery_rate: sentMessages > 0 ? (deliveredMessages / sentMessages) * 100 : 0,
      open_count: messages?.filter(m => m.read_at).length || 0,
      open_rate: deliveredMessages > 0 ? 
        ((messages?.filter(m => m.read_at).length || 0) / deliveredMessages) * 100 : 0,
      click_count: messages?.filter(m => m.clicked_at).length || 0,
      click_rate: deliveredMessages > 0 ?
        ((messages?.filter(m => m.clicked_at).length || 0) / deliveredMessages) * 100 : 0,
      bounce_count: messages?.filter(m => m.status === 'bounced').length || 0,
      bounce_rate: sentMessages > 0 ?
        ((messages?.filter(m => m.status === 'bounced').length || 0) / sentMessages) * 100 : 0,
      error_count: failedMessages,
      error_rate: sentMessages > 0 ? (failedMessages / sentMessages) * 100 : 0,
      channel_stats: channelStats,
    };
  }

  // =====================================
  // Queue Processing
  // =====================================

  async processMessageQueue(limit: number = 100): Promise<number> {
    // Get pending messages from queue
    const { data: queueItems, error } = await supabase
      .from('message_queue')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for')
      .limit(limit);

    if (error) throw error;

    let processedCount = 0;

    for (const item of queueItems || []) {
      try {
        await this.processQueueItem(item);
        processedCount++;
      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        await this.handleQueueItemError(item, error);
      }
    }

    return processedCount;
  }

  private async processQueueItem(item: MessageQueueItem): Promise<void> {
    // Update status to processing
    await supabase
      .from('message_queue')
      .update({ status: 'processing' })
      .eq('id', item.id);

    // Send the message based on channel type
    let messageId: string | undefined;
    
    switch (item.channel_type) {
      case 'line':
        messageId = await this.sendLineMessage(item);
        break;
      case 'email':
        messageId = await this.sendEmailMessage(item);
        break;
      case 'sms':
        messageId = await this.sendSmsMessage(item);
        break;
      default:
        throw new Error(`Unsupported channel type: ${item.channel_type}`);
    }

    // Update queue item
    await supabase
      .from('message_queue')
      .update({
        status: 'sent',
        processed_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    // Update campaign message if applicable
    if (item.campaign_id) {
      await supabase
        .from('campaign_messages')
        .update({
          message_id: messageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('campaign_id', item.campaign_id)
        .eq('customer_id', item.customer_id)
        .eq('channel_type', item.channel_type);
    }
  }

  private async handleQueueItemError(item: MessageQueueItem, error: any): Promise<void> {
    const retryCount = item.retry_count + 1;
    const shouldRetry = retryCount < item.max_retries;

    await supabase
      .from('message_queue')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        retry_count: retryCount,
        last_error: error.message || 'Unknown error',
        scheduled_for: shouldRetry ? 
          addMinutes(new Date(), Math.pow(2, retryCount)).toISOString() : // Exponential backoff
          item.scheduled_for,
      })
      .eq('id', item.id);

    // Update campaign message if applicable
    if (item.campaign_id && !shouldRetry) {
      await supabase
        .from('campaign_messages')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('campaign_id', item.campaign_id)
        .eq('customer_id', item.customer_id)
        .eq('channel_type', item.channel_type);
    }
  }

  private async sendLineMessage(item: MessageQueueItem): Promise<string> {
    // TODO: Implement LINE message sending
    console.log('Sending LINE message:', item);
    
    // Create message record
    const { data, error } = await supabase
      .from('messages')
      .insert({
        tenant_id: this.tenantId,
        customer_id: item.customer_id,
        channel_type: 'line',
        direction: 'sent',
        content: item.content,
        is_read: false,
        is_ai_reply: false,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async sendEmailMessage(item: MessageQueueItem): Promise<string> {
    // TODO: Implement email sending (SendGrid/AWS SES)
    console.log('Sending email:', item);
    
    // Create message record
    const { data, error } = await supabase
      .from('messages')
      .insert({
        tenant_id: this.tenantId,
        customer_id: item.customer_id,
        channel_type: 'email',
        direction: 'sent',
        content: item.content,
        is_read: false,
        is_ai_reply: false,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async sendSmsMessage(item: MessageQueueItem): Promise<string> {
    // TODO: Implement SMS sending (Twilio)
    console.log('Sending SMS:', item);
    
    // Create message record
    const { data, error } = await supabase
      .from('messages')
      .insert({
        tenant_id: this.tenantId,
        customer_id: item.customer_id,
        channel_type: 'sms',
        direction: 'sent',
        content: item.content,
        is_read: false,
        is_ai_reply: false,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  // =====================================
  // Emergency Templates
  // =====================================

  getEmergencyTemplates(): MessageTemplate[] {
    return [
      {
        id: 'emergency-closure',
        tenant_id: this.tenantId,
        name: '緊急休業のお知らせ',
        category: 'emergency',
        content: `{customer_name}様

大変申し訳ございません。
本日は緊急の事情により臨時休業とさせていただきます。

ご予約のお客様には個別にご連絡させていただきます。
ご迷惑をおかけして申し訳ございません。

{salon_name}`,
        variables: ['customer_name', 'salon_name'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'holiday-schedule',
        tenant_id: this.tenantId,
        name: '年末年始の営業について',
        category: 'announcement',
        content: `{customer_name}様

いつもご利用いただきありがとうございます。
年末年始の営業時間についてお知らせいたします。

12月31日(月) 10:00-18:00（最終受付17:00）
1月1日(火)〜3日(木) 休業
1月4日(金) 通常営業

新年もどうぞよろしくお願いいたします。`,
        variables: ['customer_name'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'special-campaign',
        tenant_id: this.tenantId,
        name: '期間限定キャンペーン',
        category: 'campaign',
        content: `{customer_name}様

特別キャンペーンのお知らせです！

【期間限定】全メニュー20%OFF
期間：3月1日〜3月31日

この機会にぜひご利用ください。
ご予約はお電話またはLINEにて承ります。`,
        variables: ['customer_name'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  // =====================================
  // Default Segments
  // =====================================

  getDefaultSegments(): CustomerSegment[] {
    return [
      {
        id: 'all-customers',
        tenant_id: this.tenantId,
        name: '全顧客',
        description: 'すべての顧客',
        segment_type: 'dynamic',
        conditions: { all: true },
        customer_ids: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'vip-customers',
        tenant_id: this.tenantId,
        name: 'VIP顧客',
        description: '月2回以上来店する顧客',
        segment_type: 'dynamic',
        conditions: {
          visit_frequency: {
            operator: '>=',
            value: 2,
            period: 'month',
          },
        },
        customer_ids: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'new-customers',
        tenant_id: this.tenantId,
        name: '新規顧客',
        description: '初回来店から3ヶ月以内',
        segment_type: 'dynamic',
        conditions: {
          first_visit: {
            operator: '<=',
            value: 90,
            unit: 'days',
          },
        },
        customer_ids: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dormant-customers',
        tenant_id: this.tenantId,
        name: '休眠顧客',
        description: '3ヶ月以上来店なし',
        segment_type: 'dynamic',
        conditions: {
          last_visit: {
            operator: '>=',
            value: 90,
            unit: 'days',
          },
        },
        customer_ids: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }
}