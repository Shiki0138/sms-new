# SMS Testing Suite

Comprehensive testing framework for the SMS (Salon Management System) built with Jest, Playwright, K6, and custom security testing utilities.

## 📋 Overview

This testing suite provides complete coverage for the SMS system including:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoint and service integration testing  
- **E2E Tests**: Full user workflow testing with Playwright
- **Performance Tests**: Load testing with K6
- **Security Tests**: Security vulnerability and compliance testing

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 14.0.0
npm >= 6.0.0
```

### Installation

```bash
cd tests/
npm install
```

### Setup Test Environment

```bash
# Setup test environment
npm run setup:test-env

# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance
```

## 📁 Directory Structure

```
tests/
├── unit/                    # Unit tests
│   ├── auth.test.js        # Authentication logic tests
│   └── validators.test.js  # Input validation tests
├── integration/            # Integration tests
│   ├── api-auth.test.js   # Authentication API tests
│   └── api-customers.test.js # Customer API tests
├── e2e/                   # End-to-end tests
│   ├── login-flow.spec.js # Login workflow tests
│   └── customer-management.spec.js # Customer management tests
├── performance/           # Performance tests
│   └── load-test.js      # K6 load testing
├── security/             # Security tests
│   └── security-tests.js # Security vulnerability tests
├── setup/               # Test setup utilities
│   └── test-environment.js # Environment setup
├── api-tests/          # API collection tests
├── test-data/         # Test data and fixtures
├── test-results/      # Test output and reports
└── utils/            # Test utilities
```

## 🧪 Test Categories

### Unit Tests

Tests individual functions and components in isolation:

- **Authentication**: Password hashing, JWT token generation/validation
- **Validation**: Input validation, data sanitization
- **Utilities**: Helper functions, formatters

```bash
npm run test:unit
```

**Coverage Target**: 90%

### Integration Tests

Tests API endpoints and service integration:

- **Authentication API**: Login, token validation, middleware
- **Customer API**: CRUD operations, search, pagination
- **Appointment API**: Booking, scheduling, conflicts
- **Staff API**: Staff management, availability

```bash
npm run test:integration
```

**Coverage Target**: 85%

### E2E Tests

Tests complete user workflows:

- **Login Flow**: Authentication, session management, logout
- **Customer Management**: Create, edit, delete, search customers
- **Appointment Booking**: Schedule, modify, cancel appointments
- **Dashboard**: Statistics, real-time updates

```bash
npm run test:e2e
```

**Browser Support**: Chrome, Firefox, Safari, Mobile

### Performance Tests

Load and stress testing with K6:

- **Load Testing**: Normal user load simulation
- **Stress Testing**: High load scenarios
- **Spike Testing**: Sudden traffic spikes
- **Endurance Testing**: Extended load periods

```bash
npm run test:performance
```

**Performance Targets**:
- Response time < 1000ms (95th percentile)
- Error rate < 0.1%
- Throughput > 100 RPS

### Security Tests

Security vulnerability and compliance testing:

- **Authentication Security**: SQL injection, brute force, token security
- **Input Validation**: XSS, CSRF, injection attacks
- **Authorization**: Role-based access, privilege escalation
- **Data Security**: Encryption, sensitive data exposure

```bash
npm run test:security
```

**Compliance**: OWASP Top 10

## ⚙️ Configuration

### Environment Variables

```bash
# Test environment
NODE_ENV=test

# API endpoints
BASE_URL=http://localhost:5001
FRONTEND_URL=http://localhost:3001

# Test credentials
TEST_ADMIN_EMAIL=admin@salon.com
TEST_ADMIN_PASSWORD=admin123

# Security
JWT_SECRET=test-secret-key

# Notifications (optional)
SLACK_WEBHOOK=https://hooks.slack.com/...
TEST_NOTIFICATIONS_EMAIL=test@example.com
```

### Test Configuration

Main configuration in `test.config.js`:

```javascript
{
  environment: {
    development: { /* dev settings */ },
    staging: { /* staging settings */ },
    production: { /* prod settings */ }
  },
  testCategories: {
    unit: { coverage: 90 },
    integration: { coverage: 85 },
    e2e: { coverage: 70 },
    performance: { thresholds: {...} },
    security: { compliance: ['OWASP-Top-10'] }
  }
}
```

## 📊 Reporting

### Test Reports

- **HTML Reports**: `./test-results/reports/`
- **Coverage Reports**: `./test-results/coverage/`
- **Screenshots**: `./test-results/screenshots/`
- **Performance Reports**: `./test-results/performance/`

### Coverage Thresholds

| Test Type | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| Unit      | 90%        | 85%      | 90%       | 90%   |
| Integration | 85%      | 75%      | 80%       | 85%   |

### Viewing Reports

```bash
# Open HTML coverage report
open ./test-results/coverage/lcov-report/index.html

# Open E2E test report  
open ./test-results/e2e-report/index.html
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd tests && npm install
      - run: cd tests && npm test
      - uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/test-results/
```

### Test Automation

```bash
# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run smoke tests only
npm run test:smoke

# Run regression tests
npm run test:regression
```

## 🛠️ Development

### Adding New Tests

1. **Unit Test Example**:

```javascript
// tests/unit/new-feature.test.js
describe('New Feature', () => {
  test('should work correctly', () => {
    expect(newFeature()).toBe(expectedResult);
  });
});
```

2. **Integration Test Example**:

```javascript
// tests/integration/new-api.test.js
describe('New API Endpoint', () => {
  test('should return correct response', async () => {
    const response = await request(app)
      .get('/api/new-endpoint')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
});
```

3. **E2E Test Example**:

```javascript
// tests/e2e/new-workflow.spec.js
test('should complete new workflow', async ({ page }) => {
  await page.goto('/new-page');
  await page.click('.new-button');
  await expect(page).toHaveURL('/success');
});
```

### Test Data Management

Test data is managed through:

- **Fixtures**: Static test data in `test-data/fixtures/`
- **Factories**: Dynamic test data generation
- **Mocks**: API response mocking in `test-data/mocks/`

### Debugging Tests

```bash
# Debug unit tests
npm run test:unit -- --verbose

# Debug E2E tests in headed mode
npm run test:e2e -- --headed

# Debug specific test file
npm run test:unit -- auth.test.js
```

## 📈 Performance Monitoring

### Metrics Collection

- Response times (p50, p95, p99)
- Error rates and types
- Throughput (requests/second)
- Resource utilization

### Performance Budgets

- Page load time < 2s
- API response time < 500ms
- Time to interactive < 3s
- First contentful paint < 1.5s

## 🔒 Security Testing

### Vulnerability Scanning

- OWASP Top 10 compliance
- Dependency vulnerability scanning
- Authentication security testing
- Input validation testing

### Security Checklist

- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secure authentication
- [ ] Authorization controls
- [ ] Data encryption
- [ ] Secure headers
- [ ] Input sanitization

## 🚨 Troubleshooting

### Common Issues

1. **Tests failing locally**:
   ```bash
   npm run setup:test-env
   npm run clean:coverage
   npm test
   ```

2. **E2E tests timing out**:
   ```bash
   # Increase timeout in playwright.config.js
   timeout: 60000
   ```

3. **Performance tests failing**:
   ```bash
   # Check if local server is running
   npm run dev
   # Run performance tests
   npm run test:performance
   ```

### Getting Help

- Check test logs in `./test-results/`
- Review configuration in `test.config.js`
- Check environment variables
- Verify test data setup

## 📝 Best Practices

### Writing Tests

1. **Follow AAA pattern**: Arrange, Act, Assert
2. **Use descriptive names**: Tests should be self-documenting
3. **Keep tests isolated**: Each test should be independent
4. **Mock external dependencies**: Use mocks for API calls
5. **Test edge cases**: Include error scenarios

### Test Maintenance

1. **Regular updates**: Keep tests updated with code changes
2. **Remove obsolete tests**: Clean up unused test code
3. **Monitor flakiness**: Fix flaky tests immediately
4. **Review coverage**: Ensure adequate test coverage

### Performance

1. **Parallel execution**: Run tests in parallel when possible
2. **Smart test selection**: Run only affected tests in CI
3. **Test data optimization**: Use efficient test data setup
4. **Resource cleanup**: Clean up test resources properly

## 📄 License

This testing suite is part of the SMS project and follows the same licensing terms.

## 🤝 Contributing

1. Follow existing test patterns
2. Maintain test coverage thresholds
3. Update documentation for new test types
4. Ensure all tests pass before submitting

---

For more information, see the main project documentation.