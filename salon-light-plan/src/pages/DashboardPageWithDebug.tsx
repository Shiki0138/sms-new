import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface DebugLogEntry {
  timestamp: string;
  message: string;
  data?: unknown;
}

const DashboardPageWithDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugLogEntry[]>([]);
  const [manualUserData, setManualUserData] = useState<unknown>(null);
  const [manualTenantData, setManualTenantData] = useState<unknown>(null);

  const addDebugLog = useCallback((message: string, data?: unknown) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo((prev) => [...prev, { timestamp, message, data }]);
    console.log(`[${timestamp}] ${message}`, data);
  }, []);

  // useAuthを呼び出す
  const authData = useAuth();

  useEffect(() => {
    addDebugLog('DashboardPageWithDebug mounted');
    addDebugLog('useAuth result', authData);
  }, [addDebugLog, authData]);

  const { user, tenant, loading, error } = authData;

  // 手動でデータを取得する関数
  const fetchManualData = useCallback(async () => {
    try {
      addDebugLog('Starting manual data fetch...');

      // 現在のセッションを確認
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      addDebugLog('Session check', {
        session: session?.user?.id,
        error: sessionError,
      });

      if (session?.user) {
        // usersテーブルから情報を取得
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', session.user.id);

        addDebugLog('Users table query', { userData, userError });
        setManualUserData(userData);

        if (userData && userData.length > 0) {
          // tenantsテーブルから情報を取得
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', userData[0].tenant_id);

          addDebugLog('Tenants table query', { tenantData, tenantError });
          setManualTenantData(tenantData);
        }
      }
    } catch (err) {
      addDebugLog('Manual fetch error', err);
    }
  }, [addDebugLog]);

  useEffect(() => {
    if (!loading && user) {
      fetchManualData();
    }
  }, [loading, user, fetchManualData]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            デバッグダッシュボード
          </h1>
          <p className="text-gray-600">根本原因を調査中...</p>
        </div>

        {/* 現在の状態 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-2">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : user ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">認証状態</span>
            </div>
            <p className="text-sm text-gray-600">
              {loading ? '読み込み中...' : user ? '認証済み' : '未認証'}
            </p>
            {user && (
              <p className="text-xs text-gray-500 mt-1">
                ID: {user.id?.slice(0, 8)}...
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-2">
              {tenant ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="font-medium">テナント情報</span>
            </div>
            <p className="text-sm text-gray-600">
              {tenant ? tenant.name : 'テナント情報なし'}
            </p>
            {tenant && (
              <p className="text-xs text-gray-500 mt-1">
                プラン: {tenant.plan}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-2">
              {error ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="font-medium">エラー状態</span>
            </div>
            <p className="text-sm text-gray-600">{error || 'エラーなし'}</p>
          </div>
        </div>

        {/* 手動取得データ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium mb-2">手動取得: ユーザーデータ</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(manualUserData, null, 2)}
            </pre>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium mb-2">手動取得: テナントデータ</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(manualTenantData, null, 2)}
            </pre>
          </div>
        </div>

        {/* デバッグログ */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">デバッグログ</h3>
            <button
              onClick={() => setDebugInfo([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              クリア
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {debugInfo.map((log, index) => (
              <div key={index} className="border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2">
                  <Info className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-gray-500">{log.timestamp}</span>
                  <span className="text-sm">{log.message}</span>
                </div>
                {log.data && (
                  <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mt-6 flex space-x-4">
          <button
            onClick={fetchManualData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            データ再取得
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            ページリロード
          </button>
          <a
            href="/auth/login"
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            ログイン画面へ
          </a>
        </div>

        {/* 環境情報 */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium mb-2">環境情報</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">URL:</span> {window.location.href}
            </div>
            <div>
              <span className="text-gray-600">User Agent:</span>{' '}
              {navigator.userAgent.slice(0, 50)}...
            </div>
            <div>
              <span className="text-gray-600">現在時刻:</span>{' '}
              {new Date().toLocaleString('ja-JP')}
            </div>
            <div>
              <span className="text-gray-600">Supabase URL:</span>{' '}
              {import.meta.env.VITE_SUPABASE_URL ? '設定済み' : '未設定'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageWithDebug;
