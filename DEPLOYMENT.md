# Sage's Love AI バックエンド デプロイガイド

## 🚀 初心者でも簡単！Vercelデプロイ手順

### ステップ 1: 必要なツールをインストール

```bash
# Vercel CLIをインストール（初回のみ）
npm install -g vercel
```

### ステップ 2: Vercelにログイン

```bash
# Vercelアカウントでログイン
vercel login
```

### ステップ 3: プロジェクトの依存関係をインストール

```bash
# プロジェクトフォルダで実行
npm install
```

### ステップ 4: ローカルでテスト（任意）

```bash
# ローカルサーバーを起動
npm run dev
```

### ステップ 5: 本番環境にデプロイ

```bash
# 本番環境にデプロイ
npm run deploy
```

## ⚙️ 環境変数の設定

### Vercelダッシュボードで設定する環境変数：

1. **API_KEY**: Google Gemini APIキー
   - 値: `[YOUR_GEMINI_API_KEY]`

2. **ALLOWED_ORIGIN**: フロントエンドのURL
   - 開発時: `*`
   - 本番時: `https://yourdomain.vercel.app`

3. **NODE_ENV**: 環境設定
   - 値: `production`

### 環境変数設定手順：

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. 「Settings」タブをクリック
4. 「Environment Variables」をクリック
5. 上記の変数を追加

## 🔧 トラブルシューティング

### よくあるエラーと解決方法：

**エラー**: `vercel: command not found`
```bash
# 解決方法: Vercel CLIを再インストール
npm install -g vercel
```

**エラー**: `API key is not configured`
```bash
# 解決方法: 環境変数 API_KEY が設定されているか確認
```

**エラー**: `Too many requests`
```bash
# 解決方法: 1分間に20回以上リクエストを送信している場合の制限
# 少し待ってから再試行
```

## 📱 デプロイ後の確認

1. デプロイが完了すると、VercelからURLが提供されます
2. `https://your-project.vercel.app/api/chat` にアクセス
3. POST リクエストでチャット機能をテスト

## 🛡️ セキュリティ機能

- レート制限: IP別1分間20リクエスト
- 入力検証: メッセージ長制限
- 安全性フィルター: 不適切なコンテンツをブロック
- セキュリティヘッダー: XSS、フレーミング攻撃を防止

## 📞 サポート

問題が発生した場合は、以下を確認してください：
1. 環境変数が正しく設定されているか
2. APIキーが有効か
3. Vercelの使用制限に達していないか