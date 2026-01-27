# Troubleshooting Guide

## Quick Diagnosis

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| API calls failing | Invalid API key | Check `GEMINI_API_KEY` |
| 429 errors | Rate limit exceeded | Wait and retry |
| 503 errors | Circuit breaker open | Wait 60 seconds |
| Blank response | Empty AI response | Retry or check prompt |
| Language not changing | Cache issue | Clear localStorage |

---

## Common Issues

### 1. API Key Issues

#### Error: "API key not valid" (401)

**Symptoms:**
- `errorAuth` error message
- All requests fail immediately

**Causes:**
- Missing or invalid `GEMINI_API_KEY`
- API key not activated
- API key deleted or regenerated

**Solutions:**

1. Verify API key is set:
```bash
# Local development
cat .env.local | grep GEMINI_API_KEY

# Vercel
vercel env ls
```

2. Test API key directly:
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

3. Get a new key from [Google AI Studio](https://aistudio.google.com/)

---

### 2. Rate Limiting Issues

#### Error: "Too many requests" (429)

**Symptoms:**
- `BURST_LIMIT_EXCEEDED`: Too many requests in 1 minute
- `IP_RATE_LIMIT`: Too many requests from your IP
- `SESSION_HOURLY_LIMIT`: Session hourly limit reached
- `SESSION_DAILY_LIMIT`: Session daily limit reached

**Solutions:**

1. Check `Retry-After` header:
```javascript
// The API returns retry time in seconds
response.headers.get('Retry-After')
```

2. Wait before retrying:
```javascript
const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
```

3. For development, temporarily disable rate limiting:
```typescript
// api/rate-limiter.ts
// WARNING: Only for development!
if (process.env.NODE_ENV === 'development') {
  return { blocked: false };
}
```

#### Error: "Daily cost limit reached"

**Symptoms:**
- `DAILY_COST_LIMIT` or `EMERGENCY_COST_LIMIT`
- Service unavailable until next day

**Solutions:**

1. Check current usage:
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-domain.vercel.app/api/stats
```

2. Increase limits (if needed):
```bash
# .env.local
DAILY_COST_LIMIT=100.0
HOURLY_COST_LIMIT=10.0
EMERGENCY_STOP_LIMIT=150.0
```

---

### 3. Circuit Breaker Issues

#### Error: "Circuit breaker is open" (503)

**Symptoms:**
- Repeated 503 errors
- `errorCircuitBreaker` message
- Stats show `state: "OPEN"`

**Causes:**
- 5+ consecutive failures to Gemini API
- Network issues
- Gemini API outage

**Solutions:**

1. Check circuit breaker status:
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-domain.vercel.app/api/stats
```

2. Wait for automatic recovery:
   - Circuit breaker opens after 5 failures
   - Automatically tries again after 60 seconds
   - Returns to normal after 2 consecutive successes

3. Check Gemini API status:
   - Visit [Google Cloud Status](https://status.cloud.google.com/)

4. Force reset (redeploy):
```bash
vercel --force
```

---

### 4. Redis/Rate Limiting Setup Issues

#### Warning: "Upstash Redis not configured"

**Symptoms:**
- Rate limiting disabled
- Console warning about missing Redis config

**Solutions:**

1. Create Upstash Redis instance:
   - Visit [Upstash Console](https://console.upstash.com/)
   - Create new Redis database
   - Copy REST URL and Token

2. Set environment variables:
```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx...
```

3. For Vercel, add via dashboard or CLI:
```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

---

### 5. Timeout Issues

#### Error: "Request timeout" (408)

**Symptoms:**
- Long requests fail
- `errorTimeout` message

**Causes:**
- Gemini API slow to respond
- Large input/output
- Network latency

**Solutions:**

1. Reduce input size:
   - Shorten message length
   - Reduce conversation history

2. Check network:
```bash
ping generativelanguage.googleapis.com
```

3. Timeout is set to 25 seconds (within Vercel's 30s limit):
```typescript
// api/chat.ts
const REQUEST_TIMEOUT = 25000;
```

---

### 6. Build/Development Issues

#### Vite build fails

**Symptoms:**
- `npm run build` fails
- Chunk size warnings

**Solutions:**

1. Clear cache:
```bash
rm -rf node_modules/.vite
npm run build
```

2. Check for circular dependencies:
```bash
npx madge --circular src/
```

#### Tests failing

**Symptoms:**
- `npm test` shows failures

**Solutions:**

1. Clear test cache:
```bash
rm -rf node_modules/.vitest
npm test
```

2. Run specific test:
```bash
npm test -- ChatService.test.ts
```

3. Check test environment:
```bash
npm run test:ui
```

---

### 7. i18n/Translation Issues

#### Translations not showing

**Symptoms:**
- Keys displayed instead of text (e.g., `appName` instead of "Sage's Love")

**Solutions:**

1. Check language registration:
```typescript
// src/lib/i18n.ts
const resources = {
  en: { translation: enTranslation },
  ja: { translation: jaTranslation },
  // ... all languages registered?
};
```

2. Clear localStorage:
```javascript
localStorage.removeItem('i18nextLng');
location.reload();
```

3. Check for typos in translation keys

#### Language not persisting

**Solutions:**

1. Check i18n detection settings:
```typescript
detection: {
  caches: ['localStorage', 'cookie'],
}
```

2. Clear browser storage and cookies

---

### 8. Crisis Detection Issues

#### Crisis keywords not detected

**Symptoms:**
- Crisis intervention not showing for concerning messages

**Solutions:**

1. Verify keywords for the language:
```typescript
// src/services/crisisDetectionService.ts
console.log(CRISIS_KEYWORDS[currentLanguage]);
```

2. Check detection is enabled:
```typescript
const result = CrisisDetectionService.detectCrisis(message, language);
console.log(result);
```

---

## Debugging Tools

### Check API Stats

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-domain.vercel.app/api/stats | jq
```

### Check Health

```bash
curl https://your-domain.vercel.app/api/health
```

### Browser Console

```javascript
// Check error logs
window.__errorLogger?.getStats();
window.__errorLogger?.getErrors();

// Check i18n
console.log(i18n.language);
console.log(i18n.t('appName'));

// Check localStorage
console.log(localStorage.getItem('i18nextLng'));
console.log(localStorage.getItem('chatHistory'));
```

### Vercel Logs

```bash
vercel logs --follow
```

---

## Error Code Reference

| Code | HTTP | Description | Solution |
|------|------|-------------|----------|
| `errorAuth` | 401 | API key invalid | Check GEMINI_API_KEY |
| `errorValidation` | 400 | Invalid input | Check message/history |
| `errorRateLimit` | 429 | Rate limit | Wait and retry |
| `errorQuota` | 429 | API quota | Wait or upgrade |
| `errorTimeout` | 408 | Request timeout | Reduce input size |
| `errorServiceUnavailable` | 503 | Service down | Wait and retry |
| `errorCircuitBreaker` | 503 | Circuit open | Wait 60s |
| `errorGeneric` | 500 | Internal error | Check logs |

---

## Getting Help

### 1. Check Documentation

- [API Reference](./API.md)
- [Architecture](./ARCHITECTURE.md)
- [Error Handling](./ERROR_HANDLING.md)

### 2. Search Issues

- [GitHub Issues](https://github.com/your-repo/sage-love/issues)

### 3. Create Issue

When reporting issues, include:

```markdown
**Environment:**
- Node.js version:
- Browser:
- OS:

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**


**Actual behavior:**


**Error messages:**
```

**Console output:**
```

**API response:**
```
```

### 4. Useful Commands

```bash
# Check versions
node -v
npm -v

# Check dependencies
npm ls

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run diagnostics
npm run test:run
npm run build
```
