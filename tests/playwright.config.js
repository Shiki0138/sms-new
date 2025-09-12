/**
 * Playwright Configuration for E2E Tests
 * SMS Salon Management System
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Parallel execution
  fullyParallel: true,
  
  // Fail fast
  forbidOnly: !!process.env.CI,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Number of workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: '../test-results/e2e-report' }],
    ['json', { outputFile: '../test-results/e2e-results.json' }],
    ['junit', { outputFile: '../test-results/e2e-results.xml' }],
    ['list']
  ],
  
  // Global test configuration
  use: {
    // Base URL
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3001',
    
    // Browser settings
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    
    // Timeout settings
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    
    // Ignore HTTPS errors for testing
    ignoreHTTPSErrors: true
  },
  
  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  
  // Web server configuration
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3001,
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  },
  
  // Test output directory
  outputDir: '../test-results/e2e-artifacts',
  
  // Global setup and teardown
  globalSetup: './setup/e2e-global-setup.js',
  globalTeardown: './teardown/e2e-global-teardown.js',
  
  // Test timeout
  timeout: 60000,
  
  // Expect timeout
  expect: {
    timeout: 10000
  }
});