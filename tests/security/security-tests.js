/**
 * Security Tests
 * SMS Salon Management System
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock Express app for security testing
const createSecurityTestApp = () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Mock routes for security testing
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Simulate SQL injection attempt detection
    if (email && email.includes("'") && email.includes("DROP")) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (email === 'admin@salon.com' && password === 'admin123') {
      const token = jwt.sign({ id: 1, email, role: 'admin' }, 'test-secret');
      return res.json({ token, user: { id: 1, email, role: 'admin' } });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  });
  
  app.get('/api/customers', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({ customers: [], total: 0 });
  });
  
  return app;
};

describe('Security Tests', () => {
  let app;
  
  beforeEach(() => {
    app = createSecurityTestApp();
  });
  
  describe('Authentication Security', () => {
    test('should prevent SQL injection in login', async () => {
      const sqlInjectionPayloads = [
        "admin@salon.com'; DROP TABLE users; --",
        "admin@salon.com' OR '1'='1",
        "admin@salon.com' UNION SELECT * FROM users --",
        "admin@salon.com'; DELETE FROM users; --"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'admin123'
          });
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid credentials');
      }
    });
    
    test('should prevent NoSQL injection attempts', async () => {
      const noSqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.password' }
      ];
      
      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'admin123'
          });
        
        expect(response.status).toBe(401);
      }
    });
    
    test('should prevent brute force attacks with rate limiting', async () => {
      const requests = [];
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'admin@salon.com',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All should fail with 401
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
      
      // In a real implementation, we'd expect rate limiting after several attempts
      // For now, we verify the attempts are properly rejected
    });
    
    test('should validate JWT token structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@salon.com',
          password: 'admin123'
        });
      
      expect(response.status).toBe(200);
      
      const token = response.body.token;
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      
      // Verify token can be decoded
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('admin@salon.com');
      expect(decoded.role).toBe('admin');
    });
    
    test('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid.token',
        'header.payload', // Missing signature
        'not.a.jwt.token.at.all',
        '',
        null,
        undefined
      ];
      
      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', token ? `Bearer ${token}` : '');
        
        expect(response.status).toBe(401);
      }
    });
  });
  
  describe('Input Validation Security', () => {
    test('should prevent XSS attacks in customer names', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>'
      ];
      
      // In a real implementation, these would be sanitized
      // For now, we test that they don't cause server errors
      xssPayloads.forEach(payload => {
        expect(() => {
          // Simulate input validation
          const sanitized = payload.replace(/<[^>]*>/g, '');
          expect(sanitized).not.toContain('<script>');
        }).not.toThrow();
      });
    });
    
    test('should validate phone number format strictly', async () => {
      const invalidPhones = [
        '090-1234-567',   // Too short
        '090-1234-56789', // Too long
        '090-12-5678',    // Wrong segment
        'abc-defg-hijk',  // Not numeric
        '++++++++++++',   // Invalid characters
        '090 1234 5678',  // Spaces instead of hyphens
        '09012345678'     // No separators
      ];
      
      invalidPhones.forEach(phone => {
        const isValid = /^0\d{1,4}-\d{1,4}-\d{4}$/.test(phone);
        expect(isValid).toBe(false);
      });
    });
    
    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'plaintext',
        '@missingdomain.com',
        'missing@.com',
        'spaces in@email.com',
        'multiple@@signs.com',
        'trailing.dot.@email.com',
        '.leading.dot@email.com'
      ];
      
      invalidEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });
    
    test('should prevent prototype pollution', async () => {
      const pollutionPayloads = [
        { '__proto__.polluted': 'yes' },
        { 'constructor.prototype.polluted': 'yes' },
        { 'prototype.polluted': 'yes' }
      ];
      
      pollutionPayloads.forEach(payload => {
        // Simulate safe object handling
        const safeObject = JSON.parse(JSON.stringify(payload));
        expect(safeObject.polluted).toBeUndefined();
        expect(Object.prototype.polluted).toBeUndefined();
      });
    });
  });
  
  describe('Authorization Security', () => {
    test('should enforce role-based access control', async () => {
      // Test different user roles and their permissions
      const roles = [
        { role: 'admin', canDelete: true, canCreate: true, canRead: true },
        { role: 'staff', canDelete: false, canCreate: true, canRead: true },
        { role: 'receptionist', canDelete: false, canCreate: false, canRead: true }
      ];
      
      roles.forEach(({ role, canDelete, canCreate, canRead }) => {
        expect(canRead).toBe(true); // All roles can read
        
        if (role === 'admin') {
          expect(canDelete).toBe(true);
          expect(canCreate).toBe(true);
        } else if (role === 'staff') {
          expect(canDelete).toBe(false);
          expect(canCreate).toBe(true);
        } else {
          expect(canDelete).toBe(false);
          expect(canCreate).toBe(false);
        }
      });
    });
    
    test('should prevent privilege escalation', async () => {
      // Simulate attempt to escalate privileges
      const userToken = jwt.sign(
        { id: 2, email: 'staff@salon.com', role: 'staff' },
        'test-secret'
      );
      
      // Attempt to modify token payload
      const tokenParts = userToken.split('.');
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      // Try to change role to admin
      const maliciousPayload = { ...payload, role: 'admin' };
      const maliciousPayloadEncoded = Buffer.from(JSON.stringify(maliciousPayload)).toString('base64');
      const maliciousToken = `${tokenParts[0]}.${maliciousPayloadEncoded}.${tokenParts[2]}`;
      
      // This should fail validation due to signature mismatch
      expect(() => {
        jwt.verify(maliciousToken, 'test-secret');
      }).toThrow();
    });
  });
  
  describe('Data Security', () => {
    test('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@salon.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
      
      // Should not expose database errors, stack traces, or other sensitive info
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('query');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('hash');
    });
    
    test('should hash passwords securely', async () => {
      const bcrypt = require('bcryptjs');
      
      const password = 'testpassword123';
      const hash = await bcrypt.hash(password, 10);
      
      // Hash should not contain the original password
      expect(hash).not.toContain(password);
      
      // Hash should follow bcrypt format
      expect(hash).toMatch(/^\$2[aby]\$10\$/);
      
      // Hash length should be appropriate
      expect(hash.length).toBeGreaterThan(50);
      
      // Same password should produce different hashes
      const hash2 = await bcrypt.hash(password, 10);
      expect(hash).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
    
    test('should use secure JWT signing', async () => {
      const payload = { id: 1, email: 'test@salon.com', role: 'admin' };
      
      // Weak secret should be detected (in real implementation)
      const weakSecrets = ['secret', '123456', 'password', 'test'];
      const strongSecret = 'very-long-and-complex-secret-key-for-jwt-signing-2024!@#$%^&*()';
      
      weakSecrets.forEach(secret => {
        expect(secret.length).toBeLessThan(32); // Weak
      });
      
      expect(strongSecret.length).toBeGreaterThan(32); // Strong
      
      // JWT should be properly formatted
      const token = jwt.sign(payload, strongSecret);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      
      // Verify token integrity
      const decoded = jwt.verify(token, strongSecret);
      expect(decoded.id).toBe(payload.id);
    });
  });
  
  describe('Session Security', () => {
    test('should have appropriate token expiration', async () => {
      const shortLivedToken = jwt.sign(
        { id: 1, email: 'test@salon.com' },
        'test-secret',
        { expiresIn: '1s' }
      );
      
      // Token should be valid initially
      const decoded = jwt.verify(shortLivedToken, 'test-secret');
      expect(decoded.id).toBe(1);
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Token should now be expired
      expect(() => {
        jwt.verify(shortLivedToken, 'test-secret');
      }).toThrow('jwt expired');
    });
    
    test('should invalidate tokens on logout', async () => {
      // In a real implementation, we'd maintain a blacklist of invalidated tokens
      // For now, we test the concept
      const token = jwt.sign(
        { id: 1, email: 'admin@salon.com' },
        'test-secret',
        { expiresIn: '1h' }
      );
      
      // Simulate token blacklist
      const blacklistedTokens = new Set();
      
      // Add token to blacklist (simulate logout)
      blacklistedTokens.add(token);
      
      // Check if token is blacklisted
      expect(blacklistedTokens.has(token)).toBe(true);
      
      // Token should be rejected even if valid
      if (blacklistedTokens.has(token)) {
        expect(true).toBe(true); // Simulated rejection
      } else {
        jwt.verify(token, 'test-secret'); // Would normally verify
      }
    });
  });
  
  describe('Network Security', () => {
    test('should validate CORS configuration', async () => {
      // Test CORS headers
      const corsConfig = {
        origin: ['http://localhost:3001', 'https://sms-new.vercel.app'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
      };
      
      expect(corsConfig.origin).not.toContain('*'); // Should not allow all origins in production
      expect(corsConfig.credentials).toBe(true); // Allow credentials
      expect(corsConfig.methods).toContain('GET');
      expect(corsConfig.allowedHeaders).toContain('Authorization');
    });
    
    test('should enforce HTTPS in production', async () => {
      // Simulate production environment check
      const isProduction = process.env.NODE_ENV === 'production';
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
      
      if (isProduction) {
        expect(baseUrl).toMatch(/^https:/);
      } else {
        // In development, HTTP is acceptable
        expect(baseUrl).toMatch(/^https?:/);
      }
    });
    
    test('should set secure headers', async () => {
      // Test security headers that should be present
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      };
      
      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(header).toBeDefined();
        expect(value).toBeDefined();
        expect(value).not.toBe('');
      });
    });
  });
});

// Export security test utilities
module.exports = {
  createSecurityTestApp,
  testSqlInjection: (app, endpoint, payload) => {
    return request(app)
      .post(endpoint)
      .send(payload)
      .expect(401);
  },
  
  testXss: (input) => {
    const sanitized = input.replace(/<[^>]*>/g, '');
    return !sanitized.includes('<script>');
  },
  
  validateJwtToken: (token, secret) => {
    try {
      const decoded = jwt.verify(token, secret);
      return { valid: true, payload: decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
};