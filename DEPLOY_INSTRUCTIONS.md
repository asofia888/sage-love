# 🚀 簡単デプロイ手順 - Render使用

## 準備完了！
バックエンドAPI（`server.js`）は完全に構築されており、すぐにデプロイできます。

## 📋 デプロイ手順

### ステップ 1: GitHubにアップロード
1. GitHubで新しいリポジトリを作成
2. このフォルダをアップロード

### ステップ 2: Renderでデプロイ
1. [Render.com](https://render.com) にアクセス
2. GitHubアカウントでサインアップ/ログイン
3. 「New +」→「Web Service」
4. GitHubリポジトリを選択
5. 以下の設定を入力：

**基本設定:**
- Name: `sage-love-api`
- Environment: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

**環境変数（Environment Variables）:**
```
API_KEY = [YOUR_GEMINI_API_KEY]
NODE_ENV = production
ALLOWED_ORIGIN = *
DAILY_TOKEN_LIMIT = 50000
MONTHLY_REQUEST_LIMIT = 1000
```

### ステップ 3: デプロイ実行
「Create Web Service」をクリック

## ✅ 完成！
数分でAPIが利用可能になります。

**APIエンドポイント:**
- ベースURL: `https://あなたのプロジェクト名.onrender.com`
- チャット: `https://あなたのプロジェクト名.onrender.com/api/chat`

## 🧪 テスト方法
```bash
curl -X POST "https://あなたのプロジェクト名.onrender.com/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

## 🛡️ セキュリティ機能
- ✅ レート制限（IP別20req/分）
- ✅ 入力検証（4000文字制限）
- ✅ 安全性フィルター（不適切コンテンツブロック）
- ✅ セキュリティヘッダー
- ✅ CORS設定
- ✅ **API使用量制限（NEW!）**
  - 日次トークン制限: 50,000トークン
  - 月次リクエスト制限: 1,000リクエスト
  - 制限超過時は自動ブロック

## 📊 使用量監視
**使用量確認エンドポイント**: `/api/usage`
```bash
curl https://あなたのプロジェクト名.onrender.com/api/usage
```

レスポンス例:
```json
{
  "status": "available",
  "usage": {
    "dailyTokens": { "used": 1500, "limit": 50000, "remaining": 48500 },
    "monthlyRequests": { "used": 25, "limit": 1000, "remaining": 975 }
  }
}
```

**すべて準備完了です！GitHubにアップロードしてRenderでデプロイするだけです。**