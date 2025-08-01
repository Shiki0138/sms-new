import { supabase } from '../lib/supabase';

export interface CustomerLifetimeValue {
  id: string;
  customerId: string;
  customerName?: string;
  totalRevenue: number;
  totalVisits: number;
  averageOrderValue: number;
  firstVisitDate?: string;
  lastVisitDate?: string;
  daysSinceFirstVisit: number;
  visitFrequencyDays: number;
  projectedAnnualValue: number;
  churnProbability: number;
  customerSegment: 'VIP' | 'Regular' | 'New' | 'At-Risk' | 'Lost';
  updatedAt: string;
}

export interface ServiceAnalytics {
  id: string;
  serviceId: string;
  serviceName?: string;
  month: string;
  bookingCount: number;
  revenue: number;
  uniqueCustomers: number;
  repeatRate: number;
  averageRating?: number;
  cancellationRate: number;
  popularityScore: number;
  trend: 'rising' | 'stable' | 'declining';
}

export interface StaffPerformanceMetrics {
  id: string;
  staffId: string;
  staffName?: string;
  month: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number;
  averageServiceTime?: number;
  utilizationRate: number;
  customerSatisfaction?: number;
  repeatCustomerRate: number;
  newCustomerCount: number;
  productivityScore: number;
}

export interface RevenueTrend {
  date: string;
  dailyRevenue: number;
  appointmentCount: number;
  newCustomerRevenue: number;
  repeatCustomerRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  averageTicketSize: number;
  dayOfWeek: number;
  isHoliday: boolean;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  serviceId?: string;
  staffId?: string;
  segment?: string;
}

/**
 * 高度なレポーティングサービス
 */
export class AdvancedReportingService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * 顧客生涯価値（CLV）レポートを取得
   */
  async getCustomerLifetimeValues(filter?: ReportFilter): Promise<CustomerLifetimeValue[]> {
    try {
      let query = supabase
        .from('customer_lifetime_values')
        .select(`
          *,
          customers (
            name
          )
        `)
        .eq('tenant_id', this.tenantId)
        .order('total_revenue', { ascending: false });

      if (filter?.customerId) {
        query = query.eq('customer_id', filter.customerId);
      }
      if (filter?.segment) {
        query = query.eq('customer_segment', filter.segment);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        customerId: item.customer_id,
        customerName: item.customers?.name,
        totalRevenue: item.total_revenue,
        totalVisits: item.total_visits,
        averageOrderValue: item.average_order_value,
        firstVisitDate: item.first_visit_date,
        lastVisitDate: item.last_visit_date,
        daysSinceFirstVisit: item.days_since_first_visit,
        visitFrequencyDays: item.visit_frequency_days,
        projectedAnnualValue: item.projected_annual_value,
        churnProbability: item.churn_probability,
        customerSegment: item.customer_segment,
        updatedAt: item.updated_at,
      })) || [];
    } catch (error) {
      console.error('Error fetching CLV data:', error);
      return [];
    }
  }

  /**
   * 特定の顧客のCLVを計算・更新
   */
  async calculateCustomerLifetimeValue(customerId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('calculate_customer_lifetime_value', {
        p_tenant_id: this.tenantId,
        p_customer_id: customerId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error calculating CLV:', error);
      throw error;
    }
  }

  /**
   * 全顧客のCLVを一括計算
   */
  async calculateAllCustomerLifetimeValues(): Promise<void> {
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', this.tenantId);

      if (customers) {
        for (const customer of customers) {
          await this.calculateCustomerLifetimeValue(customer.id);
        }
      }
    } catch (error) {
      console.error('Error calculating all CLVs:', error);
      throw error;
    }
  }

  /**
   * サービス分析データを取得
   */
  async getServiceAnalytics(filter?: ReportFilter): Promise<ServiceAnalytics[]> {
    try {
      let query = supabase
        .from('service_analytics')
        .select(`
          *,
          services (
            name
          )
        `)
        .eq('tenant_id', this.tenantId)
        .order('month', { ascending: false });

      if (filter?.serviceId) {
        query = query.eq('service_id', filter.serviceId);
      }
      if (filter?.startDate) {
        query = query.gte('month', filter.startDate);
      }
      if (filter?.endDate) {
        query = query.lte('month', filter.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        serviceId: item.service_id,
        serviceName: item.services?.name,
        month: item.month,
        bookingCount: item.booking_count,
        revenue: item.revenue,
        uniqueCustomers: item.unique_customers,
        repeatRate: item.repeat_rate,
        averageRating: item.average_rating,
        cancellationRate: item.cancellation_rate,
        popularityScore: item.popularity_score,
        trend: item.trend,
      })) || [];
    } catch (error) {
      console.error('Error fetching service analytics:', error);
      return [];
    }
  }

  /**
   * スタッフパフォーマンス指標を取得
   */
  async getStaffPerformanceMetrics(filter?: ReportFilter): Promise<StaffPerformanceMetrics[]> {
    try {
      let query = supabase
        .from('staff_performance_metrics')
        .select(`
          *,
          staff (
            name
          )
        `)
        .eq('tenant_id', this.tenantId)
        .order('month', { ascending: false });

      if (filter?.staffId) {
        query = query.eq('staff_id', filter.staffId);
      }
      if (filter?.startDate) {
        query = query.gte('month', filter.startDate);
      }
      if (filter?.endDate) {
        query = query.lte('month', filter.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        staffId: item.staff_id,
        staffName: item.staff?.name,
        month: item.month,
        totalAppointments: item.total_appointments,
        completedAppointments: item.completed_appointments,
        cancelledAppointments: item.cancelled_appointments,
        noShowAppointments: item.no_show_appointments,
        totalRevenue: item.total_revenue,
        averageServiceTime: item.average_service_time,
        utilizationRate: item.utilization_rate,
        customerSatisfaction: item.customer_satisfaction,
        repeatCustomerRate: item.repeat_customer_rate,
        newCustomerCount: item.new_customer_count,
        productivityScore: item.productivity_score,
      })) || [];
    } catch (error) {
      console.error('Error fetching staff performance metrics:', error);
      return [];
    }
  }

  /**
   * 収益トレンドを取得
   */
  async getRevenueTrends(filter?: ReportFilter): Promise<RevenueTrend[]> {
    try {
      let query = supabase
        .from('revenue_trends')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('date', { ascending: true });

      if (filter?.startDate) {
        query = query.gte('date', filter.startDate);
      }
      if (filter?.endDate) {
        query = query.lte('date', filter.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        date: item.date,
        dailyRevenue: item.daily_revenue,
        appointmentCount: item.appointment_count,
        newCustomerRevenue: item.new_customer_revenue,
        repeatCustomerRevenue: item.repeat_customer_revenue,
        serviceRevenue: item.service_revenue,
        productRevenue: item.product_revenue,
        averageTicketSize: item.average_ticket_size,
        dayOfWeek: item.day_of_week,
        isHoliday: item.is_holiday,
      })) || [];
    } catch (error) {
      console.error('Error fetching revenue trends:', error);
      return [];
    }
  }

  /**
   * 顧客セグメント別の統計を取得
   */
  async getCustomerSegmentStats(): Promise<{
    segment: string;
    count: number;
    totalRevenue: number;
    avgRevenue: number;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('customer_lifetime_values')
        .select('customer_segment, total_revenue')
        .eq('tenant_id', this.tenantId);

      if (error) throw error;

      const segmentStats = new Map<string, { count: number; totalRevenue: number }>();

      data?.forEach(item => {
        const segment = item.customer_segment;
        const current = segmentStats.get(segment) || { count: 0, totalRevenue: 0 };
        segmentStats.set(segment, {
          count: current.count + 1,
          totalRevenue: current.totalRevenue + item.total_revenue,
        });
      });

      return Array.from(segmentStats.entries()).map(([segment, stats]) => ({
        segment,
        count: stats.count,
        totalRevenue: stats.totalRevenue,
        avgRevenue: stats.totalRevenue / stats.count,
      }));
    } catch (error) {
      console.error('Error fetching customer segment stats:', error);
      return [];
    }
  }

  /**
   * トップパフォーマンススタッフを取得
   */
  async getTopPerformingStaff(limit: number = 5): Promise<StaffPerformanceMetrics[]> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      const { data, error } = await supabase
        .from('staff_performance_metrics')
        .select(`
          *,
          staff (
            name
          )
        `)
        .eq('tenant_id', this.tenantId)
        .eq('month', currentMonth)
        .order('productivity_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        staffId: item.staff_id,
        staffName: item.staff?.name,
        month: item.month,
        totalAppointments: item.total_appointments,
        completedAppointments: item.completed_appointments,
        cancelledAppointments: item.cancelled_appointments,
        noShowAppointments: item.no_show_appointments,
        totalRevenue: item.total_revenue,
        averageServiceTime: item.average_service_time,
        utilizationRate: item.utilization_rate,
        customerSatisfaction: item.customer_satisfaction,
        repeatCustomerRate: item.repeat_customer_rate,
        newCustomerCount: item.new_customer_count,
        productivityScore: item.productivity_score,
      })) || [];
    } catch (error) {
      console.error('Error fetching top performing staff:', error);
      return [];
    }
  }

  /**
   * 人気サービストップを取得
   */
  async getPopularServices(limit: number = 5): Promise<ServiceAnalytics[]> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      const { data, error } = await supabase
        .from('service_analytics')
        .select(`
          *,
          services (
            name
          )
        `)
        .eq('tenant_id', this.tenantId)
        .eq('month', currentMonth)
        .order('popularity_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        serviceId: item.service_id,
        serviceName: item.services?.name,
        month: item.month,
        bookingCount: item.booking_count,
        revenue: item.revenue,
        uniqueCustomers: item.unique_customers,
        repeatRate: item.repeat_rate,
        averageRating: item.average_rating,
        cancellationRate: item.cancellation_rate,
        popularityScore: item.popularity_score,
        trend: item.trend,
      })) || [];
    } catch (error) {
      console.error('Error fetching popular services:', error);
      return [];
    }
  }
}