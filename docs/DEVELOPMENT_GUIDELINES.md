# 開発ガイドライン - 白画面問題を防ぐために

## 🚨 必須チェック項目

### 1. **変更前の動作確認**
- [ ] 現在の画面が正常に表示されているか確認
- [ ] ブラウザのリロードで問題ないか確認
- [ ] 直接URLアクセスで問題ないか確認

### 2. **変更時の注意点**
- [ ] 認証関連の変更は特に慎重に
- [ ] useAuth/useContextの使用は最小限に
- [ ] ルーティング変更は段階的に実施

### 3. **変更後の検証**
- [ ] ローカルで必ず動作確認
- [ ] ページリロードテスト実施
- [ ] コンソールエラーの確認
- [ ] 複数回のテストで再現性確認

## ⚠️ 特に注意すべき変更

### 認証フロー
```typescript
// ❌ 避けるべきパターン
<ProtectedRoute>
  <ComponentUsingAuth />
</ProtectedRoute>

// ✅ 推奨パターン
<Route element={<Layout />}>
  <Route path="/path" element={<Component />} />
</Route>
```

### コンテキストの使用
```typescript
// ❌ 避けるべきパターン
const Component = () => {
  const auth = useAuth(); // エラーハンドリングなし
}

// ✅ 推奨パターン
const Component = () => {
  try {
    const auth = useAuth();
  } catch {
    // フォールバック処理
  }
}
```

## 📋 デプロイ前チェックリスト

1. **ローカル環境**
   - [ ] npm run dev で起動確認
   - [ ] すべてのページが表示される
   - [ ] リロードしても問題ない
   - [ ] エラーログがない

2. **ビルド確認**
   - [ ] npm run build が成功
   - [ ] npm run preview で動作確認
   - [ ] 本番環境想定での動作確認

3. **最終確認**
   - [ ] git diff で変更内容を再確認
   - [ ] 不要な console.log の削除
   - [ ] 環境変数の確認

## 🔧 トラブルシューティング

### 白画面になった場合
1. 開発者ツールのConsoleを確認
2. 「useAuth must be used within an AuthProvider」エラーの有無
3. ネットワークタブでAPI通信の確認
4. git log で直前の変更を確認

### 緊急時の対応
```bash
# 直前のコミットに戻る
git reset --hard HEAD~1

# または安定版のタグに戻る
git checkout stable-version
```

## 📝 変更履歴の記録

すべての重要な変更は以下を記録：
- 変更の目的
- 変更内容の詳細
- 潜在的なリスク
- テスト結果

このガイドラインに従うことで、白画面問題の再発を防ぎます。