@echo off
echo ===================================
echo   Sage's Love AI デプロイスクリプト
echo ===================================
echo.

echo ステップ 1: 依存関係をインストール中...
call npm install
if %errorlevel% neq 0 (
    echo エラー: npm install に失敗しました
    pause
    exit /b 1
)

echo.
echo ステップ 2: Vercelにデプロイ中...
call npm run deploy
if %errorlevel% neq 0 (
    echo エラー: デプロイに失敗しました
    pause
    exit /b 1
)

echo.
echo ✅ デプロイが完了しました！
echo.
echo 次の手順:
echo 1. Vercelダッシュボードで環境変数を設定
echo 2. API_KEY = AIzaSyB0vC5yi8FjWVh0VH3T_J0WLDf6G5tuBlw
echo 3. NODE_ENV = production
echo 4. ALLOWED_ORIGIN = https://yourdomain.vercel.app
echo.
pause