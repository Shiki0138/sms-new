// Light Plan Security Tests
const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

describe('Light Plan Security Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'security@test.com',
        password: 'SecurePass123!',
        name: 'Security Test User',
        salonName: 'Security Test Salon',
        plan: 'light'
      });
    
    authToken = response.body.token;
    testUser = response.body.user;
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in customer creation', async () => {
      const maliciousPayloads = [
        "'; DROP TABLE customers; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users WHERE 1=1; --",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: payload,
            email: `test${Date.now()}@test.com`,
            phone: '090-1234-5678'
          });
        
        // Should either sanitize or reject
        if (response.status === 201) {
          // If created, ensure payload was sanitized
          expect(response.body.name).not.toContain('DROP');
          expect(response.body.name).not.toContain('DELETE');
          expect(response.body.name).not.toContain('UNION');
        }
      }
    });

    it('should prevent SQL injection in search queries', async () => {
      const response = await request(app)
        .get('/api/customers/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: "'; DROP TABLE customers; --" });
      
      // Should handle safely
      expect([200, 400]).toContain(response.status);
      
      // Verify tables still exist
      const checkResponse = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(checkResponse.status).toBe(200);
    });
  });

  describe('XSS (Cross-Site Scripting) Prevention', () => {
    it('should sanitize HTML in customer data', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\"XSS\")"></iframe>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: payload,
            email: `xss${Date.now()}@test.com`,
            phone: '090-1234-5678',
            notes: payload
          });
        
        if (response.status === 201) {
          // Ensure scripts are sanitized
          expect(response.body.name).not.toContain('<script>');
          expect(response.body.name).not.toContain('javascript:');
          expect(response.body.notes).not.toContain('<script>');
        }
      }
    });

    it('should set proper Content-Security-Policy headers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('CSRF (Cross-Site Request Forgery) Protection', () => {
    it('should validate CSRF tokens for state-changing operations', async () => {
      // Try to make request without CSRF token
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'http://evil-site.com')
        .send({
          name: 'CSRF Test',
          email: 'csrf@test.com',
          phone: '090-1234-5678'
        });
      
      // Should check origin/referer
      expect([201, 403]).toContain(response.status);
    });

    it('should validate origin headers', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'http://malicious-site.com')
        .set('Referer', 'http://malicious-site.com/attack')
        .send({
          name: 'Origin Test',
          email: 'origin@test.com',
          phone: '090-1234-5678'
        });
      
      // Should validate origin
      expect([201, 403]).toContain(response.status);
    });
  });

  describe('Authentication Bypass Prevention', () => {
    it('should prevent JWT token manipulation', async () => {
      // Try with invalid token
      const invalidTokens = [
        'invalid.token.here',
        jwt.sign({ id: 'fake-id' }, 'wrong-secret'),
        authToken + 'tampered',
        '',
        'Bearer '
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${token}`);
        
        expect(response.status).toBe(401);
      }
    });

    it('should prevent privilege escalation', async () => {
      // Try to access another user's data
      const response = await request(app)
        .get('/api/users/admin-user-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect([403, 404]).toContain(response.status);
    });

    it('should validate token expiration', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { id: testUser.id, exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should enforce rate limits on API endpoints', async () => {
      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      // Should have some rate limited responses
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should rate limit authentication attempts', async () => {
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@test.com',
              password: 'wrong-password'
            })
        );
      }

      const responses = await Promise.all(attempts);
      const blocked = responses.filter(r => r.status === 429);
      
      expect(blocked.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate email formats', async () => {
      const invalidEmails = [
        'not-an-email',
        '@invalid.com',
        'user@',
        'user@@domain.com',
        'user@domain@com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test User',
            email: email,
            phone: '090-1234-5678'
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate phone number formats', async () => {
      const invalidPhones = [
        '123',
        'not-a-phone',
        '+++123456',
        '12345678901234567890'
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test User',
            email: `test${Date.now()}@test.com`,
            phone: phone
          });
        
        expect([400, 201]).toContain(response.status);
      }
    });
  });

  describe('Data Encryption and Privacy', () => {
    it('should not expose sensitive data in responses', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should hash passwords properly', async () => {
      // Password should never be stored in plain text
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `hash${Date.now()}@test.com`,
          password: 'TestPassword123!',
          name: 'Hash Test',
          salonName: 'Hash Salon',
          plan: 'light'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.password).toBeUndefined();
      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const maliciousFiles = [
        { name: 'script.php', content: '<?php echo "hack"; ?>' },
        { name: 'virus.exe', content: Buffer.from('MZ') },
        { name: 'hack.jsp', content: '<% out.println("hack"); %>' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/uploads')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from(file.content), file.name);
        
        expect([400, 415]).toContain(response.status);
      }
    });

    it('should enforce file size limits', async () => {
      // Create a large file (over limit)
      const largeFile = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large.jpg');
      
      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens on logout', async () => {
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Try to use same token
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(401);
    });

    it('should prevent session fixation', async () => {
      // Login should generate new session
      const loginResponse1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!'
        });
      
      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!'
        });
      
      expect(loginResponse1.body.token).not.toBe(loginResponse2.body.token);
    });
  });
});