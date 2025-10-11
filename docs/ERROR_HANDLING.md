# エラーハンドリングガイド

## 概要

このアプリケーションは、堅牢なエラーハンドリングシステムを実装しています。

## アーキテクチャ

### 1. カスタムエラークラス (`api/errors.ts`)

型安全なエラー処理のためのカスタムエラークラス:

```typescript
// エラーカテゴリ
enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA = 'QUOTA',
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  VALIDATION = 'VALIDATION',
  INTERNAL = 'INTERNAL',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
}

// 基本エラークラス
class APIError extends Error {
  category: ErrorCategory;
  statusCode: number;
  isRetryable: boolean;
  errorCode: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}
```

**利用可能なエラークラス:**
- `AuthenticationError` - 認証エラー (401)
- `RateLimitError` - レート制限エラー (429)
- `QuotaError` - クォータ超過エラー (429)
- `TimeoutError` - タイムアウトエラー (408)
- `ServiceUnavailableError` - サービス利用不可 (503)
- `ValidationError` - バリデーションエラー (400)
- `CircuitBreakerError` - サーキットブレーカーエラー (503)

### 2. リトライロジック (`api/retry-utils.ts`)

Exponential Backoff + Jitterを使用した賢いリトライ:

```typescript
const result = await retryWithBackoff(
  async () => {
    // リトライする処理
  },
  {
    maxRetries: 3,
    baseDelay: 1000,      // 1秒
    maxDelay: 10000,      // 10秒
    backoffFactor: 2,     // 指数バックオフ係数
    jitterFactor: 0.3,    // 30%のジッター
  },
  (attempt, error, delay) => {
    console.log(`Retry ${attempt} after ${delay}ms`);
  }
);
```

**リトライ可能エラーの判定:**
- ネットワークエラー (ECONNRESET, ETIMEDOUT)
- タイムアウトエラー
- サービス利用不可 (503)
- レート制限 (429)

**リトライ不可エラー:**
- 認証エラー (401, 403)
- バリデーションエラー (400)

### 3. サーキットブレーカー (`api/circuit-breaker.ts`)

カスケード障害を防ぐためのサーキットブレーカーパターン:

```typescript
const result = await geminiCircuitBreaker.execute(async () => {
  // 保護する処理
});
```

**状態遷移:**
- `CLOSED` - 正常動作（リクエスト許可）
- `OPEN` - 障害検知（リクエスト拒否）
- `HALF_OPEN` - 回復テスト（制限付きリクエスト許可）

**設定:**
```typescript
{
  failureThreshold: 5,      // 5回失敗でOPEN
  successThreshold: 2,      // HALF_OPENから2回成功でCLOSED
  timeout: 60000,          // 1分後にHALF_OPENへ遷移
  monitoringPeriod: 120000 // 2分間の監視期間
}
```

### 4. エラーロギング (`src/lib/error-logger.ts`)

集中型エラーロギングシステム:

```typescript
import { errorLogger, ErrorSeverity } from './lib/error-logger';

// エラーをログ
errorLogger.log(
  error,
  ErrorSeverity.HIGH,
  'API_CALL',
  {
    component: 'ChatService',
    action: 'sendMessage',
    metadata: { userId: '123' }
  }
);

// エラー統計取得
const stats = errorLogger.getStats();
console.log(stats);
// {
//   total: 10,
//   bySeverity: { LOW: 2, MEDIUM: 5, HIGH: 2, CRITICAL: 1 },
//   byCategory: { API_CALL: 5, NETWORK: 3, VALIDATION: 2 }
// }
```

**グローバルエラーハンドラー:**
```typescript
setupGlobalErrorHandlers(); // index.tsxで初期化済み
```

### 5. フロントエンドエラーサービス (`src/services/errorService.ts`)

統一されたエラー処理:

```typescript
import { ErrorService } from './services/errorService';

try {
  // 処理
} catch (error) {
  const apiError = ErrorService.normalizeError(error);
  ErrorService.logError(apiError, 'sendMessage', 'ChatComponent');

  // ユーザー向けメッセージ取得
  const message = ErrorService.getUserFriendlyMessage(apiError, t);
}
```

## 使用例

### バックエンドAPI (`api/chat.ts`)

```typescript
export default async function handler(req: Request) {
  try {
    // バリデーション
    if (!message) {
      throw new ValidationError('Message is required.');
    }

    // サーキットブレーカー + リトライ + タイムアウト
    const result = await geminiCircuitBreaker.execute(async () => {
      return await retryWithBackoff(
        async () => {
          return await withTimeout(
            model.generateContent(prompt),
            REQUEST_TIMEOUT,
            'Request timeout'
          );
        },
        { maxRetries: 3, jitterFactor: 0.3 }
      );
    });

    return new Response(JSON.stringify({ message: result }));

  } catch (error: unknown) {
    return handleError(error); // 型安全なエラーハンドリング
  }
}
```

### フロントエンド

```typescript
import { ErrorService } from './services/errorService';
import { errorLogger, ErrorSeverity } from './lib/error-logger';

async function sendMessage(message: string) {
  try {
    const response = await apiService.sendMessage({ message });
    return response;
  } catch (error) {
    // エラー正規化
    const apiError = ErrorService.normalizeError(error);

    // ログ記録
    ErrorService.logError(apiError, 'sendMessage', 'ChatComponent');

    // ユーザー通知
    showErrorToUser(apiError);

    throw apiError;
  }
}
```

## 監視とデバッグ

### 統計エンドポイント (`/api/stats`)

システムの健全性とエラー統計を取得:

```bash
curl -H "Authorization: Bearer YOUR_STATS_API_KEY" \
  https://your-app.vercel.app/api/stats
```

**レスポンス例:**
```json
{
  "health": {
    "status": "healthy",
    "timestamp": "2025-10-11T12:00:00.000Z",
    "uptime": 3600
  },
  "circuitBreaker": {
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 150,
    "totalRequests": 150,
    "rejectedRequests": 0,
    "failureRate": "0%"
  },
  "rateLimit": {
    "dailyCost": 2.45,
    "hourlyCost": 0.32,
    "remainingBudget": 47.55
  }
}
```

### ブラウザコンソールでのデバッグ

```javascript
// エラー統計表示
console.log(window.__errorLogger?.getStats());

// エラー履歴表示
console.log(window.__errorLogger?.getErrors());

// 特定カテゴリのエラー表示
console.log(window.__errorLogger?.getErrors({
  category: 'API_CALL',
  severity: 'HIGH'
}));
```

## ベストプラクティス

### 1. 適切なエラー分類
```typescript
// ❌ Bad
throw new Error('Something went wrong');

// ✅ Good
throw new ValidationError('User ID is required', {
  field: 'userId'
});
```

### 2. コンテキスト情報の追加
```typescript
errorLogger.log(error, ErrorSeverity.HIGH, 'API_ERROR', {
  component: 'UserService',
  action: 'updateProfile',
  metadata: {
    userId: user.id,
    attemptCount: 3
  }
});
```

### 3. リトライ可能性の判断
```typescript
// リトライ可能なエラーのみリトライ
if (error.isRetryable) {
  await retryWithBackoff(() => operation());
}
```

### 4. ユーザー体験の向上
```typescript
// エラーの重要度に応じた処理
switch (error.severity) {
  case 'critical':
    // アプリ全体のエラーモーダル表示
    showCriticalErrorModal(error);
    break;
  case 'high':
    // トーストメッセージ表示
    showErrorToast(error);
    break;
  case 'medium':
  case 'low':
    // コンソールログのみ
    console.warn(error);
    break;
}
```

## 環境変数

```bash
# 統計エンドポイントの認証キー（オプション）
STATS_API_KEY=your-secret-key

# Sentryなどの外部監視サービス（今後追加予定）
# SENTRY_DSN=https://...
```

## 今後の改善予定

- [ ] Sentry統合による本番エラー監視
- [ ] エラーメトリクスのダッシュボード
- [ ] 自動アラート機能
- [ ] エラーレポートのエクスポート機能
- [ ] A/Bテスト用のエラー追跡
