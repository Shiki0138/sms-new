import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReservations } from '../useReservations';
import { supabase } from '../../lib/supabase';
import { createTestQueryClient } from '../../tests/setup';

// Mock dependencies
vi.mock('../../lib/supabase');
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    tenant: { id: 'test-tenant-123' },
  }),
}));

describe('useReservations', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  describe('Reservation Fetching', () => {
    it('should fetch reservations successfully', async () => {
      const mockReservations = [
        {
          id: '1',
          tenant_id: 'test-tenant-123',
          customer_id: '1',
          start_time: '2024-01-22T10:00:00',
          end_time: '2024-01-22T11:00:00',
          menu_content: 'カット＆カラー',
          status: 'CONFIRMED',
          price: 8000,
          customer: {
            name: '山田花子',
            phone_number: '090-1234-5678',
          },
        },
        {
          id: '2',
          tenant_id: 'test-tenant-123',
          customer_id: '2',
          start_time: '2024-01-22T14:00:00',
          end_time: '2024-01-22T15:30:00',
          menu_content: 'パーマ',
          status: 'CONFIRMED',
          price: 7500,
          customer: {
            name: '佐藤太郎',
            phone_number: '080-9876-5432',
          },
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockReservations, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockReservations);
      expect(result.current.error).toBeNull();
    });

    it('should filter reservations by date range', async () => {
      const startDate = '2024-01-22';
      const endDate = '2024-01-23';
      const mockFilteredReservations = [
        {
          id: '1',
          tenant_id: 'test-tenant-123',
          start_time: '2024-01-22T10:00:00',
          menu_content: 'カット',
          status: 'CONFIRMED',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: mockFilteredReservations, error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(startDate, endDate), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockFilteredReservations);
    });

    it('should return mock data in development mode', async () => {
      // Mock development environment
      vi.stubEnv('DEV', true);
      
      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].customer.name).toBe('山田花子');
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: mockError }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should return empty array when no tenant', async () => {
      const mockUseAuth = vi.mocked(require('../useAuth').useAuth);
      mockUseAuth.mockReturnValue({ tenant: null });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Date Range Filtering', () => {
    it('should handle same start and end date', async () => {
      const sameDate = '2024-01-22';
      const mockSameDayReservations = [
        {
          id: '1',
          start_time: '2024-01-22T10:00:00',
          menu_content: 'カット',
        },
        {
          id: '2',
          start_time: '2024-01-22T14:00:00',
          menu_content: 'カラー',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: mockSameDayReservations, error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(sameDate, sameDate), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockSameDayReservations);
    });

    it('should handle end date before start date', async () => {
      const startDate = '2024-01-23';
      const endDate = '2024-01-22'; // Earlier than start date

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(startDate, endDate), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle future date ranges', async () => {
      const futureStart = '2025-01-01';
      const futureEnd = '2025-01-31';

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(futureStart, futureEnd), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Reservation Status Handling', () => {
    it('should handle different reservation statuses', async () => {
      const mockReservationsWithStatuses = [
        {
          id: '1',
          status: 'CONFIRMED',
          menu_content: 'カット',
          start_time: '2024-01-22T10:00:00',
        },
        {
          id: '2',
          status: 'CANCELLED',
          menu_content: 'カラー',
          start_time: '2024-01-22T11:00:00',
        },
        {
          id: '3',
          status: 'COMPLETED',
          menu_content: 'パーマ',
          start_time: '2024-01-22T12:00:00',
        },
        {
          id: '4',
          status: 'NO_SHOW',
          menu_content: 'トリートメント',
          start_time: '2024-01-22T13:00:00',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockReservationsWithStatuses, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(4);
      expect(result.current.data?.map(r => r.status)).toEqual([
        'CONFIRMED', 
        'CANCELLED', 
        'COMPLETED', 
        'NO_SHOW'
      ]);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large reservation datasets', async () => {
      const largeReservationSet = Array.from({ length: 5000 }, (_, i) => ({
        id: `reservation-${i}`,
        tenant_id: 'test-tenant-123',
        customer_id: `customer-${i % 100}`, // 100 customers
        start_time: `2024-01-${(i % 30) + 1}T${(i % 24).toString().padStart(2, '0')}:00:00`,
        end_time: `2024-01-${(i % 30) + 1}T${((i % 24) + 1).toString().padStart(2, '0')}:00:00`,
        menu_content: `メニュー${i % 10}`,
        status: ['CONFIRMED', 'COMPLETED', 'CANCELLED'][i % 3] as any,
        price: 5000 + (i % 10) * 1000,
        customer: {
          name: `顧客${i % 100}`,
          phone_number: `090-${i.toString().padStart(8, '0')}`,
        },
      }));

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: largeReservationSet, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(5000);
    });

    it('should handle concurrent date range queries', async () => {
      const dateRanges = [
        ['2024-01-01', '2024-01-07'],
        ['2024-01-08', '2024-01-14'],
        ['2024-01-15', '2024-01-21'],
        ['2024-01-22', '2024-01-28'],
      ];

      // Mock different responses for different date ranges
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ 
                  data: [{ id: 'range-reservation', start_time: '2024-01-01T10:00:00' }], 
                  error: null 
                }),
              }),
            }),
          }),
        }),
      });

      const hooks = dateRanges.map(([start, end]) => 
        renderHook(() => useReservations(start, end), { wrapper })
      );

      // Wait for all to complete
      await Promise.all(hooks.map(({ result }) => 
        waitFor(() => expect(result.current.isLoading).toBe(false))
      ));

      // All should have data
      hooks.forEach(({ result }) => {
        expect(result.current.data).toHaveLength(1);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null customer data', async () => {
      const mockReservationsWithNullCustomer = [
        {
          id: '1',
          tenant_id: 'test-tenant-123',
          customer_id: 'non-existent-customer',
          start_time: '2024-01-22T10:00:00',
          menu_content: 'カット',
          status: 'CONFIRMED',
          customer: null, // Null customer
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockReservationsWithNullCustomer, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockReservationsWithNullCustomer);
    });

    it('should handle invalid date formats', async () => {
      const invalidStartDate = 'invalid-date';
      const invalidEndDate = 'also-invalid';

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(invalidStartDate, invalidEndDate), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle empty date strings', async () => {
      const emptyStart = '';
      const emptyEnd = '';

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(emptyStart, emptyEnd), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle extremely long menu content', async () => {
      const longMenuContent = 'A'.repeat(10000);
      const mockReservationWithLongContent = [
        {
          id: '1',
          tenant_id: 'test-tenant-123',
          start_time: '2024-01-22T10:00:00',
          menu_content: longMenuContent,
          status: 'CONFIRMED',
          customer: { name: 'Test Customer', phone_number: '090-0000-0000' },
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockReservationWithLongContent, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.[0].menu_content).toBe(longMenuContent);
    });

    it('should handle extreme price values', async () => {
      const mockReservationsWithExtremePrices = [
        {
          id: '1',
          price: 0, // Free service
          menu_content: '無料カウンセリング',
          status: 'CONFIRMED',
        },
        {
          id: '2',
          price: 999999999, // Very expensive service
          menu_content: 'プレミアムコース',
          status: 'CONFIRMED',
        },
        {
          id: '3',
          price: -100, // Negative price (refund?)
          menu_content: '返金処理',
          status: 'CANCELLED',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockReservationsWithExtremePrices, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockReservationsWithExtremePrices);
    });

    it('should handle timezone edge cases', async () => {
      const mockReservationsWithTimezones = [
        {
          id: '1',
          start_time: '2024-01-22T23:59:59+09:00', // JST
          end_time: '2024-01-23T00:59:59+09:00',
          menu_content: '深夜営業',
          status: 'CONFIRMED',
        },
        {
          id: '2',
          start_time: '2024-01-22T23:59:59Z', // UTC
          end_time: '2024-01-23T00:59:59Z',
          menu_content: 'UTC時間',
          status: 'CONFIRMED',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockReservationsWithTimezones, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockReservationsWithTimezones);
    });
  });

  describe('Real-time Updates and Caching', () => {
    it('should handle query invalidation correctly', async () => {
      const initialData = [{ id: '1', menu_content: 'Initial' }];
      const updatedData = [
        { id: '1', menu_content: 'Updated' },
        { id: '2', menu_content: 'New' },
      ];

      // First call returns initial data
      (supabase.from as any).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: initialData, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(initialData);

      // Mock updated data for refetch
      (supabase.from as any).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: updatedData, error: null }),
          }),
        }),
      });

      // Trigger refetch
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedData);
      });
    });
  });
});