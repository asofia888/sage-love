#!/bin/bash

echo "==================================="
echo "  Sage's Love AI デプロイスクリプト"
echo "==================================="
echo

echo "ステップ 1: 依存関係をインストール中..."
npm install
if [ $? -ne 0 ]; then
    echo "エラー: npm install に失敗しました"
    read -p "Enterキーを押して終了..."
    exit 1
fi

echo
echo "ステップ 2: Vercel CLIをチェック中..."
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLIをインストール中..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo "エラー: Vercel CLIのインストールに失敗しました"
        read -p "Enterキーを押して終了..."
        exit 1
    fi
fi

echo
echo "ステップ 3: Vercelにログイン中..."
echo "ブラウザでログイン画面が開きます..."
vercel login
if [ $? -ne 0 ]; then
    echo "エラー: ログインに失敗しました"
    read -p "Enterキーを押して終了..."
    exit 1
fi

echo
echo "ステップ 4: Vercelにデプロイ中..."
vercel --prod
if [ $? -ne 0 ]; then
    echo "エラー: デプロイに失敗しました"
    read -p "Enterキーを押して終了..."
    exit 1
fi

echo
echo "✅ デプロイが完了しました！"
echo
echo "次の手順:"
echo "1. Vercelダッシュボードで環境変数を設定"
echo "   https://vercel.com/dashboard"
echo "2. GEMINI_API_KEY = [新しいAPI KEYを設定してください]"
echo "3. NODE_ENV = production"
echo "4. ALLOWED_ORIGIN = https://yourdomain.vercel.app"
echo
read -p "Enterキーを押して終了..."