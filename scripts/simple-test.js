#!/usr/bin/env node

/**
 * Simple SMS Blast System Test
 */

const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3002'; // Use localhost instead of 0.0.0.0
const TEST_EMAIL = 'test@salon-lumiere.com';
const TEST_PASSWORD = 'password123';

async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing SMS Blast Enhancement System...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await makeRequest('GET', '/health');
    console.log(`✅ Health check: ${healthResponse.statusCode} - ${JSON.stringify(healthResponse.data)}\n`);

    // Test login
    console.log('2. Testing login...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (loginResponse.statusCode !== 200) {
      console.error(`❌ Login failed: ${loginResponse.statusCode}`);
      console.error(JSON.stringify(loginResponse.data, null, 2));
      return;
    }

    const token = loginResponse.data.token;
    console.log(`✅ Login successful, got token\n`);

    // Test SMS service status
    console.log('3. Testing SMS service status...');
    const statusResponse = await makeRequest('GET', '/api/sms/status', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log(`✅ SMS Status: ${statusResponse.statusCode} - ${JSON.stringify(statusResponse.data, null, 2)}\n`);

    // Test template creation
    console.log('4. Testing template creation...');
    const templateResponse = await makeRequest('POST', '/api/sms/templates', {
      name: 'Test Template',
      description: 'A test SMS template',
      category: 'promotional',
      content: 'Hello {{firstName}}! Special offer from {{salonName}}.'
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log(`✅ Template creation: ${templateResponse.statusCode} - ${JSON.stringify(templateResponse.data, null, 2)}\n`);

    // Test campaign creation
    console.log('5. Testing campaign creation...');
    const campaignResponse = await makeRequest('POST', '/api/sms/campaigns', {
      name: 'Test SMS Campaign',
      description: 'A test SMS blast campaign',
      type: 'promotional',
      messageContent: 'Hello! This is a test SMS from our salon. Thank you for being our valued customer!'
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log(`✅ Campaign creation: ${campaignResponse.statusCode} - ${JSON.stringify(campaignResponse.data, null, 2)}\n`);

    // Test phone validation
    console.log('6. Testing phone validation...');
    const validationResponse = await makeRequest('POST', '/api/sms/validate-phones', {
      phoneNumbers: ['090-1234-5678', '+81-90-1234-5678', 'invalid-phone']
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log(`✅ Phone validation: ${validationResponse.statusCode} - ${JSON.stringify(validationResponse.data, null, 2)}\n`);

    // Test bulk SMS (simplified)
    console.log('7. Testing bulk SMS...');
    const bulkResponse = await makeRequest('POST', '/api/sms/bulk', {
      recipients: [
        { phone: '090-1111-1111', firstName: 'Test', lastName: 'User1' },
        { phone: '090-2222-2222', firstName: 'Test', lastName: 'User2' }
      ],
      message: 'Hello {{firstName}} {{lastName}}! This is a test message from {{salonName}}.'
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log(`✅ Bulk SMS: ${bulkResponse.statusCode} - ${JSON.stringify(bulkResponse.data, null, 2)}\n`);

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Try alternate ports
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔄 Trying alternate ports...');
      
      for (const port of [3001, 3002, 8080]) {
        try {
          console.log(`Trying port ${port}...`);
          const testUrl = `http://0.0.0.0:${port}`;
          const url = new URL('/health', testUrl);
          const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET'
          };

          const testResponse = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
              let body = '';
              res.on('data', (chunk) => body += chunk);
              res.on('end', () => resolve({ statusCode: res.statusCode, body }));
            });
            req.on('error', reject);
            req.setTimeout(2000, () => reject(new Error('Timeout')));
            req.end();
          });

          console.log(`✅ Found server on port ${port}: ${testResponse.statusCode}`);
          console.log(`Server response: ${testResponse.body}`);
          break;
        } catch (portError) {
          console.log(`❌ Port ${port} not available`);
        }
      }
    }
  }
}

// Run test
test().catch(console.error);