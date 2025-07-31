import { ApiIntegration } from '../types/message';
import { supabase } from '../lib/supabase';
import { SalonErrorMessages } from './salon-error-messages';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

export class ApiErrorRecovery {
  private static retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  private static circuitBreakers = new Map<string, {
    failureCount: number;
    lastFailureTime: number;
    state: 'closed' | 'open' | 'half-open';
  }>();

  /**
   * エラーからの自動回復を試みる
   */
  static async recoverFromError(
    service: string,
    error: any,
    integration?: ApiIntegration
  ): Promise<{ recovered: boolean; action?: string; suggestion?: string }> {
    console.error(`API Error for ${service}:`, error);

    // エラータイプを判定
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'AUTH_ERROR':
        return await this.handleAuthError(service, integration);
      
      case 'RATE_LIMIT':
        return await this.handleRateLimitError(service);
      
      case 'NETWORK_ERROR':
        return await this.handleNetworkError(service);
      
      case 'INVALID_RESPONSE':
        return await this.handleInvalidResponseError(service);
      
      case 'TOKEN_EXPIRED':
        return await this.handleTokenExpiredError(service, integration);
      
      default:
        return {
          recovered: false,
          suggestion: 'サポートに連絡してください',
        };
    }
  }

  /**
   * エラーの分類
   */
  private static classifyError(error: any): string {
    const errorMessage = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.statusCode;

    // 認証エラー
    if (statusCode === 401 || errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
      return 'AUTH_ERROR';
    }

    // レート制限
    if (statusCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return 'RATE_LIMIT';
    }

    // ネットワークエラー
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || statusCode >= 500) {
      return 'NETWORK_ERROR';
    }

    // 無効なレスポンス
    if (errorMessage.includes('invalid') || errorMessage.includes('unexpected')) {
      return 'INVALID_RESPONSE';
    }

    // トークン期限切れ
    if (errorMessage.includes('token') && errorMessage.includes('expired')) {
      return 'TOKEN_EXPIRED';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * 認証エラーの処理
   */
  private static async handleAuthError(
    service: string,
    integration?: ApiIntegration
  ): Promise<{ recovered: boolean; action?: string; suggestion?: string }> {
    // 統合設定を無効化
    if (integration) {
      await supabase
        .from('api_integrations')
        .update({ is_active: false })
        .eq('id', integration.id);
    }

    return {
      recovered: false,
      action: 'INTEGRATION_DISABLED',
      suggestion: `${service}のAPI認証情報を確認し、再設定してください`,
    };
  }

  /**
   * レート制限エラーの処理
   */
  private static async handleRateLimitError(
    service: string
  ): Promise<{ recovered: boolean; action?: string; suggestion?: string }> {
    // レート制限をログに記録
    await this.logApiError(service, 'RATE_LIMIT', {
      timestamp: new Date().toISOString(),
    });

    // バックオフ時間を計算
    const backoffTime = this.calculateBackoffTime(service);

    return {
      recovered: false,
      action: 'BACKOFF',
      suggestion: `API制限に達しました。${Math.ceil(backoffTime / 1000)}秒後に再試行してください`,
    };
  }

  /**
   * ネットワークエラーの処理
   */
  private static async handleNetworkError(
    service: string
  ): Promise<{ recovered: boolean; action?: string; suggestion?: string }> {
    // サーキットブレーカーのチェック
    const breaker = this.getCircuitBreaker(service);
    
    if (breaker.state === 'open') {
      return {
        recovered: false,
        action: 'CIRCUIT_OPEN',
        suggestion: 'サービスが一時的に利用できません。しばらくお待ちください',
      };
    }

    // エラーカウントを増やす
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    // 閾値を超えたらサーキットを開く
    if (breaker.failureCount >= 5) {
      breaker.state = 'open';
      setTimeout(() => {
        breaker.state = 'half-open';
        breaker.failureCount = 0;
      }, 60000); // 1分後にhalf-openに
    }

    return {
      recovered: false,
      action: 'RETRY_LATER',
      suggestion: 'ネットワーク接続を確認してください',
    };
  }

  /**
   * 無効なレスポンスエラーの処理
   */
  private static async handleInvalidResponseError(
    service: string
  ): Promise<{ recovered: boolean; action?: string; suggestion?: string }> {
    await this.logApiError(service, 'INVALID_RESPONSE', {
      timestamp: new Date().toISOString(),
    });

    return {
      recovered: false,
      action: 'LOG_ERROR',
      suggestion: 'APIの応答形式が変更された可能性があります',
    };
  }

  /**
   * トークン期限切れエラーの処理
   */
  private static async handleTokenExpiredError(
    service: string,
    integration?: ApiIntegration
  ): Promise<{ recovered: boolean; action?: string; suggestion?: string }> {
    // Instagram の場合は自動更新を試みる
    if (service === 'instagram' && integration) {
      try {
        const newToken = await this.refreshInstagramToken(integration);
        if (newToken) {
          return {
            recovered: true,
            action: 'TOKEN_REFRESHED',
            suggestion: 'アクセストークンが自動的に更新されました',
          };
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }

    return {
      recovered: false,
      action: 'TOKEN_EXPIRED',
      suggestion: `${service}のアクセストークンを更新してください`,
    };
  }

  /**
   * Instagramトークンの更新
   */
  private static async refreshInstagramToken(
    integration: ApiIntegration
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?` +
        `grant_type=ig_refresh_token&` +
        `access_token=${integration.api_credentials.access_token}`
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // 新しいトークンを保存
      await supabase
        .from('api_integrations')
        .update({
          api_credentials: {
            ...integration.api_credentials,
            access_token: data.access_token,
          },
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      return data.access_token;
    } catch (error) {
      console.error('Instagram token refresh error:', error);
      return null;
    }
  }

  /**
   * リトライロジック（指数バックオフ付き）
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    service: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.retryConfig, ...config };
    let lastError: any;
    let delay = retryConfig.initialDelay;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // サーキットブレーカーのチェック
        const breaker = this.getCircuitBreaker(service);
        if (breaker.state === 'open') {
          throw new Error('Circuit breaker is open');
        }

        const result = await operation();
        
        // 成功したらサーキットブレーカーをリセット
        if (breaker.state === 'half-open') {
          breaker.state = 'closed';
          breaker.failureCount = 0;
        }

        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < retryConfig.maxRetries) {
          // 指数バックオフで待機
          await this.sleep(delay);
          delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * サーキットブレーカーの取得
   */
  private static getCircuitBreaker(service: string) {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, {
        failureCount: 0,
        lastFailureTime: 0,
        state: 'closed',
      });
    }
    return this.circuitBreakers.get(service)!;
  }

  /**
   * バックオフ時間の計算
   */
  private static calculateBackoffTime(service: string): number {
    const breaker = this.getCircuitBreaker(service);
    const baseDelay = 1000; // 1秒
    const maxDelay = 60000; // 60秒
    
    const delay = Math.min(
      baseDelay * Math.pow(2, breaker.failureCount),
      maxDelay
    );
    
    return delay;
  }

  /**
   * エラーログの記録
   */
  private static async logApiError(
    service: string,
    errorType: string,
    details: any
  ): Promise<void> {
    try {
      await supabase
        .from('api_error_logs')
        .insert({
          service,
          error_type: errorType,
          details,
          occurred_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log API error:', error);
    }
  }

  /**
   * スリープユーティリティ
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * フォールバック処理
   */
  static async executeFallback(
    service: string,
    originalOperation: () => Promise<any>,
    fallbackOperation: () => Promise<any>
  ): Promise<any> {
    try {
      return await originalOperation();
    } catch (error) {
      console.warn(`Falling back for ${service}:`, error);
      
      // エラーをログに記録
      await this.logApiError(service, 'FALLBACK_TRIGGERED', {
        originalError: error,
        timestamp: new Date().toISOString(),
      });

      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error(`Fallback also failed for ${service}:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * 健全性チェックとアラート
   */
  static async checkServiceHealth(service: string): Promise<{
    isHealthy: boolean;
    errorRate: number;
    recentErrors: number;
    recommendation?: string;
  }> {
    try {
      // 直近1時間のエラーを取得
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: errors, error } = await supabase
        .from('api_error_logs')
        .select('*')
        .eq('service', service)
        .gte('occurred_at', oneHourAgo);

      if (error) throw error;

      const recentErrors = errors?.length || 0;
      const errorRate = recentErrors / 60; // エラー/分

      let isHealthy = true;
      let recommendation: string | undefined;

      if (errorRate > 1) {
        isHealthy = false;
        recommendation = 'エラー率が高いため、API設定を確認してください';
      } else if (errorRate > 0.5) {
        recommendation = 'エラーが頻発しています。監視を続けてください';
      }

      return {
        isHealthy,
        errorRate,
        recentErrors,
        recommendation,
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        isHealthy: false,
        errorRate: 0,
        recentErrors: 0,
        recommendation: '健全性チェックに失敗しました',
      };
    }
  }
}