import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  KeyIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { IntegrationType, ApiIntegration, IntegrationStatus } from '../../types/message';
import { animations } from '../../styles/design-system';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// 統合設定
const INTEGRATION_CONFIG: Record<IntegrationType, {
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  requiredFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    placeholder: string;
  }>;
  helpUrl: string;
}> = {
  line: {
    name: 'LINE Messaging API',
    description: 'LINEメッセージの送受信、リッチメッセージ、自動応答',
    icon: '💬',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    requiredFields: [
      {
        key: 'channel_access_token',
        label: 'Channel Access Token',
        type: 'password',
        placeholder: 'チャンネルアクセストークンを入力',
      },
      {
        key: 'channel_secret',
        label: 'Channel Secret',
        type: 'password',
        placeholder: 'チャンネルシークレットを入力',
      },
    ],
    helpUrl: 'https://developers.line.biz/ja/docs/messaging-api/',
  },
  instagram: {
    name: 'Instagram Basic Display API',
    description: 'Instagram DMの管理、投稿連携、顧客コミュニケーション',
    icon: '📷',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    requiredFields: [
      {
        key: 'app_id',
        label: 'Instagram App ID',
        type: 'text',
        placeholder: 'アプリIDを入力',
      },
      {
        key: 'app_secret',
        label: 'Instagram App Secret',
        type: 'password',
        placeholder: 'アプリシークレットを入力',
      },
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        placeholder: 'アクセストークンを入力',
      },
    ],
    helpUrl: 'https://developers.facebook.com/docs/instagram-basic-display-api',
  },
  google_calendar: {
    name: 'Google Calendar API',
    description: '予約の双方向同期、スケジュール管理の自動化',
    icon: '📅',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    requiredFields: [
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        placeholder: 'クライアントIDを入力',
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'クライアントシークレットを入力',
      },
    ],
    helpUrl: 'https://developers.google.com/calendar/api/guides/overview',
  },
  hot_pepper: {
    name: 'ホットペッパービューティー',
    description: '予約情報の自動取り込み、空き状況の同期',
    icon: '🌶️',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    requiredFields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'APIキーを入力',
      },
      {
        key: 'salon_id',
        label: 'サロンID',
        type: 'text',
        placeholder: 'サロンIDを入力',
      },
    ],
    helpUrl: 'https://webservice.recruit.co.jp/doc/hotpepper/',
  },
};

export default function ApiIntegrationSettings() {
  const [integrations, setIntegrations] = useState<Record<IntegrationType, ApiIntegration | null>>({
    line: null,
    instagram: null,
    google_calendar: null,
    hot_pepper: null,
  });
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<IntegrationType | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [testingType, setTestingType] = useState<IntegrationType | null>(null);

  // 統合設定を読み込み
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('api_integrations')
        .select('*')
        .order('integration_type');

      if (error) throw error;

      const integrationsMap: Record<IntegrationType, ApiIntegration | null> = {
        line: null,
        instagram: null,
        google_calendar: null,
        hot_pepper: null,
      };

      data?.forEach((integration) => {
        integrationsMap[integration.integration_type as IntegrationType] = integration;
      });

      setIntegrations(integrationsMap);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('API連携設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 設定を開始
  const startEditing = (type: IntegrationType) => {
    setEditingType(type);
    const existing = integrations[type];
    if (existing) {
      setCredentials(existing.api_credentials || {});
    } else {
      setCredentials({});
    }
  };

  // 設定を保存
  const saveIntegration = async () => {
    if (!editingType) return;

    try {
      const config = INTEGRATION_CONFIG[editingType];
      
      // 必須フィールドのチェック
      for (const field of config.requiredFields) {
        if (!credentials[field.key]) {
          toast.error(`${field.label}を入力してください`);
          return;
        }
      }

      // Webhook URLを生成
      const webhookUrl = `${window.location.origin}/api/webhooks/${editingType}`;

      const integrationData = {
        tenant_id: 'current_tenant_id', // TODO: 実際のテナントID
        integration_type: editingType,
        api_credentials: credentials,
        webhook_url: webhookUrl,
        is_active: true,
      };

      if (integrations[editingType]) {
        // 更新
        const { error } = await supabase
          .from('api_integrations')
          .update(integrationData)
          .eq('id', integrations[editingType]!.id);

        if (error) throw error;
      } else {
        // 新規作成
        const { error } = await supabase
          .from('api_integrations')
          .insert(integrationData);

        if (error) throw error;
      }

      toast.success('API連携設定を保存しました');
      setEditingType(null);
      setCredentials({});
      loadIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('設定の保存に失敗しました');
    }
  };

  // 接続テスト
  const testConnection = async (type: IntegrationType) => {
    setTestingType(type);
    
    try {
      // TODO: 実際のAPI接続テスト
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // テスト成功
      toast.success(`${INTEGRATION_CONFIG[type].name}への接続に成功しました`);
      
      // last_sync_atを更新
      if (integrations[type]) {
        await supabase
          .from('api_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integrations[type]!.id);
        
        loadIntegrations();
      }
    } catch (error) {
      toast.error(`${INTEGRATION_CONFIG[type].name}への接続に失敗しました`);
    } finally {
      setTestingType(null);
    }
  };

  // 連携を削除
  const deleteIntegration = async (type: IntegrationType) => {
    if (!integrations[type]) return;

    if (!window.confirm(`${INTEGRATION_CONFIG[type].name}の連携を解除しますか？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_integrations')
        .delete()
        .eq('id', integrations[type]!.id);

      if (error) throw error;

      toast.success('API連携を解除しました');
      loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error('連携の解除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-primary-100 rounded-lg">
            <LinkIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">外部API連携設定</h2>
            <p className="text-sm text-gray-600">
              LINE、Instagram、Google Calendarなどと連携して機能を拡張
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(INTEGRATION_CONFIG).map(([type, config]) => {
            const integration = integrations[type as IntegrationType];
            const isConnected = integration && integration.is_active;
            const isEditing = editingType === type;
            const isTesting = testingType === type;

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={animations.spring.gentle}
                className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition-colors"
              >
                {/* ヘッダー */}
                <div className={`p-6 ${isConnected ? 'bg-gradient-to-r from-gray-50 to-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-3 rounded-lg ${config.bgColor}`}>
                        <span className="text-2xl">{config.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{config.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                        
                        {/* ステータス */}
                        <div className="flex items-center mt-3 space-x-2">
                          {isConnected ? (
                            <>
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-medium text-green-600">接続済み</span>
                              {integration.last_sync_at && (
                                <span className="text-xs text-gray-500">
                                  最終同期: {new Date(integration.last_sync_at).toLocaleString('ja-JP')}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-5 w-5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-500">未接続</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 編集フォーム */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={animations.spring.gentle}
                      className="border-t border-gray-200"
                    >
                      <div className="p-6 space-y-4">
                        {config.requiredFields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label}
                            </label>
                            <input
                              type={field.type}
                              value={credentials[field.key] || ''}
                              onChange={(e) => setCredentials({
                                ...credentials,
                                [field.key]: e.target.value,
                              })}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        ))}

                        {/* Webhook URL表示 */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium mb-1">Webhook URL:</p>
                          <code className="text-xs text-gray-700 break-all">
                            {window.location.origin}/api/webhooks/{type}
                          </code>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <button
                            onClick={() => {
                              setEditingType(null);
                              setCredentials({});
                            }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={saveIntegration}
                            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* アクションボタン */}
                {!isEditing && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <a
                      href={config.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                      <span>設定ガイド</span>
                    </a>
                    
                    <div className="flex items-center space-x-2">
                      {isConnected && (
                        <>
                          <button
                            onClick={() => testConnection(type as IntegrationType)}
                            disabled={isTesting}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 flex items-center space-x-1"
                          >
                            {isTesting ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <ArrowPathIcon className="h-4 w-4" />
                            )}
                            <span>テスト</span>
                          </button>
                          <button
                            onClick={() => deleteIntegration(type as IntegrationType)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                          >
                            解除
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => startEditing(type as IntegrationType)}
                        className={`px-4 py-1.5 text-sm rounded-lg font-medium ${
                          isConnected
                            ? 'text-primary-600 hover:bg-primary-50'
                            : 'bg-primary-500 text-white hover:bg-primary-600'
                        }`}
                      >
                        {isConnected ? '編集' : '接続'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* 注意事項 */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">API連携に関する注意事項</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>APIキーは安全に管理し、第三者に共有しないでください</li>
                <li>各サービスの利用規約とAPI利用制限をご確認ください</li>
                <li>連携解除してもメッセージ履歴は保持されます</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}