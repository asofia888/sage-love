# エラーハンドリング強化 - 変更履歴

## 📅 実装日: 2025-10-11

## ✨ 実装内容

### 1. 型安全なカスタムエラークラス (`api/errors.ts`)

**削除:**
- ❌ `any` 型の使用を完全に排除
- ❌ 文字列ベースのエラー判定

**追加:**
- ✅ `APIError` 基底クラス（カテゴリ、ステータスコード、リトライ可能性を含む）
- ✅ 特化したエラークラス:
  - `AuthenticationError` (401)
  - `RateLimitError` (429, retryAfter付き)
  - `QuotaError` (429)
  - `TimeoutError` (408)
  - `ServiceUnavailableError` (503)
  - `ValidationError` (400)
  - `CircuitBreakerError` (503)
- ✅ `parseGeminiError()` - Gemini APIエラーのパース
- ✅ `buildErrorResponse()` - 統一されたエラーレスポンス生成

### 2. Jitter付きExponential Backoff (`api/retry-utils.ts`)

**改善前:**
```typescript
// 単純なExponential backoff（ジッターなし）
const delay = Math.min(
  baseDelay * Math.pow(backoffFactor, attempt),
  maxDelay
);
```

**改善後:**
```typescript
// Jitter付きExponential backoff
const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt);
const jitter = (Math.random() * 2 - 1) * exponentialDelay * jitterFactor;
const delay = Math.max(0, Math.min(exponentialDelay + jitter, maxDelay));
```

**追加機能:**
- ✅ `isRetryableError()` - エラーのリトライ可能性を判定
- ✅ `withTimeout()` - タイムアウト付き実行
- ✅ `RetryStatsTracker` - リトライ統計の追跡

### 3. サーキットブレーカーパターン (`api/circuit-breaker.ts`)

**新規実装:**
- ✅ 3状態サーキットブレーカー (CLOSED / OPEN / HALF_OPEN)
- ✅ 設定可能な失敗閾値とタイムアウト
- ✅ 統計情報の取得 (`getStats()`)
- ✅ グローバルインスタンス (`geminiCircuitBreaker`)

**設定:**
```typescript
{
  failureThreshold: 5,      // 5回失敗でOPEN
  successThreshold: 2,      // HALF_OPENから2回成功でCLOSED
  timeout: 60000,          // 1分後にHALF_OPENへ遷移
  monitoringPeriod: 120000 // 2分間の監視期間
}
```

### 4. バックエンドAPI統合 (`api/chat.ts`)

**変更点:**

**エラーハンドリング:**
```typescript
// Before
catch (error: any) {
  return handleError(error);
}

// After
catch (error: unknown) {
  retryStats.recordAttempt(0, false);
  return handleError(error); // 型安全
}
```

**リクエスト実行:**
```typescript
// 3層の保護: サーキットブレーカー → リトライ → タイムアウト
const result = await geminiCircuitBreaker.execute(async () => {
  return await retryWithBackoff(
    async () => {
      return await withTimeout(
        model.generateContent(prompt),
        REQUEST_TIMEOUT,
        'Request timeout'
      );
    },
    {
      maxRetries: 3,
      jitterFactor: 0.3,  // 30%のジッター
    }
  );
});
```

### 5. フロントエンドエラーロギング (`src/lib/error-logger.ts`)

**新規実装:**
- ✅ 集中型エラーロギングシステム
- ✅ エラー重要度の分類 (LOW/MEDIUM/HIGH/CRITICAL)
- ✅ グローバルエラーハンドラー (`setupGlobalErrorHandlers()`)
- ✅ イベントリスナーによるエラー通知
- ✅ エラー統計の取得 (`getStats()`)
- ✅ 外部サービス連携の準備 (Sentry等)

**グローバルエラーハンドラー:**
```typescript
// index.tsxで初期化
setupGlobalErrorHandlers();

// 未処理エラーのキャッチ
window.addEventListener('error', ...);
window.addEventListener('unhandledrejection', ...);
```

### 6. エラーサービスの強化 (`src/services/errorService.ts`)

**改善点:**

**型安全性:**
```typescript
// Before
static normalizeError(error: any): ApiError

// After
static normalizeError(error: unknown): ApiError
```

**新機能:**
- ✅ `isApiError()` - 型ガード関数
- ✅ `parseApiErrorMessage()` - バックエンドエラーフォーマットのパース
- ✅ `determineErrorCode()` - エラーコードの判定
- ✅ エラーロガーとの統合

### 7. 統計/ヘルスチェックエンドポイント (`api/stats.ts`)

**新規エンドポイント:** `/api/stats`

**レスポンス例:**
```json
{
  "health": {
    "status": "healthy",
    "timestamp": "2025-10-11T12:00:00.000Z"
  },
  "circuitBreaker": {
    "state": "CLOSED",
    "failureCount": 0,
    "totalRequests": 150,
    "failureRate": "0%"
  },
  "rateLimit": {
    "dailyCost": 2.45,
    "remainingBudget": 47.55
  }
}
```

**セキュリティ:**
- Bearer Token認証 (`STATS_API_KEY` 環境変数)

### 8. ドキュメント (`docs/ERROR_HANDLING.md`)

**追加:**
- ✅ アーキテクチャ概要
- ✅ 使用例とベストプラクティス
- ✅ 監視とデバッグ方法
- ✅ トラブルシューティングガイド

## 📊 改善効果

### 型安全性
- **Before:** `any` 型を多用、型エラーの検出不可
- **After:** 完全な型安全性、コンパイル時エラー検出

### エラー処理の信頼性
- **Before:** 単純なリトライ、サンダリングハード問題のリスク
- **After:** Jitter付きリトライ + サーキットブレーカー

### 監視性
- **Before:** console.logのみ
- **After:** 集中型ロギング、統計情報、外部サービス連携準備

### 復旧時間
- **Before:** 無限リトライの可能性
- **After:** サーキットブレーカーによる迅速な障害検知と復旧

## 🔧 設定方法

### 環境変数（オプション）

```bash
# .env.local
STATS_API_KEY=your-secret-key-here
```

### デプロイ

```bash
npm run build  # ビルド成功確認済み
```

## 📈 今後の拡張予定

- [ ] Sentry統合
- [ ] エラーメトリクスダッシュボード
- [ ] 自動アラート機能
- [ ] カスタムリトライポリシー
- [ ] デッドレターキュー

## 🧪 テスト

ビルド確認済み:
```
✓ 110 modules transformed.
✓ built in 6.90s
```

## 📝 破壊的変更

**なし** - 完全な後方互換性を維持

## 🔗 関連ファイル

### 新規追加
- `api/errors.ts`
- `api/circuit-breaker.ts`
- `api/retry-utils.ts`
- `api/stats.ts`
- `src/lib/error-logger.ts`
- `docs/ERROR_HANDLING.md`

### 更新
- `api/chat.ts`
- `src/services/errorService.ts`
- `index.tsx`
