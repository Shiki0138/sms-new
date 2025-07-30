# アプリケーションの表示方法

## 方法1: VS Code の Live Server 拡張機能（推奨）

1. VS Code で「Live Server」拡張機能をインストール
2. `dist/index.html` を右クリック
3. 「Open with Live Server」を選択

## 方法2: 直接ブラウザで開く（デモデータ用）

デモ用のHTMLファイルを作成しました：

```bash
open demo.html
```

## 方法3: ファイアウォールの設定確認

macOSのファイアウォール設定を確認：

1. システム環境設定 → セキュリティとプライバシー → ファイアウォール
2. ファイアウォールオプションで「受信接続をブロック」を確認
3. 必要に応じて一時的に無効化

## 方法4: 別のポートを試す

```bash
# ポート 9000 で試す
cd dist && python3 -m http.server 9000

# または
npx http-server dist -p 9999
```

## トラブルシューティング

- ブラウザのキャッシュをクリア（Cmd + Shift + R）
- 別のブラウザで試す（Safari, Firefox など）
- セキュリティソフトの設定を確認
- VPNを使用している場合は一時的に無効化