import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface MenuAnalytics {
  menuId: string;
  menuName: string;
  category: string;
  bookingCount: number;
  revenue: number;
  averageRating: number;
  popularityScore: number;
  lastBookingDate: string | null;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export const useMenuAnalytics = (dateRange?: { start: Date; end: Date }) => {
  const { tenant } = useAuth();

  return useQuery({
    queryKey: ['menu-analytics', tenant?.id, dateRange],
    queryFn: async () => {
      if (!tenant?.id) return [];

      // In a real implementation, this would fetch analytics data
      // For now, return mock data
      const mockAnalytics: MenuAnalytics[] = [
        {
          menuId: '1',
          menuName: 'カット',
          category: 'カット',
          bookingCount: 156,
          revenue: 702000,
          averageRating: 4.8,
          popularityScore: 95,
          lastBookingDate: new Date().toISOString(),
          trendDirection: 'up',
          trendPercentage: 12.5,
        },
        {
          menuId: '2',
          menuName: 'カット＆カラー',
          category: 'カラー',
          bookingCount: 98,
          revenue: 784000,
          averageRating: 4.6,
          popularityScore: 88,
          lastBookingDate: new Date().toISOString(),
          trendDirection: 'stable',
          trendPercentage: 2.1,
        },
        {
          menuId: '3',
          menuName: 'パーマ',
          category: 'パーマ',
          bookingCount: 45,
          revenue: 337500,
          averageRating: 4.7,
          popularityScore: 72,
          lastBookingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          trendDirection: 'down',
          trendPercentage: -5.3,
        },
      ];

      return mockAnalytics;
    },
    enabled: !!tenant?.id,
  });
};