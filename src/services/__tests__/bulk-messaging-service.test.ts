import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BulkMessagingService } from '../bulk-messaging-service';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(),
              single: vi.fn(),
              limit: vi.fn(),
            })),
            single: vi.fn(),
            limit: vi.fn(),
          })),
          single: vi.fn(),
          order: vi.fn(),
          limit: vi.fn(),
        })),
        in: vi.fn(),
        or: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        gte: vi.fn(),
        lt: vi.fn(),
        lte: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      upsert: vi.fn(),
    })),
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => '1月22日(月)'),
  addMinutes: vi.fn((date, minutes) => new Date(date.getTime() + minutes * 60000)),
  parseISO: vi.fn((date) => new Date(date)),
  isWithinInterval: vi.fn(() => true),
  startOfDay: vi.fn((date) => new Date(date.setHours(0, 0, 0, 0))),
  endOfDay: vi.fn((date) => new Date(date.setHours(23, 59, 59, 999))),
}));

vi.mock('date-fns/locale', () => ({
  ja: {},
}));

describe('BulkMessagingService', () => {
  let service: BulkMessagingService;
  const mockTenantId = 'test-tenant-123';

  beforeEach(() => {
    service = new BulkMessagingService(mockTenantId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Message Templates', () => {
    it('should fetch message templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          tenant_id: mockTenantId,
          name: '予約確認',
          category: 'reservation',
          content: '{customer_name}様の予約を確認しました。',
          is_active: true,
        },
        {
          id: 'template-2',
          tenant_id: mockTenantId,
          name: 'キャンペーン',
          category: 'campaign',
          content: 'お得なキャンペーンのお知らせです。',
          is_active: true,
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockTemplates, error: null }),
              }),
            }),
          }),
        }),
      });

      const templates = await service.getMessageTemplates();

      expect(templates).toEqual(mockTemplates);
      expect(supabase.from).toHaveBeenCalledWith('message_templates');
    });

    it('should filter templates by category', async () => {
      const mockCategoryTemplates = [
        {
          id: 'template-1',
          category: 'reservation',
          name: '予約確認',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  order: () => Promise.resolve({ data: mockCategoryTemplates, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const templates = await service.getMessageTemplates('reservation');

      expect(templates).toEqual(mockCategoryTemplates);
    });

    it('should create new message template', async () => {
      const newTemplate = {
        name: '新規テンプレート',
        category: 'general',
        content: 'テスト内容',
        variables: ['customer_name'],
        is_active: true,
      };

      const mockCreatedTemplate = {
        id: 'new-template-123',
        tenant_id: mockTenantId,
        ...newTemplate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockCreatedTemplate, error: null }),
          }),
        }),
      });

      const result = await service.createMessageTemplate(newTemplate);

      expect(result).toEqual(mockCreatedTemplate);
    });

    it('should handle template creation errors', async () => {
      const newTemplate = {
        name: 'エラーテンプレート',
        category: 'general',
        content: 'エラー内容',
        variables: [],
        is_active: true,
      };

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Database error') }),
          }),
        }),
      });

      await expect(service.createMessageTemplate(newTemplate)).rejects.toThrow('Database error');
    });
  });

  describe('Customer Preferences', () => {
    it('should get customer preferences', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          customer_id: 'customer-123',
          channel_type: 'line',
          is_opted_in: true,
          receive_campaigns: true,
          receive_reminders: true,
        },
        {
          id: 'pref-2',
          customer_id: 'customer-123',
          channel_type: 'email',
          is_opted_in: false,
          receive_campaigns: false,
          receive_reminders: true,
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: mockPreferences, error: null }),
          }),
        }),
      });

      const preferences = await service.getCustomerPreferences('customer-123');

      expect(preferences).toEqual(mockPreferences);
    });

    it('should update customer preference (opt-out)', async () => {
      const mockExistingPreference = {
        id: 'pref-1',
        customer_id: 'customer-123',
        channel_type: 'line',
        is_opted_in: true,
      };

      const mockUpdatedPreference = {
        ...mockExistingPreference,
        is_opted_in: false,
        opt_out_date: new Date().toISOString(),
        opt_out_reason: 'Too many messages',
      };

      // Mock getCustomerPreference (private method)
      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockExistingPreference, error: null }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockUpdatedPreference, error: null }),
              }),
            }),
          }),
        });

      const result = await service.updateCustomerPreference({
        customer_id: 'customer-123',
        channel_type: 'line',
        is_opted_in: false,
        reason: 'Too many messages',
      });

      expect(result.is_opted_in).toBe(false);
    });

    it('should create new preference when none exists', async () => {
      const mockNewPreference = {
        id: 'new-pref-123',
        tenant_id: mockTenantId,
        customer_id: 'customer-456',
        channel_type: 'email',
        is_opted_in: true,
      };

      // Mock getCustomerPreference returning null (no existing preference)
      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockNewPreference, error: null }),
            }),
          }),
        });

      const result = await service.updateCustomerPreference({
        customer_id: 'customer-456',
        channel_type: 'email',
        is_opted_in: true,
      });

      expect(result).toEqual(mockNewPreference);
    });

    it('should bulk update preferences', async () => {
      const request = {
        customer_ids: ['customer-1', 'customer-2', 'customer-3'],
        channel_types: ['line', 'email'],
        updates: {
          is_opted_in: false,
          receive_campaigns: false,
        },
      };

      // Mock successful updates
      vi.spyOn(service, 'updateCustomerPreference').mockResolvedValue({
        id: 'mock-pref',
        tenant_id: mockTenantId,
        customer_id: 'mock-customer',
        channel_type: 'line',
        is_opted_in: false,
        receive_campaigns: false,
        receive_reminders: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updatedCount = await service.bulkUpdatePreferences(request);

      // Should update 3 customers × 2 channels = 6 preferences
      expect(updatedCount).toBe(6);
    });
  });

  describe('Customer Segmentation', () => {
    it('should get customer segments with counts', async () => {
      const mockSegments = [
        {
          id: 'segment-1',
          tenant_id: mockTenantId,
          name: 'VIP顧客',
          description: '月2回以上来店',
          segment_type: 'dynamic',
          conditions: { visit_frequency: { operator: '>=', value: 2 } },
          is_active: true,
        },
        {
          id: 'segment-2',
          tenant_id: mockTenantId,
          name: '新規顧客',
          description: '初回来店から3ヶ月以内',
          segment_type: 'dynamic',
          conditions: { first_visit: { operator: '<=', value: 90 } },
          is_active: true,
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockSegments, error: null }),
            }),
          }),
        }),
      });

      // Mock getSegmentCustomerCount
      vi.spyOn(service as any, 'getSegmentCustomerCount')
        .mockResolvedValueOnce(25) // VIP customers
        .mockResolvedValueOnce(15); // New customers

      const segments = await service.getCustomerSegments();

      expect(segments).toHaveLength(2);
      expect(segments[0].customer_count).toBe(25);
      expect(segments[1].customer_count).toBe(15);
    });

    it('should create new customer segment', async () => {
      const newSegment = {
        name: '休眠顧客',
        description: '3ヶ月以上来店なし',
        segment_type: 'dynamic' as const,
        conditions: { last_visit: { operator: '>=', value: 90 } },
        customer_ids: [],
        is_active: true,
      };

      const mockCreatedSegment = {
        id: 'new-segment-123',
        tenant_id: mockTenantId,
        ...newSegment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockCreatedSegment, error: null }),
          }),
        }),
      });

      const result = await service.createCustomerSegment(newSegment);

      expect(result).toEqual(mockCreatedSegment);
    });

    it('should get customers by segment (static)', async () => {
      const mockSegment = {
        id: 'static-segment',
        segment_type: 'static',
        customer_ids: ['customer-1', 'customer-2', 'customer-3'],
      };

      const mockCustomers = [
        { id: 'customer-1', name: '顧客1' },
        { id: 'customer-2', name: '顧客2' },
        { id: 'customer-3', name: '顧客3' },
      ];

      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockSegment, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            in: () => Promise.resolve({ data: mockCustomers, error: null }),
          }),
        });

      const customers = await service.getCustomersBySegment('static-segment');

      expect(customers).toEqual(mockCustomers);
    });

    it('should get customers by segment (dynamic - all customers)', async () => {
      const mockSegment = {
        id: 'all-customers-segment',
        segment_type: 'dynamic',
        conditions: { all: true },
      };

      const mockAllCustomers = [
        { id: 'customer-1', name: '全顧客1' },
        { id: 'customer-2', name: '全顧客2' },
      ];

      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockSegment, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => Promise.resolve({ data: mockAllCustomers, error: null }),
          }),
        });

      const customers = await service.getCustomersBySegment('all-customers-segment');

      expect(customers).toEqual(mockAllCustomers);
    });
  });

  describe('Campaign Management', () => {
    it('should create campaign successfully', async () => {
      const campaignRequest = {
        campaign_name: 'テストキャンペーン',
        description: 'テスト用のキャンペーンです',
        template_id: 'template-123',
        subject: 'お得情報',
        content: '{customer_name}様へお得な情報をお知らせします',
        target_segments: ['segment-1', 'segment-2'],
        target_filters: { visit_count: { min: 3 } },
        send_channels: ['line', 'email'],
        scheduled_at: '2024-02-01T10:00:00Z',
      };

      const mockTargetCustomers = [
        { id: 'customer-1', name: '顧客1' },
        { id: 'customer-2', name: '顧客2' },
      ];

      const mockCreatedCampaign = {
        id: 'campaign-123',
        tenant_id: mockTenantId,
        name: campaignRequest.campaign_name,
        status: 'scheduled',
        total_recipients: 2,
        ...campaignRequest,
      };

      // Mock getTargetCustomers
      vi.spyOn(service as any, 'getTargetCustomers').mockResolvedValue(mockTargetCustomers);

      (supabase.from as any).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockCreatedCampaign, error: null }),
          }),
        }),
      });

      const result = await service.createCampaign(campaignRequest);

      expect(result).toEqual(mockCreatedCampaign);
      expect(result.total_recipients).toBe(2);
    });

    it('should send campaign immediately', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        name: 'テストキャンペーン',
        content: '{customer_name}様へ',
        target_segments: ['segment-1'],
        target_filters: {},
        send_channels: ['line'],
      };

      const mockTargetCustomers = [
        { id: 'customer-1', name: '顧客1' },
        { id: 'customer-2', name: '顧客2' },
      ];

      // Mock campaign fetch
      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockCampaign, error: null }),
              }),
            }),
          }),
        })
        // Mock campaign status update
        .mockReturnValueOnce({
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        });

      // Mock getTargetCustomers
      vi.spyOn(service as any, 'getTargetCustomers').mockResolvedValue(mockTargetCustomers);

      // Mock queueCampaignMessages
      vi.spyOn(service as any, 'queueCampaignMessages').mockResolvedValue(undefined);

      await service.sendCampaign('campaign-123', { send_immediately: true });

      expect(service['queueCampaignMessages']).toHaveBeenCalled();
    });
  });

  describe('Message Queue Processing', () => {
    it('should process message queue successfully', async () => {
      const mockQueueItems = [
        {
          id: 'queue-1',
          tenant_id: mockTenantId,
          customer_id: 'customer-1',
          channel_type: 'line',
          content: 'テストメッセージ1',
          status: 'pending',
          priority: 5,
          scheduled_for: new Date().toISOString(),
        },
        {
          id: 'queue-2',
          tenant_id: mockTenantId,
          customer_id: 'customer-2',
          channel_type: 'email',
          content: 'テストメッセージ2',
          status: 'pending',
          priority: 7,
          scheduled_for: new Date().toISOString(),
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              lte: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: mockQueueItems, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock processQueueItem
      vi.spyOn(service as any, 'processQueueItem').mockResolvedValue(undefined);

      const processedCount = await service.processMessageQueue(10);

      expect(processedCount).toBe(2);
      expect(service['processQueueItem']).toHaveBeenCalledTimes(2);
    });

    it('should handle queue processing errors gracefully', async () => {
      const mockQueueItems = [
        {
          id: 'queue-error',
          customer_id: 'customer-1',
          channel_type: 'line',
          content: 'エラーメッセージ',
          status: 'pending',
          retry_count: 0,
          max_retries: 3,
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              lte: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: mockQueueItems, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock processQueueItem to throw error
      vi.spyOn(service as any, 'processQueueItem').mockRejectedValue(new Error('Processing failed'));
      
      // Mock handleQueueItemError
      vi.spyOn(service as any, 'handleQueueItemError').mockResolvedValue(undefined);

      const processedCount = await service.processMessageQueue(10);

      expect(processedCount).toBe(0); // No successful processing
      expect(service['handleQueueItemError']).toHaveBeenCalledWith(
        mockQueueItems[0],
        expect.any(Error)
      );
    });
  });

  describe('Template Variable Filling', () => {
    it('should fill customer variables correctly', async () => {
      const template = 'こんにちは、{customer_name}様。お電話番号は{customer_phone}ですね。';
      const customer = {
        id: 'customer-1',
        name: '山田花子',
        phone_number: '090-1234-5678',
        email: 'yamada@example.com',
      };

      const result = await service.fillTemplateVariables(template, customer as any);

      expect(result).toBe('こんにちは、山田花子様。お電話番号は090-1234-5678ですね。');
    });

    it('should fill reservation variables correctly', async () => {
      const template = '{customer_name}様の予約は{date}の{time}です。メニューは{menu}です。';
      const customer = { name: '佐藤太郎' };
      const reservation = {
        start_time: '2024-01-22T14:00:00',
        menu_content: 'カット＆カラー',
        staff_name: '田中スタイリスト',
      };

      const result = await service.fillTemplateVariables(
        template,
        customer as any,
        reservation as any
      );

      expect(result).toContain('佐藤太郎様の予約は1月22日(月)の');
      expect(result).toContain('カット＆カラーです');
    });

    it('should handle missing variables gracefully', async () => {
      const template = '{customer_name}様、{unknown_variable}です。';
      const customer = { name: '田中太郎' };

      const result = await service.fillTemplateVariables(template, customer as any);

      expect(result).toBe('田中太郎様、{unknown_variable}です。');
    });

    it('should fill salon variables', async () => {
      const template = '{salon_name}（{salon_phone}）からのお知らせです。';
      const customer = { name: 'テスト顧客' };

      const result = await service.fillTemplateVariables(template, customer as any);

      expect(result).toContain('ビューティーサロン（03-1234-5678）からのお知らせです。');
    });
  });

  describe('Message Preview', () => {
    it('should generate message previews', async () => {
      const mockTemplate = {
        id: 'template-1',
        content: '{customer_name}様へのメッセージ',
        subject: '件名: {customer_name}様',
      };

      const mockCustomers = [
        { id: 'customer-1', name: '山田花子' },
        { id: 'customer-2', name: '佐藤太郎' },
      ];

      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockTemplate, error: null }),
            }),
          }),
        })
        .mockReturnValue({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ 
                data: mockCustomers[0], // Return first customer for each call
                error: null 
              }),
            }),
          }),
        });

      const previews = await service.previewMessage(
        'template-1',
        ['customer-1', 'customer-2']
      );

      expect(previews).toHaveLength(2);
      expect(previews[0].content).toBe('山田花子様へのメッセージ');
      expect(previews[0].subject).toBe('件名: 山田花子様');
    });
  });

  describe('Campaign Analytics', () => {
    it('should calculate campaign analytics correctly', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        total_recipients: 100,
        send_channels: ['line', 'email'],
      };

      const mockMessages = [
        { 
          id: 'msg-1', 
          status: 'delivered', 
          channel_type: 'line',
          sent_at: '2024-01-01T10:00:00',
          delivered_at: '2024-01-01T10:01:00',
          read_at: '2024-01-01T10:05:00',
        },
        { 
          id: 'msg-2', 
          status: 'delivered', 
          channel_type: 'email',
          sent_at: '2024-01-01T10:00:00',
          delivered_at: '2024-01-01T10:02:00',
          read_at: null,
          clicked_at: '2024-01-01T10:10:00',
        },
        { 
          id: 'msg-3', 
          status: 'failed', 
          channel_type: 'line',
          sent_at: '2024-01-01T10:00:00',
        },
      ];

      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockCampaign, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => Promise.resolve({ data: mockMessages, error: null }),
          }),
        });

      const analytics = await service.getCampaignAnalytics('campaign-123');

      expect(analytics.total_recipients).toBe(100);
      expect(analytics.sent_count).toBe(2); // 2 non-pending messages
      expect(analytics.delivered_count).toBe(2);
      expect(analytics.delivery_rate).toBe(100); // 2/2 * 100
      expect(analytics.open_count).toBe(1); // 1 with read_at
      expect(analytics.click_count).toBe(1); // 1 with clicked_at
      expect(analytics.error_count).toBe(1); // 1 failed
    });
  });

  describe('Reminder System', () => {
    it('should get active reminder rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          tenant_id: mockTenantId,
          trigger_type: 'before_appointment',
          trigger_timing: 1440, // 24 hours before
          send_channels: ['line'],
          is_active: true,
          template: {
            content: '明日のご予約をお忘れなく',
          },
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockRules, error: null }),
              }),
            }),
          }),
        }),
      });

      const rules = await service.getReminderRules();

      expect(rules).toEqual(mockRules);
    });

    it('should process reminders and return count', async () => {
      const mockRules = [
        { id: 'rule-1', trigger_type: 'before_appointment' },
        { id: 'rule-2', trigger_type: 'after_appointment' },
      ];

      vi.spyOn(service, 'getReminderRules').mockResolvedValue(mockRules as any);
      vi.spyOn(service as any, 'processReminderRule')
        .mockResolvedValueOnce(5) // Rule 1 processed 5 reminders
        .mockResolvedValueOnce(3); // Rule 2 processed 3 reminders

      const totalProcessed = await service.processReminders();

      expect(totalProcessed).toBe(8);
    });
  });

  describe('Emergency Templates', () => {
    it('should provide emergency templates', () => {
      const templates = service.getEmergencyTemplates();

      expect(templates).toHaveLength(3);
      expect(templates[0].name).toBe('緊急休業のお知らせ');
      expect(templates[1].name).toBe('年末年始の営業について');
      expect(templates[2].name).toBe('期間限定キャンペーン');
      
      // All should have tenant_id set
      templates.forEach(template => {
        expect(template.tenant_id).toBe(mockTenantId);
      });
    });
  });

  describe('Default Segments', () => {
    it('should provide default customer segments', () => {
      const segments = service.getDefaultSegments();

      expect(segments).toHaveLength(4);
      expect(segments[0].name).toBe('全顧客');
      expect(segments[1].name).toBe('VIP顧客');
      expect(segments[2].name).toBe('新規顧客');
      expect(segments[3].name).toBe('休眠顧客');

      // All should have tenant_id set
      segments.forEach(segment => {
        expect(segment.tenant_id).toBe(mockTenantId);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle large customer segments', async () => {
      const largeSegment = {
        id: 'large-segment',
        segment_type: 'static',
        customer_ids: Array.from({ length: 10000 }, (_, i) => `customer-${i}`),
      };

      const largeCustomerSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `customer-${i}`,
        name: `顧客${i}`,
      }));

      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: largeSegment, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            in: () => Promise.resolve({ data: largeCustomerSet, error: null }),
          }),
        });

      const customers = await service.getCustomersBySegment('large-segment');

      expect(customers).toHaveLength(10000);
    });

    it('should handle extremely long message content', async () => {
      const longContent = 'A'.repeat(100000);
      const template = `{customer_name}様\n\n${longContent}`;
      const customer = { name: '長文テスト' };

      const result = await service.fillTemplateVariables(template, customer as any);

      expect(result).toContain('長文テスト様');
      expect(result.length).toBeGreaterThan(100000);
    });

    it('should handle null/undefined customer data', async () => {
      const template = '{customer_name}様、{customer_phone}、{customer_email}';
      const customer = {
        name: '不完全顧客',
        phone_number: null,
        email: undefined,
      };

      const result = await service.fillTemplateVariables(template, customer as any);

      expect(result).toBe('不完全顧客様、、');
    });

    it('should handle queue items with invalid channel types', async () => {
      const mockQueueItem = {
        id: 'invalid-queue',
        channel_type: 'invalid_channel',
        content: 'テストメッセージ',
      };

      // Mock queue item processing
      (supabase.from as any).mockReturnValue({
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      });

      await expect(service['processQueueItem'](mockQueueItem as any))
        .rejects.toThrow('Unsupported channel type: invalid_channel');
    });
  });
});