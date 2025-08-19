// Light Plan Performance Tests
const request = require('supertest');
const app = require('../../src/app');
const { performance } = require('perf_hooks');

describe('Light Plan Performance Tests', () => {
  let authToken;
  let testCustomers = [];

  beforeAll(async () => {
    // Create test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'performance@test.com',
        password: 'PerfTest123!',
        name: 'Performance Test User',
        salonName: 'Performance Test Salon',
        plan: 'light'
      });
    
    authToken = response.body.token;

    // Create some test data
    for (let i = 0; i < 50; i++) {
      const customer = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Perf Customer ${i}`,
          email: `perf${i}@test.com`,
          phone: `090-1234-${String(i).padStart(4, '0')}`
        });
      
      if (customer.status === 201) {
        testCustomers.push(customer.body);
      }
    }
  });

  describe('API Response Time Tests', () => {
    it('should respond to customer list within 200ms', async () => {
      const start = performance.now();
      
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(200);
    });

    it('should create customer within 100ms', async () => {
      const start = performance.now();
      
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Speed Test Customer',
          email: 'speed@test.com',
          phone: '090-1234-9999'
        });
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect([201, 403]).toContain(response.status);
      if (response.status === 201) {
        expect(responseTime).toBeLessThan(100);
      }
    });

    it('should search customers within 150ms', async () => {
      const start = performance.now();
      
      const response = await request(app)
        .get('/api/customers/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'Perf' });
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(150);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 50 concurrent read requests', async () => {
      const start = performance.now();
      
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const responses = await Promise.all(requests);
      const end = performance.now();
      const totalTime = end - start;
      
      // All should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(50);
      
      // Should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle mixed read/write operations concurrently', async () => {
      const start = performance.now();
      
      const requests = [];
      
      // 30 read requests
      for (let i = 0; i < 30; i++) {
        requests.push(
          request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      // 10 write requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Concurrent Customer ${i}`,
              email: `concurrent${i}@test.com`,
              phone: `090-5555-${String(i).padStart(4, '0')}`
            })
        );
      }
      
      const responses = await Promise.all(requests);
      const end = performance.now();
      const totalTime = end - start;
      
      // Most should succeed
      const successCount = responses.filter(r => [200, 201, 403].includes(r.status)).length;
      expect(successCount).toBeGreaterThan(35);
      
      // Should complete within 3 seconds
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory on repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Query Performance', () => {
    it('should use indexes efficiently for customer search', async () => {
      // Search with different criteria
      const searches = [
        { q: 'Perf' },
        { email: 'perf1@test.com' },
        { phone: '090-1234-0001' }
      ];
      
      for (const search of searches) {
        const start = performance.now();
        
        const response = await request(app)
          .get('/api/customers/search')
          .set('Authorization', `Bearer ${authToken}`)
          .query(search);
        
        const end = performance.now();
        const queryTime = end - start;
        
        expect(response.status).toBe(200);
        expect(queryTime).toBeLessThan(100);
      }
    });

    it('should paginate results efficiently', async () => {
      const start = performance.now();
      
      // Get first page
      const page1 = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });
      
      // Get second page
      const page2 = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 2, limit: 20 });
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Plan Limit Check Performance', () => {
    it('should check plan limits quickly', async () => {
      const start = performance.now();
      
      const response = await request(app)
        .get('/api/plan/usage')
        .set('Authorization', `Bearer ${authToken}`);
      
      const end = performance.now();
      const checkTime = end - start;
      
      expect(response.status).toBe(200);
      expect(checkTime).toBeLessThan(50);
    });

    it('should not slow down requests with plan limit checks', async () => {
      // Time request without explicit limit check
      const startDirect = performance.now();
      await request(app)
        .get('/api/customers/1')
        .set('Authorization', `Bearer ${authToken}`);
      const directTime = performance.now() - startDirect;
      
      // Time request that includes limit check
      const startWithCheck = performance.now();
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Limit Check Test',
          email: 'limitcheck@test.com',
          phone: '090-1234-8888'
        });
      const withCheckTime = performance.now() - startWithCheck;
      
      // Limit check should add minimal overhead (less than 20ms)
      const overhead = withCheckTime - directTime;
      expect(overhead).toBeLessThan(20);
    });
  });

  describe('Caching Performance', () => {
    it('should cache repeated plan usage checks', async () => {
      const times = [];
      
      // Make 5 requests to same endpoint
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        
        await request(app)
          .get('/api/plan/usage')
          .set('Authorization', `Bearer ${authToken}`);
        
        const end = performance.now();
        times.push(end - start);
      }
      
      // Later requests should be faster due to caching
      const firstRequestTime = times[0];
      const avgCachedTime = times.slice(1).reduce((a, b) => a + b, 0) / 4;
      
      expect(avgCachedTime).toBeLessThan(firstRequestTime * 0.5);
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const testDuration = 10000; // 10 seconds
      const startTime = Date.now();
      const responseTimes = [];
      let requestCount = 0;
      let errorCount = 0;
      
      while (Date.now() - startTime < testDuration) {
        const reqStart = performance.now();
        
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${authToken}`);
        
        const reqEnd = performance.now();
        responseTimes.push(reqEnd - reqStart);
        requestCount++;
        
        if (response.status !== 200) {
          errorCount++;
        }
      }
      
      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const errorRate = (errorCount / requestCount) * 100;
      
      // Performance criteria
      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1 second
      expect(errorRate).toBeLessThan(1); // Less than 1% errors
    });
  });
});