# SMS CSS アーキテクチャ移行計画

## 概要

現在のCSS崩れ問題を解決するため、新しいCSS アーキテクチャ（SMACSS + BEM + Design System）への段階的移行を実施します。

## 現在の問題点

### 特定された主要問題
- **重複・コンフリクト**: main-unified.css (42KB) と unified-salon.css (41KB) が併存
- **カラー定義の不統一**: `#d4a574` vs `#E91E63`
- **分散管理**: 11個の個別CSSファイル + 各HTMLページのインラインスタイル  
- **責任分離の破綻**: ページ固有スタイルが共通CSSに混入

## 新しいCSS アーキテクチャ

### アーキテクチャ原則
1. **SMACSS (Scalable and Modular Architecture)** - 5つのレイヤー分離
2. **BEM (Block Element Modifier)** - 統一命名規則
3. **Design System** - デザイントークンによる統一性
4. **Single Source of Truth** - 単一ソース原則

### ファイル構造
```
app/frontend/css/
├── salon-design-system.css  # Design Tokens (CSS Variables)
├── salon-base.css           # Reset & Typography Foundation  
├── salon-layout.css         # Grid & Container Systems
├── salon-components.css     # Reusable UI Components (BEM)
├── salon-main.css           # Main Entry Point (imports all)
├── pages/                   # Page-specific styles (optional)
│   ├── dashboard.css
│   ├── customer.css
│   └── booking.css
└── legacy/                  # Legacy files (migration period)
    ├── main-unified.css
    ├── unified-salon.css
    └── ...
```

## 段階的移行戦略

### Phase 1: 基盤準備 (1-2日)
**目標**: 新しいアーキテクチャの基盤を構築

#### 1.1 新アーキテクチャファイル作成 ✅
- [x] salon-design-system.css (Design Tokens)
- [x] salon-base.css (Reset & Typography)  
- [x] salon-layout.css (Layout System)
- [x] salon-components.css (UI Components)
- [x] salon-main.css (Main Entry Point)

#### 1.2 既存ファイルのバックアップ
```bash
# 既存CSSファイルをlegacyフォルダに移動
mkdir -p app/frontend/css/legacy
mv app/frontend/css/main-unified.css app/frontend/css/legacy/
mv app/frontend/css/unified-salon.css app/frontend/css/legacy/
mv app/frontend/css/styles.css app/frontend/css/legacy/
# その他のファイルも同様に移動
```

#### 1.3 バージョン管理の設定
```bash
git add .
git commit -m "feat: Add new CSS architecture foundation files

- Add salon-design-system.css with Design Tokens
- Add salon-base.css with modern CSS reset
- Add salon-layout.css with grid system
- Add salon-components.css with BEM components
- Add salon-main.css as single entry point

Backup existing CSS files to legacy folder"
```

### Phase 2: 段階的置換 (3-4日)
**目標**: ページ単位で新しいCSSに置換

#### 2.1 テスト環境での検証
- テストサーバーで新CSSの動作確認
- 主要ブラウザでの表示チェック
- レスポンシブ動作の確認

#### 2.2 プライオリティ順でページ移行

**優先順位 1: 重要ページ**
1. `login.html` - ログインページ（最もシンプル）
2. `dashboard.html` - メインダッシュボード
3. `index.html` - ランディングページ

**優先順位 2: 管理ページ**
4. `customers.html` - 顧客管理
5. `appointments.html` - 予約管理  
6. `services.html` - サービス管理

**優先順位 3: その他のページ**
7. 残りのHTMLファイル

#### 2.3 各ページの移行手順
```html
<!-- OLD: -->
<link rel="stylesheet" href="/css/main-unified.css?v=20250906">

<!-- NEW: -->
<link rel="stylesheet" href="/css/salon-main.css?v=2.0.0">
```

### Phase 3: コンポーネント最適化 (2-3日)
**目標**: 各ページ特有のスタイルを新アーキテクチャに合わせて最適化

#### 3.1 インラインスタイルの統合
- 各HTMLファイル内の`<style>`タグ内容を分析
- 共通パターンをコンポーネント化
- ページ固有スタイルは別ファイル化

#### 3.2 BEM命名規則への統一
```css
/* OLD: */
.header .container .nav a:hover { }

/* NEW: */
.sms-nav__link:hover { }
.sms-nav__link--active { }
```

#### 3.3 CSS変数の活用
```css
/* OLD: */
color: #d4a574;

/* NEW: */
color: var(--sms-primary-500);
```

### Phase 4: 品質保証とテスト (1-2日)
**目標**: 全ページでの動作確認と最適化

#### 4.1 クロスブラウザテスト
- Chrome, Firefox, Safari, Edge
- モバイル端末での表示確認
- 印刷スタイルの確認

#### 4.2 パフォーマンステスト
- CSSファイルサイズの最適化
- 読み込み時間の測定
- Critical CSSの実装検討

#### 4.3 アクセシビリティチェック  
- WCAG 2.1 AA準拠確認
- キーボードナビゲーション
- スクリーンリーダー対応

### Phase 5: クリーンアップと最終化 (1日)
**目標**: 不要ファイルの削除と最終調整

#### 5.1 レガシーファイルの削除
- 移行完了確認後にlegacyフォルダを削除
- 未使用CSSファイルの特定と削除

#### 5.2 ドキュメント更新
- CSS使用ガイドラインの作成
- コンポーネントライブラリの整備
- 今後の保守方針の策定

## 後方互換性の確保

### 段階的移行期間中の対応
1. **A/Bテスト機能**: 新旧CSS切り替え可能な仕組み
2. **フォールバック**: 新CSS読み込み失敗時の旧CSS適用
3. **段階的ロールアウト**: ページ単位での段階的適用

### 緊急時のロールバック手順
```html
<!-- 緊急時: 新CSSから旧CSSに戻す -->
<link rel="stylesheet" href="/css/legacy/main-unified.css?v=20250906">
```

## テスト戦略

### 自動テスト
```bash
# CSS Lint チェック
npx stylelint "app/frontend/css/**/*.css"

# Visual Regression テスト (Percy/Chromatic等)
npm run test:visual

# パフォーマンステスト
npm run test:performance
```

### 手動テスト
- [ ] 全ページの表示確認
- [ ] レスポンシブ動作確認
- [ ] フォーム操作確認  
- [ ] ナビゲーション動作確認
- [ ] 印刷プレビュー確認

## リスク管理

### 想定リスク と対策
1. **表示崩れ**: 段階的移行により影響範囲を限定
2. **パフォーマンス劣化**: CSS最適化とキャッシュ戦略で対応
3. **ユーザー体験の一貫性**: デザインシステムで統一性確保

### 成功指標  
- [ ] CSS崩れゼロ達成
- [ ] ファイルサイズ30%以上削減
- [ ] 全ページでデザイン統一性達成  
- [ ] 保守性向上（CSS変更時の影響範囲明確化）

## 実装スケジュール

| Phase | 作業内容 | 期間 | 担当 | Status |
|-------|----------|------|------|--------|
| Phase 1 | 基盤準備 | Day 1-2 | System Architect | ✅ Complete |
| Phase 2 | 段階的置換 | Day 3-6 | Frontend Developer | 🔄 Next |
| Phase 3 | コンポーネント最適化 | Day 7-9 | UI Developer | ⏳ Pending |
| Phase 4 | 品質保証とテスト | Day 10-11 | QA Engineer | ⏳ Pending |
| Phase 5 | クリーンアップ | Day 12 | System Architect | ⏳ Pending |

## まとめ

この移行計画により、CSS崩れ問題を根本的に解決し、保守性・拡張性・統一性を兼ね備えた新しいCSS アーキテクチャを実現します。段階的アプローチにより、リスクを最小化しながら確実に移行を進めます。