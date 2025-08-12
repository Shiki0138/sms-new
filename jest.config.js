module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test files pattern
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage collection
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/api/server.js', // Exclude server entry point
    '!**/node_modules/**',
    '!**/coverage/**'
  ],

  // Coverage thresholds (disabled for initial implementation)
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   }
  // },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Transform files
  transform: {},

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  // Error handling
  errorOnDeprecated: true,

  // Performance monitoring (disabled for initial setup)
  // detectLeaks: true,
  forceExit: true,

  // Reporter options
  reporters: [
    'default'
  ]
};