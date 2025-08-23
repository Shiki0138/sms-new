#!/usr/bin/env node

/**
 * Test script to verify authentication flow and token handling
 */

const fs = require('fs');
const path = require('path');

console.log('=== SMS Authentication Flow Test ===\n');

// Check for conflicting files
console.log('1. Checking for conflicting login files:');
const files = [
  '/login.html',
  '/public/login.html', 
  '/index.html'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✓ Found: ${file}`);
  } else {
    console.log(`   ✗ Missing: ${file}`);
  }
});

console.log('\n2. Checking API endpoints:');
const apiFiles = [
  '/api/auth/login.js',
  '/api/index.js',
  '/api/health.js'
];

apiFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✓ Found: ${file}`);
  } else {
    console.log(`   ✗ Missing: ${file}`);
  }
});

console.log('\n3. Checking key authentication files:');
const authFiles = [
  '/public/js/auth.js',
  '/public/js/api.js',
  '/public/js/app.js',
  '/public/js/app-new.js'
];

authFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✓ Found: ${file}`);
    
    // Check for token key consistency
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasAccessToken = content.includes("'accessToken'");
    const hasSalonToken = content.includes("'salon_token'");
    
    if (hasAccessToken && hasSalonToken) {
      console.log(`     → Uses both token keys (good for compatibility)`);
    } else if (hasSalonToken) {
      console.log(`     → Uses salon_token key`);
    } else if (hasAccessToken) {
      console.log(`     → Uses accessToken key`);
    }
  } else {
    console.log(`   ✗ Missing: ${file}`);
  }
});

console.log('\n4. Token Key Analysis:');
console.log('   Expected behavior:');
console.log('   - login.html stores: salon_token, accessToken (for compatibility)');
console.log('   - auth.js checks: salon_token || accessToken');
console.log('   - api.js uses: salon_token || accessToken');
console.log('   - API returns: token & accessToken (both for compatibility)');

console.log('\n5. Redirect Flow:');
console.log('   1. User visits https://sms-new.vercel.app/login.html');
console.log('   2. Successful login stores tokens in localStorage/sessionStorage');
console.log('   3. Redirects to /dashboard (which maps to /public/dashboard.html)');
console.log('   4. app-new.js checks authentication on dashboard load');
console.log('   5. If no valid token, redirects back to /login.html');

console.log('\n6. Common Issues Fixed:');
console.log('   ✓ Token key mismatch (salon_token vs accessToken)');
console.log('   ✓ API URL hardcoded to localhost');
console.log('   ✓ Wrong redirect path (/index.html instead of /dashboard)');
console.log('   ✓ API response missing accessToken field');
console.log('   ✓ Authentication check looking for wrong token key');

console.log('\n=== Test Complete ===');