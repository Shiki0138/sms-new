# SMS Service Test Suite

This comprehensive test suite provides full coverage for the SMS service, including unit tests, integration tests, end-to-end tests, and performance tests.

## 📁 Test Structure

```
tests/
├── setup.ts                    # Global test setup and configuration
├── mocks/                      # Mock providers and utilities
│   └── sms-providers.mock.ts   # SMS provider mocks (Twilio, AWS, MessageBird)
├── fixtures/                   # Test data and sample requests
│   └── sample-requests.json    # Pre-defined test requests
├── helpers/                    # Test utilities and helpers
│   ├── test-data.ts           # Test data generators
│   └── test-server.ts         # Test server management
├── unit/                      # Unit tests
│   ├── sms-service.test.ts    # Core SMS service tests
│   ├── providers/             # Provider-specific tests
│   │   └── twilio.provider.test.ts
│   └── middleware/            # Middleware tests
│       └── auth.test.ts       # Authentication tests
├── integration/               # Integration tests
│   └── sms-providers.integration.test.ts
├── e2e/                      # End-to-end API tests
│   └── api.e2e.test.ts       # Full API workflow tests
└── performance/              # Performance and load tests
    └── bulk-sms.performance.test.ts
```

## 🚀 Running Tests

### All Tests
```bash
npm test
```

### Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance

# With coverage report
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## 🎯 Test Coverage

The test suite maintains high coverage standards:

- **Branches**: 80%+
- **Functions**: 80%+  
- **Lines**: 80%+
- **Statements**: 80%+

### Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`
- **Text**: Console output during test runs

## 🧪 Test Categories

### Unit Tests (`tests/unit/`)

Test individual components in isolation:

- **SMS Service Core**: Message sending, provider management, failover
- **Provider Implementations**: Twilio, AWS SNS, MessageBird specific logic
- **Authentication**: JWT validation, API key auth, rate limiting
- **Middleware**: Request validation, error handling

### Integration Tests (`tests/integration/`)

Test component interactions:

- **Provider Integration**: Real API calls (mocked)
- **Multi-Provider Failover**: Seamless provider switching
- **Bulk Operations**: Large-scale message processing
- **Status Tracking**: Message status updates and webhooks

### End-to-End Tests (`tests/e2e/`)

Test complete user workflows:

- **API Endpoints**: Full HTTP request/response cycles
- **Authentication Flow**: Token validation and permissions
- **Rate Limiting**: Request throttling and headers
- **Error Handling**: Comprehensive error scenarios
- **Webhook Processing**: Status update handling

### Performance Tests (`tests/performance/`)

Test system performance and scalability:

- **Bulk SMS Performance**: High-volume message processing
- **Rate Limiting**: Throttling effectiveness
- **Memory Usage**: Resource management
- **Concurrent Operations**: Multi-threaded performance

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)

- **Projects**: Separate configurations for each test type
- **Coverage**: Comprehensive coverage collection and thresholds
- **Timeout**: Appropriate timeouts for different test types
- **Setup**: Global test environment setup

### Environment Variables

Required for testing:

```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/sms-test

# Provider credentials (for integration tests)
TWILIO_ACCOUNT_SID=test-twilio-sid
TWILIO_AUTH_TOKEN=test-twilio-token
AWS_ACCESS_KEY_ID=test-aws-key
AWS_SECRET_ACCESS_KEY=test-aws-secret
AWS_REGION=us-east-1
MESSAGEBIRD_ACCESS_KEY=test-messagebird-key
```

## 🎭 Mocking Strategy

### SMS Provider Mocks

The test suite uses comprehensive mocking for SMS providers:

- **HTTP Mocking**: Uses `nock` for HTTP request interception
- **SDK Mocking**: Direct SDK method mocking with Jest
- **Error Simulation**: Comprehensive error scenario testing
- **Rate Limiting**: Realistic rate limiting simulation

### Mock Management

```typescript
// Setup mocks before tests
MockSMSProviders.setupTwilioMock();
MockSMSProviders.setupAWSSNSMock();
MockSMSProviders.setupMessageBirdMock();

// Cleanup after tests
MockSMSProviders.cleanupMocks();

// Simulate specific scenarios
MockSMSProviders.setupRateLimitMock('twilio');
MockSMSProviders.setupTwilioErrorMock(400, 'Invalid phone number');
```

## 📊 Performance Testing

### Load Testing with Artillery

The test suite includes comprehensive load testing:

```bash
# Run load tests
npm run test:load

# Custom load test scenarios
artillery run artillery.yml --environment production
```

### Performance Metrics

Tracked performance indicators:

- **Throughput**: Messages per second
- **Response Time**: API response latency
- **Error Rate**: Failed request percentage
- **Resource Usage**: Memory and CPU consumption

### Performance Thresholds

- **Single SMS**: < 100ms response time
- **Bulk SMS (100 messages)**: < 30 seconds
- **Bulk SMS (1000 messages)**: < 2 minutes
- **Memory Growth**: < 50MB during bulk operations

## 🔍 Test Data Management

### Test Data Generators

The `TestDataGenerator` class provides realistic test data:

```typescript
// Generate test phone numbers
const phoneNumber = TestDataGenerator.generatePhoneNumber('US');

// Generate bulk recipients
const recipients = TestDataGenerator.generateBulkRecipients(100);

// Generate SMS messages
const smsData = TestDataGenerator.generateSMSMessage();

// Generate webhook payloads
const webhook = TestDataGenerator.generateWebhookPayload('twilio');
```

### Fixtures

Pre-defined test data in `tests/fixtures/`:

- **Sample Requests**: Common API request patterns
- **Webhook Payloads**: Provider-specific webhook examples
- **Error Scenarios**: Invalid request examples

## 🐛 Debugging Tests

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true npm test
```

### Test Isolation

Run specific test files:

```bash
# Single test file
npm test -- tests/unit/sms-service.test.ts

# Test pattern
npm test -- --testNamePattern="should send SMS"

# Specific test suite
npm test -- --testPathPattern=unit
```

### Memory Debugging

Enable memory profiling:

```bash
node --expose-gc ./node_modules/.bin/jest
```

## 🔄 Continuous Integration

### GitHub Actions

The test suite integrates with CI/CD:

- **Multi-Node Testing**: Tests on Node.js 18.x and 20.x
- **Service Dependencies**: Redis and MongoDB in CI
- **Security Scanning**: Automated vulnerability checks
- **Coverage Upload**: Codecov integration
- **Docker Testing**: Container-based testing

### Pre-commit Hooks

Automated quality checks:

```bash
# Install pre-commit hooks
npm run precommit

# Manual quality check
npm run lint && npm test
```

## 📈 Test Metrics

### Coverage Tracking

Monitor test coverage trends:

- **Codecov**: Online coverage reporting
- **Local Reports**: HTML coverage reports
- **Threshold Enforcement**: Automatic build failures

### Performance Monitoring

Track performance regressions:

- **Baseline Metrics**: Performance benchmarks
- **Trend Analysis**: Performance over time
- **Alert Thresholds**: Performance regression alerts

## 🛠️ Test Development

### Writing New Tests

Follow these patterns:

1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the function under test
3. **Assert**: Verify expected outcomes
4. **Cleanup**: Clean up mocks and resources

### Best Practices

- **Isolation**: Each test should be independent
- **Descriptive Names**: Clear test descriptions
- **Mock Management**: Proper setup and cleanup
- **Error Testing**: Test both success and failure cases
- **Performance**: Consider test execution time

### Test Templates

Use existing tests as templates:

- **Unit Test**: `tests/unit/sms-service.test.ts`
- **Integration Test**: `tests/integration/sms-providers.integration.test.ts`
- **E2E Test**: `tests/e2e/api.e2e.test.ts`
- **Performance Test**: `tests/performance/bulk-sms.performance.test.ts`

## 🚨 Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout for async operations
2. **Mock Conflicts**: Ensure proper mock cleanup
3. **Memory Leaks**: Check for unclosed resources
4. **Rate Limiting**: Account for rate limits in tests

### Debug Commands

```bash
# Verbose test output
npm test -- --verbose

# Run tests in band (no parallel execution)
npm test -- --runInBand

# Detect open handles
npm test -- --detectOpenHandles

# Force exit after tests
npm test -- --forceExit
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Artillery Load Testing](https://artillery.io/docs/)
- [Nock HTTP Mocking](https://github.com/nock/nock)

---

This test suite ensures the SMS service is reliable, performant, and maintainable. All tests should pass before deployment to production.