import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomers } from '../hooks/useCustomers';
import { useReservations } from '../hooks/useReservations';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { PlanLimitService } from '../services/plan-limit-service';
import { BulkMessagingService } from '../services/bulk-messaging-service';
import { LineApiService } from '../services/line-api';
import { supabase } from '../lib/supabase';
import { createTestQueryClient } from '../tests/setup';
import { toast } from 'sonner';

// Mock all dependencies
vi.mock('../lib/supabase');
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    tenant: { id: 'integration-tenant-123', plan: 'light' },
  }),
}));
vi.mock('sonner');

describe('Integration Tests', () => {
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

  describe('Complete Customer Registration Flow', () => {
    it('should handle complete customer registration with limit checking', async () => {
      const mockPlanService = new PlanLimitService('integration-tenant-123');
      const tenantId = 'integration-tenant-123';

      // Mock plan status - 98 customers out of 100 (light plan)
      vi.spyOn(mockPlanService, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 98, monthlyReservations: 30, activeStaff: 2 },
        remainingQuota: { customers: 2, reservations: 20, staff: 1 },
        isOverLimit: { customers: false, reservations: false, staff: false },
      });

      // Mock successful customer creation
      const newCustomer = {
        id: 'new-customer-integration',
        tenant_id: tenantId,
        name: '統合テスト顧客',
        phone_number: '090-9999-9999',
        email: 'integration@test.com',
        created_at: new Date().toISOString(),
      };

      (supabase.from as any)
        .mockReturnValueOnce({
          // Mock initial customer fetch
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ 
                data: Array.from({ length: 98 }, (_, i) => ({
                  id: `existing-customer-${i}`,
                  name: `既存顧客${i}`,
                  tenant_id: tenantId,
                })), 
                error: null 
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Mock customer creation
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: newCustomer, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Mock updated customer list fetch
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ 
                data: [...Array.from({ length: 98 }, (_, i) => ({
                  id: `existing-customer-${i}`,
                  name: `既存顧客${i}`,
                })), newCustomer], 
                error: null 
              }),
            }),
          }),
        });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have 98 existing customers
      expect(result.current.customers).toHaveLength(98);

      // Create new customer
      result.current.createCustomer({
        name: '統合テスト顧客',
        phone_number: '090-9999-9999',
        email: 'integration@test.com',
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith('顧客を登録しました');
    });

    it('should handle customer limit reached scenario', async () => {
      const tenantId = 'integration-tenant-123';

      // Mock plan status - 100 customers (at limit)
      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ 
                data: Array.from({ length: 100 }, (_, i) => ({
                  id: `full-customer-${i}`,
                  name: `満員顧客${i}`,
                })), 
                error: null 
              }),
            }),
          }),
        });

      // Mock plan limits context to return false for canAddCustomer
      vi.mock('../contexts/PlanLimitsContext', () => ({
        usePlanLimits: () => ({
          checkCustomerLimit: vi.fn(() => Promise.resolve(false)),
          showUpgradeModal: vi.fn(),
        }),
      }));

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customers).toHaveLength(100);

      // Try to create customer when at limit
      result.current.createCustomer({
        name: '制限超過顧客',
        phone_number: '090-0000-0000',
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Should show error toast
      expect(toast.error).toHaveBeenCalledWith('顧客登録数が上限に達しています');
    });
  });

  describe('Complete Reservation Flow with Limits', () => {
    it('should handle reservation creation with monthly limit checking', async () => {
      const tenantId = 'integration-tenant-123';
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Mock existing reservations (45 out of 50 monthly limit)
      const existingReservations = Array.from({ length: 45 }, (_, i) => ({
        id: `reservation-${i}`,
        tenant_id: tenantId,
        customer_id: `customer-${i % 10}`,
        start_time: `${currentMonth}-${(i % 28) + 1}T${(i % 8) + 10}:00:00`,
        end_time: `${currentMonth}-${(i % 28) + 1}T${(i % 8) + 11}:00:00`,
        menu_content: `メニュー${i % 5}`,
        status: 'CONFIRMED',
        price: 5000 + (i % 10) * 500,
        customer: {
          name: `顧客${i % 10}`,
          phone_number: `090-${i.toString().padStart(8, '0')}`,
        },
      }));

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: existingReservations, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(45);

      // Verify we can still add 5 more reservations
      const planService = new PlanLimitService(tenantId);
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 50,
        monthlyReservations: 45,
        activeStaff: 2,
      });

      const canAdd = await planService.canAddReservation();
      expect(canAdd.allowed).toBe(true);
    });

    it('should prevent reservation creation when monthly limit reached', async () => {
      const tenantId = 'integration-tenant-123';
      const planService = new PlanLimitService(tenantId);

      // Mock plan status at reservation limit
      vi.spyOn(planService, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 80, monthlyReservations: 50, activeStaff: 2 },
        remainingQuota: { customers: 20, reservations: 0, staff: 1 },
        isOverLimit: { customers: false, reservations: true, staff: false },
      });

      const canAdd = await planService.canAddReservation();

      expect(canAdd.allowed).toBe(false);
      expect(canAdd.reason).toContain('lightプランでは月間予約数は50件まで');
    });
  });

  describe('Message Integration Flow', () => {
    it('should handle complete message sending flow through LINE API', async () => {
      const lineApiService = new LineApiService({
        channelAccessToken: 'test-token',
        channelSecret: 'test-secret',
      });

      const bulkMessagingService = new BulkMessagingService('integration-tenant-123');

      // Mock successful customer segment retrieval
      const mockCustomers = [
        { id: 'customer-1', name: '顧客1', phone_number: '090-1111-1111' },
        { id: 'customer-2', name: '顧客2', phone_number: '090-2222-2222' },
        { id: 'customer-3', name: '顧客3', phone_number: '090-3333-3333' },
      ];

      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue(mockCustomers);

      // Mock customer preferences (all opted in)
      vi.spyOn(bulkMessagingService, 'getCustomerPreferences').mockResolvedValue([
        {
          id: 'pref-1',
          tenant_id: 'integration-tenant-123',
          customer_id: 'customer-1',
          channel_type: 'line',
          is_opted_in: true,
          receive_campaigns: true,
          receive_reminders: true,
          created_at: '2024-01-01T00:00:00',
          updated_at: '2024-01-01T00:00:00',
        },
      ]);

      // Mock template variable filling
      vi.spyOn(bulkMessagingService, 'fillTemplateVariables')
        .mockImplementation(async (template, customer) => {
          return template.replace('{customer_name}', customer.name);
        });

      // Mock LINE API sending
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      // Mock database operations
      (supabase.from as any).mockReturnValue({
        insert: () => Promise.resolve({ error: null }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      });

      // Create and send campaign
      const campaignRequest = {
        campaign_name: '統合テストキャンペーン',
        description: 'LINE API統合テスト',
        template_id: 'template-123',
        subject: 'テスト件名',
        content: '{customer_name}様へのテストメッセージ',
        target_segments: ['all-customers'],
        send_channels: ['line'] as const,
      };

      const campaign = await bulkMessagingService.createCampaign(campaignRequest);
      expect(campaign.name).toBe('統合テストキャンペーン');

      // Send campaign
      await bulkMessagingService.sendCampaign(campaign.id, {
        send_immediately: true,
        batch_size: 10,
      });

      // Verify LINE API was called for message sending
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle webhook event processing with customer linking', async () => {
      const lineApiService = new LineApiService({
        channelAccessToken: 'test-token',
        channelSecret: 'test-secret',
      });

      // Mock webhook event
      const webhookEvent = {
        type: 'message',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U1234567890abcdef',
        },
        replyToken: 'reply-token-123',
        message: {
          id: 'message-webhook-123',
          type: 'text',
          text: '予約をお願いします',
        },
      };

      // Process webhook
      const messageData = await lineApiService.handleWebhookEvent(webhookEvent as any);

      expect(messageData).toMatchObject({
        message_type: 'received',
        content: '予約をお願いします',
        external_message_id: 'message-webhook-123',
        is_read: false,
        is_ai_reply: false,
      });
    });
  });

  describe('Plan Upgrade Flow Integration', () => {
    it('should handle complete plan upgrade scenario', async () => {
      const tenantId = 'integration-tenant-123';
      const planService = new PlanLimitService(tenantId);

      // Step 1: Light plan at customer limit
      vi.spyOn(planService, 'getTenantPlan').mockResolvedValueOnce('light');
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValueOnce({
        totalCustomers: 100,
        monthlyReservations: 45,
        activeStaff: 3,
      });

      let status = await planService.getPlanStatus();
      expect(status.isOverLimit.customers).toBe(true);

      // Step 2: Upgrade to standard plan
      vi.spyOn(planService, 'getTenantPlan').mockResolvedValueOnce('standard');
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValueOnce({
        totalCustomers: 100,
        monthlyReservations: 45,
        activeStaff: 3,
      });

      status = await planService.getPlanStatus();
      expect(status.planType).toBe('standard');
      expect(status.isOverLimit.customers).toBe(false); // 100 < 500 (standard limit)
      expect(status.remainingQuota.customers).toBe(400);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database error
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ 
              data: null, 
              error: new Error('Database connection failed') 
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.customers).toEqual([]);
    });

    it('should handle LINE API failures gracefully', async () => {
      const lineApiService = new LineApiService({
        channelAccessToken: 'invalid-token',
        channelSecret: 'invalid-secret',
      });

      // Mock API failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(lineApiService.sendTextMessage('U1234567890abcdef', 'test'))
        .rejects.toThrow('Failed to send LINE message: Unauthorized');
    });

    it('should handle partial system failures', async () => {
      const bulkMessagingService = new BulkMessagingService('integration-tenant-123');

      // Mock partial failure scenario
      const mockCustomers = [
        { id: 'customer-1', name: '成功顧客' },
        { id: 'customer-2', name: 'エラー顧客' },
        { id: 'customer-3', name: '成功顧客2' },
      ];

      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue(mockCustomers);

      // Mock preferences with some failures
      vi.spyOn(bulkMessagingService, 'getCustomerPreferences')
        .mockResolvedValueOnce([/* success */])
        .mockRejectedValueOnce(new Error('Preference fetch failed'))
        .mockResolvedValueOnce([/* success */]);

      // Bulk update should handle partial failures
      const result = await bulkMessagingService.bulkUpdatePreferences({
        customer_ids: ['customer-1', 'customer-2', 'customer-3'],
        channel_types: ['line'],
        updates: { is_opted_in: false },
      });

      // Should report partial success
      expect(result).toBeLessThan(3); // Less than total due to failure
      expect(result).toBeGreaterThan(0); // But some succeeded
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle high-volume operations efficiently', async () => {
      const startTime = Date.now();
      
      const bulkMessagingService = new BulkMessagingService('integration-tenant-123');

      // Mock large customer base
      const largeCustomerSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `customer-${i}`,
        name: `顧客${i}`,
        phone_number: `090-${i.toString().padStart(8, '0')}`,
      }));

      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue(largeCustomerSet);

      // Mock successful template processing
      vi.spyOn(bulkMessagingService, 'fillTemplateVariables')
        .mockImplementation(async (template) => template);

      // Mock successful queue operations
      (supabase.from as any).mockReturnValue({
        insert: () => Promise.resolve({ error: null }),
      });

      // Create campaign for large audience
      const campaign = await bulkMessagingService.createCampaign({
        campaign_name: 'パフォーマンステスト',
        description: '1000人への配信テスト',
        template_id: 'template-123',
        content: 'テストメッセージ',
        target_segments: ['all-customers'],
        send_channels: ['line'],
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds for 1000 customers)
      expect(executionTime).toBeLessThan(5000);
      expect(campaign.total_recipients).toBe(1000);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should maintain data consistency across operations', async () => {
      const tenantId = 'integration-tenant-123';
      const planService = new PlanLimitService(tenantId);

      // Mock sequential operations that should maintain consistency
      let customerCount = 95;
      let reservationCount = 40;

      // Initial state
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: customerCount,
        monthlyReservations: reservationCount,
        activeStaff: 2,
      });

      let status = await planService.getPlanStatus();
      expect(status.currentUsage.totalCustomers).toBe(95);
      expect(status.currentUsage.monthlyReservations).toBe(40);

      // Simulate customer addition
      customerCount = 96;
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: customerCount,
        monthlyReservations: reservationCount,
        activeStaff: 2,
      });

      status = await planService.getPlanStatus();
      expect(status.currentUsage.totalCustomers).toBe(96);
      expect(status.remainingQuota.customers).toBe(4);

      // Simulate reservation addition
      reservationCount = 41;
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: customerCount,
        monthlyReservations: reservationCount,
        activeStaff: 2,
      });

      status = await planService.getPlanStatus();
      expect(status.currentUsage.monthlyReservations).toBe(41);
      expect(status.remainingQuota.reservations).toBe(9);
    });
  });

  describe('Multi-Channel Integration', () => {
    it('should coordinate messages across multiple channels', async () => {
      const bulkMessagingService = new BulkMessagingService('integration-tenant-123');

      // Mock customer with multiple channel preferences
      const mockCustomer = {
        id: 'multi-channel-customer',
        name: 'マルチチャンネル顧客',
        phone_number: '090-1234-5678',
        email: 'multi@example.com',
      };

      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue([mockCustomer]);
      
      vi.spyOn(bulkMessagingService, 'getCustomerPreferences').mockResolvedValue([
        {
          id: 'pref-line',
          tenant_id: 'integration-tenant-123',
          customer_id: 'multi-channel-customer',
          channel_type: 'line',
          is_opted_in: true,
          receive_campaigns: true,
          receive_reminders: true,
          created_at: '2024-01-01T00:00:00',
          updated_at: '2024-01-01T00:00:00',
        },
        {
          id: 'pref-email',
          tenant_id: 'integration-tenant-123',
          customer_id: 'multi-channel-customer',
          channel_type: 'email',
          is_opted_in: true,
          receive_campaigns: true,
          receive_reminders: false, // Different preferences per channel
          created_at: '2024-01-01T00:00:00',
          updated_at: '2024-01-01T00:00:00',
        },
      ]);

      // Mock queue operations
      (supabase.from as any).mockReturnValue({
        insert: () => Promise.resolve({ error: null }),
      });

      const campaign = await bulkMessagingService.createCampaign({
        campaign_name: 'マルチチャンネルテスト',
        description: 'LINE + Email配信テスト',
        template_id: 'template-123',
        content: 'マルチチャンネルメッセージ',
        target_segments: ['multi-channel-segment'],
        send_channels: ['line', 'email'],
      });

      await bulkMessagingService.sendCampaign(campaign.id, {
        send_immediately: true,
      });

      // Should handle both channels appropriately based on preferences
      expect(campaign.send_channels).toEqual(['line', 'email']);
    });
  });
});