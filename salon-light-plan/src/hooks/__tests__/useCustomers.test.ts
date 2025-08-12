import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomers } from '../useCustomers';
import { supabase } from '../../lib/supabase';
import { createTestQueryClient } from '../../tests/setup';

// Mock dependencies
vi.mock('../../lib/supabase');
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    tenant: { id: 'test-tenant-123' },
  }),
}));
vi.mock('../../contexts/PlanLimitsContext', () => ({
  usePlanLimits: () => ({
    checkCustomerLimit: vi.fn(() => Promise.resolve(true)),
    showUpgradeModal: vi.fn(),
  }),
}));
vi.mock('../usePlanUsage', () => ({
  usePlanUsage: () => ({
    updateCustomerCount: vi.fn(),
  }),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useCustomers', () => {
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

  describe('Customer Fetching', () => {
    it('should fetch customers successfully', async () => {
      const mockCustomers = [
        {
          id: '1',
          tenant_id: 'test-tenant-123',
          name: '山田花子',
          phone_number: '090-1234-5678',
          email: 'yamada@example.com',
          visit_count: 5,
          created_at: '2024-01-01',
        },
        {
          id: '2',
          tenant_id: 'test-tenant-123',
          name: '佐藤太郎',
          phone_number: '080-9876-5432',
          email: 'sato@example.com',
          visit_count: 3,
          created_at: '2024-01-02',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockCustomers, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customers).toEqual(mockCustomers);
      expect(result.current.error).toBeNull();
    });

    it('should handle search filter', async () => {
      const searchTerm = '山田';
      const mockFilteredCustomers = [
        {
          id: '1',
          tenant_id: 'test-tenant-123',
          name: '山田花子',
          phone_number: '090-1234-5678',
          visit_count: 5,
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              or: () => Promise.resolve({ data: mockFilteredCustomers, error: null }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(searchTerm), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customers).toEqual(mockFilteredCustomers);
    });

    it('should return mock data in development mode', async () => {
      // Mock development environment
      vi.stubEnv('DEV', true);
      
      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customers).toHaveLength(3);
      expect(result.current.customers[0].name).toBe('山田花子');
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

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Customer Creation', () => {
    it('should create customer successfully', async () => {
      const mockNewCustomer = {
        id: 'new-customer-123',
        tenant_id: 'test-tenant-123',
        name: '新規顧客',
        phone_number: '090-0000-0000',
        email: 'new@example.com',
      };

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockNewCustomer, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const customerData = {
        name: '新規顧客',
        phone_number: '090-0000-0000',
        email: 'new@example.com',
      };

      result.current.createCustomer(customerData);

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('customers');
    });

    it('should handle plan limit reached during creation', async () => {
      const mockUsePlanLimits = vi.mocked(require('../../contexts/PlanLimitsContext').usePlanLimits);
      mockUsePlanLimits.mockReturnValue({
        checkCustomerLimit: vi.fn(() => Promise.resolve(false)),
        showUpgradeModal: vi.fn(),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const customerData = {
        name: '制限超過顧客',
        phone_number: '090-0000-0000',
      };

      result.current.createCustomer(customerData);

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Should show upgrade modal
      expect(mockUsePlanLimits().showUpgradeModal).toHaveBeenCalledWith('customers');
    });

    it('should handle creation errors', async () => {
      const mockError = new Error('Database insert failed');
      
      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: mockError }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const customerData = {
        name: 'エラー顧客',
        phone_number: '090-0000-0000',
      };

      result.current.createCustomer(customerData);

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      const { toast } = require('sonner');
      expect(toast.error).toHaveBeenCalledWith('顧客登録に失敗しました');
    });
  });

  describe('Customer Updates', () => {
    it('should update customer successfully', async () => {
      const mockUpdatedCustomer = {
        id: 'customer-123',
        tenant_id: 'test-tenant-123',
        name: '更新済み顧客',
        phone_number: '090-1111-1111',
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockUpdatedCustomer, error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updateData = {
        id: 'customer-123',
        name: '更新済み顧客',
        phone_number: '090-1111-1111',
      };

      result.current.updateCustomer(updateData);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('customers');
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed');
      
      (supabase.from as any).mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: mockError }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      const updateData = {
        id: 'customer-123',
        name: 'エラー更新',
      };

      result.current.updateCustomer(updateData);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      const { toast } = require('sonner');
      expect(toast.error).toHaveBeenCalledWith('顧客情報の更新に失敗しました');
    });
  });

  describe('Customer Deletion', () => {
    it('should delete customer successfully when no reservations exist', async () => {
      // Mock reservation check - no reservations
      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                count: 0,
                error: null,
              }),
            }),
          }),
        })
        // Mock deletion
        .mockReturnValueOnce({
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      result.current.deleteCustomer('customer-123');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      const { toast } = require('sonner');
      expect(toast.success).toHaveBeenCalledWith('顧客を削除しました');
    });

    it('should prevent deletion when customer has reservations', async () => {
      // Mock reservation check - has reservations
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              count: 3, // Has 3 reservations
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      result.current.deleteCustomer('customer-with-reservations');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      const { toast } = require('sonner');
      expect(toast.error).toHaveBeenCalledWith('予約履歴のある顧客は削除できません');
    });
  });

  describe('Customer Search and Filtering', () => {
    it('should search customers by various criteria', async () => {
      const mockSearchResults = [
        {
          id: '1',
          name: '検索結果1',
          phone_number: '090-1234-5678',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: mockSearchResults, error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      const searchResults = await result.current.searchCustomers('検索');

      expect(searchResults).toEqual(mockSearchResults);
    });

    it('should filter customers by visit count', async () => {
      const mockVipCustomers = [
        {
          id: '1',
          name: 'VIP顧客',
          visit_count: 10,
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => Promise.resolve({ data: mockVipCustomers, error: null }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      const vipCustomers = await result.current.getCustomersByVisitCount(5);

      expect(vipCustomers).toEqual(mockVipCustomers);
    });

    it('should filter customers by last visit date', async () => {
      const mockDormantCustomers = [
        {
          id: '1',
          name: '休眠顧客',
          last_visit_date: '2023-01-01',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            lte: () => ({
              order: () => Promise.resolve({ data: mockDormantCustomers, error: null }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      const dormantCustomers = await result.current.getCustomersByLastVisit(90);

      expect(dormantCustomers).toEqual(mockDormantCustomers);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty customer data', async () => {
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customers).toEqual([]);
    });

    it('should handle null tenant', async () => {
      const mockUseAuth = vi.mocked(require('../useAuth').useAuth);
      mockUseAuth.mockReturnValue({ tenant: null });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customers).toEqual([]);
    });

    it('should handle extremely long customer names', async () => {
      const longName = 'A'.repeat(1000);
      const customerData = {
        name: longName,
        phone_number: '090-0000-0000',
      };

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ 
              data: { ...customerData, id: 'long-name-customer' }, 
              error: null 
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      result.current.createCustomer(customerData);

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('customers');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large customer datasets', async () => {
      const largeCustomerSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `customer-${i}`,
        tenant_id: 'test-tenant-123',
        name: `顧客${i}`,
        phone_number: `090-${i.toString().padStart(8, '0')}`,
        visit_count: Math.floor(Math.random() * 20),
      }));

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: largeCustomerSet, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customers).toHaveLength(10000);
    });

    it('should handle rapid successive operations', async () => {
      const { result } = renderHook(() => useCustomers(), { wrapper });

      // Mock successful operations
      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ 
              data: { id: 'rapid-customer', name: 'Rapid Test' }, 
              error: null 
            }),
          }),
        }),
      });

      // Perform multiple rapid operations
      const operations = Array.from({ length: 10 }, (_, i) => 
        result.current.createCustomer({
          name: `Rapid Customer ${i}`,
          phone_number: `090-${i}000-0000`,
        })
      );

      await Promise.all(operations);

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Should handle all operations
      expect(supabase.from).toHaveBeenCalledTimes(10);
    });
  });
});