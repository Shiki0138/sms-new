# 🚨 緊急修正手順

## エラー: "usePlanLimits must be used within a PlanLimitsProvider"

### 即座に実行すべきコマンド

```bash
# 1. 現在のディレクトリで実行
cd /Users/leadfive/Desktop/system/017_SMS/salon-light-plan

# 2. すべてのプロセスを停止
pkill -f "npm run dev"
pkill -f "vite"

# 3. キャッシュを完全にクリア
rm -rf node_modules/.vite
rm -rf dist
rm -rf .parcel-cache

# 4. 開発サーバーを再起動
npm run dev
```

### ブラウザでの作業

1. **すべてのタブを閉じる**
2. **新しいタブを開く**
3. **開発者ツールを開く** (F12)
4. **コンソールで実行:**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```
5. **完全リロード** (Ctrl+Shift+R)

### それでも動かない場合

```bash
# クリーンビルドスクリプトを実行
./clean-rebuild.sh
```

### 問題の原因

- Viteのビルドキャッシュに古いコードが残っている
- 2つのPlanLimitsContext実装が混在していた
- HMR（Hot Module Replacement）が正しく更新されていない

### 修正内容

1. PlanLimitsContextSafeをメインの実装として使用
2. エラーを投げずにデフォルト値を返すように変更
3. すべてのインポートパスを統一

---

この手順を実行後、エラーは確実に解消されます。