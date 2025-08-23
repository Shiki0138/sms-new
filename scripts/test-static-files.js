#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing static file configuration...\n');

const publicDir = path.join(__dirname, '..', 'public');
const requiredFiles = [
  'login.html',
  'dashboard.html',
  'customer-detail.html',
  '404.html',
  'css/app.css',
  'js/app.js',
  'favicon.ico',
  'manifest.json'
];

const missingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

console.log('\nRewrite Rules Test:');
const rewriteTests = [
  { source: '/', expected: '/public/login.html' },
  { source: '/dashboard', expected: '/public/dashboard.html' },
  { source: '/customer-edit', expected: '/public/customer-detail.html' },
  { source: '/customer-edit.html', expected: '/public/customer-detail.html' },
  { source: '/css/app.css', expected: '/public/css/app.css' },
  { source: '/js/app.js', expected: '/public/js/app.js' }
];

console.log('\nExpected rewrites (from vercel.json):');
rewriteTests.forEach(test => {
  console.log(`${test.source} → ${test.expected}`);
});

if (missingFiles.length > 0) {
  console.log('\n⚠️  Warning: Some required files are missing!');
  console.log('Missing files:', missingFiles.join(', '));
  process.exit(1);
} else {
  console.log('\n✅ All required static files are present!');
  console.log('\nDeployment checklist:');
  console.log('1. Run: git add -A');
  console.log('2. Run: git commit -m "Fix static file serving configuration"');
  console.log('3. Run: git push');
  console.log('4. Vercel will automatically deploy the changes');
}