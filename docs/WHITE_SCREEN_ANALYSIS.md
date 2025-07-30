# ダッシュボード白画面問題の根本原因分析レポート

## 問題の概要
- **症状**: ダッシュボードページが時々白画面になる
- **エラーメッセージ**: "useAuth must be used within an AuthProvider"
- **発生条件**: ページのリロード時、または直接URLアクセス時

## 根本原因の分析

### 1. 認証コンテキストの階層問題
現在のコンポーネント階層:
```
ErrorBoundary
  └── QueryClientProvider
      └── Router
          └── AuthProvider  ← ここで認証コンテキストを提供
              └── Routes
                  └── ProtectedRoute  ← ここでuseAuthを使用
                      └── AppLayout  ← ここでもuseAuthを使用
```

**問題点**: ProtectedRouteとAppLayoutの両方でuseAuthを使用しているが、これらは同じAuthProvider内にある。

### 2. 依存関係の競合
- **framer-motion**: まだインストールされているが、一部のコンポーネントで削除
- **不整合**: AppLayoutSimple.tsxはframer-motionを使わないが、他のコンポーネント（AppLayout.tsx、BottomNavigation.tsxなど）は使用している可能性

### 3. レンダリングタイミングの問題
- **非同期処理**: AuthProviderの初期化が非同期
- **競合状態**: コンポーネントのマウント時にまだ認証情報が読み込まれていない可能性

## 発生メカニズム

1. **初回レンダリング時**:
   - AuthProviderがマウントされる
   - ProtectedRouteが即座にuseAuthを呼び出す
   - AuthProviderの初期化がまだ完了していない場合、エラーが発生

2. **ページリロード時**:
   - Reactツリー全体が再構築される
   - タイミングによってはAuthProviderの初期化前にProtectedRouteがレンダリングされる

## 推奨される解決策

### 短期的解決策
1. **Loading状態の改善**:
   - AuthProviderの初期化中は必ずローディング画面を表示
   - ProtectedRouteでのエラーハンドリング強化

2. **コンポーネントの分離**:
   - 認証チェックとレイアウトの責務を分離
   - useAuthの使用箇所を最小限に

### 長期的解決策
1. **依存関係の整理**:
   - framer-motionを完全に削除するか、全体で統一して使用
   - アニメーションライブラリの選定と統一

2. **認証フローの再設計**:
   - 認証状態の管理をより堅牢に
   - エラーバウンダリーの活用

3. **開発環境と本番環境の統一**:
   - 環境変数の管理
   - ビルド設定の最適化

## 現在の対応状況
- ✅ AppLayoutSimpleを作成（framer-motion依存を削除）
- ✅ ルーティング構造の改善
- ❌ framer-motionの完全削除（まだ残存）
- ❌ 認証フローの根本的な改善

## 今後のアクションアイテム
1. framer-motion依存の完全削除または統一
2. AuthProviderの初期化処理の改善
3. エラーハンドリングの強化
4. 開発環境でのテスト強化
5. 本番環境でのモニタリング設定