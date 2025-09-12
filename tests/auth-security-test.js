#!/usr/bin/env node

/**
 * Comprehensive Authentication Security Test Suite
 * Tests the SMS Management System Authentication API for security vulnerabilities
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

class AuthSecurityTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.loginUrl = `${baseUrl}/api/auth/login`;
    this.meUrl = `${baseUrl}/api/auth/me`;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green  
      error: '\x1b[31m',    // Red
      warning: '\x1b[33m',  // Yellow
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async runTest(testName, testFunction) {
    this.log(`\n🧪 Running: ${testName}`, 'info');
    
    try {
      const result = await testFunction();
      
      if (result.status === 'pass') {
        this.log(`✓ ${testName}: ${result.message}`, 'success');
        this.results.passed++;
      } else if (result.status === 'warning') {
        this.log(`⚠ ${testName}: ${result.message}`, 'warning');
        this.results.warnings++;
      } else {
        this.log(`✗ ${testName}: ${result.message}`, 'error');
        this.results.failed++;
      }
      
      this.results.tests.push({
        name: testName,
        status: result.status,
        message: result.message,
        details: result.details || null
      });
      
    } catch (error) {
      this.log(`✗ ${testName}: ${error.message}`, 'error');
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'fail',
        message: error.message,
        details: error
      });
    }
  }

  async testValidLogin() {
    const response = await axios.post(this.loginUrl, {
      email: 'test@salon-lumiere.com',
      password: 'password123'
    }, { validateStatus: () => true });

    if (response.status === 200 && response.data.token) {
      // Store token for later tests
      this.token = response.data.token;
      
      // Validate JWT structure
      const decoded = jwt.decode(this.token);
      if (!decoded || !decoded.id || !decoded.email) {
        return {
          status: 'fail',
          message: 'JWT token missing required fields',
          details: decoded
        };
      }

      return {
        status: 'pass',
        message: 'Valid credentials accepted, JWT token received',
        details: { token: this.token.substring(0, 20) + '...' }
      };
    }

    return {
      status: 'fail',
      message: `Expected 200 with token, got ${response.status}`,
      details: response.data
    };
  }

  async testInvalidCredentials() {
    const response = await axios.post(this.loginUrl, {
      email: 'test@salon-lumiere.com',
      password: 'wrongpassword'
    }, { validateStatus: () => true });

    if (response.status === 401) {
      return {
        status: 'pass',
        message: 'Invalid credentials properly rejected'
      };
    }

    return {
      status: 'fail',
      message: `Expected 401, got ${response.status}`,
      details: response.data
    };
  }

  async testMissingFields() {
    // Test missing email
    const noEmail = await axios.post(this.loginUrl, {
      password: 'password123'
    }, { validateStatus: () => true });

    // Test missing password
    const noPassword = await axios.post(this.loginUrl, {
      email: 'test@salon-lumiere.com'
    }, { validateStatus: () => true });

    const emailFail = noEmail.status !== 400;
    const passwordFail = noPassword.status !== 400;

    if (!emailFail && !passwordFail) {
      return {
        status: 'pass',
        message: 'Missing fields properly validated'
      };
    }

    return {
      status: 'fail',
      message: 'Missing field validation failed',
      details: {
        emailTest: noEmail.status,
        passwordTest: noPassword.status
      }
    };
  }

  async testSQLInjection() {
    const injectionAttempts = [
      { email: "admin@test.com'OR 1=1--", password: "any" },
      { email: "'; DROP TABLE users; --", password: "any" },
      { email: "admin@test.com", password: "' OR '1'='1" }
    ];

    for (const attempt of injectionAttempts) {
      const response = await axios.post(this.loginUrl, attempt, { 
        validateStatus: () => true 
      });

      // Should be rejected (401 or 400, not 200)
      if (response.status === 200) {
        return {
          status: 'fail',
          message: 'SQL injection attempt succeeded',
          details: { attempt, response: response.data }
        };
      }
    }

    return {
      status: 'pass',
      message: 'SQL injection attempts properly rejected'
    };
  }

  async testRateLimiting() {
    const promises = [];
    
    // Send 10 rapid requests
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.post(this.loginUrl, {
          email: 'test@example.com',
          password: 'wrongpassword'
        }, { validateStatus: () => true })
      );
    }

    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);

    if (rateLimited) {
      return {
        status: 'pass',
        message: 'Rate limiting is active'
      };
    }

    return {
      status: 'warning',
      message: 'Rate limiting not detected (may not be implemented)'
    };
  }

  async testCORSHeaders() {
    try {
      // Test preflight request
      const response = await axios.options(this.loginUrl, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        validateStatus: () => true
      });

      const corsOrigin = response.headers['access-control-allow-origin'];
      
      if (corsOrigin === '*') {
        return {
          status: 'fail',
          message: 'Insecure CORS: Allows all origins (*)',
          details: { corsOrigin }
        };
      } else if (corsOrigin) {
        return {
          status: 'pass',
          message: `CORS configured with specific origin: ${corsOrigin}`
        };
      } else {
        return {
          status: 'warning',
          message: 'CORS headers not found'
        };
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'Could not test CORS (preflight failed)',
        details: error.message
      };
    }
  }

  async testJWTValidation() {
    if (!this.token) {
      return {
        status: 'warning',
        message: 'No token available for testing'
      };
    }

    // Test valid token
    const validResponse = await axios.get(this.meUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
      validateStatus: () => true
    });

    if (validResponse.status !== 200) {
      return {
        status: 'fail',
        message: 'Valid JWT token was rejected',
        details: { status: validResponse.status, data: validResponse.data }
      };
    }

    // Test invalid token
    const invalidResponse = await axios.get(this.meUrl, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
      validateStatus: () => true
    });

    if (invalidResponse.status !== 401) {
      return {
        status: 'fail',
        message: 'Invalid JWT token was not rejected properly',
        details: { status: invalidResponse.status }
      };
    }

    // Test missing token
    const noTokenResponse = await axios.get(this.meUrl, {
      validateStatus: () => true
    });

    if (noTokenResponse.status !== 401) {
      return {
        status: 'fail',
        message: 'Missing JWT token was not rejected properly',
        details: { status: noTokenResponse.status }
      };
    }

    return {
      status: 'pass',
      message: 'JWT validation working correctly'
    };
  }

  async testHTTPMethods() {
    // Test unsupported methods
    const getResponse = await axios.get(this.loginUrl, { validateStatus: () => true });
    const putResponse = await axios.put(this.loginUrl, {}, { validateStatus: () => true });

    if (getResponse.status === 405 && putResponse.status === 405) {
      return {
        status: 'pass',
        message: 'Unsupported HTTP methods properly rejected'
      };
    }

    return {
      status: 'fail',
      message: 'HTTP method validation failed',
      details: {
        get: getResponse.status,
        put: putResponse.status
      }
    };
  }

  async testSecurityHeaders() {
    const response = await axios.post(this.loginUrl, {
      email: 'test',
      password: 'test'  
    }, { validateStatus: () => true });

    const headers = response.headers;
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options', 
      'x-xss-protection'
    ];

    const missingHeaders = requiredHeaders.filter(header => !headers[header]);

    if (missingHeaders.length === 0) {
      return {
        status: 'pass',
        message: 'All required security headers present'
      };
    } else if (missingHeaders.length < requiredHeaders.length) {
      return {
        status: 'warning',
        message: `Some security headers missing: ${missingHeaders.join(', ')}`
      };
    } else {
      return {
        status: 'fail',
        message: 'Security headers not implemented'
      };
    }
  }

  async testJWTSecurity() {
    if (!this.token) {
      return {
        status: 'warning',
        message: 'No token available for security testing'
      };
    }

    const decoded = jwt.decode(this.token, { complete: true });
    
    if (!decoded) {
      return {
        status: 'fail',
        message: 'Could not decode JWT token'
      };
    }

    const issues = [];

    // Check algorithm
    if (decoded.header.alg === 'none') {
      issues.push('Uses "none" algorithm (insecure)');
    }

    // Check expiration
    const exp = decoded.payload.exp;
    const now = Math.floor(Date.now() / 1000);
    const timeToExpiry = exp - now;

    if (timeToExpiry > 86400 * 7) { // More than 7 days
      issues.push('Token expiry too long (> 7 days)');
    }

    // Check for sensitive data
    const payload = decoded.payload;
    if (payload.password || payload.passwordHash) {
      issues.push('Contains password information');
    }

    if (issues.length === 0) {
      return {
        status: 'pass',
        message: 'JWT token security looks good',
        details: {
          algorithm: decoded.header.alg,
          expiresIn: `${Math.floor(timeToExpiry / 3600)} hours`
        }
      };
    }

    return {
      status: 'fail',
      message: 'JWT token security issues found',
      details: issues
    };
  }

  async runAllTests() {
    this.log('🔒 SMS Authentication Security Test Suite', 'info');
    this.log('==========================================', 'info');
    this.log(`Testing endpoint: ${this.loginUrl}\n`, 'info');

    await this.runTest('Valid Login Test', () => this.testValidLogin());
    await this.runTest('Invalid Credentials Test', () => this.testInvalidCredentials());
    await this.runTest('Missing Fields Validation', () => this.testMissingFields());
    await this.runTest('SQL Injection Protection', () => this.testSQLInjection());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('CORS Configuration', () => this.testCORSHeaders());
    await this.runTest('JWT Token Validation', () => this.testJWTValidation());
    await this.runTest('HTTP Methods Validation', () => this.testHTTPMethods());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('JWT Security Analysis', () => this.testJWTSecurity());

    // Summary
    this.log('\n🔒 Security Test Summary', 'info');
    this.log('======================', 'info');
    this.log(`✓ Passed: ${this.results.passed}`, 'success');
    this.log(`✗ Failed: ${this.results.failed}`, 'error');
    this.log(`⚠ Warnings: ${this.results.warnings}`, 'warning');
    this.log(`📊 Total: ${this.results.tests.length}\n`, 'info');

    if (this.results.failed > 0) {
      this.log('⚠ SECURITY ISSUES FOUND - Review failed tests', 'error');
      return false;
    } else if (this.results.warnings > 0) {
      this.log('⚠ Security warnings found - Consider improvements', 'warning');
      return true;
    } else {
      this.log('✅ All security tests passed!', 'success');
      return true;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3001';
  const tester = new AuthSecurityTester(baseUrl);
  
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = AuthSecurityTester;