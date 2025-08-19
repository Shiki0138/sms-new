# GitHub Actions セットアップガイド

このガイドでは、GitHub ActionsでVercelへの自動デプロイを設定する手順を説明します。

## 1. Vercel トークンの取得

1. [Vercel Dashboard](https://vercel.com/account/tokens) にアクセス
2. "Create" ボタンをクリック
3. トークン名を入力（例：`github-actions-sms-new`）
4. "Create Token" をクリック
5. 表示されたトークンをコピー（**一度しか表示されません**）

## 2. Vercel プロジェクト情報の取得

ターミナルで以下のコマンドを実行：

```bash
cd /Users/leadfive/Desktop/system/017_SMS
npx vercel link
```

次に、`.vercel/project.json` ファイルを確認：

```bash
cat .vercel/project.json
```

以下の情報をメモ：
- `projectId`: VERCEL_PROJECT_ID として使用
- `orgId`: VERCEL_ORG_ID として使用

## 3. GitHub リポジトリのシークレット設定

1. GitHubリポジトリ（https://github.com/Shiki0138/sms-new）にアクセス
2. Settings → Secrets and variables → Actions をクリック
3. "New repository secret" をクリックして、以下の3つのシークレットを追加：

### 必須シークレット

| Name | Value |
|------|--------|
| `VERCEL_TOKEN` | 手順1で取得したトークン |
| `VERCEL_ORG_ID` | 手順2で取得したorgId |
| `VERCEL_PROJECT_ID` | 手順2で取得したprojectId |

## 4. ワークフローの有効化

1. GitHubリポジトリの "Actions" タブに移動
2. "I understand my workflows, go ahead and enable them" をクリック（表示される場合）

## 5. デプロイの自動化

設定が完了すると、以下が自動化されます：

### mainブランチへのプッシュ時
- 本番環境へ自動デプロイ
- テストの実行
- セキュリティ監査

### プルリクエスト作成時
- プレビューデプロイの作成
- PRにプレビューURLをコメント
- コード品質チェック

### 定期実行（毎週月曜日）
- CodeQLセキュリティスキャン
- 脆弱性の検出

## 6. 確認方法

1. 任意のファイルを変更してコミット・プッシュ
2. GitHubの "Actions" タブで実行状況を確認
3. 緑色のチェックマークが表示されれば成功

## トラブルシューティング

### デプロイが失敗する場合

1. シークレットが正しく設定されているか確認
2. Vercelプロジェクトが正しくリンクされているか確認
3. GitHub Actionsのログを確認してエラーメッセージを調査

### 権限エラーの場合

1. GitHubリポジトリの Settings → Actions → General
2. "Workflow permissions" で "Read and write permissions" を選択
3. "Allow GitHub Actions to create and approve pull requests" にチェック

## 追加の自動化機能

### Dependabot自動マージ
- パッチとマイナーアップデートは自動的にマージ
- メジャーアップデートは手動レビューが必要

### セキュリティスキャン
- 週次でCodeQLによるコードスキャン
- npm auditによる依存関係の脆弱性チェック

---

設定が完了したら、コードをプッシュするだけで自動的にVercelにデプロイされます！