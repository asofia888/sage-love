const express = require('express');
const cors = require('cors');
const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// レート制限用のシンプルなメモリストア
const rateLimitStore = new Map();

// APIキー使用量トラッキング
const apiUsageStore = new Map();
const DAILY_TOKEN_LIMIT = parseInt(process.env.DAILY_TOKEN_LIMIT) || 50000; // 1日あたりのトークン制限
const MONTHLY_REQUEST_LIMIT = parseInt(process.env.MONTHLY_REQUEST_LIMIT) || 1000; // 月間リクエスト制限

// IPアドレスを取得する安全な関数
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.connection?.remoteAddress;
  return ip || 'unknown';
};

// レート制限チェック
const checkRateLimit = (ip, limit = 20, windowMs = 60000) => {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
};

// 入力サニタイゼーション関数
const sanitizeInput = (text) => {
  if (typeof text !== 'string') return text;
  // 危険な文字をエスケープ
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
};

// 入力検証関数
const validateInput = (data) => {
  if (!data.message || typeof data.message !== 'string') {
    return { isValid: false, error: 'Message is required and must be a string.' };
  }

  if (data.message.length > 4000) {
    return { isValid: false, error: 'Message too long. Maximum 4000 characters allowed.' };
  }

  if (data.history && (!Array.isArray(data.history) || data.history.length > 50)) {
    return { isValid: false, error: 'History must be an array with maximum 50 messages.' };
  }

  if (data.systemInstruction && (typeof data.systemInstruction !== 'string' || data.systemInstruction.length > 1000)) {
    return { isValid: false, error: 'System instruction must be a string with maximum 1000 characters.' };
  }

  return { isValid: true };
};

// API使用量チェック関数
const checkApiUsage = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const usage = apiUsageStore.get('current') || {
    dailyTokens: { date: today, count: 0 },
    monthlyRequests: { month: currentMonth, count: 0 }
  };

  // 日付が変わった場合、日次カウンターをリセット
  if (usage.dailyTokens.date !== today) {
    usage.dailyTokens = { date: today, count: 0 };
  }

  // 月が変わった場合、月次カウンターをリセット
  if (usage.monthlyRequests.month !== currentMonth) {
    usage.monthlyRequests = { month: currentMonth, count: 0 };
  }

  return usage;
};

// API使用量を更新
const updateApiUsage = (tokensUsed = 100) => { // デフォルト推定トークン数
  const usage = checkApiUsage();
  
  usage.dailyTokens.count += tokensUsed;
  usage.monthlyRequests.count += 1;
  
  apiUsageStore.set('current', usage);
  
  return usage;
};

// 使用量制限チェック
const isUsageWithinLimits = () => {
  const usage = checkApiUsage();
  
  const dailyLimitExceeded = usage.dailyTokens.count >= DAILY_TOKEN_LIMIT;
  const monthlyLimitExceeded = usage.monthlyRequests.count >= MONTHLY_REQUEST_LIMIT;
  
  return {
    allowed: !dailyLimitExceeded && !monthlyLimitExceeded,
    dailyTokensUsed: usage.dailyTokens.count,
    monthlyRequestsUsed: usage.monthlyRequests.count,
    dailyTokensRemaining: Math.max(0, DAILY_TOKEN_LIMIT - usage.dailyTokens.count),
    monthlyRequestsRemaining: Math.max(0, MONTHLY_REQUEST_LIMIT - usage.monthlyRequests.count),
    limitType: dailyLimitExceeded ? 'daily_tokens' : monthlyLimitExceeded ? 'monthly_requests' : null
  };
};

// フロントエンドのメッセージ履歴をGeminiが期待する形式に変換
const toApiHistory = (messages) => {
  return messages
    .filter(msg => !msg.isTyping)
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
};

// ミドルウェア設定
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// セキュリティヘッダー
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Sage Love AI API Ready',
    endpoints: {
      chat: '/api/chat',
      health: '/health'
    },
    version: '1.0.0'
  });
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API使用量確認エンドポイント
app.get('/api/usage', (req, res) => {
  const usageInfo = isUsageWithinLimits();
  res.json({
    status: usageInfo.allowed ? 'available' : 'limited',
    usage: {
      dailyTokens: {
        used: usageInfo.dailyTokensUsed,
        limit: DAILY_TOKEN_LIMIT,
        remaining: usageInfo.dailyTokensRemaining
      },
      monthlyRequests: {
        used: usageInfo.monthlyRequestsUsed,
        limit: MONTHLY_REQUEST_LIMIT,
        remaining: usageInfo.monthlyRequestsRemaining
      }
    },
    limitType: usageInfo.limitType
  });
});

// チャットエンドポイント
app.post('/api/chat', async (req, res) => {
  try {
    // レート制限チェック
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // API使用量制限チェック
    const usageInfo = isUsageWithinLimits();
    if (!usageInfo.allowed) {
      const errorMessages = {
        daily_tokens: `Daily token limit (${DAILY_TOKEN_LIMIT}) exceeded. Please try again tomorrow.`,
        monthly_requests: `Monthly request limit (${MONTHLY_REQUEST_LIMIT}) exceeded. Please try again next month.`
      };
      
      return res.status(429).json({ 
        error: errorMessages[usageInfo.limitType] || 'Usage limit exceeded.',
        usage: {
          dailyTokensRemaining: usageInfo.dailyTokensRemaining,
          monthlyRequestsRemaining: usageInfo.monthlyRequestsRemaining,
          limitType: usageInfo.limitType
        }
      });
    }

    // 環境変数チェック
    if (!process.env.API_KEY) {
      console.error('API key is not configured');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // 入力検証
    const validation = validateInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const { message, history, systemInstruction } = req.body;

    const genAI = new GoogleGenAI(process.env.API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
      systemInstruction: systemInstruction || 'You are a helpful and safe assistant.',
    });

    // チャット履歴を設定
    const chat = model.startChat({
      history: toApiHistory(history || [])
    });

    // リクエストタイムアウト設定
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 25000);
    });

    const streamPromise = chat.sendMessageStream(message);
    const stream = await Promise.race([streamPromise, timeoutPromise]);

    // ストリーミングレスポンス設定
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    
    let totalResponseLength = 0;
    const maxResponseLength = 8000;
    let estimatedTokensUsed = 0;

    // ストリームの各チャンクをクライアントに書き込む
    for await (const chunk of stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        totalResponseLength += chunkText.length;
        estimatedTokensUsed += Math.ceil(chunkText.length / 4); // 文字数からトークン数を推定（1トークン≈4文字）
        
        // レスポンス長制限
        if (totalResponseLength > maxResponseLength) {
          res.write('\n\n[Response truncated due to length limit]');
          break;
        }
        
        res.write(chunkText);
      }
    }
    
    // リクエスト完了後に使用量を更新
    const inputTokens = Math.ceil(message.length / 4); // 入力トークンも推定
    const totalTokensUsed = inputTokens + estimatedTokensUsed;
    updateApiUsage(totalTokensUsed);
    
    // ヘッダーに使用量情報を追加
    const updatedUsage = isUsageWithinLimits();
    res.setHeader('X-Tokens-Used', totalTokensUsed);
    res.setHeader('X-Daily-Tokens-Remaining', updatedUsage.dailyTokensRemaining);
    res.setHeader('X-Monthly-Requests-Remaining', updatedUsage.monthlyRequestsRemaining);
    
    res.end();

  } catch (error) {
    console.error('Error calling Gemini API:', {
      message: error.message,
      timestamp: new Date().toISOString(),
      ip: getClientIP(req)
    });
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = {
      error: 'Failed to get response from AI',
      ...(isDevelopment && { details: error.message })
    };
    
    res.status(500).json(errorResponse);
  }
});

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/chat`);
});