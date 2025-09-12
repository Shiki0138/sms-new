/**
 * Jest Configuration for Unit Tests
 * SMS Salon Management System
 */

module.exports = {
  displayName: 'Unit Tests',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/unit/**/*.test.js',
    '**/unit/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '../coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '../api/**/*.js',
    '../src/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/test-results/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Setup and teardown
  setupFilesAfterEnv: ['./setup/unit-setup.js'],
  
  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@api/(.*)$': '<rootDir>/../api/$1'
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Error handling
  errorOnDeprecated: true,
  
  // Parallel execution
  maxWorkers: '50%'
};