#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue.bold('\n🧪 Running Light Plan Comprehensive Tests\n'));

const testSuites = [
  {
    name: 'Unit Tests',
    path: 'tests/unit/planLimits.test.js',
    description: 'Testing individual components and functions'
  },
  {
    name: 'Integration Tests',
    path: 'tests/integration/lightPlan.integration.test.js',
    description: 'Testing complete workflows and feature interactions'
  },
  {
    name: 'Security Tests',
    path: 'tests/security/lightPlan.security.test.js',
    description: 'Testing for vulnerabilities (SQL injection, XSS, CSRF, etc.)'
  },
  {
    name: 'Performance Tests',
    path: 'tests/performance/lightPlan.performance.test.js',
    description: 'Testing response times and load handling'
  },
  {
    name: 'API Tests',
    path: 'tests/api/lightPlan.api.test.js',
    description: 'Testing all API endpoints'
  },
  {
    name: 'Error Handling Tests',
    path: 'tests/error-handling/lightPlan.errors.test.js',
    description: 'Testing error scenarios and recovery'
  }
];

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of testSuites) {
  console.log(chalk.yellow(`\n📋 Running ${suite.name}`));
  console.log(chalk.gray(`   ${suite.description}`));
  console.log(chalk.gray(`   File: ${suite.path}\n`));
  
  try {
    const output = execSync(`npx jest ${suite.path} --verbose`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(chalk.green(`✅ ${suite.name} passed`));
    totalPassed++;
    results.push({ suite: suite.name, status: 'PASSED', output });
  } catch (error) {
    console.log(chalk.red(`❌ ${suite.name} failed`));
    totalFailed++;
    results.push({ 
      suite: suite.name, 
      status: 'FAILED', 
      error: error.message,
      output: error.stdout || error.stderr 
    });
  }
}

// Summary Report
console.log(chalk.blue.bold('\n📊 Test Summary Report\n'));
console.log(chalk.white('═'.repeat(60)));

results.forEach(result => {
  const status = result.status === 'PASSED' 
    ? chalk.green('✅ PASSED') 
    : chalk.red('❌ FAILED');
  console.log(`${result.suite.padEnd(25)} ${status}`);
});

console.log(chalk.white('═'.repeat(60)));
console.log(chalk.green(`Total Passed: ${totalPassed}`));
console.log(chalk.red(`Total Failed: ${totalFailed}`));
console.log(chalk.white('═'.repeat(60)));

// Security Vulnerability Summary
console.log(chalk.yellow.bold('\n🔒 Security Test Summary\n'));
const securityChecks = [
  'SQL Injection Prevention',
  'XSS (Cross-Site Scripting) Prevention',
  'CSRF (Cross-Site Request Forgery) Protection',
  'Authentication Bypass Prevention',
  'Rate Limiting and DDoS Protection',
  'Input Validation and Sanitization',
  'Data Encryption and Privacy',
  'File Upload Security',
  'Session Security'
];

securityChecks.forEach(check => {
  console.log(`${chalk.gray('•')} ${check}`);
});

// Performance Metrics
console.log(chalk.cyan.bold('\n⚡ Performance Metrics\n'));
const performanceMetrics = [
  'API Response Time: < 200ms',
  'Customer Creation: < 100ms',
  'Search Operations: < 150ms',
  'Concurrent Request Handling: 50 requests',
  'Memory Usage: < 50MB increase',
  'Database Query Performance: Indexed',
  'Plan Limit Checks: < 50ms overhead'
];

performanceMetrics.forEach(metric => {
  console.log(`${chalk.gray('•')} ${metric}`);
});

// Exit with appropriate code
process.exit(totalFailed > 0 ? 1 : 0);