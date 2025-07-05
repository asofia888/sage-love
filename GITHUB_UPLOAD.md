# 📤 GitHubアップロード手順

## 方法1: GitHub Web UI（最も簡単）

1. **GitHubにアクセス**: [github.com](https://github.com)
2. **新しいリポジトリ作成**:
   - 「New repository」をクリック
   - Repository name: `sage-love-api`
   - Public/Private選択
   - 「Create repository」

3. **ファイルアップロード**:
   - 「uploading an existing file」をクリック
   - このフォルダ内の**すべてのファイル**をドラッグ&ドロップ
   - Commit message: `Initial commit - Sage Love AI Backend`
   - 「Commit changes」

## 方法2: Git CLI（上級者向け）

```bash
cd "/mnt/c/Users/heali/OneDrive/デスクトップ/sage-love"

# Git初期化
git init
git add .
git commit -m "Initial commit - Sage Love AI Backend"

# GitHubリポジトリに接続（URLは作成したリポジトリのURL）
git remote add origin https://github.com/あなたのユーザー名/sage-love-api.git
git branch -M main
git push -u origin main
```

## 🚀 Renderデプロイ（GitHubアップロード後）

1. **Render.com**にアクセス: [render.com](https://render.com)
2. **GitHubでサインアップ/ログイン**
3. **「New +」→「Web Service」**
4. **GitHubリポジトリ選択**: `sage-love-api`
5. **設定入力**:
   - Name: `sage-love-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

6. **環境変数設定**（重要！）:
   ```
   API_KEY = AIzaSyB0vC5yi8FjWVh0VH3T_J0WLDf6G5tuBlw
   NODE_ENV = production
   ALLOWED_ORIGIN = *
   DAILY_TOKEN_LIMIT = 50000
   MONTHLY_REQUEST_LIMIT = 1000
   ```

7. **「Create Web Service」をクリック**

## ⏱️ デプロイ完了

- 約3-5分でデプロイ完了
- URLが自動生成されます: `https://sage-love-api-xxxx.onrender.com`

## 🧪 テスト

```bash
curl -X POST "https://あなたのURL.onrender.com/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

**準備完了！手順に従ってアップロード・デプロイしてください。**