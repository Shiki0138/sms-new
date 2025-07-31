import { LineApiService } from './line-api';
import { InstagramApiService } from './instagram-api';
import { EmailApiService } from './email-api';
import { GeminiAiService } from './gemini-ai-service';
import { ApiIntegration } from '../types/message';
import { SalonErrorMessages } from './salon-error-messages';

export interface ValidationResult {
  service: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  capabilities: string[];
  recommendations: string[];
}

export interface IntegrationTestResult {
  service: string;
  success: boolean;
  latency?: number;
  error?: string;
  details?: any;
}

/**
 * API統合の検証とテストを行うサービス
 */
export class ApiIntegrationValidator {
  /**
   * LINE API統合の検証
   */
  static async validateLineIntegration(integration: ApiIntegration): Promise<ValidationResult> {
    const result: ValidationResult = {
      service: 'LINE',
      isValid: true,
      errors: [],
      warnings: [],
      capabilities: [],
      recommendations: [],
    };

    try {
      // 必須フィールドの検証
      if (!integration.api_credentials.channel_access_token) {
        result.errors.push('Channel Access Tokenが設定されていません');
        result.isValid = false;
      }

      if (!integration.api_credentials.channel_secret) {
        result.errors.push('Channel Secretが設定されていません');
        result.isValid = false;
      }

      // トークンフォーマットの検証
      const token = integration.api_credentials.channel_access_token;
      if (token && token.length < 100) {
        result.warnings.push('Channel Access Tokenの形式が不正な可能性があります');
      }

      // Webhook URLの確認
      if (!integration.webhook_url) {
        result.warnings.push('Webhook URLが設定されていません。メッセージ受信ができません');
      } else if (!integration.webhook_url.startsWith('https://')) {
        result.errors.push('Webhook URLはHTTPSである必要があります');
        result.isValid = false;
      }

      // 機能確認
      if (result.isValid) {
        result.capabilities = [
          'テキストメッセージ送信',
          'リッチメッセージ送信',
          'カルーセルメッセージ送信',
          'プロフィール取得',
          '予約確認メッセージ',
          'リマインダーメッセージ',
        ];
      }

      // 推奨事項
      result.recommendations = [
        'リッチメニューを設定して顧客の操作を簡単にしましょう',
        '自動応答メッセージを設定して24時間対応を実現しましょう',
        'Messaging APIの利用料金プランを確認してください',
      ];

    } catch (error) {
      result.errors.push(`検証エラー: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Instagram API統合の検証
   */
  static async validateInstagramIntegration(integration: ApiIntegration): Promise<ValidationResult> {
    const result: ValidationResult = {
      service: 'Instagram',
      isValid: true,
      errors: [],
      warnings: [],
      capabilities: [],
      recommendations: [],
    };

    try {
      // 必須フィールドの検証
      if (!integration.api_credentials.app_id) {
        result.errors.push('Instagram App IDが設定されていません');
        result.isValid = false;
      }

      if (!integration.api_credentials.app_secret) {
        result.errors.push('Instagram App Secretが設定されていません');
        result.isValid = false;
      }

      if (!integration.api_credentials.access_token) {
        result.errors.push('Access Tokenが設定されていません');
        result.isValid = false;
      }

      // ビジネスアカウントの確認
      result.warnings.push('Instagram Graph API for MessagingはInstagramビジネスアカウントが必要です');

      // トークンの有効期限チェック
      if (integration.api_credentials.access_token) {
        result.warnings.push('Access Tokenは60日で有効期限が切れます。定期的な更新が必要です');
      }

      // 機能確認
      if (result.isValid) {
        result.capabilities = [
          'DMの送受信（ビジネスアカウントのみ）',
          'プロフィール情報取得',
          'メディア投稿の取得',
          'ハッシュタグ分析',
        ];
      }

      // 推奨事項
      result.recommendations = [
        'Instagram Shopping機能と連携して商品販売を促進しましょう',
        'ストーリーズハイライトで営業時間や料金を表示しましょう',
        'DMの自動返信を設定して即座に対応しましょう',
        'アクセストークンの自動更新を設定してください',
      ];

    } catch (error) {
      result.errors.push(`検証エラー: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Email API統合の検証
   */
  static async validateEmailIntegration(integration: ApiIntegration): Promise<ValidationResult> {
    const result: ValidationResult = {
      service: 'Email',
      isValid: true,
      errors: [],
      warnings: [],
      capabilities: [],
      recommendations: [],
    };

    try {
      // SMTP設定の検証
      if (!integration.api_credentials.smtp_host) {
        result.errors.push('SMTPホストが設定されていません');
        result.isValid = false;
      }

      if (!integration.api_credentials.email_user) {
        result.errors.push('メールアドレスが設定されていません');
        result.isValid = false;
      }

      if (!integration.api_credentials.email_password) {
        result.errors.push('メールパスワードが設定されていません');
        result.isValid = false;
      }

      // ポート番号の検証
      const smtpPort = parseInt(integration.api_credentials.smtp_port || '587');
      if (![25, 465, 587, 2525].includes(smtpPort)) {
        result.warnings.push('一般的でないSMTPポートが設定されています');
      }

      // セキュリティ設定の確認
      if (smtpPort === 25) {
        result.warnings.push('ポート25は暗号化されていません。セキュアな接続（465/587）を推奨します');
      }

      // SPF/DKIM設定の確認
      result.warnings.push('SPF/DKIM設定を行い、メールの到達率を向上させてください');

      // 機能確認
      if (result.isValid) {
        result.capabilities = [
          'HTMLメール送信',
          'テキストメール送信',
          '添付ファイル送信',
          '一括メール送信（制限あり）',
          '予約確認メール',
          'リマインダーメール',
          '自動返信メール',
        ];
      }

      // 推奨事項
      result.recommendations = [
        'SPF/DKIM/DMARCを設定してメールの信頼性を向上させましょう',
        '配信停止リンクを含めて法令遵守しましょう',
        'バウンスメールの処理を自動化しましょう',
        'メールテンプレートをレスポンシブデザインにしましょう',
      ];

    } catch (error) {
      result.errors.push(`検証エラー: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Gemini AI統合の検証
   */
  static async validateGeminiIntegration(apiKey: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      service: 'Gemini AI',
      isValid: true,
      errors: [],
      warnings: [],
      capabilities: [],
      recommendations: [],
    };

    try {
      // APIキーの検証
      if (!apiKey) {
        result.errors.push('Gemini APIキーが設定されていません');
        result.isValid = false;
      }

      // APIキーフォーマットの検証
      if (apiKey && apiKey.length !== 39) {
        result.warnings.push('Gemini APIキーの形式が不正な可能性があります');
      }

      // 利用制限の確認
      result.warnings.push('Gemini APIには無料プランで1分間60リクエストの制限があります');

      // 機能確認
      if (result.isValid) {
        result.capabilities = [
          '自動返信文生成',
          '予約メッセージ解析',
          '感情分析',
          '多言語対応',
          'カスタムプロンプト対応',
          '複数返信候補生成',
        ];
      }

      // 推奨事項
      result.recommendations = [
        'APIキーは環境変数で管理してセキュリティを確保しましょう',
        'レート制限を考慮したリトライ機能を実装しましょう',
        '生成された返信は必ず人間が確認してから送信しましょう',
        'プロンプトを最適化して的確な返信を生成しましょう',
      ];

    } catch (error) {
      result.errors.push(`検証エラー: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * 統合APIの接続テスト
   */
  static async testLineConnection(integration: ApiIntegration): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      const lineApi = new LineApiService({
        channelAccessToken: integration.api_credentials.channel_access_token,
        channelSecret: integration.api_credentials.channel_secret,
      });

      // テスト用のダミーユーザーIDでプロフィール取得を試みる
      // 実際のテストでは有効なユーザーIDが必要
      const testUserId = 'U1234567890abcdef1234567890abcdef';
      
      try {
        await lineApi.getUserProfile(testUserId);
      } catch (error: any) {
        // 401エラーは認証の問題、404はユーザーが見つからない（正常）
        if (error.message.includes('401')) {
          throw new Error('認証に失敗しました。アクセストークンを確認してください');
        }
        // 404は期待される動作（テスト用ダミーIDのため）
      }

      const latency = Date.now() - startTime;
      
      return {
        service: 'LINE',
        success: true,
        latency,
        details: {
          webhookUrl: integration.webhook_url,
          capabilities: ['messaging', 'rich_messages', 'profile_api'],
        },
      };
    } catch (error: any) {
      return {
        service: 'LINE',
        success: false,
        error: error.message || 'LINE API接続テストに失敗しました',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Instagram API接続テスト
   */
  static async testInstagramConnection(integration: ApiIntegration): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      const instagramApi = new InstagramApiService(integration);
      const isConnected = await instagramApi.testConnection();
      
      if (!isConnected) {
        throw new Error('Instagram APIへの接続に失敗しました');
      }

      // アクセストークンの有効性確認
      const tokenValidation = await instagramApi.validateAccessToken();
      
      const latency = Date.now() - startTime;
      
      return {
        service: 'Instagram',
        success: true,
        latency,
        details: {
          tokenValid: tokenValidation.isValid,
          tokenExpiry: tokenValidation.expiresAt,
          capabilities: ['direct_messaging', 'media_api', 'basic_display'],
        },
      };
    } catch (error: any) {
      return {
        service: 'Instagram',
        success: false,
        error: error.message || 'Instagram API接続テストに失敗しました',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Email接続テスト
   */
  static async testEmailConnection(integration: ApiIntegration): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      const emailApi = new EmailApiService(integration);
      const testResult = await emailApi.testConnection();
      
      if (!testResult.smtp) {
        throw new Error('SMTPサーバーへの接続に失敗しました');
      }

      const latency = Date.now() - startTime;
      
      return {
        service: 'Email',
        success: true,
        latency,
        details: {
          smtp: testResult.smtp,
          imap: testResult.imap,
          capabilities: ['html_email', 'attachments', 'bulk_send', 'templates'],
        },
      };
    } catch (error: any) {
      return {
        service: 'Email',
        success: false,
        error: error.message || 'メールサーバー接続テストに失敗しました',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Gemini AI接続テスト
   */
  static async testGeminiConnection(apiKey: string): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      const geminiService = new GeminiAiService(apiKey);
      
      // テストプロンプトで接続確認
      const testReply = await geminiService.generateCustomReply(
        'こんにちは。これはテストメッセージです。短く返信してください。'
      );
      
      if (!testReply || testReply.length === 0) {
        throw new Error('Gemini APIからの応答がありません');
      }

      const latency = Date.now() - startTime;
      
      return {
        service: 'Gemini AI',
        success: true,
        latency,
        details: {
          testResponse: testReply.substring(0, 100),
          capabilities: ['text_generation', 'sentiment_analysis', 'intent_detection'],
        },
      };
    } catch (error: any) {
      return {
        service: 'Gemini AI',
        success: false,
        error: error.message || 'Gemini AI接続テストに失敗しました',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * すべての統合をテスト
   */
  static async testAllIntegrations(integrations: {
    line?: ApiIntegration;
    instagram?: ApiIntegration;
    email?: ApiIntegration;
    geminiApiKey?: string;
  }): Promise<IntegrationTestResult[]> {
    const results: IntegrationTestResult[] = [];

    // 並行してテストを実行
    const testPromises: Promise<IntegrationTestResult>[] = [];

    if (integrations.line) {
      testPromises.push(this.testLineConnection(integrations.line));
    }

    if (integrations.instagram) {
      testPromises.push(this.testInstagramConnection(integrations.instagram));
    }

    if (integrations.email) {
      testPromises.push(this.testEmailConnection(integrations.email));
    }

    if (integrations.geminiApiKey) {
      testPromises.push(this.testGeminiConnection(integrations.geminiApiKey));
    }

    const testResults = await Promise.allSettled(testPromises);
    
    testResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          service: 'Unknown',
          success: false,
          error: result.reason?.message || '不明なエラー',
        });
      }
    });

    return results;
  }

  /**
   * 統合の健全性チェック
   */
  static async checkIntegrationHealth(integration: ApiIntegration): Promise<{
    isHealthy: boolean;
    issues: string[];
    lastSync?: Date;
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let isHealthy = true;

    // 最終同期時刻のチェック
    if (integration.last_sync_at) {
      const lastSync = new Date(integration.last_sync_at);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync > 24) {
        issues.push('24時間以上同期されていません');
        recommendations.push('接続状態を確認し、必要に応じて再接続してください');
      }
    } else {
      issues.push('まだ一度も同期されていません');
      isHealthy = false;
    }

    // アクティブ状態のチェック
    if (!integration.is_active) {
      issues.push('統合が無効化されています');
      isHealthy = false;
      recommendations.push('設定画面から統合を有効化してください');
    }

    // 認証情報の存在チェック
    const requiredFields = this.getRequiredFieldsForIntegrationType(integration.integration_type);
    const missingFields = requiredFields.filter(
      field => !integration.api_credentials[field]
    );

    if (missingFields.length > 0) {
      issues.push(`必須フィールドが不足しています: ${missingFields.join(', ')}`);
      isHealthy = false;
      recommendations.push('API設定を確認し、必要な情報を入力してください');
    }

    return {
      isHealthy,
      issues,
      lastSync: integration.last_sync_at ? new Date(integration.last_sync_at) : undefined,
      recommendations,
    };
  }

  /**
   * 統合タイプごとの必須フィールドを取得
   */
  private static getRequiredFieldsForIntegrationType(type: string): string[] {
    switch (type) {
      case 'line':
        return ['channel_access_token', 'channel_secret'];
      case 'instagram':
        return ['app_id', 'app_secret', 'access_token'];
      case 'email':
        return ['smtp_host', 'email_user', 'email_password'];
      case 'google_calendar':
        return ['client_id', 'client_secret'];
      case 'hot_pepper':
        return ['api_key', 'salon_id'];
      default:
        return [];
    }
  }
}