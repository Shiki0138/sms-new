/**
 * セキュリティミドルウェア
 * CORS、セキュリティヘッダー、レート制限などのセキュリティ機能を提供
 */

interface SecurityHeaders {
  [key: string]: string;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: any) => string;
}

/**
 * セキュリティヘッダーを設定
 */
export function getSecurityHeaders(isDevelopment: boolean = false): SecurityHeaders {
  const baseHeaders: SecurityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };

  if (!isDevelopment) {
    baseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    baseHeaders['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.line.me https://generativelanguage.googleapis.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ');
  }

  return baseHeaders;
}

/**
 * レート制限管理クラス
 */
export class RateLimiter {
  private static cache = new Map<string, number[]>();
  
  /**
   * レート制限チェック
   */
  static checkRateLimit(
    key: string, 
    options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }
  ): boolean {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    // 既存のリクエスト履歴を取得
    let requests = this.cache.get(key) || [];
    
    // ウィンドウ外のリクエストを削除
    requests = requests.filter(time => time > windowStart);
    
    // レート制限チェック
    if (requests.length >= options.maxRequests) {
      // ログに記録（本番環境では外部ログシステムに送信）
      console.warn(`Rate limit exceeded for key: ${key}`);
      return false;
    }
    
    // 新しいリクエストを記録
    requests.push(now);
    this.cache.set(key, requests);
    
    // 古いエントリをクリーンアップ（メモリ使用量制限）
    if (this.cache.size > 10000) {
      this.cleanupCache();
    }
    
    return true;
  }
  
  /**
   * キャッシュのクリーンアップ
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000; // 5分前
    
    for (const [key, requests] of this.cache.entries()) {
      const recentRequests = requests.filter(time => time > fiveMinutesAgo);
      if (recentRequests.length === 0) {
        this.cache.delete(key);
      } else {
        this.cache.set(key, recentRequests);
      }
    }
  }
  
  /**
   * 特定のキーをリセット
   */
  static resetRateLimit(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * すべてのレート制限をリセット
   */
  static resetAllRateLimits(): void {
    this.cache.clear();
  }
}

/**
 * IPアドレスベースのレート制限
 */
export function rateLimitByIP(
  request: any, 
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }
): boolean {
  const ip = getClientIP(request);
  return RateLimiter.checkRateLimit(`ip:${ip}`, options);
}

/**
 * ユーザーIDベースのレート制限
 */
export function rateLimitByUser(
  userId: string, 
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 200 }
): boolean {
  return RateLimiter.checkRateLimit(`user:${userId}`, options);
}

/**
 * Webhookエンドポイント用のレート制限
 */
export function rateLimitWebhook(
  source: string,
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 1000 }
): boolean {
  return RateLimiter.checkRateLimit(`webhook:${source}:${identifier}`, options);
}

/**
 * クライアントIPアドレスを取得
 */
function getClientIP(request: any): string {
  return (
    request.headers['x-forwarded-for']?.split(',')[0] ||
    request.headers['x-real-ip'] ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * CORS設定を生成
 */
export function getCorsConfig(isDevelopment: boolean = false) {
  const allowedOrigins = isDevelopment
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : (process.env.VITE_ALLOWED_ORIGINS?.split(',') || []);

  return {
    origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
      // リクエストにoriginがない場合（例：モバイルアプリ、Postman）は許可
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Line-Signature',
      'X-Hub-Signature-256'
    ]
  };
}

/**
 * 入力値のサニタイゼーション
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    // XSS防止
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // SQL Injection防止（追加の保護として）
    .replace(/(['";])/g, '\\$1')
    // 制御文字削除
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * メールアドレスの検証
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * パスワードの強度チェック
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    feedback.push('パスワードは8文字以上である必要があります');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    feedback.push('小文字を含む必要があります');
  } else {
    score += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push('大文字を含む必要があります');
  } else {
    score += 1;
  }
  
  if (!/[0-9]/.test(password)) {
    feedback.push('数字を含む必要があります');
  } else {
    score += 1;
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('特殊文字を含む必要があります');
  } else {
    score += 1;
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback
  };
}

/**
 * セキュリティログ出力
 */
export function logSecurityEvent(
  event: string,
  details: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  };
  
  // 本番環境では外部ログシステムに送信
  if (process.env.NODE_ENV === 'production') {
    // TODO: 外部ログサービス（DataDog、Splunk等）に送信
    console.log(JSON.stringify(logEntry));
  } else {
    console.warn('Security Event:', logEntry);
  }
}