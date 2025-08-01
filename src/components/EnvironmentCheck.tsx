import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface EnvironmentCheckProps {
  children: React.ReactNode;
}

const EnvironmentCheck: React.FC<EnvironmentCheckProps> = ({ children }) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isDevelopment = import.meta.env.DEV;

  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

  // In development, show warning but allow app to continue
  if (isDevelopment && !hasSupabaseConfig) {
    return (
      <>
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">
                環境変数が設定されていません
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                Supabaseの環境変数が設定されていないため、モックモードで動作しています。
                .envファイルを設定してください。
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-yellow-600 text-sm hover:text-yellow-700">
                  設定方法を表示
                </summary>
                <div className="mt-2 p-3 bg-yellow-100 rounded-lg text-sm space-y-1">
                  <p>1. .env.example を .env にコピー</p>
                  <p>2. VITE_SUPABASE_URL を設定</p>
                  <p>3. VITE_SUPABASE_ANON_KEY を設定</p>
                  <p>4. アプリケーションを再起動</p>
                </div>
              </details>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  // In production, block app if no config
  if (!isDevelopment && !hasSupabaseConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mb-6 p-4 bg-red-100 rounded-full inline-block">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              設定エラー
            </h1>

            <p className="text-gray-600 mb-6">
              アプリケーションの設定が完了していません。
              管理者にお問い合わせください。
            </p>

            <div className="bg-gray-100 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-gray-800 mb-2">
                不足している設定:
              </h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {!supabaseUrl && (
                  <li className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                    VITE_SUPABASE_URL
                  </li>
                )}
                {!supabaseAnonKey && (
                  <li className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                    VITE_SUPABASE_ANON_KEY
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Everything is configured
  return (
    <>
      {isDevelopment && (
        <div className="bg-green-50 border-b border-green-200 p-2">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-700">
              環境変数が正しく設定されています
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default EnvironmentCheck;
