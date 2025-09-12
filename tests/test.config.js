/**
 * SMS Testing Configuration
 * Comprehensive test configuration for the salon management system
 */

module.exports = {
  // Test Environment Configuration
  environment: {
    development: {
      apiUrl: 'http://localhost:5001',
      frontendUrl: 'http://localhost:3001',
      timeout: 10000,
      retries: 3
    },
    staging: {
      apiUrl: 'https://staging-sms.vercel.app',
      frontendUrl: 'https://staging-sms.vercel.app',
      timeout: 15000,
      retries: 2
    },
    production: {
      apiUrl: 'https://sms-new.vercel.app',
      frontendUrl: 'https://sms-new.vercel.app',
      timeout: 20000,
      retries: 1
    }
  },

  // Test Categories and Coverage
  testCategories: {
    unit: {
      enabled: true,
      coverage: 90,
      patterns: ['**/*.test.js', '**/*.spec.js'],
      excludePatterns: ['node_modules/**', 'coverage/**']
    },
    integration: {
      enabled: true,
      coverage: 85,
      patterns: ['**/integration/*.test.js'],
      setup: 'integration-setup.js'
    },
    e2e: {
      enabled: true,
      coverage: 70,
      patterns: ['**/e2e/*.test.js'],
      browser: 'chromium',
      headless: true
    },
    performance: {
      enabled: true,
      thresholds: {
        responseTime: 1000,
        throughput: 100,
        errorRate: 0.1
      }
    },
    security: {
      enabled: true,
      scanners: ['jwt-audit', 'dependency-check', 'cors-validation'],
      compliance: ['OWASP-Top-10']
    }
  },

  // Test Data Management
  testData: {
    users: {
      admin: {
        email: 'admin@salon.com',
        password: 'admin123',
        role: 'admin'
      },
      staff: {
        email: 'staff@salon.com',
        password: 'staff123',
        role: 'staff'
      },
      invalid: {
        email: 'invalid@test.com',
        password: 'wrongpass'
      }
    },
    customers: {
      valid: {
        name: 'テスト顧客',
        phone: '090-1234-5678',
        email: 'test@customer.com'
      },
      invalid: {
        name: '',
        phone: 'invalid-phone',
        email: 'invalid-email'
      }
    },
    appointments: {
      valid: {
        date: '2024-12-31',
        time: '10:00',
        service: 'テストサービス'
      },
      conflicting: {
        date: '2024-12-31',
        time: '10:00',
        service: '重複予約テスト'
      }
    }
  },

  // Reporting Configuration
  reporting: {
    formats: ['html', 'json', 'junit'],
    outputDir: './test-results',
    screenshots: true,
    videos: false,
    coverage: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  },

  // CI/CD Integration
  cicd: {
    parallel: 4,
    failFast: false,
    artifactRetention: 30,
    notifications: {
      slack: process.env.SLACK_WEBHOOK,
      email: process.env.TEST_NOTIFICATIONS_EMAIL
    }
  }
};