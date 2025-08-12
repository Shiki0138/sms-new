/**
 * Performance Load Tests
 * SMS Salon Management System
 * 
 * Run with: k6 run performance/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 },   // Stay at 10 users for 5 minutes
    { duration: '2m', target: 20 },   // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 20 },   // Stay at 20 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete within 1s
    http_req_failed: ['rate<0.1'],     // Error rate must be less than 10%
    errors: ['rate<0.1'],              // Custom error rate
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';
const ADMIN_EMAIL = 'admin@salon.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';

export function setup() {
  // Login to get auth token
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (loginResponse.status === 200) {
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.token;
    console.log('✅ Authentication successful for load testing');
    return { token: authToken };
  } else {
    console.error('❌ Authentication failed for load testing');
    return { token: null };
  }
}

export default function(data) {
  if (!data.token) {
    console.error('No auth token available');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json'
  };
  
  // Test scenarios
  testDashboardEndpoint(headers);
  testCustomersList(headers);
  testCustomerCreation(headers);
  testAppointmentsList(headers);
  testStaffList(headers);
  
  sleep(1); // Wait 1 second between iterations
}

function testDashboardEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/dashboard/stats`, { headers });
  
  const success = check(response, {
    'Dashboard status is 200': (r) => r.status === 200,
    'Dashboard response time < 500ms': (r) => r.timings.duration < 500,
    'Dashboard has required fields': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.totalCustomers !== undefined && 
               data.todayAppointments !== undefined &&
               data.monthlyRevenue !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testCustomersList(headers) {
  const response = http.get(`${BASE_URL}/api/customers`, { headers });
  
  const success = check(response, {
    'Customers list status is 200': (r) => r.status === 200,
    'Customers response time < 800ms': (r) => r.timings.duration < 800,
    'Customers response has pagination': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.customers !== undefined && 
               data.total !== undefined &&
               data.page !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Test with search parameter
  const searchResponse = http.get(`${BASE_URL}/api/customers?search=山田`, { headers });
  check(searchResponse, {
    'Customers search status is 200': (r) => r.status === 200,
    'Customers search response time < 800ms': (r) => r.timings.duration < 800,
  });
}

function testCustomerCreation(headers) {
  const randomId = Math.floor(Math.random() * 10000);
  const newCustomer = {
    name: `負荷テスト顧客${randomId}`,
    phone: `090-${String(1000 + randomId % 9000).padStart(4, '0')}-${String(1000 + (randomId * 2) % 9000).padStart(4, '0')}`,
    email: `loadtest${randomId}@example.com`,
    notes: '負荷テストで作成'
  };
  
  const response = http.post(`${BASE_URL}/api/customers`, JSON.stringify(newCustomer), { headers });
  
  const success = check(response, {
    'Customer creation status is 201': (r) => r.status === 201,
    'Customer creation response time < 1000ms': (r) => r.timings.duration < 1000,
    'Created customer has ID': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Cleanup: Delete the created customer
  if (response.status === 201) {
    try {
      const customerData = JSON.parse(response.body);
      http.del(`${BASE_URL}/api/customers/${customerData.id}`, null, { headers });
    } catch (e) {
      console.error('Failed to cleanup test customer:', e);
    }
  }
}

function testAppointmentsList(headers) {
  const response = http.get(`${BASE_URL}/api/appointments`, { headers });
  
  const success = check(response, {
    'Appointments list status is 200': (r) => r.status === 200,
    'Appointments response time < 800ms': (r) => r.timings.duration < 800,
    'Appointments response is array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.appointments) && data.total !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Test with date filter
  const today = new Date().toISOString().split('T')[0];
  const dateFilterResponse = http.get(`${BASE_URL}/api/appointments?date=${today}`, { headers });
  check(dateFilterResponse, {
    'Appointments date filter status is 200': (r) => r.status === 200,
    'Appointments date filter response time < 800ms': (r) => r.timings.duration < 800,
  });
}

function testStaffList(headers) {
  const response = http.get(`${BASE_URL}/api/staff`, { headers });
  
  const success = check(response, {
    'Staff list status is 200': (r) => r.status === 200,
    'Staff response time < 500ms': (r) => r.timings.duration < 500,
    'Staff response has array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.staff);
      } catch (e) {
        return false;
      }
    }
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

// Stress test scenario
export function stressTest() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Simulate high load scenario
  const requests = [
    http.get(`${BASE_URL}/api/dashboard/stats`, { headers }),
    http.get(`${BASE_URL}/api/customers`, { headers }),
    http.get(`${BASE_URL}/api/appointments`, { headers }),
    http.get(`${BASE_URL}/api/staff`, { headers })
  ];
  
  const responses = http.batch(requests);
  
  responses.forEach((response, index) => {
    check(response, {
      [`Stress test request ${index} successful`]: (r) => r.status === 200,
      [`Stress test request ${index} fast enough`]: (r) => r.timings.duration < 2000,
    });
  });
}

// Spike test scenario
export function spikeTest() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Create multiple customers simultaneously
  const customers = [];
  for (let i = 0; i < 10; i++) {
    const randomId = Math.floor(Math.random() * 10000);
    customers.push({
      name: `スパイクテスト顧客${randomId}`,
      phone: `090-${String(2000 + randomId % 8000).padStart(4, '0')}-${String(2000 + (randomId * 3) % 8000).padStart(4, '0')}`,
      email: `spike${randomId}@example.com`,
      notes: 'スパイクテストで作成'
    });
  }
  
  const requests = customers.map(customer => 
    http.post(`${BASE_URL}/api/customers`, JSON.stringify(customer), { headers })
  );
  
  const responses = http.batch(requests);
  
  let successCount = 0;
  const customerIds = [];
  
  responses.forEach((response, index) => {
    const success = check(response, {
      [`Spike test customer ${index} created`]: (r) => r.status === 201,
      [`Spike test customer ${index} fast enough`]: (r) => r.timings.duration < 3000,
    });
    
    if (success && response.status === 201) {
      successCount++;
      try {
        const customerData = JSON.parse(response.body);
        customerIds.push(customerData.id);
      } catch (e) {
        console.error('Failed to parse customer response:', e);
      }
    }
  });
  
  console.log(`Spike test: ${successCount}/${customers.length} customers created successfully`);
  
  // Cleanup created customers
  customerIds.forEach(id => {
    http.del(`${BASE_URL}/api/customers/${id}`, null, { headers });
  });
}

export function teardown(data) {
  console.log('🧹 Load test completed, cleaning up...');
  // Additional cleanup if needed
}

// Export different test scenarios
export { stressTest, spikeTest };