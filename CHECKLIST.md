# 🚀 デプロイ前チェックリスト

## 事前準備
- [ ] Node.js がインストールされている
- [ ] Vercelアカウントを作成済み
- [ ] Google Gemini APIキーを取得済み

## デプロイ手順（初心者向け）

### ⚡ 簡単な方法（Windows）
- [ ] `deploy.bat` をダブルクリックして実行

### 📱 手動での方法
1. **Vercel CLIインストール**
   - [ ] `npm install -g vercel` を実行

2. **ログイン**
   - [ ] `vercel login` を実行してログイン

3. **デプロイ**
   - [ ] `npm run deploy` を実行

4. **環境変数設定**
   - [ ] Vercelダッシュボードにアクセス
   - [ ] プロジェクトの Settings > Environment Variables
   - [ ] `API_KEY` = `[YOUR_GEMINI_API_KEY]`
   - [ ] `NODE_ENV` = `production`
   - [ ] `ALLOWED_ORIGIN` = `https://yourdomain.vercel.app`

## デプロイ後の確認
- [ ] デプロイURLにアクセスできる
- [ ] `/api/chat` エンドポイントが応答する
- [ ] フロントエンドからAPI呼び出しが成功する

## トラブル時
- [ ] `DEPLOYMENT.md` の「トラブルシューティング」を確認
- [ ] Vercelダッシュボードでログを確認
- [ ] 環境変数が正しく設定されているか確認

---
💡 **初心者の方へ**: まずは `deploy.bat` を実行してみてください！