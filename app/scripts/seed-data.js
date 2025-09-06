#!/usr/bin/env node

/**
 * Firebase データベース初期化スクリプト
 * 美容室VOTAN（ボタン）の実際のデータを投入
 * 
 * 実行方法:
 * node app/scripts/seed-data.js
 */

require('dotenv').config();
const { initializeSalonData, checkExistingData, clearAllData } = require('../shared/firebase-init');

async function main() {
  console.log('=== 美容室VOTAN Firebase データ初期化スクリプト ===\n');
  
  try {
    // 環境変数の確認
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.error('❌ FIREBASE_PROJECT_ID が設定されていません');
      process.exit(1);
    }
    
    console.log(`🔥 Firebase プロジェクト: ${process.env.FIREBASE_PROJECT_ID}`);
    console.log(`🏪 対象サロン: ボタン(VOTAN)`);
    console.log('');
    
    // 既存データの確認
    console.log('📋 既存データを確認しています...');
    const hasExistingData = await checkExistingData();
    
    if (hasExistingData) {
      console.log('⚠️  既存のデータが見つかりました');
      console.log('');
      
      // 実際の本番環境では、ユーザーに確認を求める
      if (process.env.NODE_ENV === 'production') {
        console.log('❌ 本番環境では既存データの上書きはできません');
        process.exit(1);
      }
      
      // 開発環境では自動的にクリア
      console.log('🧹 開発環境のため、既存データをクリアします...');
      const cleared = await clearAllData();
      if (!cleared) {
        console.error('❌ データのクリアに失敗しました');
        process.exit(1);
      }
      console.log('✅ データクリア完了\n');
    }
    
    // データの初期化
    console.log('🚀 美容室VOTANのデータ初期化を開始します...');
    const success = await initializeSalonData();
    
    if (success) {
      console.log('\n🎉 データ初期化が正常に完了しました！');
      console.log('');
      console.log('投入されたデータ:');
      console.log('• サロン基本情報: 1件');
      console.log('• スタッフ情報: 7件');
      console.log('• サービス情報: 6件');
      console.log('• 設定情報: 1件');
      console.log('');
      console.log('管理画面でデータを確認してください: http://localhost:3001/admin');
    } else {
      console.error('❌ データ初期化に失敗しました');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ スクリプト実行中にエラーが発生しました:', error.message);
    console.error('詳細:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = { main };