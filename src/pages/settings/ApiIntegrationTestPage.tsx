import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BeakerIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { ApiIntegrationValidator, ValidationResult, IntegrationTestResult } from '../../services/api-integration-validator';
import { IntegratedApiService } from '../../services/integrated-api-service';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { animations } from '../../styles/design-system';

interface TestStatus {
  service: string;
  status: 'idle' | 'testing' | 'success' | 'error';
  result?: IntegrationTestResult;
  validation?: ValidationResult;
}

export default function ApiIntegrationTestPage() {
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({
    line: { service: 'LINE', status: 'idle' },
    instagram: { service: 'Instagram', status: 'idle' },
    email: { service: 'Email', status: 'idle' },
    gemini: { service: 'Gemini AI', status: 'idle' },
  });
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');

  // 個別のAPI統合をテスト
  const testIntegration = async (service: string) => {
    setTestStatuses(prev => ({
      ...prev,
      [service]: { ...prev[service], status: 'testing' },
    }));

    try {
      // API統合情報を取得
      const { data: integration, error } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('integration_type', service)
        .eq('is_active', true)
        .single();

      if (error || !integration) {
        throw new Error(`${service}の統合設定が見つかりません`);
      }

      // バリデーション実行
      let validation: ValidationResult;
      switch (service) {
        case 'line':
          validation = await ApiIntegrationValidator.validateLineIntegration(integration);
          break;
        case 'instagram':
          validation = await ApiIntegrationValidator.validateInstagramIntegration(integration);
          break;
        case 'email':
          validation = await ApiIntegrationValidator.validateEmailIntegration(integration);
          break;
        default:
          throw new Error('未対応のサービスです');
      }

      // 接続テスト実行
      let testResult: IntegrationTestResult;
      switch (service) {
        case 'line':
          testResult = await ApiIntegrationValidator.testLineConnection(integration);
          break;
        case 'instagram':
          testResult = await ApiIntegrationValidator.testInstagramConnection(integration);
          break;
        case 'email':
          testResult = await ApiIntegrationValidator.testEmailConnection(integration);
          break;
        default:
          throw new Error('未対応のサービスです');
      }

      setTestStatuses(prev => ({
        ...prev,
        [service]: {
          ...prev[service],
          status: testResult.success ? 'success' : 'error',
          result: testResult,
          validation,
        },
      }));

      if (testResult.success) {
        toast.success(`${service}の接続テストに成功しました`);
      } else {
        toast.error(`${service}の接続テストに失敗しました: ${testResult.error}`);
      }
    } catch (error: any) {
      setTestStatuses(prev => ({
        ...prev,
        [service]: {
          ...prev[service],
          status: 'error',
          result: {
            service,
            success: false,
            error: error.message,
          },
        },
      }));
      toast.error(error.message);
    }
  };

  // Gemini AIをテスト
  const testGeminiIntegration = async () => {
    setTestStatuses(prev => ({
      ...prev,
      gemini: { ...prev.gemini, status: 'testing' },
    }));

    try {
      // Gemini APIキーを取得（通常は環境変数や設定から）
      const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
      
      if (!geminiApiKey) {
        throw new Error('Gemini APIキーが設定されていません');
      }

      // バリデーション
      const validation = await ApiIntegrationValidator.validateGeminiIntegration(geminiApiKey);

      // 接続テスト
      const testResult = await ApiIntegrationValidator.testGeminiConnection(geminiApiKey);

      setTestStatuses(prev => ({
        ...prev,
        gemini: {
          ...prev.gemini,
          status: testResult.success ? 'success' : 'error',
          result: testResult,
          validation,
        },
      }));

      if (testResult.success) {
        toast.success('Gemini AIの接続テストに成功しました');
      } else {
        toast.error(`Gemini AIの接続テストに失敗しました: ${testResult.error}`);
      }
    } catch (error: any) {
      setTestStatuses(prev => ({
        ...prev,
        gemini: {
          ...prev.gemini,
          status: 'error',
          result: {
            service: 'Gemini AI',
            success: false,
            error: error.message,
          },
        },
      }));
      toast.error(error.message);
    }
  };

  // すべての統合をテスト
  const testAllIntegrations = async () => {
    setIsTestingAll(true);
    
    const services = ['line', 'instagram', 'email'];
    
    // 順番にテスト（並行実行も可能）
    for (const service of services) {
      await testIntegration(service);
    }
    
    // Gemini AIもテスト
    await testGeminiIntegration();
    
    setIsTestingAll(false);
  };

  // ステータスアイコンを取得
  const getStatusIcon = (status: TestStatus['status']) => {
    switch (status) {
      case 'idle':
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
      case 'testing':
        return <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
    }
  };

  // ステータスの色を取得
  const getStatusColor = (status: TestStatus['status']) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-100 border-gray-300';
      case 'testing':
        return 'bg-blue-50 border-blue-300';
      case 'success':
        return 'bg-green-50 border-green-300';
      case 'error':
        return 'bg-red-50 border-red-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <BeakerIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">API統合テスト</h1>
                <p className="text-sm text-gray-600 mt-1">
                  外部サービスとの接続状態を確認し、問題を診断します
                </p>
              </div>
            </div>
            <button
              onClick={testAllIntegrations}
              disabled={isTestingAll}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isTestingAll ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  <span>テスト中...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>すべてテスト</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* テスト結果一覧 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(testStatuses).map(([key, status]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={animations.spring.gentle}
              className={`bg-white rounded-xl shadow-sm border-2 ${getStatusColor(status.status)} overflow-hidden`}
            >
              {/* サービスヘッダー */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status.status)}
                    <h3 className="text-lg font-bold text-gray-800">{status.service}</h3>
                  </div>
                  <button
                    onClick={() => key === 'gemini' ? testGeminiIntegration() : testIntegration(key)}
                    disabled={status.status === 'testing' || isTestingAll}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    テスト実行
                  </button>
                </div>

                {/* レイテンシ表示 */}
                {status.result?.latency && (
                  <div className="mt-2 text-sm text-gray-600">
                    応答時間: <span className="font-medium">{status.result.latency}ms</span>
                  </div>
                )}
              </div>

              {/* バリデーション結果 */}
              {status.validation && (
                <div className="p-6 space-y-4">
                  {/* エラー */}
                  {status.validation.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-red-700">エラー</h4>
                      {status.validation.errors.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <XCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 警告 */}
                  {status.validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-amber-700">警告</h4>
                      {status.validation.warnings.map((warning, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-600">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 機能 */}
                  {status.validation.capabilities.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-green-700">利用可能な機能</h4>
                      <div className="flex flex-wrap gap-2">
                        {status.validation.capabilities.map((capability, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 推奨事項 */}
                  {status.validation.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-700">推奨事項</h4>
                      {status.validation.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-600">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* テスト結果詳細 */}
              {status.result && (
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  {status.result.error ? (
                    <div className="text-sm text-red-600">
                      <p className="font-medium">エラー詳細:</p>
                      <p className="mt-1">{status.result.error}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-green-600">接続成功</p>
                      {status.result.details && (
                        <pre className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs overflow-auto">
                          {JSON.stringify(status.result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* 統合サービスのステータス */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">統合サービスの健全性</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700">API呼び出し制限</span>
              </div>
              <span className="text-sm text-gray-600">今月: 234/1,000回</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">メール送信制限</span>
              </div>
              <span className="text-sm text-gray-600">本日: 45/50通</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700">最終同期</span>
              </div>
              <span className="text-sm text-gray-600">5分前</span>
            </div>
          </div>
        </div>

        {/* ヘルプ情報 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-2">API統合のトラブルシューティング</p>
              <ul className="list-disc list-inside space-y-1">
                <li>接続エラーが発生する場合は、APIキーやトークンが正しく設定されているか確認してください</li>
                <li>Webhook URLはHTTPSである必要があります。開発環境ではngrokなどを使用してください</li>
                <li>Instagram DMはビジネスアカウントでのみ利用可能です</li>
                <li>メール送信にはSMTP設定が必要です。Gmailの場合はアプリパスワードを使用してください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}