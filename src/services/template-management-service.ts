import { supabase } from '../lib/supabase';

// Template Management Types
export interface MessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: 'campaign' | 'holiday' | 'emergency' | 'special_offer' | 'reminder' | 'custom';
  sub_category?: string;
  line_content?: string;
  email_content?: string;
  email_subject?: string;
  sms_content?: string;
  variables: string[];
  metadata: Record<string, any>;
  version: number;
  parent_template_id?: string;
  is_ab_test: boolean;
  ab_test_percentage?: number;
  is_active: boolean;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  valid_from?: string;
  valid_until?: string;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TemplateVariable {
  id: string;
  tenant_id: string;
  name: string;
  display_name: string;
  description?: string;
  data_type: 'string' | 'number' | 'date' | 'boolean' | 'url';
  data_source: string;
  data_path?: string;
  default_value?: string;
  example_value?: string;
  is_required: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateDistributionRule {
  id: string;
  tenant_id: string;
  template_id: string;
  name: string;
  send_conditions: Record<string, any>;
  exclusion_conditions: Record<string, any>;
  channel_priorities: Record<string, number>;
  fallback_channels: string[];
  frequency_limit?: number;
  frequency_period?: number;
  preferred_send_times: { start: string; end: string };
  excluded_days: number[];
  is_auto_send: boolean;
  trigger_event?: string;
  trigger_timing?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderTemplate {
  id: string;
  tenant_id: string;
  template_id: string;
  reminder_type: string;
  trigger_timing: number;
  max_reminders: number;
  reminder_interval?: number;
  send_conditions: Record<string, any>;
  customer_filters: Record<string, any>;
  allow_customer_customization: boolean;
  customizable_fields: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template?: MessageTemplate;
}

export interface SeasonalTemplate {
  id: string;
  tenant_id: string;
  template_id: string;
  season_type: string;
  start_date?: string;
  end_date?: string;
  recurring_yearly: boolean;
  event_name?: string;
  event_description?: string;
  send_days_before: number;
  send_on_date: boolean;
  send_days_after: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template?: MessageTemplate;
}

export interface CustomerTemplatePreferences {
  id: string;
  tenant_id: string;
  customer_id: string;
  preferred_channels: string[];
  blocked_channels: string[];
  preferred_language: string;
  communication_style: 'formal' | 'polite' | 'casual' | 'friendly';
  receive_campaigns: boolean;
  receive_reminders: boolean;
  receive_promotions: boolean;
  receive_announcements: boolean;
  receive_birthday_messages: boolean;
  preferred_send_time_start: string;
  preferred_send_time_end: string;
  do_not_disturb_days: number[];
  max_messages_per_week: number;
  min_hours_between_messages: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateAnalytics {
  id: string;
  tenant_id: string;
  template_id: string;
  date: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  line_sent: number;
  email_sent: number;
  sms_sent: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  revenue_generated: number;
  bookings_generated: number;
  created_at: string;
}

export interface TemplatePreview {
  customer_id: string;
  customer_name: string;
  channel_type: 'line' | 'email' | 'sms';
  subject?: string;
  content: string;
  variables_used: Record<string, string>;
}

export class TemplateManagementService {
  constructor(private tenantId: string) {}

  // Template CRUD operations
  async getTemplates(category?: string, includeInactive = false): Promise<MessageTemplate[]> {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getTemplate(id: string): Promise<MessageTemplate | null> {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createTemplate(templateData: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        tenant_id: this.tenantId,
        ...templateData,
        variables: templateData.variables || [],
        metadata: templateData.metadata || {},
        version: 1,
        is_active: templateData.is_active ?? true,
        is_approved: false,
        usage_count: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTemplate(id: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate> {
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

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('message_templates')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  async duplicateTemplate(id: string, newName: string): Promise<MessageTemplate> {
    const original = await this.getTemplate(id);
    if (!original) throw new Error('Template not found');

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        tenant_id: this.tenantId,
        name: newName,
        description: `${original.description} (コピー)`,
        category: original.category,
        sub_category: original.sub_category,
        line_content: original.line_content,
        email_content: original.email_content,
        email_subject: original.email_subject,
        sms_content: original.sms_content,
        variables: original.variables,
        metadata: original.metadata,
        version: 1,
        is_active: true,
        is_approved: false,
        usage_count: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Template Variables
  async getTemplateVariables(): Promise<TemplateVariable[]> {
    const { data, error } = await supabase
      .from('template_variables')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('is_system', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async createTemplateVariable(variableData: Partial<TemplateVariable>): Promise<TemplateVariable> {
    const { data, error } = await supabase
      .from('template_variables')
      .insert({
        tenant_id: this.tenantId,
        ...variableData,
        is_system: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Template Preview with Variable Substitution
  async previewTemplate(
    templateId: string, 
    customerIds: string[], 
    testData?: Record<string, any>
  ): Promise<TemplatePreview[]> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    // Get customer data for preview
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, phone_number, email')
      .in('id', customerIds)
      .eq('tenant_id', this.tenantId);

    if (customerError) throw customerError;

    // Get salon data
    const { data: salon, error: salonError } = await supabase
      .from('tenants')
      .select('name, phone_number, address')
      .eq('id', this.tenantId)
      .single();

    if (salonError) throw salonError;

    const previews: TemplatePreview[] = [];

    for (const customer of customers || []) {
      // Create variable substitution map
      const variableMap = {
        customer_name: customer.name,
        salon_name: salon.name,
        salon_phone: salon.phone_number || '03-1234-5678',
        salon_address: salon.address || '東京都渋谷区〇〇1-2-3',
        appointment_date: testData?.appointment_date || '4月15日(月)',
        appointment_time: testData?.appointment_time || '14:00',
        menu_name: testData?.menu_name || 'カット＋カラー',
        staff_name: testData?.staff_name || 'スタッフ 花子',
        duration: testData?.duration || '120',
        ...testData
      };

      // Generate previews for each channel
      const channels: Array<'line' | 'email' | 'sms'> = ['line', 'email', 'sms'];
      
      for (const channel of channels) {
        let content = '';
        let subject = '';

        switch (channel) {
          case 'line':
            content = template.line_content || template.email_content || '';
            break;
          case 'email':
            content = template.email_content || template.line_content || '';
            subject = template.email_subject || '';
            break;
          case 'sms':
            content = template.sms_content || this.truncateForSMS(template.line_content || '');
            break;
        }

        // Substitute variables
        const processedContent = this.substituteVariables(content, variableMap);
        const processedSubject = this.substituteVariables(subject, variableMap);

        previews.push({
          customer_id: customer.id,
          customer_name: customer.name,
          channel_type: channel,
          subject: processedSubject || undefined,
          content: processedContent,
          variables_used: this.extractUsedVariables(content, variableMap)
        });
      }
    }

    return previews;
  }

  // Reminder Templates
  async getReminderTemplates(): Promise<ReminderTemplate[]> {
    const { data, error } = await supabase
      .from('reminder_templates')
      .select(`
        *,
        template:message_templates(*)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .order('reminder_type');

    if (error) throw error;
    return data || [];
  }

  async createReminderTemplate(reminderData: Partial<ReminderTemplate>): Promise<ReminderTemplate> {
    const { data, error } = await supabase
      .from('reminder_templates')
      .insert({
        tenant_id: this.tenantId,
        ...reminderData,
        send_conditions: reminderData.send_conditions || {},
        customer_filters: reminderData.customer_filters || {},
        customizable_fields: reminderData.customizable_fields || [],
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Seasonal Templates
  async getSeasonalTemplates(): Promise<SeasonalTemplate[]> {
    const { data, error } = await supabase
      .from('seasonal_templates')
      .select(`
        *,
        template:message_templates(*)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .order('start_date');

    if (error) throw error;
    return data || [];
  }

  async createSeasonalTemplate(seasonalData: Partial<SeasonalTemplate>): Promise<SeasonalTemplate> {
    const { data, error } = await supabase
      .from('seasonal_templates')
      .insert({
        tenant_id: this.tenantId,
        ...seasonalData,
        recurring_yearly: seasonalData.recurring_yearly ?? true,
        send_days_before: seasonalData.send_days_before ?? 0,
        send_on_date: seasonalData.send_on_date ?? true,
        send_days_after: seasonalData.send_days_after ?? 0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Customer Preferences
  async getCustomerPreferences(customerId: string): Promise<CustomerTemplatePreferences | null> {
    const { data, error } = await supabase
      .from('customer_template_preferences')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('customer_id', customerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateCustomerPreferences(
    customerId: string, 
    preferences: Partial<CustomerTemplatePreferences>
  ): Promise<CustomerTemplatePreferences> {
    const { data, error } = await supabase
      .from('customer_template_preferences')
      .upsert({
        tenant_id: this.tenantId,
        customer_id: customerId,
        ...preferences
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Template Analytics
  async getTemplateAnalytics(
    templateId?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<TemplateAnalytics[]> {
    let query = supabase
      .from('template_analytics')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('date', { ascending: false });

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Utility Methods
  private substituteVariables(content: string, variables: Record<string, any>): string {
    return content.replace(/\{([^}]+)\}/g, (match, variableName) => {
      return variables[variableName] || match;
    });
  }

  private extractUsedVariables(content: string, variableMap: Record<string, any>): Record<string, string> {
    const used: Record<string, string> = {};
    const matches = content.match(/\{([^}]+)\}/g) || [];
    
    matches.forEach(match => {
      const variableName = match.slice(1, -1);
      if (variableMap[variableName]) {
        used[variableName] = variableMap[variableName];
      }
    });
    
    return used;
  }

  private truncateForSMS(content: string, maxLength = 160): string {
    const cleaned = content.replace(/\n+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  // Template Distribution and Sending
  async sendTemplate(
    templateId: string,
    recipientIds: string[],
    channelOverride?: 'line' | 'email' | 'sms',
    customVariables?: Record<string, any>
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    // This would integrate with your existing messaging service
    // For now, we'll return mock results
    results.sent = recipientIds.length;
    
    // Update template usage
    await this.updateTemplate(templateId, {
      usage_count: template.usage_count + 1,
      last_used_at: new Date().toISOString()
    });

    return results;
  }

  // Smart Template Recommendations
  async getRecommendedTemplates(
    context: 'appointment_reminder' | 'campaign' | 'seasonal' | 'emergency'
  ): Promise<MessageTemplate[]> {
    const categoryMap = {
      appointment_reminder: 'reminder',
      campaign: 'campaign',
      seasonal: 'holiday',
      emergency: 'emergency'
    };

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('category', categoryMap[context])
      .eq('is_active', true)
      .eq('is_approved', true)
      .order('usage_count', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  }

  // Template Performance Summary
  async getTemplatePerformanceSummary(templateId: string, days = 30): Promise<{
    total_sent: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    revenue_generated: number;
    bookings_generated: number;
  }> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('template_analytics')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('template_id', templateId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    const analytics = data || [];
    const totals = analytics.reduce((acc, curr) => ({
      total_sent: acc.total_sent + curr.sent_count,
      total_delivered: acc.total_delivered + curr.delivered_count,
      total_opened: acc.total_opened + curr.opened_count,
      total_clicked: acc.total_clicked + curr.clicked_count,
      revenue_generated: acc.revenue_generated + curr.revenue_generated,
      bookings_generated: acc.bookings_generated + curr.bookings_generated
    }), {
      total_sent: 0,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      revenue_generated: 0,
      bookings_generated: 0
    });

    return {
      total_sent: totals.total_sent,
      delivery_rate: totals.total_sent > 0 ? (totals.total_delivered / totals.total_sent) * 100 : 0,
      open_rate: totals.total_delivered > 0 ? (totals.total_opened / totals.total_delivered) * 100 : 0,
      click_rate: totals.total_opened > 0 ? (totals.total_clicked / totals.total_opened) * 100 : 0,
      revenue_generated: totals.revenue_generated,
      bookings_generated: totals.bookings_generated
    };
  }
}

export default TemplateManagementService;