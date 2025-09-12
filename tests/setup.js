/**
 * Jest test setup file
 * Runs before each test file
 */

const { initializeDefaultUsers } = require('../src/models/userModel');
const { initializeSampleCustomers } = require('../src/models/customerModel');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Global test timeout
jest.setTimeout(10000);

// Initialize test data before all tests
beforeAll(async () => {
  try {
    // Initialize default users (admin, staff)
    await initializeDefaultUsers();
    
    // Initialize sample customers
    await initializeSampleCustomers();
    
    console.log('✅ Test data initialized');
  } catch (error) {
    console.error('❌ Error initializing test data:', error);
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Console log capture for testing
global.console = {
  ...console,
  // Uncomment to hide console.log during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error,
  debug: jest.fn(),
};

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    };
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
      pass,
    };
  },

  toBeValidPhoneNumber(received) {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    const pass = phoneRegex.test(received);
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid phone number`
          : `expected ${received} to be a valid phone number`,
      pass,
    };
  },

  toHaveTimestamp(received) {
    const pass = received && typeof received === 'string' && !isNaN(Date.parse(received));
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid timestamp`
          : `expected ${received} to be a valid timestamp`,
      pass,
    };
  }
});

// Test utilities
global.testUtils = {
  /**
   * Create test user data
   * @param {Object} overrides - Override default values
   * @returns {Object} User data
   */
  createTestUser(overrides = {}) {
    return {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      role: 'customer',
      ...overrides
    };
  },

  /**
   * Create test customer data
   * @param {Object} overrides - Override default values
   * @returns {Object} Customer data
   */
  createTestCustomer(overrides = {}) {
    return {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'customer@test.com',
      phone: '+1555123456',
      dateOfBirth: '1990-01-01',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345'
      },
      preferences: {
        communicationMethod: 'email'
      },
      ...overrides
    };
  },

  /**
   * Create test appointment data
   * @param {Object} overrides - Override default values
   * @returns {Object} Appointment data
   */
  createTestAppointment(overrides = {}) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    return {
      customerId: null, // Should be set in tests
      staffId: null, // Should be set in tests
      serviceIds: [], // Should be set in tests
      startTime: tomorrow.toISOString(),
      notes: 'Test appointment',
      ...overrides
    };
  },

  /**
   * Wait for a specified number of milliseconds
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after the wait
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate random string
   * @param {number} length - String length
   * @returns {string} Random string
   */
  randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate random email
   * @param {string} domain - Email domain
   * @returns {string} Random email
   */
  randomEmail(domain = 'test.com') {
    return `${this.randomString(8)}@${domain}`;
  },

  /**
   * Generate random phone number
   * @returns {string} Random phone number
   */
  randomPhone() {
    const area = Math.floor(Math.random() * 800) + 200;
    const exchange = Math.floor(Math.random() * 800) + 200;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `+1${area}${exchange}${number}`;
  }
};