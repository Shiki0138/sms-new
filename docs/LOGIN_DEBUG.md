# ログイン後に画面が変わらない問題の対処法

## 問題
- ログイン成功後もログイン画面のまま
- "ログインしました"と表示されるが、ダッシュボードに遷移しない

## 原因と解決方法

### 1. ブラウザのコンソールでエラーを確認
1. ブラウザの開発者ツールを開く（F12）
2. Consoleタブでエラーメッセージを確認
3. Networkタブで失敗しているリクエストを確認

### 2. 手動でダッシュボードにアクセス
```
https://あなたのプロジェクト.vercel.app/dashboard
```
直接このURLにアクセスしてみてください。

### 3. セッションが保存されているか確認
ブラウザのコンソールで実行：
```javascript
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
```

### 4. ローカルでテスト
```bash
npm run dev
```
http://localhost:5173 でローカル環境でテストしてみてください。

### 5. Vercelの再デプロイ
```bash
git add .
git commit -m "Fix login redirect issue"
git push origin main
```

## デバッグ情報の収集
ログイン後、以下の情報を確認してください：
1. ブラウザのコンソールエラー
2. ネットワークタブの失敗リクエスト
3. Supabaseダッシュボードでユーザーセッションの確認