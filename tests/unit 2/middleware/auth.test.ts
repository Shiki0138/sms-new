import { Request, Response, NextFunction } from 'express';
import { authMiddleware, rateLimitMiddleware } from '../../../src/middleware/auth';
import jwt from 'jsonwebtoken';

// Mock Express objects
const mockRequest = (headers: any = {}, body: any = {}) => ({
  headers,
  body,
  user: undefined
} as Request);

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate valid JWT token', async () => {
      const user = { userId: 'test-user', permissions: ['sms:send'] };
      const token = jwt.sign(user, process.env.JWT_SECRET!);
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();

      await authMiddleware(req, res, mockNext);

      expect(req.user).toEqual(expect.objectContaining(user));
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await authMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      const req = mockRequest({ authorization: 'InvalidFormat token' });
      const res = mockResponse();

      await authMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token format' });
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user', permissions: ['sms:send'] },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );
      
      const req = mockRequest({ authorization: `Bearer ${expiredToken}` });
      const res = mockResponse();

      await authMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    });

    it('should reject request with invalid token signature', async () => {
      const invalidToken = jwt.sign(
        { userId: 'test-user', permissions: ['sms:send'] },
        'wrong-secret'
      );
      
      const req = mockRequest({ authorization: `Bearer ${invalidToken}` });
      const res = mockResponse();

      await authMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });

  describe('Permission Checking', () => {
    it('should allow access with required permission', async () => {
      const user = { userId: 'test-user', permissions: ['sms:send', 'sms:read'] };
      const token = jwt.sign(user, process.env.JWT_SECRET!);
      
      const requirePermission = (permission: string) => 
        async (req: Request, res: Response, next: NextFunction) => {
          if (!req.user?.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        };

      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();

      // First apply auth middleware
      await authMiddleware(req, res, () => {});
      
      // Then check permission
      const permissionMiddleware = requirePermission('sms:send');
      await permissionMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access without required permission', async () => {
      const user = { userId: 'test-user', permissions: ['sms:read'] };
      const token = jwt.sign(user, process.env.JWT_SECRET!);
      
      const requirePermission = (permission: string) => 
        async (req: Request, res: Response, next: NextFunction) => {
          if (!req.user?.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        };

      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();

      // First apply auth middleware
      await authMiddleware(req, res, () => {});
      
      // Then check permission
      const permissionMiddleware = requirePermission('sms:bulk');
      await permissionMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Middleware', () => {
    beforeEach(() => {
      // Reset rate limiter state
      jest.clearAllMocks();
    });

    it('should allow requests within rate limit', async () => {
      const user = { userId: 'test-user', rateLimit: { requestsPerMinute: 60 } };
      const req = mockRequest();
      req.user = user;
      const res = mockResponse();

      await rateLimitMiddleware(req, res, mockNext);

      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '60');
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', async () => {
      const user = { userId: 'rate-limited-user', rateLimit: { requestsPerMinute: 1 } };
      const req = mockRequest();
      req.user = user;
      const res = mockResponse();

      // First request should pass
      await rateLimitMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should be rate limited
      jest.clearAllMocks();
      await rateLimitMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Rate limit exceeded',
        retryAfter: expect.any(Number)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should include rate limit headers', async () => {
      const user = { userId: 'test-user', rateLimit: { requestsPerMinute: 60 } };
      const req = mockRequest();
      req.user = user;
      const res = mockResponse();

      await rateLimitMiddleware(req, res, mockNext);

      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '60');
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should handle burst limits', async () => {
      const user = { 
        userId: 'burst-user', 
        rateLimit: { 
          requestsPerMinute: 60, 
          burstLimit: 5 
        } 
      };
      const req = mockRequest();
      req.user = user;
      const res = mockResponse();

      // Should allow burst of 5 requests
      for (let i = 0; i < 5; i++) {
        jest.clearAllMocks();
        await rateLimitMiddleware(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 6th request should be rate limited
      jest.clearAllMocks();
      await rateLimitMiddleware(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate valid API key', async () => {
      const req = mockRequest({ 'x-api-key': 'valid-api-key' });
      const res = mockResponse();

      // Mock API key validation
      const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        const apiKey = req.headers['x-api-key'];
        if (apiKey === 'valid-api-key') {
          req.user = { userId: 'api-user', permissions: ['sms:send'] };
          next();
        } else {
          res.status(401).json({ error: 'Invalid API key' });
        }
      };

      await apiKeyMiddleware(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      const req = mockRequest({ 'x-api-key': 'invalid-api-key' });
      const res = mockResponse();

      const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        const apiKey = req.headers['x-api-key'];
        if (apiKey === 'valid-api-key') {
          req.user = { userId: 'api-user', permissions: ['sms:send'] };
          next();
        } else {
          res.status(401).json({ error: 'Invalid API key' });
        }
      };

      await apiKeyMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});