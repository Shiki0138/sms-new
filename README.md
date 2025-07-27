# 美容サロン管理システム - ライトプラン

個人経営や小規模サロン向けの軽量な管理システムです。

## 機能

- 👥 顧客管理（最大100件）
- 📅 予約管理（月間50件まで）
- 📊 簡易統計ダッシュボード
- ⚙️ 営業時間・メニュー設定

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **スタイリング**: TailwindCSS + Headless UI
- **バックエンド**: Supabase (認証・データベース)
- **状態管理**: React Query
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_NAME=美容サロン管理システム
VITE_APP_VERSION=1.0.0
```

### 3. Supabaseセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで`database-schema.sql`または`cleanup-and-setup.sql`を実行

### 4. 開発サーバーの起動

```bash
npm run dev
```

## 開発環境での認証スキップ

開発環境（`npm run dev`）では自動的にダミーユーザーでログインされ、ダッシュボードが表示されます。

## ビルド & デプロイ

### ローカルビルド

```bash
npm run build
npm run preview
```

### Vercelへのデプロイ

```bash
vercel
```

または、GitHubにプッシュすると自動的にデプロイされます。

## プロジェクト構造

```
src/
├── components/      # 再利用可能なコンポーネント
├── contexts/        # React Context（認証など）
├── hooks/          # カスタムフック
├── lib/            # 外部ライブラリ設定
├── pages/          # ページコンポーネント
├── types/          # TypeScript型定義
└── utils/          # ユーティリティ関数
```

## ライセンス

Private
