# Architecture

## Overview

Sage's Love AIは、React + Vite フロントエンドと Vercel Edge Functions バックエンドで構成されるフルスタックアプリケーションです。

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   React     │  │   i18next   │  │    LocalStorage         │ │
│  │   Components│  │   (7 langs) │  │    (Conversation)       │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Functions                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     /api/chat                                ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               ││
│  │  │ Rate      │→ │ Circuit   │→ │ Retry     │               ││
│  │  │ Limiter   │  │ Breaker   │  │ Handler   │               ││
│  │  └───────────┘  └───────────┘  └─────┬─────┘               ││
│  │                                      │                      ││
│  └──────────────────────────────────────┼──────────────────────┘│
│                                         │                        │
│  ┌─────────────────────────────────────┐│                        │
│  │              /api/stats             ││                        │
│  │  Health Check & Monitoring          ││                        │
│  └─────────────────────────────────────┘│                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────┐
              │                           │                       │
              ▼                           ▼                       ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│   Gemini Flash API  │    │   Upstash Redis     │    │  Error Logger    │
│   (Google AI)       │    │   (Rate Limiting)   │    │  (Console/Sentry)│
└─────────────────────┘    └─────────────────────┘    └──────────────────┘
```

## Data Flow

### Chat Request Flow

```
1. User Input
      │
      ▼
2. Crisis Detection (Frontend)
      │
      ├── Crisis Detected? → Show Crisis Modal
      │
      ▼
3. API Request (/api/chat)
      │
      ▼
4. Rate Limit Check
      │
      ├── Blocked? → Return 429
      │
      ▼
5. Input Validation
      │
      ├── Invalid? → Return 400
      │
      ▼
6. Circuit Breaker Check
      │
      ├── Open? → Return 503
      │
      ▼
7. Retry with Backoff
      │
      ├── Generate Content (Gemini API)
      │
      ├── Success? → Return 200
      │
      └── Failed? → Parse Error → Return Error Response
```

### Translation Flow

```
1. AI Response Received
      │
      ▼
2. Check Language Mismatch
      │
      ├── Same Language? → Display Response
      │
      ▼
3. Translation Request (Gemini API)
      │
      ▼
4. Duplicate Detection
      │
      ├── Duplicate? → Use Original
      │
      ▼
5. Display Translated Response
```

## Directory Structure

```
sage-love/
├── api/                          # Backend (Vercel Edge Functions)
│   ├── chat.ts                   # Main chat endpoint
│   ├── stats.ts                  # Statistics endpoint
│   ├── health.js                 # Health check endpoint
│   ├── errors.ts                 # Custom error classes
│   ├── rate-limiter.ts           # Rate limiting logic
│   ├── circuit-breaker.ts        # Circuit breaker pattern
│   ├── retry-utils.ts            # Retry utilities
│   ├── context-cache.ts          # Context caching for cost optimization
│   └── admin/                    # Admin endpoints
│
├── src/                          # Frontend (React + Vite)
│   ├── components/               # React components
│   │   ├── __tests__/            # Component tests
│   │   ├── ChatContainer.tsx     # Main chat container
│   │   ├── ChatInput.tsx         # User input
│   │   ├── ChatMessage.tsx       # Message display
│   │   ├── LanguageSelector.tsx  # Language switcher
│   │   ├── CrisisInterventionModal.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ...
│   │
│   ├── services/                 # Business logic
│   │   ├── __tests__/            # Service tests
│   │   ├── chatService.ts        # Chat API client
│   │   ├── crisisDetectionService.ts
│   │   ├── translationService.ts
│   │   ├── errorService.ts
│   │   └── geminiService.ts
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── __tests__/
│   │   ├── useMessageHandler.ts
│   │   ├── useChatHistory.ts
│   │   └── useCrisisDetection.ts
│   │
│   ├── lib/                      # Libraries & utilities
│   │   ├── locales/              # Translation files
│   │   │   ├── ja/translation.ts
│   │   │   ├── en/translation.ts
│   │   │   ├── es/translation.ts
│   │   │   ├── pt/translation.ts
│   │   │   ├── fr/translation.ts
│   │   │   ├── hi/translation.ts
│   │   │   └── ar/translation.ts
│   │   ├── i18n.ts               # i18next configuration
│   │   └── error-logger.ts       # Error logging
│   │
│   ├── types/                    # TypeScript definitions
│   ├── constants/                # App constants
│   ├── utils/                    # Utility functions
│   ├── data/                     # Static data
│   └── test/                     # Test configuration
│
├── docs/                         # Documentation
├── public/                       # Static assets
├── index.html                    # HTML template
├── App.tsx                       # Root component
├── main.tsx                      # Entry point
├── vite.config.ts                # Vite configuration
├── vitest.config.ts              # Vitest configuration
└── tsconfig.json                 # TypeScript configuration
```

## Component Architecture

### Frontend Components

```
App.tsx
├── ErrorBoundary
│   └── Suspense
│       ├── Header
│       │   ├── Logo
│       │   ├── LanguageSelector
│       │   ├── TextSizeToggle
│       │   ├── ShareButton
│       │   ├── HelpButton
│       │   └── ClearButton
│       │
│       ├── ChatContainer
│       │   ├── WelcomeMessage
│       │   ├── PromptSuggestions
│       │   ├── VirtualizedChat
│       │   │   └── ChatMessage (multiple)
│       │   └── ChatInput
│       │       └── VoiceInput
│       │
│       ├── Footer
│       │   ├── DisclaimerLink
│       │   ├── PrivacyPolicyLink
│       │   └── TermsOfServiceLink
│       │
│       └── Modals (lazy loaded)
│           ├── DisclaimerModal
│           ├── PrivacyPolicyModal
│           ├── TermsOfServiceModal
│           ├── HelpModal
│           ├── ConfirmationModal
│           └── CrisisInterventionModal
```

### Service Layer

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend Services                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  chatService.ts                                              │
│  ├── sendMessage()           - Send chat message             │
│  ├── streamChat()            - Stream response               │
│  └── streamChatWithTranslation() - Stream with translation   │
│                                                              │
│  crisisDetectionService.ts                                   │
│  ├── detectCrisis()          - Analyze message               │
│  ├── detectCrisisPattern()   - Multi-message analysis        │
│  └── generateCrisisResponse() - Generate intervention        │
│                                                              │
│  translationService.ts                                       │
│  ├── translateText()         - Translate text                │
│  └── detectDuplicateResponse() - Detect repetition           │
│                                                              │
│  errorService.ts                                             │
│  ├── normalizeError()        - Convert to APIError           │
│  ├── logError()              - Log error                     │
│  └── getUserFriendlyMessage() - Get UI message               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Error Handling Architecture

### Three-Layer Protection

```
┌─────────────────────────────────────────────────────────────┐
│                    API Request                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 1: Circuit Breaker                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  State: CLOSED → OPEN → HALF_OPEN → CLOSED              ││
│  │  Failure Threshold: 5                                   ││
│  │  Success Threshold: 2                                   ││
│  │  Timeout: 60s                                           ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 2: Retry with Backoff                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Max Retries: 3                                         ││
│  │  Base Delay: 1000ms                                     ││
│  │  Backoff Factor: 2 (exponential)                        ││
│  │  Jitter: 30%                                            ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 3: Timeout Handler                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Request Timeout: 25s                                   ││
│  │  (Within Vercel 30s Edge Function limit)                ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gemini API                                │
└─────────────────────────────────────────────────────────────┘
```

### Error Class Hierarchy

```
Error
└── APIError (base)
    ├── AuthenticationError  (401)
    ├── RateLimitError       (429)
    ├── QuotaError           (429)
    ├── TimeoutError         (408)
    ├── ServiceUnavailableError (503)
    ├── ValidationError      (400)
    └── CircuitBreakerError  (503)
```

## Rate Limiting Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Request                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Content Validation                           │
│  • Message length ≤ 1000 chars                              │
│  • History ≤ 5 messages                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              2. Global Cost Check                            │
│  • Daily cost < $50                                         │
│  • Hourly cost < $5                                         │
│  • Emergency stop at $75                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              3. Burst Rate Limit                             │
│  • 3 requests / 1 minute                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              4. IP Rate Limit                                │
│  • 10 requests / 15 minutes (sliding window)                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              5. Session Rate Limit                           │
│  • 15 requests / hour                                       │
│  • 30 requests / day                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Request Allowed                           │
└─────────────────────────────────────────────────────────────┘
```

## Internationalization (i18n)

### Supported Languages

| Code | Language | RTL |
|------|----------|-----|
| ja | Japanese | No |
| en | English | No |
| es | Spanish | No |
| pt | Portuguese | No |
| fr | French | No |
| hi | Hindi | No |
| ar | Arabic | Yes |

### Translation Structure

```
src/lib/locales/
├── ja/translation.ts    # Japanese
├── en/translation.ts    # English (fallback)
├── es/translation.ts    # Spanish
├── pt/translation.ts    # Portuguese
├── fr/translation.ts    # French
├── hi/translation.ts    # Hindi
└── ar/translation.ts    # Arabic
```

## Context Caching

システムプロンプトをキャッシュしてAPIコストを最大75%削減します。

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat Request                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Context Cache Manager                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  1. Check cache validity                                ││
│  │  2. If miss: Cache system instruction (~2500 tokens)    ││
│  │  3. If hit: Reuse cached instruction (75% cost saving)  ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Gemini API with Cached Context                  │
│  • System instruction: From cache (reduced cost)            │
│  • User message: Normal cost                                │
└─────────────────────────────────────────────────────────────┘
```

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| TTL | 3600s | Cache expires after 1 hour |
| Min Tokens | 1000 | Only cache if ≥1000 tokens |
| Model | gemini-2.0-flash | Target model |

### Cost Savings

```
Without Caching:
  System Prompt: ~2500 tokens × $0.10/1M = $0.00025/request

With Caching:
  System Prompt: ~2500 tokens × $0.025/1M = $0.0000625/request

Savings: 75% on system prompt tokens
```

### Monitoring

```bash
# Check cache status
curl -H "Authorization: Bearer $ADMIN_TOKEN" /api/stats

# Response includes:
{
  "contextCache": {
    "active": true,
    "tokenCount": 2500,
    "remainingTTL": 3200
  },
  "rateLimit": {
    "contextCache": {
      "dailySavings": 0.45,
      "dailyHits": 150,
      "savingsPercentage": 22.5
    }
  }
}
```

## Performance Optimizations

### Bundle Splitting

```javascript
// vite.config.ts
manualChunks: {
  'react-vendor': ['react', 'react-dom'],
  'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
  'ai-vendor': ['@google/generative-ai'],
  'modal-components': ['./src/components/DisclaimerModal', ...]
}
```

### Lazy Loading

```typescript
// Modals are lazy loaded
const DisclaimerModal = React.lazy(() => import('./DisclaimerModal'));
const HelpModal = React.lazy(() => import('./HelpModal'));
// ...
```

### Virtualization

- Large chat histories are rendered using virtualized lists
- Only visible messages are rendered in the DOM

## Security Measures

### API Key Protection

- Gemini API Key is server-side only
- Never exposed to client
- Stored in environment variables

### Input Validation

- Message length limits (1000 chars)
- History limits (5 messages)
- Content safety filters

### Rate Limiting

- Multiple layers (IP, session, cost)
- Redis-based distributed limiting
- Graceful degradation if Redis unavailable

### Crisis Detection

- Multi-language keyword detection
- 4 severity levels
- Automatic resource referral
