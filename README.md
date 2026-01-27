# Sage's Love AI

Gemini APIを活用した、多言語対応の瞑想・スピリチュアルガイダンスAIアプリケーション。

## Features

- **AIチャット**: Gemini Flash APIとのリアルタイム対話
- **多言語対応**: 7言語（日本語、英語、スペイン語、ポルトガル語、フランス語、ヒンディー語、アラビア語）
- **危機検出**: 自傷・自殺関連キーワードの多言語検出と緊急リソース提供
- **レート制限**: IP/セッション/コストベースの多層防御
- **エラーハンドリング**: Circuit Breaker + Retry with Backoff

## Tech Stack

| カテゴリ | 技術 |
|---------|------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Vercel Edge Functions |
| AI | Google Gemini Flash API |
| i18n | i18next |
| Rate Limiting | Upstash Redis |
| Testing | Vitest, Testing Library |

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Gemini API Key ([Google AI Studio](https://aistudio.google.com/)で取得)

### Installation

```bash
# リポジトリをクローン
git clone https://github.com/your-repo/sage-love.git
cd sage-love

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
```

### Environment Variables

`.env.local`を編集:

```bash
# 必須: Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# 本番環境用: Upstash Redis (レート制限)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here

# オプション: コスト制限（デフォルト値あり）
DAILY_COST_LIMIT=50.0
HOURLY_COST_LIMIT=5.0
EMERGENCY_STOP_LIMIT=75.0

# オプション: 統計エンドポイント認証
ADMIN_TOKEN=your-secure-admin-token-here

# 本番環境推奨: Sentry エラー監視
VITE_SENTRY_DSN=https://xxxx@xxx.ingest.sentry.io/xxxx
VITE_APP_VERSION=1.0.0
```

### Development

```bash
# 開発サーバー起動
npm run dev

# ブラウザで開く
open http://localhost:5173
```

### Testing

```bash
# テスト実行
npm test

# カバレッジ付き
npm run test:coverage

# ウォッチモード
npm run test:watch

# UIモード
npm run test:ui
```

### Build & Deploy

```bash
# プロダクションビルド
npm run build

# プレビュー
npm run preview
```

Vercelへのデプロイ:
```bash
vercel
```

## Project Structure

```
sage-love/
├── api/                    # Vercel Edge Functions
│   ├── chat.ts             # メインチャットAPI
│   ├── stats.ts            # ヘルスチェック・統計API
│   ├── errors.ts           # カスタムエラークラス
│   ├── rate-limiter.ts     # レート制限ロジック
│   ├── circuit-breaker.ts  # サーキットブレーカー
│   └── retry-utils.ts      # リトライユーティリティ
├── src/
│   ├── components/         # Reactコンポーネント
│   ├── services/           # ビジネスロジック
│   ├── hooks/              # カスタムフック
│   ├── lib/                # i18n設定・ユーティリティ
│   │   ├── locales/        # 翻訳ファイル (7言語)
│   │   └── i18n.ts         # i18next設定
│   ├── types/              # TypeScript型定義
│   └── test/               # テスト設定
├── docs/                   # ドキュメント
├── public/                 # 静的アセット
└── package.json
```

## Documentation

| ドキュメント | 内容 |
|------------|------|
| [API Reference](docs/API.md) | APIエンドポイント仕様 |
| [Architecture](docs/ARCHITECTURE.md) | システムアーキテクチャ |
| [Error Handling](docs/ERROR_HANDLING.md) | エラーハンドリング詳細 |
| [i18n Guide](docs/I18N.md) | 国際化・翻訳ガイド |
| [Monitoring](docs/MONITORING.md) | エラー監視・Sentry設定 |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | トラブルシューティング |

## Security Features

### Rate Limiting
- **IPベース**: 10リクエスト/15分
- **バースト**: 3リクエスト/分
- **セッション**: 15リクエスト/時間、30リクエスト/日
- **コスト**: $5/時間、$50/日（自動停止）

### Content Filtering
- Gemini API Safety Settings（4カテゴリ）
- 入力検証（文字数制限、履歴制限）

### Crisis Detection
- 7言語対応の危機キーワード検出
- 4段階の重要度分類
- 緊急リソースへの自動誘導

## Scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルドプレビュー |
| `npm test` | テスト実行（ウォッチモード） |
| `npm run test:run` | テスト実行（単発） |
| `npm run test:coverage` | カバレッジ計測 |
| `npm run test:ui` | テストUIモード |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License - see [LICENSE](LICENSE) for details.

## Support

- Issues: [GitHub Issues](https://github.com/your-repo/sage-love/issues)
- Documentation: [docs/](docs/)
