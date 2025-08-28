#!/usr/bin/env node

/**
 * Test script to verify API endpoints are working correctly
 */

const http = require('http');
const https = require('https');

// Mock JWT token for testing
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwidXNlcm5hbWUiOiJ0ZXN0IiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const isHTTPS = BASE_URL.startsWith('https');
const client = isHTTPS ? https : http;

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Helper function to make requests
function makeRequest(path, options = {}) {
  const url = new URL(BASE_URL + path);
  
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHTTPS ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test endpoints
async function runTests() {
  console.log(`Testing API endpoints at ${BASE_URL}\n`);
  
  const tests = [
    {
      name: 'GET /api/settings',
      path: '/api/settings',
      expectedStatus: 200,
      validate: (data) => {
        return data && (data.setting || data.businessHours);
      }
    },
    {
      name: 'GET /api/channel-config',
      path: '/api/channel-config',
      expectedStatus: 200,
      validate: (data) => {
        return data && data.configs && Array.isArray(data.configs);
      }
    },
    {
      name: 'GET /api/channel-config/sms',
      path: '/api/channel-config/sms',
      expectedStatus: 200,
      validate: (data) => {
        return data && data.channel === 'sms';
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await makeRequest(test.path);
      
      if (response.status === test.expectedStatus) {
        if (test.validate && !test.validate(response.data)) {
          console.log(`  ${colors.red}✗ Failed${colors.reset} - Invalid response data`);
          console.log(`    Response:`, JSON.stringify(response.data, null, 2));
          failed++;
        } else {
          console.log(`  ${colors.green}✓ Passed${colors.reset} - Status ${response.status}`);
          passed++;
        }
      } else {
        console.log(`  ${colors.red}✗ Failed${colors.reset} - Expected status ${test.expectedStatus}, got ${response.status}`);
        if (response.data) {
          console.log(`    Response:`, JSON.stringify(response.data, null, 2));
        }
        failed++;
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ Failed${colors.reset} - ${error.message}`);
      failed++;
    }
    
    console.log();
  }
  
  // Summary
  console.log('\nTest Summary:');
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`  Total: ${passed + failed}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);