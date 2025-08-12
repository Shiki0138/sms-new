@echo off
REM SMS美容室管理システム - 開発環境起動スクリプト (Windows)

echo 🚀 SMS美容室管理システム 開発環境を起動します...

REM プロジェクトディレクトリに移動
cd /d "%~dp0\.."

REM 既存のプロセスを終了
echo 既存のプロセスを終了中...
taskkill /F /IM node.exe 2>nul

REM 依存関係のインストール確認
echo 依存関係を確認中...
if not exist "node_modules" (
    echo 依存関係をインストール中...
    call npm install
)

REM 環境変数の設定
set NODE_ENV=development
set PORT=3001

REM サーバー起動
echo サーバーを起動中...
start /B npm start

REM サーバーの起動を待つ
echo サーバーの起動を待っています...
timeout /t 5 /nobreak >nul

REM ブラウザを開く
echo ブラウザを開いています...
start http://localhost:3001

echo ✅ 開発環境が起動しました！
echo.
echo 📋 アクセス情報:
echo    URL: http://localhost:3001
echo    メール: admin@salon.com
echo    パスワード: admin123
echo.
echo 🛑 サーバーを停止するには: Ctrl+C
echo.

REM コマンドプロンプトを開いたままにする
pause