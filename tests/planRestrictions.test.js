// Plan Restrictions Test Suite
// This file tests that plan restrictions work correctly for all features

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';

// Test users with different subscription plans
const testUsers = {
  light: {
    email: 'light@test.com',
    password: 'test123',
    plan: 'light'
  },
  standard: {
    email: 'standard@test.com', 
    password: 'test123',
    plan: 'standard'
  },
  premium: {
    email: 'premium@test.com',
    password: 'test123', 
    plan: 'premium'
  }
};

// Features and their required plans
const featureEndpoints = {
  // Light plan features (should work for all)
  customers: {
    endpoint: '/customers',
    requiredPlan: 'light',
    method: 'GET'
  },
  appointments: {
    endpoint: '/appointments',
    requiredPlan: 'light',
    method: 'GET'
  },
  
  // Standard plan features (should fail for light)
  upsellingSuggestions: {
    endpoint: '/upselling/suggestions/1',
    requiredPlan: 'standard',
    method: 'GET'
  },
  membershipTiers: {
    endpoint: '/memberships/tiers',
    requiredPlan: 'standard',
    method: 'GET'
  },
  referrals: {
    endpoint: '/referrals/customer/1',
    requiredPlan: 'standard',
    method: 'GET'
  },
  inventory: {
    endpoint: '/inventory/products',
    requiredPlan: 'standard',
    method: 'GET'
  }
};

// Helper function to login and get token
async function loginUser(user) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: user.email,
      password: user.password
    });
    return response.data.token;
  } catch (error) {
    console.error(`Failed to login ${user.email}:`, error.message);
    return null;
  }
}

// Test function to check feature access
async function testFeatureAccess(userType, feature, featureConfig) {
  const user = testUsers[userType];
  const token = await loginUser(user);
  
  if (!token) {
    console.log(`❌ ${userType} user: Could not login`);
    return false;
  }

  try {
    const response = await axios({
      method: featureConfig.method,
      url: `${API_BASE_URL}${featureConfig.endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Check if access was granted
    const planHierarchy = { light: 1, standard: 2, premium: 3 };
    const hasAccess = planHierarchy[userType] >= planHierarchy[featureConfig.requiredPlan];

    if (hasAccess) {
      console.log(`✅ ${userType} user: ${feature} - Access granted (expected)`);
      return true;
    } else {
      console.log(`❌ ${userType} user: ${feature} - Access granted (should be denied)`);
      return false;
    }

  } catch (error) {
    // Check if access was denied with proper error
    if (error.response && error.response.status === 403) {
      const errorData = error.response.data;
      
      const planHierarchy = { light: 1, standard: 2, premium: 3 };
      const shouldHaveAccess = planHierarchy[userType] >= planHierarchy[featureConfig.requiredPlan];

      if (!shouldHaveAccess) {
        // Verify error has correct structure
        if (errorData.code === 'PLAN_UPGRADE_REQUIRED' && 
            errorData.currentPlan === userType &&
            errorData.feature) {
          console.log(`✅ ${userType} user: ${feature} - Access denied with correct error (expected)`);
          return true;
        } else {
          console.log(`❌ ${userType} user: ${feature} - Access denied but error format incorrect`);
          return false;
        }
      } else {
        console.log(`❌ ${userType} user: ${feature} - Access denied (should be granted)`);
        return false;
      }
    } else {
      console.log(`❌ ${userType} user: ${feature} - Unexpected error: ${error.message}`);
      return false;
    }
  }
}

// Run all tests
async function runTests() {
  console.log('=== Testing Plan Restrictions ===\n');
  
  let totalTests = 0;
  let passedTests = 0;

  // Test each user type against each feature
  for (const [userType, user] of Object.entries(testUsers)) {
    console.log(`\nTesting ${userType.toUpperCase()} plan user:`);
    console.log('------------------------');
    
    for (const [feature, featureConfig] of Object.entries(featureEndpoints)) {
      totalTests++;
      const passed = await testFeatureAccess(userType, feature, featureConfig);
      if (passed) passedTests++;
    }
  }

  console.log('\n=== Test Summary ===');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ All plan restriction tests passed!');
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
  }
}

// Additional specific tests
async function testSpecificScenarios() {
  console.log('\n=== Testing Specific Scenarios ===\n');

  // Test 1: Light user trying to access Standard feature
  console.log('Test 1: Light user accessing upselling feature');
  const lightToken = await loginUser(testUsers.light);
  try {
    await axios.get(`${API_BASE_URL}/upselling/suggestions/1`, {
      headers: { 'Authorization': `Bearer ${lightToken}` }
    });
    console.log('❌ Light user could access Standard feature');
  } catch (error) {
    if (error.response?.status === 403 && 
        error.response.data.code === 'PLAN_UPGRADE_REQUIRED') {
      console.log('✅ Light user correctly blocked from Standard feature');
      console.log(`   Message: ${error.response.data.message}`);
    }
  }

  // Test 2: Standard user accessing their features
  console.log('\nTest 2: Standard user accessing all Standard features');
  const standardToken = await loginUser(testUsers.standard);
  const standardFeatures = ['upselling', 'memberships', 'referrals', 'inventory'];
  
  for (const feature of standardFeatures) {
    try {
      const endpoint = feature === 'upselling' ? '/upselling/analytics' :
                       feature === 'memberships' ? '/memberships/tiers' :
                       feature === 'referrals' ? '/referrals/analytics' :
                       '/inventory/products';
      
      await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${standardToken}` }
      });
      console.log(`✅ Standard user can access ${feature}`);
    } catch (error) {
      console.log(`❌ Standard user blocked from ${feature}: ${error.message}`);
    }
  }
}

// Mock data setup for testing
async function setupTestData() {
  console.log('\n=== Setting up test data ===\n');
  
  // This would normally create test users with different plans
  // For now, we'll just log what would be created
  console.log('Test users that would be created:');
  console.log('- light@test.com (Light plan)');
  console.log('- standard@test.com (Standard plan)');
  console.log('- premium@test.com (Premium plan)');
}

// Main execution
async function main() {
  console.log('Starting plan restriction tests...\n');
  
  // Setup test data
  await setupTestData();
  
  // Run main tests
  await runTests();
  
  // Run specific scenario tests
  await testSpecificScenarios();
  
  console.log('\n=== Tests completed ===');
}

// Export for use in test runners
module.exports = {
  runTests,
  testFeatureAccess,
  testSpecificScenarios
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}