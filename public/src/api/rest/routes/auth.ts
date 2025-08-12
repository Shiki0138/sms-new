import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validateBody } from '../../middleware/validation';
import { authRateLimiter } from '../../middleware/rateLimit';
import { ApiError, asyncHandler } from '../../middleware/error';

export const authRouter = Router();

// Apply rate limiting to auth routes
authRouter.use(authRateLimiter);

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number and special character'
  ),
  name: z.string().min(2).max(100)
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

// Login endpoint
authRouter.post('/login', 
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // TODO: Implement actual user lookup
    // This is a mock implementation
    const mockUser = {
      id: '123',
      email: 'admin@example.com',
      password: await bcrypt.hash('Admin123!', 10),
      name: 'Admin User',
      roles: ['admin']
    };

    if (email !== mockUser.email) {
      throw new ApiError(401, 'Invalid credentials', true);
    }

    const isValidPassword = await bcrypt.compare(password, mockUser.password);
    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials', true);
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: mockUser.id, email: mockUser.email, roles: mockUser.roles },
      process.env.JWT_SECRET || 'default-secret-change-me',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: mockUser.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        roles: mockUser.roles
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes
      }
    });
  })
);

// Register endpoint
authRouter.post('/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // TODO: Check if user exists
    // TODO: Create user in database

    const _hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      roles: ['user']
    };

    // Generate tokens
    const accessToken = jwt.sign(
      { id: newUser.id, email: newUser.email, roles: newUser.roles },
      process.env.JWT_SECRET || 'default-secret-change-me',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: newUser.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: newUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900
      }
    });
  })
);

// Refresh token endpoint
authRouter.post('/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me'
      ) as any;

      if (decoded.type !== 'refresh') {
        throw new ApiError(401, 'Invalid refresh token', true);
      }

      // TODO: Get user from database
      const user = {
        id: decoded.id,
        email: 'admin@example.com',
        roles: ['admin']
      };

      // Generate new access token
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, roles: user.roles },
        process.env.JWT_SECRET || 'default-secret-change-me',
        { expiresIn: '15m' }
      );

      res.json({
        accessToken,
        expiresIn: 900
      });
    } catch (error) {
      throw new ApiError(401, 'Invalid refresh token', true);
    }
  })
);

// Logout endpoint
authRouter.post('/logout', (_req, res) => {
  // TODO: Invalidate refresh token in database
  res.json({ message: 'Logged out successfully' });
});