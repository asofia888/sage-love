# Error Monitoring Guide

## Overview

Sage's Love AIは [Sentry](https://sentry.io/) を使用してエラー監視を行います。本番環境でのエラーをリアルタイムで追跡し、デバッグに必要な情報を収集します。

## Setup

### 1. Create Sentry Project

1. [Sentry](https://sentry.io/) でアカウントを作成
2. 新しいプロジェクトを作成（Platform: React）
3. DSN をコピー

### 2. Configure Environment Variables

```bash
# .env.local (ローカル開発用)
VITE_SENTRY_DSN=https://xxxx@xxx.ingest.sentry.io/xxxx
VITE_APP_VERSION=1.0.0

# Vercel (本番環境)
vercel env add VITE_SENTRY_DSN
vercel env add VITE_APP_VERSION
```

### 3. Verify Installation

開発サーバーを起動し、コンソールを確認:

```
✅ Sentry initialized successfully
✅ Global error handlers initialized (Sentry: enabled)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Sources                             │
├─────────────────────────────────────────────────────────────┤
│  • React Components (ErrorBoundary)                         │
│  • API Calls (ErrorService)                                 │
│  • Global Errors (window.onerror)                           │
│  • Unhandled Rejections (window.onunhandledrejection)       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Error Logger                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • Severity Classification (LOW/MEDIUM/HIGH/CRITICAL)   ││
│  │  • Category Tagging                                     ││
│  │  • Context Collection                                   ││
│  │  • Local Storage (last 100 errors)                      ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sentry SDK                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • Error Capture (HIGH/CRITICAL only)                   ││
│  │  • Breadcrumbs (All errors)                             ││
│  │  • Performance Tracing                                  ││
│  │  • Session Replay (on error)                            ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sentry Dashboard                          │
│  • Real-time error alerts                                   │
│  • Error grouping and deduplication                         │
│  • Stack traces with source maps                            │
│  • User session context                                     │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Error Severity Levels

| Level | Description | Sentry Level | Action |
|-------|-------------|--------------|--------|
| `LOW` | Minor issues | `info` | Breadcrumb only |
| `MEDIUM` | Warnings | `warning` | Breadcrumb only |
| `HIGH` | Errors | `error` | Sent to Sentry |
| `CRITICAL` | Fatal errors | `fatal` | Sent to Sentry |

### Automatic Filtering

以下のエラーは自動的にフィルタリングされ、Sentryに送信されません:

- ネットワークエラー（ユーザーの接続問題）
- レート制限エラー（期待される動作）
- ブラウザ拡張機能のエラー
- サードパーティスクリプトのエラー

### Breadcrumbs

すべてのエラーはBreadcrumbとして記録され、エラー発生前のユーザーの行動を追跡できます:

```typescript
addBreadcrumb(
  'user_action',
  'User sent message',
  'info',
  { messageLength: 150 }
);
```

### Performance Monitoring

パフォーマンストレースも収集されます（サンプルレート: 10%）:

- ページロード時間
- API リクエスト時間
- コンポーネントレンダリング時間

## Usage

### Basic Error Logging

```typescript
import { errorLogger, ErrorSeverity } from './lib/error-logger';

// Log an error
errorLogger.log(
  new Error('Something went wrong'),
  ErrorSeverity.HIGH,
  'API_ERROR',
  {
    component: 'ChatService',
    action: 'sendMessage',
    metadata: { userId: '123' }
  }
);
```

### Direct Sentry API

```typescript
import { captureException, addBreadcrumb, setUser } from './lib/sentry';

// Capture exception
captureException(error, {
  level: 'error',
  tags: { component: 'ChatInput' },
  extra: { messageLength: 500 }
});

// Add breadcrumb
addBreadcrumb('navigation', 'User opened help modal', 'info');

// Set user context
setUser({ sessionId: 'abc123' });
```

### Error Boundary Integration

ErrorBoundaryは自動的にSentryにエラーを報告します:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Custom error handling
    console.log('Error caught:', error.message);
  }}
>
  <App />
</ErrorBoundary>
```

## Configuration

### sentry.ts Options

```typescript
Sentry.init({
  dsn: SENTRY_DSN,
  environment: 'production',
  release: 'sages-love-ai@1.0.0',

  // Performance sampling
  tracesSampleRate: 0.1,  // 10% of transactions

  // Session replay (only on errors)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Filter errors
  beforeSend(event) {
    // Return null to drop the event
    return event;
  },

  // Ignore patterns
  ignoreErrors: [
    'Network Error',
    'ERR_RATE_LIMIT',
  ],
});
```

## Monitoring Dashboard

### Key Metrics

Sentryダッシュボードで以下を監視:

1. **Error Rate**: エラー発生頻度
2. **Error Types**: エラーの種類と分布
3. **Affected Users**: 影響を受けたユーザー数
4. **Performance**: API レスポンス時間

### Alerts

以下のアラートを設定することを推奨:

| Alert | Condition | Action |
|-------|-----------|--------|
| High Error Rate | > 10 errors/min | Slack/Email通知 |
| Critical Error | severity: fatal | 即座に通知 |
| New Error Type | 新しいエラーパターン | 通知 |

### Sample Alert Configuration

Sentryダッシュボードで:

1. **Alerts** > **Create Alert Rule**
2. **When**: Error count > 10 in 5 minutes
3. **Then**: Send notification to Slack/Email
4. **Filter**: environment:production

## Local Development

開発環境では、Sentryは自動的に無効化されます:

```typescript
// sentry.ts
enabled: ENVIRONMENT === 'production',
```

ローカルでテストする場合:

```bash
# 一時的に有効化
VITE_SENTRY_DSN=your-dsn npm run dev
```

## Troubleshooting

### Sentry Not Initializing

1. DSNが正しく設定されているか確認
2. 環境変数が読み込まれているか確認:
   ```javascript
   console.log(import.meta.env.VITE_SENTRY_DSN);
   ```
3. ブラウザの開発者ツールでネットワークリクエストを確認

### Errors Not Appearing in Dashboard

1. エラーのSeverityがHIGH以上か確認
2. `beforeSend` でフィルタリングされていないか確認
3. `ignoreErrors` パターンに一致していないか確認

### Source Maps

ソースマップをアップロードしてスタックトレースを読みやすくする:

```bash
# Sentry CLI をインストール
npm install -g @sentry/cli

# ソースマップをアップロード
sentry-cli releases files sages-love-ai@1.0.0 upload-sourcemaps ./dist
```

## Best Practices

1. **Severity を適切に設定**: すべてのエラーをCRITICALにしない
2. **Context を追加**: デバッグに必要な情報を含める
3. **PII を送信しない**: 個人情報をextraに含めない
4. **アラートを設定**: 重要なエラーは即座に通知
5. **定期的にレビュー**: エラーを放置しない

## Privacy Considerations

- ユーザーの個人情報（メールアドレス、名前等）は収集しない
- メッセージ内容は送信しない
- IPアドレスは匿名化（Sentry設定で有効）
- Session Replayはテキストをマスク
