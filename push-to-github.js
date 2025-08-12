const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function pushToGitHub() {
  try {
    console.log('🚀 GitHubへのプッシュを開始...');
    
    // Git初期化
    await execPromise('git init');
    console.log('✓ Git初期化完了');
    
    // ユーザー設定
    await execPromise('git config user.email "noreply@anthropic.com"');
    await execPromise('git config user.name "Claude"');
    
    // リモート追加
    await execPromise('git remote add origin https://github.com/Shiki0138/sms-new.git');
    console.log('✓ リモートリポジトリ追加完了');
    
    // ファイル追加
    await execPromise('git add .');
    console.log('✓ ファイル追加完了');
    
    // コミット
    await execPromise('git commit -m "SMS美容室管理システム - 完全版"');
    console.log('✓ コミット完了');
    
    // ブランチ設定
    await execPromise('git branch -M main');
    
    // プッシュ
    await execPromise('git push -u origin main --force');
    console.log('✅ GitHubへのプッシュが完了しました！');
    console.log('🔄 Vercelが自動的にデプロイを開始します...');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

pushToGitHub();