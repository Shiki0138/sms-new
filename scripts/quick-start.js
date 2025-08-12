#!/usr/bin/env node

/**
 * SMS美容室管理システム - クイックスタート
 * クロスプラットフォーム対応の開発環境起動スクリプト
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`═══ ${title} ═══`, 'cyan');
}

// プロセスをクリーンアップ
async function cleanup() {
  logSection('既存プロセスのクリーンアップ');
  
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('taskkill /F /IM node.exe', () => resolve());
    } else {
      exec('pkill -f "node src/server.js"', () => {
        exec('lsof -ti:3000,3001 | xargs kill -9 2>/dev/null', () => resolve());
      });
    }
  });
}

// 依存関係のチェックとインストール
async function checkDependencies() {
  logSection('依存関係の確認');
  
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log('依存関係をインストール中...', 'yellow');
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        shell: true
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          log('✅ 依存関係のインストール完了', 'green');
          resolve();
        } else {
          reject(new Error('npm install failed'));
        }
      });
    });
  } else {
    log('✅ 依存関係は既にインストール済み', 'green');
  }
}

// サーバーの起動
function startServer() {
  logSection('サーバーの起動');
  
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3001'
  };
  
  log('サーバーを起動中...', 'yellow');
  
  const server = spawn('npm', ['start'], {
    cwd: path.join(__dirname, '..'),
    env: env,
    stdio: 'inherit',
    shell: true
  });
  
  // エラーハンドリング
  server.on('error', (error) => {
    log(`エラー: ${error.message}`, 'red');
  });
  
  return server;
}

// ブラウザを開く
function openBrowser() {
  setTimeout(() => {
    logSection('ブラウザの起動');
    
    const url = 'http://localhost:3001';
    let command;
    
    switch (process.platform) {
      case 'darwin':
        command = `open ${url}`;
        break;
      case 'win32':
        command = `start ${url}`;
        break;
      default:
        command = `xdg-open ${url}`;
    }
    
    exec(command, (error) => {
      if (error) {
        log('ブラウザの自動起動に失敗しました。手動で開いてください:', 'yellow');
        log(url, 'cyan');
      } else {
        log('✅ ブラウザを開きました', 'green');
      }
    });
  }, 3000);
}

// アクセス情報の表示
function showAccessInfo() {
  console.log('');
  log('╔══════════════════════════════════════════╗', 'green');
  log('║  SMS美容室管理システム - 開発環境起動完了  ║', 'green');
  log('╚══════════════════════════════════════════╝', 'green');
  console.log('');
  log('📋 アクセス情報:', 'cyan');
  log('   URL: http://localhost:3001');
  log('   メール: admin@salon.com');
  log('   パスワード: admin123');
  console.log('');
  log('🛑 サーバーを停止: Ctrl+C', 'yellow');
  console.log('');
}

// メイン処理
async function main() {
  try {
    log('🚀 SMS美容室管理システム 開発環境起動スクリプト', 'green');
    
    await cleanup();
    await checkDependencies();
    
    const server = startServer();
    openBrowser();
    
    setTimeout(showAccessInfo, 5000);
    
    // プロセス終了時のクリーンアップ
    process.on('SIGINT', () => {
      log('\n👋 サーバーを停止しています...', 'yellow');
      server.kill();
      process.exit();
    });
    
  } catch (error) {
    log(`エラーが発生しました: ${error.message}`, 'red');
    process.exit(1);
  }
}

// スクリプトの実行
main();