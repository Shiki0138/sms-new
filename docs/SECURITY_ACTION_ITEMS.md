# Supabase セキュリティ対応アクションアイテム

## 🚨 優先度：高 - 即時対応必要

### 1. ❌ 項目の確認と対応

#### A. Supabase ダッシュボードでのSQL実行
1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクトを選択
3. SQL Editor で以下を順番に実行：
   ```sql
   -- ファイル: /salon-light-plan/supabase/migrations/013_security_fixes.sql
   -- ファイル: /salon-light-plan/supabase/migrations/014_fix_all_function_search_paths.sql
   ```

#### B. 検証スクリプトの実行
```sql
-- ファイル: /salon-light-plan/supabase/migrations/verify_security_fixes.sql
-- 実行後、❌ 項目を確認
```

### 2. 認証設定の更新（Supabase Dashboard）

**場所**: Authentication → Settings

#### 必須設定:
- [ ] **OTP設定**
  - OTP Expiry: `1800` 秒（30分）に変更
  
- [ ] **パスワード要件**
  - Minimum password length: `8` 文字
  - Password character requirements: 有効化
  - Check passwords against breach database (HIBP): 有効化
  
- [ ] **追加セキュリティ**
  - Multi-factor authentication (MFA): 有効化
  - Refresh token rotation: 有効化

### 3. auth_configuration_audit テーブルの更新

認証設定完了後、以下のSQLを実行：

```sql
INSERT INTO auth_configuration_audit (
    config_key,
    expected_value,
    actual_value,
    is_compliant,
    last_checked
) VALUES
    ('otp_expiry', '1800', '1800', true, NOW()),
    ('password_min_length', '8', '8', true, NOW()),
    ('password_hibp_enabled', 'true', 'true', true, NOW()),
    ('mfa_enabled', 'true', 'true', true, NOW()),
    ('refresh_token_rotation', 'true', 'true', true, NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
    actual_value = EXCLUDED.actual_value,
    is_compliant = EXCLUDED.is_compliant,
    last_checked = NOW();
```

### 4. 定期セキュリティ監査の設定

#### 月次タスク（毎月1日実施）:
1. **脆弱性スキャン**
   ```bash
   npm audit
   npm audit fix
   ```

2. **セキュリティ設定確認**
   - verify_security_fixes.sql を実行
   - auth_configuration_audit テーブルを確認

3. **ログ監視**
   - 認証失敗ログの確認
   - 異常なデータアクセスパターンの確認

#### 四半期タスク:
1. **ペネトレーションテスト**
2. **セキュリティポリシーの見直し**
3. **バックアップリストアテスト**

## 📅 実施スケジュール

| タスク | 期限 | 担当者 | ステータス |
|--------|------|--------|------------|
| SQL マイグレーション実行 | 即時 | - | 未完了 |
| 認証設定更新 | 即時 | - | 未完了 |
| 検証スクリプト実行 | 設定後 | - | 未完了 |
| audit テーブル更新 | 設定後 | - | 未完了 |
| 月次監査スケジュール設定 | 今週中 | - | 未完了 |

## 🔐 追加推奨事項

1. **環境変数の確認**
   - 本番環境で全ての秘密鍵を環境変数に移行
   - `.env` ファイルを `.gitignore` に追加

2. **アクセス制御**
   - Supabase の API キーローテーション（3ヶ月毎）
   - IP ホワイトリスト設定（可能な場合）

3. **モニタリング**
   - Supabase のログエクスポート設定
   - アラート設定（異常ログイン検知）

## 📞 サポート

問題が発生した場合:
1. Supabase サポートに連絡
2. セキュリティインシデント対応手順書を参照
3. 必要に応じて外部セキュリティ専門家に相談

---

最終更新: 2025-08-13
次回レビュー予定: 2025-09-01