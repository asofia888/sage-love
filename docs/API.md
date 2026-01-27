# API Reference

## Overview

このアプリケーションは Vercel Edge Functions を使用したサーバーレスAPIを提供します。

**Base URL**: `https://your-domain.vercel.app/api`

---

## Endpoints

### POST /api/chat

AIチャットメッセージを送信し、応答を取得します。

#### Request

**Headers**
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `X-Session-ID` | No | セッション識別子（レート制限用） |

**Body**
```json
{
  "message": "string",
  "conversationHistory": [
    {
      "sender": "user" | "ai",
      "text": "string"
    }
  ],
  "systemInstruction": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | ユーザーのメッセージ（最大1000文字） |
| `conversationHistory` | array | No | 会話履歴（最大5メッセージ） |
| `systemInstruction` | string | No | システムプロンプト |

#### Response

**Success (200)**
```json
{
  "message": "AIの応答テキスト",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "sessionId": "abc123",
  "cache": {
    "hit": true,
    "tokensSaved": 2500
  }
}
```

**Response Headers**
| Header | Description |
|--------|-------------|
| `X-RateLimit-Remaining-IP` | IP制限の残りリクエスト数 |
| `X-RateLimit-Remaining-Session` | セッション制限の残りリクエスト数 |
| `X-Context-Cache-Hit` | キャッシュヒットしたか |
| `X-Context-Cache-Tokens-Saved` | 節約されたトークン数 |
| `X-Context-Cache-TTL` | キャッシュの残りTTL（秒） |
| `Cache-Control` | `no-cache` |

#### Errors

**400 Bad Request - Validation Error**
```json
{
  "code": "errorValidation",
  "details": "Message is required.",
  "category": "VALIDATION",
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

**401 Unauthorized - Authentication Error**
```json
{
  "code": "errorAuth",
  "details": "API key not valid",
  "category": "AUTHENTICATION",
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

**408 Request Timeout**
```json
{
  "code": "errorTimeout",
  "details": "Request timeout: AI service took too long to respond",
  "category": "TIMEOUT",
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

**429 Too Many Requests**
```json
{
  "code": "IP_RATE_LIMIT",
  "details": "Too many requests from this IP. Please try again later.",
  "retryAfter": 300
}
```

**Response Headers for 429**
| Header | Description |
|--------|-------------|
| `Retry-After` | 再試行までの秒数 |
| `X-RateLimit-Reason` | 制限理由 |

**Rate Limit Reasons**
| Reason | Description |
|--------|-------------|
| `MESSAGE_TOO_LONG` | メッセージが1000文字超 |
| `HISTORY_TOO_LONG` | 履歴が5メッセージ超 |
| `BURST_LIMIT_EXCEEDED` | バースト制限（3/分）超過 |
| `IP_RATE_LIMIT` | IP制限（10/15分）超過 |
| `SESSION_HOURLY_LIMIT` | セッション時間制限（15/時）超過 |
| `SESSION_DAILY_LIMIT` | セッション日次制限（30/日）超過 |
| `HOURLY_COST_LIMIT` | 時間コスト制限（$5）超過 |
| `DAILY_COST_LIMIT` | 日次コスト制限（$50）超過 |
| `EMERGENCY_COST_LIMIT` | 緊急停止コスト（$75）超過 |

**500 Internal Server Error**
```json
{
  "code": "errorGeneric",
  "details": "Unknown error occurred",
  "category": "INTERNAL",
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

**503 Service Unavailable**
```json
{
  "code": "errorCircuitBreaker",
  "details": "Circuit breaker is open",
  "category": "CIRCUIT_BREAKER",
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

#### Example

```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: user-session-123" \
  -d '{
    "message": "What is the meaning of life?",
    "conversationHistory": []
  }'
```

---

### GET /api/stats

システムの健全性とレート制限統計を取得します。

#### Request

**Headers**
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Conditional | `Bearer {STATS_API_KEY}` |

> Note: `STATS_API_KEY`環境変数が設定されている場合のみ認証必須

#### Response

**Success (200)**
```json
{
  "health": {
    "status": "healthy",
    "timestamp": "2025-01-27T12:00:00.000Z",
    "uptime": 3600
  },
  "circuitBreaker": {
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 150,
    "totalRequests": 150,
    "rejectedRequests": 0,
    "lastFailureTime": null,
    "lastStateChange": "2025-01-27T10:00:00.000Z",
    "failureRate": "0%"
  },
  "rateLimit": {
    "redisConfigured": true,
    "dailyCost": 2.45,
    "hourlyCost": 0.32,
    "limits": {
      "maxCostPerHour": 5.0,
      "maxCostPerDay": 50.0,
      "emergencyStopCost": 75.0
    },
    "remainingBudget": 47.55,
    "utilizationPercentage": 4.9
  }
}
```

**Health Status Values**
| Status | Description |
|--------|-------------|
| `healthy` | Circuit Breaker CLOSED、正常動作中 |
| `degraded` | Circuit Breaker OPEN/HALF_OPEN、一部機能制限中 |

**Circuit Breaker States**
| State | Description |
|-------|-------------|
| `CLOSED` | 正常動作（リクエスト許可） |
| `OPEN` | 障害検知（リクエスト拒否） |
| `HALF_OPEN` | 回復テスト（制限付きリクエスト許可） |

#### Errors

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "Error description"
}
```

#### Example

```bash
curl -X GET https://your-domain.vercel.app/api/stats \
  -H "Authorization: Bearer your-stats-api-key"
```

---

### GET /api/health

簡易ヘルスチェック（認証不要）。

#### Response

**Success (200)**
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

---

## Error Categories

| Category | HTTP Status | Retryable | Description |
|----------|-------------|-----------|-------------|
| `AUTHENTICATION` | 401 | No | APIキー無効 |
| `RATE_LIMIT` | 429 | Yes | レート制限超過 |
| `QUOTA` | 429 | No | APIクォータ超過 |
| `TIMEOUT` | 408 | Yes | リクエストタイムアウト |
| `NETWORK` | 500 | Yes | ネットワークエラー |
| `SERVICE_UNAVAILABLE` | 503 | Yes | サービス一時利用不可 |
| `VALIDATION` | 400 | No | 入力検証エラー |
| `INTERNAL` | 500 | No | 内部エラー |
| `CIRCUIT_BREAKER` | 503 | Yes | サーキットブレーカー発動 |

---

## Rate Limiting

### Limits

| Type | Limit | Window |
|------|-------|--------|
| IP | 10 requests | 15 minutes |
| Burst | 3 requests | 1 minute |
| Session (hourly) | 15 requests | 1 hour |
| Session (daily) | 30 requests | 24 hours |
| Cost (hourly) | $5.00 | 1 hour |
| Cost (daily) | $50.00 | 24 hours |
| Emergency stop | $75.00 | - |

### Content Limits

| Type | Limit |
|------|-------|
| Message length | 1000 characters |
| History messages | 5 messages |
| Tokens per request | ~2000 tokens |

### Cost Calculation

Gemini 2.5 Flash 料金に基づく推定:
- Input: $0.0003 / 1K tokens
- Output: $0.0025 / 1K tokens
- Average request: ~$0.0016

---

## Circuit Breaker

### Configuration

| Parameter | Value |
|-----------|-------|
| Failure Threshold | 5 failures |
| Success Threshold | 2 successes |
| Timeout | 60 seconds |
| Monitoring Period | 120 seconds |

### State Transitions

```
CLOSED → (5 failures) → OPEN → (60s timeout) → HALF_OPEN → (2 successes) → CLOSED
                                    ↑                           │
                                    └───── (1 failure) ─────────┘
```

---

## Retry Strategy

### Configuration

| Parameter | Value |
|-----------|-------|
| Max Retries | 3 |
| Base Delay | 1000ms |
| Max Delay | 10000ms |
| Backoff Factor | 2 |
| Jitter Factor | 0.3 (30%) |

### Retryable Errors

- Network errors (ECONNRESET, ETIMEDOUT)
- Timeout errors
- Service unavailable (503)
- Rate limit (429)

### Non-Retryable Errors

- Authentication errors (401, 403)
- Validation errors (400)
- Quota errors

---

## Context Caching

システムプロンプトをキャッシュしてコストを最大75%削減します。

### How It Works

1. **初回リクエスト**: システムプロンプトがキャッシュに保存される
2. **後続リクエスト**: キャッシュからシステムプロンプトを再利用
3. **コスト削減**: キャッシュされたトークンは通常の25%のコストで処理

### Configuration

| Parameter | Value |
|-----------|-------|
| TTL | 3600 seconds (1 hour) |
| Min Tokens for Caching | 1000 tokens |
| Model | gemini-2.0-flash |

### Cost Savings

| Type | Cost per 1M tokens |
|------|-------------------|
| Normal Input | $0.10 |
| Cached Input | $0.025 |
| **Savings** | **75%** |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Context-Cache-Hit` | `true` if cache was used |
| `X-Context-Cache-Tokens-Saved` | Number of tokens saved |
| `X-Context-Cache-TTL` | Remaining cache TTL in seconds |

### Stats Endpoint Response

```json
{
  "contextCache": {
    "active": true,
    "tokenCount": 2500,
    "remainingTTL": 3200,
    "createdAt": "2025-01-27T12:00:00.000Z",
    "config": {
      "ttlSeconds": 3600,
      "minTokensForCaching": 1000,
      "model": "gemini-2.0-flash"
    }
  },
  "rateLimit": {
    "contextCache": {
      "dailySavings": 0.45,
      "dailyHits": 150,
      "effectiveCost": 1.55,
      "savingsPercentage": 22.5
    }
  }
}
```
