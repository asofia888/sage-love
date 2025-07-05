Write-Host "===================================" -ForegroundColor Green
Write-Host "  Sage's Love AI デプロイスクリプト" -ForegroundColor Green  
Write-Host "===================================" -ForegroundColor Green
Write-Host

Write-Host "ステップ 1: 依存関係をインストール中..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: npm install に失敗しました" -ForegroundColor Red
    Read-Host "Enterキーを押して終了"
    exit 1
}

Write-Host
Write-Host "ステップ 2: Vercel CLIをチェック中..." -ForegroundColor Yellow
$vercelExists = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelExists) {
    Write-Host "Vercel CLIをインストール中..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "エラー: Vercel CLIのインストールに失敗しました" -ForegroundColor Red
        Read-Host "Enterキーを押して終了"
        exit 1
    }
}

Write-Host
Write-Host "ステップ 3: Vercelにログイン中..." -ForegroundColor Yellow
Write-Host "ブラウザでログイン画面が開きます..." -ForegroundColor Cyan
vercel login
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: ログインに失敗しました" -ForegroundColor Red
    Read-Host "Enterキーを押して終了"
    exit 1
}

Write-Host
Write-Host "ステップ 4: Vercelにデプロイ中..." -ForegroundColor Yellow
vercel --prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: デプロイに失敗しました" -ForegroundColor Red
    Read-Host "Enterキーを押して終了"
    exit 1
}

Write-Host
Write-Host "✅ デプロイが完了しました！" -ForegroundColor Green
Write-Host
Write-Host "次の手順:" -ForegroundColor Cyan
Write-Host "1. Vercelダッシュボードで環境変数を設定"
Write-Host "   https://vercel.com/dashboard"
Write-Host "2. API_KEY = AIzaSyB0vC5yi8FjWVh0VH3T_J0WLDf6G5tuBlw"
Write-Host "3. NODE_ENV = production"
Write-Host "4. ALLOWED_ORIGIN = https://yourdomain.vercel.app"
Write-Host
Read-Host "Enterキーを押して終了"