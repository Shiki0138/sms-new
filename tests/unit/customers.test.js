const request = require('supertest');
const app = require('../../src/api/server');

describe('Customer Management', () => {
  let authToken;
  let testCustomerId;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@salon.com',
        password: 'Admin123!'
      });
    
    authToken = loginResponse.body.accessToken;
  });

  describe('POST /api/customers', () => {
    test('should create customer with valid data', async () => {
      const customerData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+1555123456',
        dateOfBirth: '1990-01-01',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        preferences: {
          communicationMethod: 'email',
          allergies: ['peanuts']
        },
        notes: 'Prefers natural products'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('customer');
      expect(response.body.customer.email).toBe(customerData.email);
      expect(response.body.customer.firstName).toBe(customerData.firstName);
      
      testCustomerId = response.body.customer.id;
    });

    test('should reject duplicate email', async () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'jane.doe@example.com', // Same email as above
        phone: '+1555987654'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('already exists');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'incomplete@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/customers', () => {
    test('should return customers list', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customers');
      expect(Array.isArray(response.body.customers)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    test('should filter customers by search', async () => {
      const response = await request(app)
        .get('/api/customers?search=jane')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customers.length).toBeGreaterThan(0);
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/customers?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customers.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/customers/:id', () => {
    test('should return specific customer', async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customer');
      expect(response.body.customer.id).toBe(testCustomerId);
    });

    test('should return 404 for non-existent customer', async () => {
      const fakeId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const response = await request(app)
        .get(`/api/customers/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('CUSTOMER_NOT_FOUND');
    });

    test('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/customers/:id', () => {
    test('should update customer successfully', async () => {
      const updateData = {
        firstName: 'Jane Updated',
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customer');
      expect(response.body.customer.firstName).toBe(updateData.firstName);
      expect(response.body.customer.notes).toBe(updateData.notes);
    });

    test('should prevent duplicate email on update', async () => {
      // Create another customer first
      const anotherCustomer = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Another',
          lastName: 'Customer',
          email: 'another@example.com',
          phone: '+1555000000'
        });

      // Try to update first customer with second customer's email
      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'another@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/customers/stats', () => {
    test('should return customer statistics', async () => {
      const response = await request(app)
        .get('/api/customers/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('total');
      expect(response.body.stats).toHaveProperty('active');
      expect(response.body.stats).toHaveProperty('topSpenders');
    });
  });

  describe('GET /api/customers/search/:query', () => {
    test('should search customers by query', async () => {
      const response = await request(app)
        .get('/api/customers/search/jane')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customers');
      expect(response.body.query).toBe('jane');
    });

    test('should limit search results', async () => {
      const response = await request(app)
        .get('/api/customers/search/customer?limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customers.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/customers/:id/visit', () => {
    test('should update customer visit statistics', async () => {
      const response = await request(app)
        .post(`/api/customers/${testCustomerId}/visit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amountSpent: 85.50 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customer');
      expect(response.body.customer.totalVisits).toBeGreaterThan(0);
      expect(response.body.customer.totalSpent).toBe(85.50);
    });

    test('should handle visit without amount', async () => {
      const response = await request(app)
        .post(`/api/customers/${testCustomerId}/visit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.customer.totalVisits).toBe(2); // Second visit
    });
  });

  describe('DELETE /api/customers/:id', () => {
    test('should require admin role', async () => {
      // Login as staff
      const staffLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'staff@salon.com',
          password: 'Staff123!'
        });

      const response = await request(app)
        .delete(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${staffLogin.body.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should soft delete customer as admin', async () => {
      const response = await request(app)
        .delete(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');

      // Verify customer is marked as inactive
      const getResponse = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.customer.isActive).toBe(false);
    });
  });

  describe('Authorization', () => {
    test('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/customers');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('MISSING_TOKEN');
    });

    test('should allow staff to access customers', async () => {
      const staffLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'staff@salon.com',
          password: 'Staff123!'
        });

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${staffLogin.body.accessToken}`);

      expect(response.status).toBe(200);
    });
  });
});