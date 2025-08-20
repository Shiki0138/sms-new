const fs = require('fs');
const path = require('path');

/**
 * セキュリティテスト・スイート
 */
const securityTests = {
  /**
   * JWT秘密鍵テスト
   */
  testJWTSecrets: () => {
    console.log('\n🔐 JWT秘密鍵セキュリティテスト');
    const results = [];
    
    // .env.exampleのJWT_SECRET確認
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(envExamplePath)) {
      const envExample = fs.readFileSync(envExamplePath, 'utf8');
      if (envExample.includes('JWT_SECRET=your-very-strong-secret-key')) {
        results.push('✅ .env.example: JWT_SECRET適切にプレースホルダー化');
      } else {
        results.push('❌ .env.example: JWT_SECRET設定に問題あり');
      }
    }
    
    // コード内のハードコードチェック
    const authFiles = [
      '../src/auth/jwt.js',
      '../src/routes/auth.js',
      '../src/middleware/auth-new.js'
    ];
    
    authFiles.forEach(file => {
      const fullPath = path.join(__dirname, file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('process.env.JWT_SECRET')) {
          results.push(`✅ ${file}: 環境変数から読み取り`);
        } else {
          results.push(`❌ ${file}: 環境変数未使用`);
        }
        
        // フォールバック値のチェック
        if (content.includes('fallback-secret-key') || content.includes('salon-lumiere-secret-key')) {
          results.push(`⚠️ ${file}: 開発用フォールバック値使用（本番では要注意）`);
        }
      }
    });
    
    return results;
  },

  /**
   * CORS設定テスト
   */
  testCORSConfiguration: () => {
    console.log('\n🌐 CORS設定テスト');
    const results = [];
    
    const appPath = path.join(__dirname, '..', 'src', 'app.js');
    if (fs.existsSync(appPath)) {
      const content = fs.readFileSync(appPath, 'utf8');
      
      // CORS設定の確認
      if (content.includes('cors({')) {
        results.push('✅ CORS設定が存在');
        
        if (content.includes("origin: process.env.ALLOWED_ORIGINS")) {
          results.push('✅ CORS: 環境変数からオリジン設定');
        } else if (content.includes("origin: '*'")) {
          results.push('❌ CORS: 全オリジン許可（セキュリティリスク）');
        }
        
        if (content.includes('credentials: true')) {
          results.push('✅ CORS: 認証情報の送信許可');
        }
        
        if (content.includes("allowedHeaders: ['Content-Type', 'Authorization'")) {
          results.push('✅ CORS: 適切なヘッダー制限');
        }
      } else {
        results.push('❌ CORS設定が見つからない');
      }
    }
    
    // vercel.jsonのCORS設定確認
    const vercelPath = path.join(__dirname, '..', 'vercel.json');
    if (fs.existsSync(vercelPath)) {
      const content = fs.readFileSync(vercelPath, 'utf8');
      const config = JSON.parse(content);
      
      if (config.headers) {
        const corsHeaders = config.headers.find(h => h.source.includes('/api/'));
        if (corsHeaders) {
          results.push('✅ Vercel: API CORS設定存在');
          
          const allowOriginHeader = corsHeaders.headers.find(h => h.key === 'Access-Control-Allow-Origin');
          if (allowOriginHeader && allowOriginHeader.value === '*') {
            results.push('⚠️ Vercel: 全オリジン許可（本番では要修正）');
          }
        }
      }
    }
    
    return results;
  },

  /**
   * バリデーションテスト
   */
  testValidation: () => {
    console.log('\n🛡️ バリデーション機能テスト');
    const results = [];
    
    const validationPath = path.join(__dirname, '..', 'src', 'middleware', 'validation.js');
    if (fs.existsSync(validationPath)) {
      const content = fs.readFileSync(validationPath, 'utf8');
      
      if (content.includes('validationResult')) {
        results.push('✅ express-validator使用');
      }
      
      if (content.includes('errors.array()')) {
        results.push('✅ エラーレスポンス統一');
      }
    }
    
    // 認証ルートのバリデーション確認
    const authRoutesPath = path.join(__dirname, '..', 'src', 'routes', 'auth.js');
    if (fs.existsSync(authRoutesPath)) {
      const content = fs.readFileSync(authRoutesPath, 'utf8');
      
      if (content.includes("body('email').isEmail()")) {
        results.push('✅ 認証: Eメールバリデーション');
      }
      
      if (content.includes("body('password').isLength({ min: 8 })")) {
        results.push('✅ 認証: パスワード長バリデーション');
      }
      
      if (content.includes('validate')) {
        results.push('✅ 認証: バリデーションミドルウェア使用');
      }
    }
    
    return results;
  }
};

/**
 * データベース設計テスト
 */
const databaseTests = {
  /**
   * Supabaseスキーマテスト
   */
  testSupabaseSchema: () => {
    console.log('\n🗄️ Supabaseスキーマ設計テスト');
    const results = [];
    
    const schemaPath = path.join(__dirname, '..', 'salon-light-plan', 'supabase', 'migrations', '001_initial_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // テナント分離の確認
      if (content.includes('tenant_id UUID NOT NULL')) {
        results.push('✅ スキーマ: マルチテナント対応');
      }
      
      // UUID使用の確認
      if (content.includes('uuid_generate_v4()')) {
        results.push('✅ スキーマ: UUID主キー使用');
      }
      
      // 外部キー制約の確認
      if (content.includes('REFERENCES') && content.includes('ON DELETE CASCADE')) {
        results.push('✅ スキーマ: 外部キー制約とカスケード削除');
      }
      
      // タイムスタンプの確認
      if (content.includes('created_at TIMESTAMP WITH TIME ZONE')) {
        results.push('✅ スキーマ: タイムゾーン対応タイムスタンプ');
      }
      
      // チェック制約の確認
      if (content.includes('CHECK (')) {
        results.push('✅ スキーマ: データ制約設定');
      }
    }
    
    // RLS設定の確認
    const rlsPath = path.join(__dirname, '..', 'salon-light-plan', 'supabase', 'migrations', '002_rls_policies.sql');
    if (fs.existsSync(rlsPath)) {
      const content = fs.readFileSync(rlsPath, 'utf8');
      
      if (content.includes('ENABLE ROW LEVEL SECURITY')) {
        results.push('✅ RLS: 行レベルセキュリティ有効');
      }
      
      if (content.includes('CREATE POLICY')) {
        results.push('✅ RLS: セキュリティポリシー設定');
      }
    }
    
    return results;
  }
};

/**
 * エラーハンドリングテスト
 */
const errorHandlingTests = {
  testGlobalErrorHandler: () => {
    console.log('\n⚠️ エラーハンドリングテスト');
    const results = [];
    
    const appPath = path.join(__dirname, '..', 'src', 'app.js');
    if (fs.existsSync(appPath)) {
      const content = fs.readFileSync(appPath, 'utf8');
      
      // グローバルエラーハンドラの確認
      if (content.includes('app.use((error, req, res, next)')) {
        results.push('✅ グローバルエラーハンドラ存在');
        
        if (content.includes('JsonWebTokenError')) {
          results.push('✅ JWTエラーハンドリング');
        }
        
        if (content.includes('entity.parse.failed')) {
          results.push('✅ JSONパースエラーハンドリング');
        }
        
        if (content.includes('entity.too.large')) {
          results.push('✅ ペイロードサイズエラーハンドリング');
        }
        
        if (content.includes('error.status === 429')) {
          results.push('✅ レート制限エラーハンドリング');
        }
      }
      
      // 404ハンドラの確認
      if (content.includes("app.use('*'")) {
        results.push('✅ 404ハンドラ存在');
      }
    }
    
    return results;
  }
};

/**
 * 環境変数整合性テスト
 */
const environmentTests = {
  testEnvironmentVariables: () => {
    console.log('\n🔧 環境変数整合性テスト');
    const results = [];
    
    // .env.exampleの確認
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'JWT_SECRET',
      'ADMIN_EMAIL',
      'ADMIN_PASSWORD',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'ALLOWED_ORIGINS'
    ];
    
    if (fs.existsSync(envExamplePath)) {
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      requiredVars.forEach(varName => {
        if (envContent.includes(`${varName}=`)) {
          results.push(`✅ 環境変数: ${varName}定義済み`);
        } else {
          results.push(`❌ 環境変数: ${varName}未定義`);
        }
      });
      
      // セキュリティ関連の確認
      if (envContent.includes('your-very-strong-secret-key')) {
        results.push('✅ セキュリティ: プレースホルダー値使用');
      }
      
      if (envContent.includes('YourStrongAdminPassword123!')) {
        results.push('⚠️ セキュリティ: 管理者パスワードのプレースホルダー');
      }
    }
    
    return results;
  }
};

/**
 * メインテスト実行
 */
function runIntegrationTests() {
  console.log('🚀 統合テスト・品質保証レポート開始\n');
  console.log('='.repeat(60));
  
  const allResults = [];
  
  // セキュリティテスト実行
  allResults.push(...securityTests.testJWTSecrets());
  allResults.push(...securityTests.testCORSConfiguration());
  allResults.push(...securityTests.testValidation());
  
  // データベーステスト実行
  allResults.push(...databaseTests.testSupabaseSchema());
  
  // エラーハンドリングテスト実行
  allResults.push(...errorHandlingTests.testGlobalErrorHandler());
  
  // 環境変数テスト実行
  allResults.push(...environmentTests.testEnvironmentVariables());
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 テスト結果サマリー');
  console.log('='.repeat(60));
  
  const passed = allResults.filter(r => r.startsWith('✅')).length;
  const warnings = allResults.filter(r => r.startsWith('⚠️')).length;
  const failed = allResults.filter(r => r.startsWith('❌')).length;
  
  console.log(`✅ 合格: ${passed}`);
  console.log(`⚠️ 警告: ${warnings}`);
  console.log(`❌ 失敗: ${failed}`);
  
  console.log('\n📝 詳細結果:');
  allResults.forEach(result => console.log(result));
  
  // 重要な問題の特定
  const criticalIssues = allResults.filter(r => 
    r.startsWith('❌') && 
    (r.includes('JWT_SECRET') || r.includes('CORS') || r.includes('認証'))
  );
  
  if (criticalIssues.length > 0) {
    console.log('\n🚨 クリティカルな問題:');
    criticalIssues.forEach(issue => console.log(issue));
  }
  
  console.log('\n✨ テスト完了');
  
  return {
    passed,
    warnings,
    failed,
    total: allResults.length,
    results: allResults,
    criticalIssues
  };
}

// テスト実行
if (require.main === module) {
  runIntegrationTests();
}

module.exports = { runIntegrationTests };