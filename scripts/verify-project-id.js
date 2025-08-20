#!/usr/bin/env node

// Vercel プロジェクトID確認スクリプト

const CORRECT_PROJECT_ID = 'prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc';
const PROJECT_NAME = 'sms-new';

console.log('🔍 Vercel プロジェクト設定確認');
console.log('================================\n');

console.log('📋 正しいプロジェクト情報:');
console.log(`   名前: ${PROJECT_NAME}`);
console.log(`   ID: ${CORRECT_PROJECT_ID}`);
console.log('');

// .vercel/project.json をチェック
const fs = require('fs');
const path = require('path');

const projectJsonPath = path.join(process.cwd(), '.vercel', 'project.json');

if (fs.existsSync(projectJsonPath)) {
    console.log('📁 .vercel/project.json が見つかりました');
    
    try {
        const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
        console.log('\n現在の設定:');
        console.log(JSON.stringify(projectData, null, 2));
        
        if (projectData.projectId === CORRECT_PROJECT_ID) {
            console.log('\n✅ プロジェクトIDは正しく設定されています！');
        } else {
            console.log('\n❌ プロジェクトIDが間違っています！');
            console.log(`   現在: ${projectData.projectId}`);
            console.log(`   正しい: ${CORRECT_PROJECT_ID}`);
            
            // 修正を提案
            console.log('\n🔧 修正方法:');
            console.log('1. .vercel/project.json を削除: rm -rf .vercel');
            console.log('2. 正しいプロジェクトIDでデプロイ:');
            console.log(`   VERCEL_PROJECT_ID="${CORRECT_PROJECT_ID}" vercel --prod`);
        }
    } catch (error) {
        console.error('❌ project.json の読み込みエラー:', error.message);
    }
} else {
    console.log('📁 .vercel/project.json が見つかりません');
    console.log('\n🔧 初回デプロイ時の推奨コマンド:');
    console.log(`VERCEL_PROJECT_ID="${CORRECT_PROJECT_ID}" vercel --prod`);
}

console.log('\n================================');
console.log('GitHub Secrets 設定リンク:');
console.log('https://github.com/Shiki0138/sms-new/settings/secrets/actions');
console.log('\n必要なシークレット:');
console.log(`- VERCEL_PROJECT_ID: ${CORRECT_PROJECT_ID}`);
console.log('- VERCEL_ORG_ID: (Vercelダッシュボードで確認)');
console.log('- VERCEL_TOKEN: (新しく生成)');
console.log('================================\n');