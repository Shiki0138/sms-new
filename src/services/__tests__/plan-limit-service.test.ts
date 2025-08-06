import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlanLimitService } from '../plan-limit-service';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          count: 'exact',
          head: true,
        })),
        gte: vi.fn(() => ({
          lt: vi.fn(),
        })),
        lt: vi.fn(),
      })),
      upsert: vi.fn(),
    })),
  },
}));

describe('PlanLimitService', () => {
  let service: PlanLimitService;
  const mockTenantId = 'test-tenant-123';

  beforeEach(() => {
    service = new PlanLimitService(mockTenantId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getPlanLimits', () => {
    it('should return light plan limits', () => {
      const limits = service.getPlanLimits('light');
      
      expect(limits).toEqual({
        customerLimit: 100,
        monthlyReservationLimit: 50,
        staffLimit: 3,
        planType: 'light',
      });
    });

    it('should return standard plan limits', () => {
      const limits = service.getPlanLimits('standard');
      
      expect(limits).toEqual({
        customerLimit: 500,
        monthlyReservationLimit: 200,
        staffLimit: 10,
        planType: 'standard',
      });
    });

    it('should return premium plan limits (unlimited)', () => {
      const limits = service.getPlanLimits('premium');
      
      expect(limits).toEqual({
        customerLimit: -1,
        monthlyReservationLimit: -1,
        staffLimit: -1,
        planType: 'premium',
      });
    });

    it('should default to light plan for unknown plan type', () => {
      const limits = service.getPlanLimits('unknown' as any);
      
      expect(limits.planType).toBe('light');
    });
  });

  describe('getTenantPlan', () => {
    it('should return tenant plan from database', async () => {
      const mockPlan = 'standard';
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { plan: mockPlan }, error: null }),
          }),
        }),
      });

      const plan = await service.getTenantPlan();
      
      expect(plan).toBe(mockPlan);
      expect(supabase.from).toHaveBeenCalledWith('tenants');
    });

    it('should default to light plan on database error', async () => {
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('DB error') }),
          }),
        }),
      });

      const plan = await service.getTenantPlan();
      
      expect(plan).toBe('light');
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current usage statistics', async () => {
      const mockCustomerCount = 45;
      const mockReservationCount = 25;
      const mockStaffCount = 2;

      (supabase.from as any)
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              count: mockCustomerCount,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () => ({
                  count: mockReservationCount,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                count: mockStaffCount,
                error: null,
              }),
            }),
          }),
        });

      const usage = await service.getCurrentUsage();

      expect(usage).toEqual({
        totalCustomers: mockCustomerCount,
        monthlyReservations: mockReservationCount,
        activeStaff: mockStaffCount,
      });
    });

    it('should return zero values on database errors', async () => {
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            count: null,
            error: new Error('DB error'),
          }),
        }),
      });

      const usage = await service.getCurrentUsage();

      expect(usage).toEqual({
        totalCustomers: 0,
        monthlyReservations: 0,
        activeStaff: 0,
      });
    });
  });

  describe('canAddCustomer', () => {
    it('should allow adding customer when under limit', async () => {
      // Mock getPlanStatus to return light plan with current usage under limit
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 90, monthlyReservations: 40, activeStaff: 2 },
        remainingQuota: { customers: 10, reservations: 10, staff: 1 },
        isOverLimit: { customers: false, reservations: false, staff: false },
      });

      const result = await service.canAddCustomer();

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent adding customer when at limit', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 100, monthlyReservations: 40, activeStaff: 2 },
        remainingQuota: { customers: 0, reservations: 10, staff: 1 },
        isOverLimit: { customers: true, reservations: false, staff: false },
      });

      const result = await service.canAddCustomer();

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('lightプランでは顧客登録は100名まで');
      expect(result.reason).toContain('現在100名が登録されています');
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(service, 'getPlanStatus').mockRejectedValue(new Error('Database error'));

      const result = await service.canAddCustomer();

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('制限チェックに失敗しました。');
    });
  });

  describe('canAddReservation', () => {
    it('should allow adding reservation when under monthly limit', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 90, monthlyReservations: 40, activeStaff: 2 },
        remainingQuota: { customers: 10, reservations: 10, staff: 1 },
        isOverLimit: { customers: false, reservations: false, staff: false },
      });

      const result = await service.canAddReservation();

      expect(result.allowed).toBe(true);
    });

    it('should prevent adding reservation when at monthly limit', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 90, monthlyReservations: 50, activeStaff: 2 },
        remainingQuota: { customers: 10, reservations: 0, staff: 1 },
        isOverLimit: { customers: false, reservations: true, staff: false },
      });

      const result = await service.canAddReservation();

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('lightプランでは月間予約数は50件まで');
      expect(result.reason).toContain('今月は50件の予約があります');
    });
  });

  describe('canAddStaff', () => {
    it('should allow adding staff when under limit', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 90, monthlyReservations: 40, activeStaff: 2 },
        remainingQuota: { customers: 10, reservations: 10, staff: 1 },
        isOverLimit: { customers: false, reservations: false, staff: false },
      });

      const result = await service.canAddStaff();

      expect(result.allowed).toBe(true);
    });

    it('should prevent adding staff when at limit', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 90, monthlyReservations: 40, activeStaff: 3 },
        remainingQuota: { customers: 10, reservations: 10, staff: 0 },
        isOverLimit: { customers: false, reservations: false, staff: true },
      });

      const result = await service.canAddStaff();

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('lightプランではスタッフ登録は3名まで');
      expect(result.reason).toContain('現在3名が登録されています');
    });
  });

  describe('getPlanWarnings', () => {
    it('should return warnings when approaching limits', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 85, monthlyReservations: 42, activeStaff: 3 },
        remainingQuota: { customers: 15, reservations: 8, staff: 0 },
        isOverLimit: { customers: false, reservations: false, staff: true },
      });

      const warnings = await service.getPlanWarnings();

      expect(warnings).toHaveLength(2);
      
      // Customer warning (85/100 = 85% > 80%)
      expect(warnings.find(w => w.category === 'customers')).toEqual({
        type: 'warning',
        message: expect.stringContaining('顧客数が上限の80%に達しています'),
        category: 'customers',
      });

      // Staff error (3/3 = 100%)
      expect(warnings.find(w => w.category === 'staff')).toEqual({
        type: 'error',
        message: expect.stringContaining('スタッフ数が上限に達しています'),
        category: 'staff',
      });
    });

    it('should return no warnings for premium plan (unlimited)', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'premium',
        limits: { customerLimit: -1, monthlyReservationLimit: -1, staffLimit: -1, planType: 'premium' },
        currentUsage: { totalCustomers: 1000, monthlyReservations: 500, activeStaff: 20 },
        remainingQuota: { customers: -1, reservations: -1, staff: -1 },
        isOverLimit: { customers: false, reservations: false, staff: false },
      });

      const warnings = await service.getPlanWarnings();

      expect(warnings).toHaveLength(0);
    });
  });

  describe('updateMonthlyUsage', () => {
    it('should update monthly usage statistics', async () => {
      vi.spyOn(service, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 95,
        monthlyReservations: 45,
        activeStaff: 2,
      });

      (supabase.from as any).mockReturnValue({
        upsert: () => Promise.resolve({ error: null }),
      });

      const result = await service.updateMonthlyUsage();

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('plan_usage');
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(service, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 95,
        monthlyReservations: 45,
        activeStaff: 2,
      });

      (supabase.from as any).mockReturnValue({
        upsert: () => Promise.resolve({ error: new Error('Database error') }),
      });

      const result = await service.updateMonthlyUsage();

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely high usage numbers', async () => {
      vi.spyOn(service, 'getPlanStatus').mockResolvedValue({
        planType: 'light',
        limits: { customerLimit: 100, monthlyReservationLimit: 50, staffLimit: 3, planType: 'light' },
        currentUsage: { totalCustomers: 999999, monthlyReservations: 999999, activeStaff: 999999 },
        remainingQuota: { customers: -999899, reservations: -999949, staff: -999996 },
        isOverLimit: { customers: true, reservations: true, staff: true },
      });

      const warnings = await service.getPlanWarnings();

      expect(warnings.every(w => w.type === 'error')).toBe(true);
      expect(warnings).toHaveLength(3);
    });

    it('should handle zero limits gracefully', async () => {
      const customService = new PlanLimitService('test');
      vi.spyOn(customService, 'getPlanLimits').mockReturnValue({
        customerLimit: 0,
        monthlyReservationLimit: 0,
        staffLimit: 0,
        planType: 'custom' as any,
      });

      vi.spyOn(customService, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: 1,
        monthlyReservations: 1,
        activeStaff: 1,
      });

      const status = await customService.getPlanStatus();

      expect(status.isOverLimit.customers).toBe(true);
      expect(status.isOverLimit.reservations).toBe(true);
      expect(status.isOverLimit.staff).toBe(true);
    });

    it('should handle negative current usage', async () => {
      vi.spyOn(service, 'getCurrentUsage').mockResolvedValue({
        totalCustomers: -1,
        monthlyReservations: -1,
        activeStaff: -1,
      });

      const status = await service.getPlanStatus();

      expect(status.currentUsage.totalCustomers).toBe(-1);
      expect(status.remainingQuota.customers).toBe(100); // light plan limit is 100
      expect(status.isOverLimit.customers).toBe(false);
    });
  });
});