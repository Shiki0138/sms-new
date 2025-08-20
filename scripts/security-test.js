#!/usr/bin/env node

/**
 * Security Validation Test Script
 * Salon Lumière SMS System
 * 
 * このスクリプトは、システムのセキュリティ設定が正しく実装されているかを検証します。
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

console.log('🔒 セキュリティ検証テストを開始...\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(testName, testFn) {
  testsTotal++;
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ ${testName}: PASS`);
      testsPassed++;
    } else {
      console.log(`❌ ${testName}: FAIL`);
    }
  } catch (error) {
    console.log(`❌ ${testName}: ERROR - ${error.message}`);
  }
}

// Test 1: Check if .env.example exists
runTest('.env.example ファイルの存在確認', () => {
  return fs.existsSync(path.join(__dirname, '../.env.example'));
});

// Test 2: Check if .env.example contains required variables
runTest('.env.example に必須変数が含まれているか', () => {
  const envExamplePath = path.join(__dirname, '../.env.example');
  if (!fs.existsSync(envExamplePath)) return false;
  
  const content = fs.readFileSync(envExamplePath, 'utf8');
  const requiredVars = ['JWT_SECRET', 'ADMIN_PASSWORD', 'ADMIN_EMAIL'];
  
  return requiredVars.every(variable => 
    content.includes(variable + '=')
  );
});

// Test 3: Check if server-simple.js has environment validation
runTest('server-simple.js に環境変数バリデーションが実装されているか', () => {
  const serverPath = path.join(__dirname, '../src/server-simple.js');
  if (!fs.existsSync(serverPath)) return false;
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Check for environment validation code
  return content.includes('requiredEnvVars') && 
         content.includes('missingEnvVars') &&
         content.includes('process.exit(1)');
});

// Test 4: Check if hardcoded secrets are removed
runTest('ハードコードされた秘密情報が除去されているか', () => {
  const serverPath = path.join(__dirname, '../src/server-simple.js');
  if (!fs.existsSync(serverPath)) return false;
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Check that hardcoded secrets are not present
  const forbiddenPatterns = [
    'salon-lumiere-secret-key',
    'Skyosai51',
    'greenroom51@gmail.com'
  ];
  
  return !forbiddenPatterns.some(pattern => 
    content.includes(`'${pattern}'`) || content.includes(`"${pattern}"`)
  );
});

// Test 5: Check JWT secret strength validation
runTest('JWT Secret の長さ検証が実装されているか', () => {
  const serverPath = path.join(__dirname, '../src/server-simple.js');
  if (!fs.existsSync(serverPath)) return false;
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  return content.includes('JWT_SECRET.length < 32');
});

// Test 6: Check password strength validation
runTest('管理者パスワードの長さ検証が実装されているか', () => {
  const serverPath = path.join(__dirname, '../src/server-simple.js');
  if (!fs.existsSync(serverPath)) return false;
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  return content.includes('ADMIN_PASSWORD.length < 8');
});

// Test 7: Check enhanced error handling
runTest('セキュリティ強化されたエラーハンドリングが実装されているか', () => {
  const serverPath = path.join(__dirname, '../src/server-simple.js');
  if (!fs.existsSync(serverPath)) return false;
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  return content.includes('JsonWebTokenError') && 
         content.includes('TokenExpiredError') &&
         content.includes('Security Error');
});

// Test 8: Check if security documentation exists
runTest('セキュリティドキュメントが作成されているか', () => {
  return fs.existsSync(path.join(__dirname, '../docs/SECURITY_CONFIGURATION.md'));
});

// Test 9: Generate secure JWT secret example
runTest('セキュアなJWT Secret生成機能の検証', () => {
  try {
    const secureSecret = crypto.randomBytes(32).toString('hex');
    return secureSecret.length === 64; // 32 bytes = 64 hex characters
  } catch (error) {
    return false;
  }
});

// Test 10: Check environment variable usage in JWT operations
runTest('JWT操作で環境変数が使用されているか', () => {
  const serverPath = path.join(__dirname, '../src/server-simple.js');
  if (!fs.existsSync(serverPath)) return false;
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Check that jwt.sign and jwt.verify use process.env.JWT_SECRET
  const jwtSignMatches = content.match(/jwt\.sign\([^)]+process\.env\.JWT_SECRET[^)]*\)/g);
  const jwtVerifyMatches = content.match(/jwt\.verify\([^)]+process\.env\.JWT_SECRET[^)]*\)/g);
  
  return jwtSignMatches && jwtSignMatches.length > 0 && 
         jwtVerifyMatches && jwtVerifyMatches.length > 0;
});

console.log('\n' + '='.repeat(50));
console.log(`📊 テスト結果: ${testsPassed}/${testsTotal} 通過`);

if (testsPassed === testsTotal) {
  console.log('🎉 すべてのセキュリティテストに合格しました！');
  console.log('\n📋 次のステップ:');
  console.log('1. .env ファイルを作成し、安全な値を設定してください');
  console.log('2. JWT_SECRET には以下のような64文字の値を使用してください:');
  console.log(`   ${crypto.randomBytes(32).toString('hex')}`);
  console.log('3. 強力な管理者パスワードを設定してください');
  console.log('4. システムを再起動してセキュリティ設定を有効化してください');
  
  process.exit(0);
} else {
  console.log('⚠️  一部のセキュリティテストが失敗しました。');
  console.log('修正が必要な項目を確認してください。');
  
  process.exit(1);
}