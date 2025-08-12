/**
 * Jest Configuration for Integration Tests
 * SMS Salon Management System
 */

module.exports = {
  displayName: 'Integration Tests',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/integration/**/*.test.js',
    '**/integration/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '../coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  
  // Setup and teardown
  setupFilesAfterEnv: ['./setup/integration-setup.js'],
  globalTeardown: './teardown/integration-teardown.js',
  
  // Test timeout (longer for integration tests)
  testTimeout: 30000,
  
  // Sequential execution for integration tests
  maxWorkers: 1,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@api/(.*)$': '<rootDir>/../api/$1'
  },
  
  // Fail fast on first error
  bail: true,
  
  // Error handling
  errorOnDeprecated: true
};