# 📊 データベース マイグレーション 整理ガイド

## 🎯 目的
- 25個のSQLファイルを整理統合
- 実行順序を明確化
- 全機能を保持しながら管理可能な構造を作成

## 📁 新しいファイル構成

```
database/
├── README.md                    # このファイル
├── migrations/                  # 順序付きマイグレーション
│   ├── 001_foundation_schema.sql    # 基本テーブル
│   ├── 002_rls_policies.sql         # セキュリティポリシー
│   ├── 003_holiday_system.sql       # 休日設定システム
│   ├── 004_plan_limits.sql          # プラン制限機能
│   ├── 005_messaging_system.sql     # メッセージング機能
│   └── 006_production_fixes.sql     # 本番修正統合
├── archive/                     # 既存ファイル保管庫
│   ├── original/               # 元のSQLファイル
│   ├── emergency/              # 緊急修正ファイル
│   └── development/            # 開発用ファイル
├── scripts/                     # 管理スクリプト
│   ├── migrate.sh              # マイグレーション実行
│   ├── rollback.sh             # ロールバック
│   └── validate.sh             # 検証スクリプト
└── documentation/              # ドキュメント
    ├── migration_history.md    # マイグレーション履歴
    ├── rollback_procedures.md  # ロールバック手順
    └── troubleshooting.md      # トラブルシューティング
```

## 🔄 マイグレーション実行順序

### Phase 1: Foundation（基盤）
1. **001_foundation_schema.sql** - 基本テーブル作成
   - tenants, users, customers, staff
   - reservations, services, messages
   - 基本インデックスとConstraints

### Phase 2: Security（セキュリティ）
2. **002_rls_policies.sql** - Row Level Security
   - テナント分離ポリシー
   - ユーザー権限管理
   - API アクセス制御

### Phase 3: Holiday System（休日システム）
3. **003_holiday_system.sql** - 休日設定機能
   - holiday_settings テーブル
   - business_hours 拡張
   - 休日計算関数

### Phase 4: Plan Management（プラン管理）
4. **004_plan_limits.sql** - プラン制限機能
   - plan_usage テーブル
   - 制限チェック関数
   - 使用量追跡

### Phase 5: Messaging（メッセージング）
5. **005_messaging_system.sql** - メッセージング機能
   - customer_channels テーブル
   - reminder_configs, reminder_logs
   - bulk_messages テーブル

### Phase 6: Production Fixes（本番修正）
6. **006_production_fixes.sql** - 本番環境修正統合
   - 既存の緊急修正を統合
   - パフォーマンス最適化
   - データ整合性修正

## ⚠️ 重要な注意事項

### 🛡️ 安全な移行手順
1. **バックアップ必須**: 移行前に必ず完全バックアップ
2. **段階実行**: 1つずつマイグレーションを実行
3. **検証必須**: 各段階で動作確認
4. **ロールバック準備**: 問題時の戻し手順を準備

### 🔄 既存データ保護
- **データ損失なし**: すべての既存データを保持
- **機能継続**: 全機能が移行後も動作
- **互換性維持**: 既存アプリケーションコードとの互換性

### 📋 移行チェックリスト
- [ ] バックアップ作成完了
- [ ] 001_foundation_schema.sql 実行 → 検証
- [ ] 002_rls_policies.sql 実行 → 検証
- [ ] 003_holiday_system.sql 実行 → 検証
- [ ] 004_plan_limits.sql 実行 → 検証
- [ ] 005_messaging_system.sql 実行 → 検証
- [ ] 006_production_fixes.sql 実行 → 最終検証
- [ ] アプリケーション動作確認
- [ ] 既存機能すべてテスト

## 🚀 実行コマンド例

```bash
# 1. バックアップ作成
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. マイグレーション実行
psql -d your_database -f database/migrations/001_foundation_schema.sql
psql -d your_database -f database/migrations/002_rls_policies.sql
# ... 順次実行

# 3. 検証
psql -d your_database -f database/scripts/validate.sh
```

## 📞 問題が発生した場合
1. **即座に作業停止**
2. **ロールバック実行**: `database/scripts/rollback.sh`
3. **バックアップから復旧**
4. **問題分析後に再実行**

このマイグレーション計画により、25個のSQLファイルを6個の管理可能なファイルに整理し、全機能を保持しながら保守性を大幅に向上させます。