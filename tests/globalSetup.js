/**
 * Global test setup - runs once before all tests
 */

module.exports = async () => {
  console.log('🚀 Starting SMS Test Suite');
  console.log('📋 Environment: test');
  console.log('⏰ Started at:', new Date().toISOString());
  
  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.BCRYPT_SALT_ROUNDS = '4'; // Faster for tests
  
  // Disable console.log in tests (uncomment if needed)
  // console.log = () => {};
  // console.info = () => {};
  
  console.log('✅ Global test setup completed');
};