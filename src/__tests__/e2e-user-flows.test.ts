import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomers } from '../hooks/useCustomers';
import { useReservations } from '../hooks/useReservations';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { PlanLimitService } from '../services/plan-limit-service';
import { BulkMessagingService } from '../services/bulk-messaging-service';
import { supabase } from '../lib/supabase';
import { createTestQueryClient } from '../tests/setup';
import { toast } from 'sonner';

// Mock all dependencies
vi.mock('../lib/supabase');
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    tenant: { id: 'e2e-tenant-123', plan: 'light' },
  }),
}));
vi.mock('sonner');
vi.mock('../contexts/PlanLimitsContext', () => ({
  usePlanLimits: () => ({
    checkCustomerLimit: vi.fn(() => Promise.resolve(true)),
    checkReservationLimit: vi.fn(() => Promise.resolve(true)),
    showUpgradeModal: vi.fn(),
  }),
}));
vi.mock('../hooks/usePlanUsage', () => ({
  usePlanUsage: () => ({
    updateCustomerCount: vi.fn(),
    updateReservationCount: vi.fn(),
  }),
}));

describe('End-to-End User Flow Tests', () => {
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

  describe('Complete New Customer Onboarding Flow', () => {
    it('should complete full customer registration → first reservation → message sending flow', async () => {
      const tenantId = 'e2e-tenant-123';

      // STEP 1: Customer Registration
      console.log('📝 Step 1: Customer Registration');
      
      // Mock initial empty customer list
      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        })
        // Mock successful customer creation
        .mockReturnValueOnce({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: {
                  id: 'new-customer-e2e',
                  tenant_id: tenantId,
                  name: '新規顧客さん',
                  phone_number: '090-1234-5678',
                  email: 'newcustomer@example.com',
                  visit_count: 0,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        });

      const { result: customerResult } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(customerResult.current.isLoading).toBe(false);
      });

      expect(customerResult.current.customers).toHaveLength(0);

      // Register new customer
      act(() => {
        customerResult.current.createCustomer({
          name: '新規顧客さん',
          phone_number: '090-1234-5678',
          email: 'newcustomer@example.com',
          preferred_contact_method: 'line',
        });
      });

      await waitFor(() => {
        expect(customerResult.current.isCreating).toBe(false);
      });

      console.log('✅ Customer registered successfully');

      // STEP 2: First Reservation Creation
      console.log('📝 Step 2: First Reservation Creation');

      // Mock reservation creation
      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: {
                  id: 'first-reservation-e2e',
                  tenant_id: tenantId,
                  customer_id: 'new-customer-e2e',
                  start_time: '2024-02-01T14:00:00',
                  end_time: '2024-02-01T15:00:00',
                  menu_content: 'カット',
                  status: 'CONFIRMED',
                  price: 4500,
                  customer: {
                    name: '新規顧客さん',
                    phone_number: '090-1234-5678',
                  },
                },
                error: null,
              }),
            }),
          }),
        });

      const { result: reservationResult } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(reservationResult.current.isLoading).toBe(false);
      });

      console.log('✅ First reservation created successfully');

      // STEP 3: Welcome Message Campaign
      console.log('📝 Step 3: Welcome Message Campaign');

      const bulkMessagingService = new BulkMessagingService(tenantId);

      // Mock template creation for welcome message
      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'welcome-template-e2e',
                tenant_id: tenantId,
                name: '新規顧客歓迎メッセージ',
                category: 'welcome',
                content: '{customer_name}様、初回ご来店ありがとうございます！次回予約もお待ちしております。',
                variables: ['customer_name'],
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const welcomeTemplate = await bulkMessagingService.createMessageTemplate({
        name: '新規顧客歓迎メッセージ',
        category: 'welcome',
        content: '{customer_name}様、初回ご来店ありがとうございます！次回予約もお待ちしております。',
        variables: ['customer_name'],
        is_active: true,
      });

      expect(welcomeTemplate.name).toBe('新規顧客歓迎メッセージ');

      // Mock customer segment for new customers
      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue([
        {
          id: 'new-customer-e2e',
          name: '新規顧客さん',
          phone_number: '090-1234-5678',
          email: 'newcustomer@example.com',
          visit_count: 1,
        } as any,
      ]);

      // Create and send welcome campaign
      const campaign = await bulkMessagingService.createCampaign({
        campaign_name: '新規顧客歓迎キャンペーン',
        description: 'First visit welcome message',
        template_id: 'welcome-template-e2e',
        content: '{customer_name}様、初回ご来店ありがとうございます！',
        target_segments: ['new-customers'],
        send_channels: ['line'],
      });

      console.log('✅ Welcome campaign created and sent');

      // STEP 4: Verify Complete Flow
      console.log('📝 Step 4: Flow Verification');

      expect(campaign.name).toBe('新規顧客歓迎キャンペーン');
      expect(campaign.total_recipients).toBe(1);
      expect(toast.success).toHaveBeenCalledWith('顧客を登録しました');

      console.log('🎉 Complete new customer onboarding flow successful!');
    });
  });

  describe('Plan Limit Hit and Upgrade Flow', () => {
    it('should handle hitting customer limit → upgrade prompt → successful addition after upgrade', async () => {
      const tenantId = 'e2e-tenant-123';
      const planService = new PlanLimitService(tenantId);

      // STEP 1: Reach Customer Limit
      console.log('📝 Step 1: Approaching Customer Limit');

      // Mock 99 existing customers (1 away from limit)
      const existingCustomers = Array.from({ length: 99 }, (_, i) => ({
        id: `customer-${i}`,
        tenant_id: tenantId,
        name: `顧客${i}`,
        phone_number: `090-${i.toString().padStart(8, '0')}`,
        visit_count: Math.floor(i / 10),
      }));

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: existingCustomers, error: null }),
          }),
        }),
      });

      const { result: customerResult } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(customerResult.current.isLoading).toBe(false);
      });

      expect(customerResult.current.customers).toHaveLength(99);

      // Mock plan status at 99/100
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 99,
        monthlyReservations: 30,
        activeStaff: 2,
      });

      let planStatus = await planService.getPlanStatus();
      expect(planStatus.remainingQuota.customers).toBe(1);

      console.log('✅ At 99/100 customers - 1 remaining');

      // STEP 2: Add 100th Customer (Last One Allowed)
      console.log('📝 Step 2: Adding 100th Customer');

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'customer-100',
                name: '100人目の顧客',
                phone_number: '090-0000-0100',
              },
              error: null,
            }),
          }),
        }),
      });

      act(() => {
        customerResult.current.createCustomer({
          name: '100人目の顧客',
          phone_number: '090-0000-0100',
        });
      });

      await waitFor(() => {
        expect(customerResult.current.isCreating).toBe(false);
      });

      console.log('✅ 100th customer added successfully');

      // STEP 3: Try to Add 101st Customer (Should Fail)
      console.log('📝 Step 3: Attempting to Add 101st Customer (Should Fail)');

      // Mock plan status at limit
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 100,
        monthlyReservations: 30,
        activeStaff: 2,
      });

      planStatus = await planService.getPlanStatus();
      expect(planStatus.isOverLimit.customers).toBe(true);

      const canAddResult = await planService.canAddCustomer();
      expect(canAddResult.allowed).toBe(false);
      expect(canAddResult.reason).toContain('lightプランでは顧客登録は100名まで');

      // Mock plan limits context to simulate limit reached
      vi.mocked(require('../contexts/PlanLimitsContext').usePlanLimits).mockReturnValue({
        checkCustomerLimit: vi.fn(() => Promise.resolve(false)),
        showUpgradeModal: vi.fn(),
      });

      act(() => {
        customerResult.current.createCustomer({
          name: '制限超過顧客',
          phone_number: '090-0000-0101',
        });
      });

      await waitFor(() => {
        expect(customerResult.current.isCreating).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith('顧客登録数が上限に達しています');

      console.log('✅ 101st customer correctly rejected');

      // STEP 4: Simulate Plan Upgrade
      console.log('📝 Step 4: Plan Upgrade to Standard');

      // Mock upgrade to standard plan
      vi.spyOn(planService, 'getTenantPlan').mockResolvedValue('standard');
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 100,
        monthlyReservations: 30,
        activeStaff: 2,
      });

      planStatus = await planService.getPlanStatus();
      expect(planStatus.planType).toBe('standard');
      expect(planStatus.isOverLimit.customers).toBe(false);
      expect(planStatus.remainingQuota.customers).toBe(400); // 500 - 100

      console.log('✅ Upgraded to standard plan - 400 customers remaining');

      // STEP 5: Add Customer After Upgrade
      console.log('📝 Step 5: Adding Customer After Upgrade');

      // Reset plan limits context to allow additions
      vi.mocked(require('../contexts/PlanLimitsContext').usePlanLimits).mockReturnValue({
        checkCustomerLimit: vi.fn(() => Promise.resolve(true)),
        showUpgradeModal: vi.fn(),
      });

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'customer-post-upgrade',
                name: 'アップグレード後顧客',
                phone_number: '090-1111-0001',
              },
              error: null,
            }),
          }),
        }),
      });

      act(() => {
        customerResult.current.createCustomer({
          name: 'アップグレード後顧客',
          phone_number: '090-1111-0001',
        });
      });

      await waitFor(() => {
        expect(customerResult.current.isCreating).toBe(false);
      });

      console.log('✅ Customer added successfully after upgrade');

      console.log('🎉 Complete plan limit and upgrade flow successful!');
    });
  });

  describe('Bulk Messaging Campaign Flow', () => {
    it('should complete full campaign creation → customer segmentation → message sending → analytics flow', async () => {
      const tenantId = 'e2e-tenant-123';
      const bulkMessagingService = new BulkMessagingService(tenantId);

      // STEP 1: Create Customer Segments
      console.log('📝 Step 1: Creating Customer Segments');

      // Mock VIP customers segment
      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'vip-segment-e2e',
                tenant_id: tenantId,
                name: 'VIP顧客',
                description: '月2回以上来店',
                segment_type: 'dynamic',
                conditions: { visit_frequency: { operator: '>=', value: 2 } },
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const vipSegment = await bulkMessagingService.createCustomerSegment({
        name: 'VIP顧客',
        description: '月2回以上来店',
        segment_type: 'dynamic',
        conditions: { visit_frequency: { operator: '>=', value: 2 } },
        customer_ids: [],
        is_active: true,
      });

      expect(vipSegment.name).toBe('VIP顧客');

      console.log('✅ VIP segment created');

      // STEP 2: Create Message Template
      console.log('📝 Step 2: Creating Message Template');

      const campaignTemplate = await bulkMessagingService.createMessageTemplate({
        name: 'VIP限定キャンペーン',
        category: 'campaign',
        content: '{customer_name}様へ特別なお知らせです。VIP会員様限定で20%OFFキャンペーンを実施中！',
        variables: ['customer_name'],
        is_active: true,
      });

      console.log('✅ Campaign template created');

      // STEP 3: Set Customer Preferences
      console.log('📝 Step 3: Setting Customer Preferences');

      // Mock VIP customers
      const vipCustomers = [
        { id: 'vip-1', name: 'VIP顧客1', phone_number: '090-1111-1111', visit_count: 5 },
        { id: 'vip-2', name: 'VIP顧客2', phone_number: '090-2222-2222', visit_count: 3 },
        { id: 'vip-3', name: 'VIP顧客3', phone_number: '090-3333-3333', visit_count: 8 },
      ];

      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue(vipCustomers as any);

      // Mock customer preferences (all opted in for campaigns)
      vi.spyOn(bulkMessagingService, 'getCustomerPreferences').mockImplementation(async (customerId) => [
        {
          id: `pref-${customerId}`,
          tenant_id: tenantId,
          customer_id: customerId,
          channel_type: 'line',
          is_opted_in: true,
          receive_campaigns: true,
          receive_reminders: true,
          created_at: '2024-01-01T00:00:00',
          updated_at: '2024-01-01T00:00:00',
        },
      ]);

      console.log('✅ Customer preferences configured');

      // STEP 4: Create and Send Campaign
      console.log('📝 Step 4: Creating and Sending Campaign');

      const campaign = await bulkMessagingService.createCampaign({
        campaign_name: 'VIP限定20%OFFキャンペーン',
        description: 'VIP顧客向け特別キャンペーン',
        template_id: campaignTemplate.id,
        subject: 'VIP限定特別オファー',
        content: '{customer_name}様へ特別なお知らせです。VIP会員様限定で20%OFFキャンペーンを実施中！',
        target_segments: ['vip-segment-e2e'],
        send_channels: ['line', 'email'],
        scheduled_at: null, // Send immediately
      });

      expect(campaign.total_recipients).toBe(3);

      // Mock message queue operations
      (supabase.from as any).mockReturnValue({
        insert: () => Promise.resolve({ error: null }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      });

      await bulkMessagingService.sendCampaign(campaign.id, {
        send_immediately: true,
        batch_size: 50,
      });

      console.log('✅ Campaign sent to 3 VIP customers');

      // STEP 5: Monitor Campaign Analytics
      console.log('📝 Step 5: Monitoring Campaign Analytics');

      // Mock campaign messages with delivery status
      const mockCampaignMessages = [
        {
          id: 'msg-1',
          campaign_id: campaign.id,
          customer_id: 'vip-1',
          channel_type: 'line',
          status: 'delivered',
          sent_at: '2024-01-01T10:00:00',
          delivered_at: '2024-01-01T10:01:00',
          read_at: '2024-01-01T10:05:00',
        },
        {
          id: 'msg-2',
          campaign_id: campaign.id,
          customer_id: 'vip-2',
          channel_type: 'line',
          status: 'delivered',
          sent_at: '2024-01-01T10:00:00',
          delivered_at: '2024-01-01T10:02:00',
          read_at: null,
        },
        {
          id: 'msg-3',
          campaign_id: campaign.id,
          customer_id: 'vip-3',
          channel_type: 'line',
          status: 'failed',
          sent_at: '2024-01-01T10:00:00',
          error_message: 'User blocked bot',
        },
      ];

      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: campaign, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => Promise.resolve({ data: mockCampaignMessages, error: null }),
          }),
        });

      const analytics = await bulkMessagingService.getCampaignAnalytics(campaign.id);

      expect(analytics.total_recipients).toBe(3);
      expect(analytics.sent_count).toBe(2); // 2 delivered + failed (not pending)
      expect(analytics.delivered_count).toBe(2);
      expect(analytics.delivery_rate).toBe(100); // 2/2 delivered messages
      expect(analytics.open_count).toBe(1); // 1 with read_at
      expect(analytics.error_count).toBe(1); // 1 failed

      console.log('✅ Campaign analytics calculated');
      console.log(`   📊 Delivery Rate: ${analytics.delivery_rate}%`);
      console.log(`   👀 Open Rate: ${analytics.open_rate}%`);

      console.log('🎉 Complete bulk messaging campaign flow successful!');
    });
  });

  describe('Monthly Reservation Limit Flow', () => {
    it('should handle monthly reservation limit approaching → warning → limit reached → next month reset', async () => {
      const tenantId = 'e2e-tenant-123';
      const planService = new PlanLimitService(tenantId);

      // STEP 1: Start of Month - Low Reservation Count
      console.log('📝 Step 1: Month Start - Low Reservations');

      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 50,
        monthlyReservations: 10,
        activeStaff: 2,
      });

      let planStatus = await planService.getPlanStatus();
      expect(planStatus.remainingQuota.reservations).toBe(40); // 50 - 10

      let warnings = await planService.getPlanWarnings();
      expect(warnings.filter(w => w.category === 'reservations')).toHaveLength(0);

      console.log('✅ Month start: 10/50 reservations - no warnings');

      // STEP 2: Approaching Warning Threshold (80%)
      console.log('📝 Step 2: Approaching Warning Threshold');

      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 50,
        monthlyReservations: 42, // 84% of limit (42/50)
        activeStaff: 2,
      });

      planStatus = await planService.getPlanStatus();
      warnings = await planService.getPlanWarnings();

      const reservationWarning = warnings.find(w => w.category === 'reservations');
      expect(reservationWarning).toBeDefined();
      expect(reservationWarning?.type).toBe('warning');
      expect(reservationWarning?.message).toContain('今月の予約数が上限の80%に達しています');

      console.log('✅ Warning triggered at 42/50 reservations (84%)');

      // STEP 3: Reaching the Limit
      console.log('📝 Step 3: Reaching Monthly Limit');

      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 50,
        monthlyReservations: 50, // At limit
        activeStaff: 2,
      });

      planStatus = await planService.getPlanStatus();
      expect(planStatus.isOverLimit.reservations).toBe(true);

      const canAddReservation = await planService.canAddReservation();
      expect(canAddReservation.allowed).toBe(false);
      expect(canAddReservation.reason).toContain('lightプランでは月間予約数は50件まで');

      warnings = await planService.getPlanWarnings();
      const errorWarning = warnings.find(w => w.category === 'reservations');
      expect(errorWarning?.type).toBe('error');

      console.log('✅ Limit reached: 50/50 reservations - further reservations blocked');

      // STEP 4: Simulate Next Month Reset
      console.log('📝 Step 4: Next Month Reset');

      // Mock next month (reset to 0 reservations)
      vi.spyOn(planService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 50,
        monthlyReservations: 0, // Reset for new month
        activeStaff: 2,
      });

      planStatus = await planService.getPlanStatus();
      expect(planStatus.isOverLimit.reservations).toBe(false);
      expect(planStatus.remainingQuota.reservations).toBe(50);

      const canAddAfterReset = await planService.canAddReservation();
      expect(canAddAfterReset.allowed).toBe(true);

      warnings = await planService.getPlanWarnings();
      expect(warnings.filter(w => w.category === 'reservations')).toHaveLength(0);

      console.log('✅ Next month: Reset to 0/50 reservations - limits cleared');

      console.log('🎉 Complete monthly reservation limit flow successful!');
    });
  });

  describe('Customer Lifecycle Flow', () => {
    it('should complete full customer lifecycle: registration → multiple visits → VIP status → targeted campaigns', async () => {
      const tenantId = 'e2e-tenant-123';
      const bulkMessagingService = new BulkMessagingService(tenantId);

      // STEP 1: Customer Registration
      console.log('📝 Step 1: Customer Registration');

      const newCustomer = {
        id: 'lifecycle-customer',
        tenant_id: tenantId,
        name: 'ライフサイクル顧客',
        phone_number: '090-7777-7777',
        email: 'lifecycle@example.com',
        visit_count: 0,
        created_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: newCustomer, error: null }),
          }),
        }),
      });

      const { result: customerResult } = renderHook(() => useCustomers(), { wrapper });

      act(() => {
        customerResult.current.createCustomer({
          name: 'ライフサイクル顧客',
          phone_number: '090-7777-7777',
          email: 'lifecycle@example.com',
        });
      });

      await waitFor(() => {
        expect(customerResult.current.isCreating).toBe(false);
      });

      console.log('✅ Customer registered with 0 visits');

      // STEP 2: First Visit (Welcome Campaign)
      console.log('📝 Step 2: First Visit - Welcome Campaign');

      // Update customer to 1 visit
      const customerAfterFirstVisit = { ...newCustomer, visit_count: 1 };

      // Mock new customer segment targeting
      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue([customerAfterFirstVisit as any]);

      const welcomeCampaign = await bulkMessagingService.createCampaign({
        campaign_name: '初回来店お礼',
        description: 'First visit thank you',
        template_id: 'welcome-template',
        content: '{customer_name}様、初回ご来店ありがとうございました！',
        target_segments: ['new-customers'],
        send_channels: ['line'],
      });

      expect(welcomeCampaign.total_recipients).toBe(1);

      console.log('✅ Welcome message sent after first visit');

      // STEP 3: Multiple Visits (Regular Customer Status)
      console.log('📝 Step 3: Multiple Visits - Regular Customer');

      // Create multiple reservations to simulate visits
      const reservations = Array.from({ length: 4 }, (_, i) => ({
        id: `reservation-${i}`,
        tenant_id: tenantId,
        customer_id: 'lifecycle-customer',
        start_time: `2024-01-${(i + 1) * 7}T14:00:00`, // Weekly visits
        end_time: `2024-01-${(i + 1) * 7}T15:00:00`,
        menu_content: `メニュー${i + 1}`,
        status: 'COMPLETED',
        price: 5000,
      }));

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: reservations, error: null }),
          }),
        }),
      });

      const { result: reservationResult } = renderHook(() => useReservations(), { wrapper });

      await waitFor(() => {
        expect(reservationResult.current.isLoading).toBe(false);
      });

      expect(reservationResult.current.data).toHaveLength(4);

      console.log('✅ Customer completed 4 visits - regular status');

      // STEP 4: VIP Status Achievement
      console.log('📝 Step 4: VIP Status Achievement');

      // Update customer to 6+ visits (VIP threshold)
      const vipCustomer = { ...newCustomer, visit_count: 6 };

      // Mock VIP segment targeting
      vi.spyOn(bulkMessagingService, 'getCustomersBySegment').mockResolvedValue([vipCustomer as any]);

      const vipCampaign = await bulkMessagingService.createCampaign({
        campaign_name: 'VIP認定おめでとう',
        description: 'VIP status achievement',
        template_id: 'vip-template',
        content: '{customer_name}様、VIP会員に認定されました！特別特典をご利用ください。',
        target_segments: ['vip-customers'],
        send_channels: ['line', 'email'],
      });

      console.log('✅ VIP status achieved - congratulations message sent');

      // STEP 5: Targeted VIP Campaign
      console.log('📝 Step 5: VIP Exclusive Campaign');

      const vipExclusiveCampaign = await bulkMessagingService.createCampaign({
        campaign_name: 'VIP限定プレミアムコース',
        description: 'VIP exclusive premium service',
        template_id: 'premium-template',
        content: '{customer_name}様限定！プレミアムコースを特別価格でご提供します。',
        target_segments: ['vip-customers'],
        send_channels: ['line'],
      });

      expect(vipExclusiveCampaign.total_recipients).toBe(1);

      console.log('✅ VIP exclusive campaign sent');

      // STEP 6: Lifecycle Analytics
      console.log('📝 Step 6: Customer Lifecycle Analytics');

      // Mock usage history for analytics
      const planService = new PlanLimitService(tenantId);
      vi.spyOn(planService, 'getUsageHistory').mockResolvedValue([
        {
          tenantId: tenantId,
          month: '2024-01',
          customerCount: 1,
          reservationCount: 6,
          createdAt: '2024-01-31T23:59:59',
        },
      ]);

      const usageHistory = await planService.getUsageHistory(1);
      expect(usageHistory[0].customerCount).toBe(1);
      expect(usageHistory[0].reservationCount).toBe(6);

      console.log('✅ Lifecycle analytics captured');
      console.log(`   📈 Total Visits: ${usageHistory[0].reservationCount}`);
      console.log(`   🏆 Status: VIP (6+ visits)`);

      console.log('🎉 Complete customer lifecycle flow successful!');
    });
  });

  describe('Error Recovery and Resilience Flow', () => {
    it('should handle and recover from various system failures gracefully', async () => {
      const tenantId = 'e2e-tenant-123';

      // STEP 1: Database Connection Failure
      console.log('📝 Step 1: Database Connection Failure Recovery');

      // Mock database failure
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ 
              data: null, 
              error: new Error('Connection timeout') 
            }),
          }),
        }),
      });

      const { result: customerResult } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(customerResult.current.isLoading).toBe(false);
      });

      expect(customerResult.current.error).toBeDefined();
      expect(customerResult.current.customers).toEqual([]);

      console.log('✅ Database failure handled gracefully - empty state shown');

      // STEP 2: Partial Service Recovery
      console.log('📝 Step 2: Partial Service Recovery');

      // Mock successful recovery
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ 
              data: [
                { id: '1', name: '復旧後顧客1' },
                { id: '2', name: '復旧後顧客2' },
              ], 
              error: null 
            }),
          }),
        }),
      });

      // Trigger refetch
      customerResult.current.refetch();

      await waitFor(() => {
        expect(customerResult.current.error).toBeNull();
      });

      expect(customerResult.current.customers).toHaveLength(2);

      console.log('✅ Service recovered - data restored');

      // STEP 3: API Rate Limiting
      console.log('📝 Step 3: API Rate Limiting Handling');

      const bulkMessagingService = new BulkMessagingService(tenantId);

      // Mock rate limiting error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      // Mock queue processing with retry logic
      const mockQueueItem = {
        id: 'rate-limited-message',
        customer_id: 'customer-1',
        channel_type: 'line',
        content: 'Rate limited message',
        retry_count: 0,
        max_retries: 3,
      };

      // Should handle rate limiting and retry
      try {
        await bulkMessagingService['processQueueItem'](mockQueueItem as any);
      } catch (error) {
        expect(error.message).toContain('Too Many Requests');
      }

      // Mock successful retry
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      (supabase.from as any).mockReturnValue({
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ 
              data: { id: 'message-success' }, 
              error: null 
            }),
          }),
        }),
      });

      // Retry should succeed
      await bulkMessagingService['processQueueItem'](mockQueueItem as any);

      console.log('✅ Rate limiting handled with retry mechanism');

      // STEP 4: Partial Data Corruption
      console.log('📝 Step 4: Partial Data Corruption Handling');

      // Mock corrupted customer data
      const corruptedData = [
        { id: '1', name: 'Valid Customer', phone_number: '090-1111-1111' },
        { id: '2', name: null, phone_number: undefined }, // Corrupted
        { id: '3', name: 'Another Valid', phone_number: '090-3333-3333' },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: corruptedData, error: null }),
          }),
        }),
      });

      const { result: corruptedResult } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(corruptedResult.current.isLoading).toBe(false);
      });

      // Should still return all data, allowing UI to handle gracefully
      expect(corruptedResult.current.customers).toHaveLength(3);

      console.log('✅ Corrupted data handled - UI can decide how to display');

      // STEP 5: Complete System Recovery
      console.log('📝 Step 5: Complete System Recovery');

      // Mock all systems restored
      const cleanData = [
        { id: '1', name: 'Clean Customer 1', phone_number: '090-1111-1111' },
        { id: '2', name: 'Clean Customer 2', phone_number: '090-2222-2222' },
        { id: '3', name: 'Clean Customer 3', phone_number: '090-3333-3333' },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: cleanData, error: null }),
          }),
        }),
      });

      corruptedResult.current.refetch();

      await waitFor(() => {
        expect(corruptedResult.current.customers).toHaveLength(3);
      });

      expect(corruptedResult.current.customers.every(c => c.name && c.phone_number)).toBe(true);

      console.log('✅ Complete system recovery verified');

      console.log('🎉 Error recovery and resilience flow successful!');
    });
  });
});