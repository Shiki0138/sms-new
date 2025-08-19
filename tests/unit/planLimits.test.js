// Light Plan Limits Unit Tests
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { PlanLimitsService } = require('../../src/services/planLimitsService');
const { checkPlanLimit, getPlanUsage } = require('../../src/middleware/planRestrictions');

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/services/planLimitsService');

describe('Plan Limits Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request, response, and next
    mockReq = {
      user: { id: 'test-user-id' },
      headers: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {}
    };
    
    mockNext = jest.fn();
  });

  describe('checkPlanLimit Middleware', () => {
    it('should allow request when within Light plan limits', async () => {
      // Mock plan usage within limits
      PlanLimitsService.checkLimit.mockResolvedValue({
        allowed: true,
        current: 50,
        limit: 100,
        remaining: 50
      });

      const middleware = checkPlanLimit('customers');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block request when exceeding Light plan limits', async () => {
      // Mock plan usage exceeding limits
      PlanLimitsService.checkLimit.mockResolvedValue({
        allowed: false,
        current: 100,
        limit: 100,
        remaining: 0
      });

      const middleware = checkPlanLimit('customers');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Plan limit reached')
      }));
    });

    it('should handle missing user gracefully', async () => {
      mockReq.user = null;

      const middleware = checkPlanLimit('customers');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized'
      }));
    });
  });

  describe('PlanLimitsService', () => {
    it('should correctly calculate remaining limits', async () => {
      const service = new PlanLimitsService();
      const result = await service.checkLimit('test-user', 'customers');
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
    });

    it('should handle different feature types correctly', async () => {
      const service = new PlanLimitsService();
      const features = ['customers', 'appointments', 'messages', 'storage'];
      
      for (const feature of features) {
        const result = await service.checkLimit('test-user', feature);
        expect(result).toBeDefined();
        expect(result.limit).toBeGreaterThan(0);
      }
    });
  });

  describe('Plan Usage Tracking', () => {
    it('should track customer creation', async () => {
      const trackUsage = jest.spyOn(PlanLimitsService.prototype, 'trackUsage');
      
      // Simulate customer creation
      await PlanLimitsService.prototype.trackUsage('test-user', 'customers', 1);
      
      expect(trackUsage).toHaveBeenCalledWith('test-user', 'customers', 1);
    });

    it('should prevent duplicate tracking', async () => {
      const service = new PlanLimitsService();
      
      // Track same action twice
      await service.trackUsage('test-user', 'customers', 1);
      await service.trackUsage('test-user', 'customers', 1);
      
      // Should only count once
      const usage = await service.getUsage('test-user', 'customers');
      expect(usage).toBe(1);
    });
  });

  describe('Plan Limits Edge Cases', () => {
    it('should handle zero limits correctly', async () => {
      PlanLimitsService.checkLimit.mockResolvedValue({
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0
      });

      const middleware = checkPlanLimit('premium_feature');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle negative limits gracefully', async () => {
      PlanLimitsService.checkLimit.mockResolvedValue({
        allowed: false,
        current: 10,
        limit: -1,
        remaining: 0
      });

      const middleware = checkPlanLimit('customers');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle database errors gracefully', async () => {
      PlanLimitsService.checkLimit.mockRejectedValue(new Error('Database error'));

      const middleware = checkPlanLimit('customers');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('error')
      }));
    });
  });
});