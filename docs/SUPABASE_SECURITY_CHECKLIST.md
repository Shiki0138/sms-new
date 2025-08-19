# Supabase セキュリティ設定チェックリスト

## 🚨 即時対応アクションアイテム

### 1. ❌ 項目の確認
検証スクリプト (`verify_security_fixes.sql`) を実行して、以下を確認:
- [ ] RLS が有効になっていない他のテーブルはないか
- [ ] search_path が設定されていない関数はないか
- [ ] 適切なポリシーが設定されているか

### 2. Supabase Dashboard での認証設定

**場所**: [Supabase Dashboard](https://app.supabase.com) → Authentication → Settings

#### A. Email 設定
- [ ] **OTP Expiry Duration**: `1800` 秒（30分）に設定
- [ ] **Enable email confirmations**: ON

#### B. Password Requirements
- [ ] **Minimum password length**: `8` 文字
- [ ] **Password character requirements**: 
  - [ ] Lowercase letters (a-z)
  - [ ] Uppercase letters (A-Z)
  - [ ] Numbers (0-9)
  - [ ] Special characters (!@#$%^&*)
- [ ] **Check passwords against breach database**: ON（HIBP有効化）

#### C. Security 設定
- [ ] **Enable Multi-Factor Authentication (TOTP)**: ON
- [ ] **Enable refresh token rotation**: ON
- [ ] **Refresh token reuse interval**: `0` 秒
- [ ] **Site URL**: 本番環境のURLを設定 (例: https://salon-lumiere.com)

### 3. マイグレーション再実行（必要な場合）

もし検証スクリプトで問題が見つかった場合:

```sql
-- 1. セキュリティ修正の適用
-- /salon-light-plan/supabase/migrations/013_security_fixes_v2.sql

-- 2. 全関数の search_path 修正
-- /salon-light-plan/supabase/migrations/014_fix_all_function_search_paths.sql

-- 3. 検証スクリプトで確認
-- /salon-light-plan/supabase/migrations/verify_security_fixes.sql
```

### 4. auth_configuration_audit テーブルの更新

Supabase Dashboard で設定を適用した後:

```sql
-- 設定適用後の更新スクリプトを実行
-- /salon-light-plan/supabase/migrations/015_update_auth_audit_after_settings.sql
```

### 5. 定期セキュリティ監査のスケジュール設定

#### 月次タスク（毎月1日）
- [ ] **監査テンプレート使用**: `/docs/MONTHLY_SECURITY_AUDIT_TEMPLATE.md`
- [ ] **カレンダー登録**: 毎月1日にリマインダー設定
- [ ] **担当者割り当て**: セキュリティ監査責任者を指定

#### 監査内容:
1. **脆弱性スキャン**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Supabase セキュリティ確認**
   ```sql
   -- verify_security_fixes.sql を実行
   SELECT * FROM auth_configuration_audit;
   ```

3. **ログ分析**
   - Authentication ログをエクスポート
   - 異常なアクセスパターンを確認
   - 失敗ログイン数をチェック

4. **バックアップ確認**
   - 自動バックアップの動作確認
   - リストアテストの実施

## 📊 現在のステータス確認

```sql
-- 現在のセキュリティステータスを確認
SELECT 
    setting_name as "設定項目",
    CASE 
        WHEN is_compliant THEN '✅'
        ELSE '❌'
    END as "適合",
    recommended_value as "推奨値",
    actual_value as "現在値"
FROM auth_configuration_audit
ORDER BY is_compliant ASC;
```

## 🔐 追加のセキュリティ強化

### 環境別の対応
- **開発環境**: 基本的なセキュリティ設定
- **ステージング環境**: 本番と同等の設定
- **本番環境**: すべてのセキュリティ機能を有効化

### API セキュリティ
- [ ] API キーの定期ローテーション（3ヶ月毎）
- [ ] Service Role キーは環境変数で管理
- [ ] anon キーは最小権限の原則に従う

### ネットワークセキュリティ
- [ ] Database への直接接続を制限
- [ ] 必要に応じて IP ホワイトリスト設定
- [ ] SSL/TLS 接続の強制

## 📅 完了予定日

| タスク | 期限 | 担当者 | 完了 |
|--------|------|--------|------|
| ❌項目の確認 | 即時 | - | [ ] |
| Dashboard設定 | 即時 | - | [ ] |
| 監査テーブル更新 | 設定後 | - | [ ] |
| 月次監査設定 | 今週中 | - | [ ] |

---

最終更新: 2025-08-13
次回監査: 2025-09-01