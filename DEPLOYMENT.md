# Sage's Love AI デプロイガイド

## 🚀 Vercelデプロイ手順

### ステップ 1: 必要なツールをインストール

```bash
# Vercel CLIをインストール（初回のみ）
npm install -g vercel
```

### ステップ 2: Vercelにログイン

```bash
vercel login
```

### ステップ 3: プロジェクトの依存関係をインストール

```bash
npm install
```

### ステップ 4: ローカルでテスト（任意）

```bash
# 開発サーバーを起動
npm run dev

# ユニットテスト / 本番ビルド確認
npm run test:run
npm run build
```

### ステップ 5: デプロイ

```bash
# プレビュー環境にデプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

GitHubリポジトリをVercelプロジェクトに接続している場合は、`main`ブランチへのpushで自動的に本番デプロイされます。

## ⚙️ 環境変数の設定

Vercelダッシュボード → プロジェクト → Settings → Environment Variables で設定します。

### 必須

1. **GEMINI_API_KEY**: Google Gemini APIキー
   - 未設定だとチャットAPIが起動時検証エラーになります
2. **SESSION_SECRET**: セッションCookie署名用のHMACキー（**16文字以上**）
   - 生成例: `openssl rand -base64 32`
   - 未設定・16文字未満の場合、`/api/chat` がすべて 500 (`SESSION_INIT_ERROR`) になります

### 任意（推奨）

3. **UPSTASH_REDIS_REST_URL** / **UPSTASH_REDIS_REST_TOKEN**: レート制限・コスト上限の保存先（Upstash Redis）
   - **必ず両方セットで設定**してください。片方だけ設定すると起動時検証エラーで `/api/chat` が 400 になります
   - 未設定の場合、IP/セッション/コスト系のレート制限は無効になり、文字数などの入力検証のみ有効です
4. **ADMIN_TOKEN**: `/api/admin/stats`（利用状況・コスト確認）の認証トークン
5. **VITE_SENTRY_DSN**: フロントエンドのSentryエラー監視（任意）

### ALLOWED_ORIGIN について

`ALLOWED_ORIGIN`（`/api/chat` のOriginチェック用・カンマ区切り）は `vercel.json` の `env` で設定済みです:

```
https://www.sage-love.com,https://sage-love.vercel.app
```

独自ドメインを変更する場合は `vercel.json` を更新してください。**ワイルドカード `*` は非対応**です（設定するとすべてのオリジンが403になります）。

## 🔧 トラブルシューティング

**エラー**: `vercel: command not found`
- Vercel CLIを再インストール: `npm install -g vercel`

**症状**: `/api/chat` がすべて 500 (`SESSION_INIT_ERROR`)
- `SESSION_SECRET` が未設定か16文字未満です

**症状**: `/api/chat` がすべて 400（`Missing required env var: ...`）
- 環境変数の検証エラーです。`GEMINI_API_KEY` の有無、Upstashの2変数が両方設定されているかを確認してください

**エラー**: `Too many requests` (429)
- 下記のレート制限に到達しています。表示された待ち時間の後に再試行してください

## 🛡️ セキュリティ機能（実装値）

- IPレート制限: **10リクエスト/15分**、バースト **3リクエスト/分**
- セッション制限: **15リクエスト/時**、**30リクエスト/日**（HMAC署名HttpOnly Cookieで識別）
- グローバルコスト上限: **$5/時間、$10/日**（**$15**で緊急停止）
- 入力検証: メッセージ**1000文字**以内、会話履歴**10件**まで
- システムプロンプトはサーバー側で構築（クライアントからの注入不可）
- セキュリティヘッダー: CSP / HSTS / X-Frame-Options ほか（`vercel.json`）

## 📱 デプロイ後の確認

1. `https://<your-domain>/api/health` で稼働状態と設定を確認
2. アプリを開いてチャットを送信し、ストリーミング応答を確認
3. （`ADMIN_TOKEN` 設定時）利用状況の確認:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<your-domain>/api/admin/stats
```

## 📞 サポート

問題が発生した場合は、以下を確認してください：
1. 環境変数が正しく設定されているか（特に `SESSION_SECRET` と Upstash のペア設定）
2. APIキーが有効か
3. Vercelの使用制限に達していないか
