/**
 * Customer Segmentation Engine
 * Advanced customer segmentation with dynamic conditions and real-time filtering
 */

import { supabase } from '../lib/supabase';
import { format, subDays, subWeeks, subMonths, parseISO } from 'date-fns';

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
  value2?: any; // For 'between' operator
}

export interface SegmentRule {
  conditions: SegmentCondition[];
  logic: 'AND' | 'OR';
}

export interface DynamicSegment {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  tags: string[];
  is_active: boolean;
  auto_update: boolean;
  last_calculated: string;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

export interface SegmentAnalytics {
  segment_id: string;
  customer_count: number;
  growth_rate: number; // Percentage change from last calculation
  demographics: {
    age_distribution: Record<string, number>;
    gender_distribution: Record<string, number>;
    location_distribution: Record<string, number>;
  };
  behavior: {
    avg_visit_frequency: number;
    avg_total_spent: number;
    favorite_services: Array<{ service: string; count: number }>;
    preferred_channels: Record<string, number>;
  };
  value_metrics: {
    high_value_customers: number;
    at_risk_customers: number;
    new_customers: number;
    dormant_customers: number;
  };
  created_at: string;
}

export interface SegmentPreview {
  matching_customers: number;
  sample_customers: Array<{
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    last_visit?: string;
    total_spent: number;
    visit_count: number;
  }>;
  estimated_reach_by_channel: Record<string, number>;
}

export class CustomerSegmentationEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Create a new dynamic segment
   */
  async createSegment(segment: Omit<DynamicSegment, 'id' | 'tenant_id' | 'customer_count' | 'last_calculated' | 'created_at' | 'updated_at'>): Promise<DynamicSegment> {
    const segmentId = crypto.randomUUID();
    
    // Calculate initial customer count
    const customerCount = await this.calculateSegmentSize(segment.rules);
    
    const { data, error } = await supabase
      .from('customer_segments_dynamic')
      .insert({
        id: segmentId,
        tenant_id: this.tenantId,
        name: segment.name,
        description: segment.description,
        rules: segment.rules,
        tags: segment.tags,
        is_active: segment.is_active,
        auto_update: segment.auto_update,
        customer_count: customerCount,
        last_calculated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing segment
   */
  async updateSegment(segmentId: string, updates: Partial<DynamicSegment>): Promise<DynamicSegment> {
    // Recalculate customer count if rules changed
    let customerCount: number | undefined;
    if (updates.rules) {
      customerCount = await this.calculateSegmentSize(updates.rules);
    }

    const { data, error } = await supabase
      .from('customer_segments_dynamic')
      .update({
        ...updates,
        customer_count: customerCount,
        last_calculated: customerCount !== undefined ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', segmentId)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all segments for tenant
   */
  async getSegments(): Promise<DynamicSegment[]> {
    const { data, error } = await supabase
      .from('customer_segments_dynamic')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get customers matching a segment
   */
  async getSegmentCustomers(segmentId: string, limit?: number, offset?: number): Promise<any[]> {
    const { data: segment, error: segmentError } = await supabase
      .from('customer_segments_dynamic')
      .select('*')
      .eq('id', segmentId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (segmentError) throw segmentError;

    return this.executeSegmentQuery(segment.rules, limit, offset);
  }

  /**
   * Preview segment results before creating
   */
  async previewSegment(rules: SegmentRule[]): Promise<SegmentPreview> {
    const customers = await this.executeSegmentQuery(rules, 1000); // Get up to 1000 for preview
    const sampleCustomers = customers.slice(0, 10); // Show 10 samples

    // Calculate channel reach
    const channelReach = await this.calculateChannelReach(customers);

    return {
      matching_customers: customers.length,
      sample_customers: sampleCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone_number,
        last_visit: customer.last_visit,
        total_spent: customer.total_spent || 0,
        visit_count: customer.visit_count || 0,
      })),
      estimated_reach_by_channel: channelReach,
    };
  }

  /**
   * Calculate segment analytics
   */
  async calculateSegmentAnalytics(segmentId: string): Promise<SegmentAnalytics> {
    const customers = await this.getSegmentCustomers(segmentId);
    
    // Get previous analytics for growth calculation
    const { data: previousAnalytics } = await supabase
      .from('segment_analytics')
      .select('customer_count')
      .eq('segment_id', segmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentCount = customers.length;
    const previousCount = previousAnalytics?.customer_count || currentCount;
    const growthRate = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;

    // Calculate demographics
    const demographics = this.calculateDemographics(customers);
    
    // Calculate behavior metrics
    const behavior = await this.calculateBehaviorMetrics(customers);
    
    // Calculate value metrics
    const valueMetrics = this.calculateValueMetrics(customers);

    const analytics: SegmentAnalytics = {
      segment_id: segmentId,
      customer_count: currentCount,
      growth_rate: growthRate,
      demographics,
      behavior,
      value_metrics: valueMetrics,
      created_at: new Date().toISOString(),
    };

    // Store analytics
    await supabase
      .from('segment_analytics')
      .insert({
        ...analytics,
        tenant_id: this.tenantId,
      });

    return analytics;
  }

  /**
   * Execute segment query based on rules
   */
  private async executeSegmentQuery(rules: SegmentRule[], limit?: number, offset?: number): Promise<any[]> {
    let baseQuery = supabase
      .from('customers')
      .select(`
        *,
        reservations!customer_id(
          id,
          start_time,
          end_time,
          price,
          status,
          menu_content
        ),
        customer_message_preferences!customer_id(
          channel_type,
          is_opted_in
        )
      `)
      .eq('tenant_id', this.tenantId);

    if (limit) baseQuery = baseQuery.limit(limit);
    if (offset) baseQuery = baseQuery.range(offset, offset + (limit || 100) - 1);

    const { data: customers, error } = await baseQuery;
    if (error) throw error;

    if (!customers) return [];

    // Apply segment rules in memory for complex conditions
    return this.filterCustomersByRules(customers, rules);
  }

  /**
   * Filter customers by segment rules
   */
  private filterCustomersByRules(customers: any[], rules: SegmentRule[]): any[] {
    return customers.filter(customer => {
      // Enhanced customer object with calculated fields
      const enhancedCustomer = this.enhanceCustomerData(customer);
      
      // Apply each rule
      return rules.every(rule => this.evaluateRule(enhancedCustomer, rule));
    });
  }

  /**
   * Enhance customer data with calculated fields
   */
  private enhanceCustomerData(customer: any): any {
    const reservations = customer.reservations || [];
    const completedReservations = reservations.filter((r: any) => r.status === 'completed');
    
    // Calculate visit metrics
    const visitCount = completedReservations.length;
    const totalSpent = completedReservations.reduce((sum: number, r: any) => sum + (r.price || 0), 0);
    
    // Calculate last visit
    const lastVisit = completedReservations.length > 0 ? 
      completedReservations.sort((a: any, b: any) => 
        new Date(b.end_time).getTime() - new Date(a.end_time).getTime()
      )[0].end_time : null;

    // Calculate days since last visit
    const daysSinceLastVisit = lastVisit ? 
      Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)) : null;

    // Calculate age if birth date is available
    const age = customer.birth_date ? 
      Math.floor((Date.now() - new Date(customer.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

    // Calculate visit frequency (visits per month)
    const firstVisit = completedReservations.length > 0 ?
      completedReservations.sort((a: any, b: any) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )[0].start_time : null;

    const monthsSinceFirstVisit = firstVisit ?
      Math.max(1, Math.floor((Date.now() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 1;

    const visitFrequency = visitCount / monthsSinceFirstVisit;

    // Get favorite services
    const serviceCount: Record<string, number> = {};
    completedReservations.forEach((r: any) => {
      if (r.menu_content) {
        serviceCount[r.menu_content] = (serviceCount[r.menu_content] || 0) + 1;
      }
    });

    const favoriteService = Object.entries(serviceCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    // Get channel preferences
    const preferences = customer.customer_message_preferences || [];
    const optedInChannels = preferences.filter((p: any) => p.is_opted_in).map((p: any) => p.channel_type);

    return {
      ...customer,
      visit_count: visitCount,
      total_spent: totalSpent,
      last_visit: lastVisit,
      days_since_last_visit: daysSinceLastVisit,
      age: age,
      visit_frequency: visitFrequency,
      favorite_service: favoriteService,
      opted_in_channels: optedInChannels,
      months_since_first_visit: monthsSinceFirstVisit,
    };
  }

  /**
   * Evaluate a single rule against a customer
   */
  private evaluateRule(customer: any, rule: SegmentRule): boolean {
    const conditionResults = rule.conditions.map(condition => 
      this.evaluateCondition(customer, condition)
    );

    return rule.logic === 'AND' ? 
      conditionResults.every(result => result) :
      conditionResults.some(result => result);
  }

  /**
   * Evaluate a single condition against a customer
   */
  private evaluateCondition(customer: any, condition: SegmentCondition): boolean {
    const fieldValue = this.getFieldValue(customer, condition.field);
    const { operator, value, value2 } = condition;

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      
      case 'not_equals':
        return fieldValue !== value;
      
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      
      case 'less_than':
        return Number(fieldValue) < Number(value);
      
      case 'between':
        const numValue = Number(fieldValue);
        return numValue >= Number(value) && numValue <= Number(value2);
      
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
      
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
      
      default:
        return false;
    }
  }

  /**
   * Get field value from customer object
   */
  private getFieldValue(customer: any, fieldPath: string): any {
    // Support nested field paths like 'profile.age' or 'preferences.channel'
    const parts = fieldPath.split('.');
    let value = customer;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * Calculate segment size without fetching all customers
   */
  private async calculateSegmentSize(rules: SegmentRule[]): Promise<number> {
    // For simple conditions, we can optimize with database queries
    // For complex conditions, we need to fetch and filter
    const customers = await this.executeSegmentQuery(rules);
    return customers.length;
  }

  /**
   * Calculate channel reach for customers
   */
  private async calculateChannelReach(customers: any[]): Promise<Record<string, number>> {
    const reach = {
      line: 0,
      instagram: 0,
      email: 0,
      sms: 0,
    };

    customers.forEach(customer => {
      if (customer.line_user_id) reach.line++;
      if (customer.instagram_user_id) reach.instagram++;
      if (customer.email) reach.email++;
      if (customer.phone_number) reach.sms++;
    });

    return reach;
  }

  /**
   * Calculate demographics
   */
  private calculateDemographics(customers: any[]): SegmentAnalytics['demographics'] {
    const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0, 'unknown': 0 };
    const genderGroups = { 'male': 0, 'female': 0, 'other': 0, 'unknown': 0 };
    const locationGroups: Record<string, number> = {};

    customers.forEach(customer => {
      // Age distribution
      if (customer.age) {
        if (customer.age <= 25) ageGroups['18-25']++;
        else if (customer.age <= 35) ageGroups['26-35']++;
        else if (customer.age <= 45) ageGroups['36-45']++;
        else if (customer.age <= 55) ageGroups['46-55']++;
        else ageGroups['56+']++;
      } else {
        ageGroups['unknown']++;
      }

      // Gender distribution
      if (customer.gender) {
        genderGroups[customer.gender as keyof typeof genderGroups]++;
      } else {
        genderGroups['unknown']++;
      }

      // Location distribution
      const location = customer.prefecture || customer.city || 'unknown';
      locationGroups[location] = (locationGroups[location] || 0) + 1;
    });

    return {
      age_distribution: ageGroups,
      gender_distribution: genderGroups,
      location_distribution: locationGroups,
    };
  }

  /**
   * Calculate behavior metrics
   */
  private async calculateBehaviorMetrics(customers: any[]): Promise<SegmentAnalytics['behavior']> {
    const totalVisitFreq = customers.reduce((sum, c) => sum + (c.visit_frequency || 0), 0);
    const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    
    const serviceCount: Record<string, number> = {};
    const channelPrefs: Record<string, number> = { line: 0, instagram: 0, email: 0, sms: 0 };

    customers.forEach(customer => {
      // Favorite services
      if (customer.favorite_service) {
        serviceCount[customer.favorite_service] = (serviceCount[customer.favorite_service] || 0) + 1;
      }

      // Channel preferences
      (customer.opted_in_channels || []).forEach((channel: string) => {
        if (channel in channelPrefs) {
          channelPrefs[channel]++;
        }
      });
    });

    const favoriteServices = Object.entries(serviceCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }));

    return {
      avg_visit_frequency: customers.length > 0 ? totalVisitFreq / customers.length : 0,
      avg_total_spent: customers.length > 0 ? totalSpent / customers.length : 0,
      favorite_services: favoriteServices,
      preferred_channels: channelPrefs,
    };
  }

  /**
   * Calculate value metrics
   */
  private calculateValueMetrics(customers: any[]): SegmentAnalytics['value_metrics'] {
    const now = Date.now();
    let highValue = 0;
    let atRisk = 0;
    let newCustomers = 0;
    let dormant = 0;

    customers.forEach(customer => {
      // High value: >$500 total spent or >5 visits
      if ((customer.total_spent || 0) > 50000 || (customer.visit_count || 0) > 5) {
        highValue++;
      }

      // At risk: No visit in 60 days but had visits before
      if (customer.days_since_last_visit && customer.days_since_last_visit > 60 && customer.visit_count > 0) {
        atRisk++;
      }

      // New customers: First visit within 30 days
      if (customer.months_since_first_visit && customer.months_since_first_visit <= 1) {
        newCustomers++;
      }

      // Dormant: No visit in 90+ days
      if (!customer.last_visit || customer.days_since_last_visit > 90) {
        dormant++;
      }
    });

    return {
      high_value_customers: highValue,
      at_risk_customers: atRisk,
      new_customers: newCustomers,
      dormant_customers: dormant,
    };
  }

  /**
   * Auto-update all segments marked for auto-update
   */
  async updateAllAutoSegments(): Promise<number> {
    const { data: segments, error } = await supabase
      .from('customer_segments_dynamic')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('auto_update', true)
      .eq('is_active', true);

    if (error) throw error;

    let updatedCount = 0;

    for (const segment of segments || []) {
      try {
        const newCount = await this.calculateSegmentSize(segment.rules);
        
        await supabase
          .from('customer_segments_dynamic')
          .update({
            customer_count: newCount,
            last_calculated: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', segment.id);

        updatedCount++;
      } catch (error) {
        console.error(`Failed to update segment ${segment.id}:`, error);
      }
    }

    return updatedCount;
  }

  /**
   * Get predefined segment templates
   */
  getPredefinedSegments(): Array<{
    name: string;
    description: string;
    rules: SegmentRule[];
    tags: string[];
  }> {
    return [
      {
        name: 'VIP顧客',
        description: '月2回以上来店、または総消費金額5万円以上',
        rules: [{
          conditions: [
            { field: 'visit_frequency', operator: 'greater_than', value: 2 },
            { field: 'total_spent', operator: 'greater_than', value: 50000 }
          ],
          logic: 'OR'
        }],
        tags: ['high-value', 'loyalty']
      },
      {
        name: '新規顧客',
        description: '初回来店から30日以内',
        rules: [{
          conditions: [
            { field: 'months_since_first_visit', operator: 'less_than', value: 1 }
          ],
          logic: 'AND'
        }],
        tags: ['new', 'onboarding']
      },
      {
        name: '離脱リスク顧客',
        description: '60日以上来店なし（過去に来店歴あり）',
        rules: [{
          conditions: [
            { field: 'days_since_last_visit', operator: 'greater_than', value: 60 },
            { field: 'visit_count', operator: 'greater_than', value: 0 }
          ],
          logic: 'AND'
        }],
        tags: ['at-risk', 'retention']
      },
      {
        name: '若年層女性',
        description: '18-35歳の女性顧客',
        rules: [{
          conditions: [
            { field: 'age', operator: 'between', value: 18, value2: 35 },
            { field: 'gender', operator: 'equals', value: 'female' }
          ],
          logic: 'AND'
        }],
        tags: ['demographics', 'young-female']
      },
      {
        name: 'カラー好き',
        description: 'ヘアカラー系メニューを頻繁に利用',
        rules: [{
          conditions: [
            { field: 'favorite_service', operator: 'contains', value: 'カラー' }
          ],
          logic: 'AND'
        }],
        tags: ['service-preference', 'color']
      },
      {
        name: 'LINE活用層',
        description: 'LINEでの連絡を希望する顧客',
        rules: [{
          conditions: [
            { field: 'opted_in_channels', operator: 'contains', value: 'line' }
          ],
          logic: 'AND'
        }],
        tags: ['channel-preference', 'line']
      }
    ];
  }
}