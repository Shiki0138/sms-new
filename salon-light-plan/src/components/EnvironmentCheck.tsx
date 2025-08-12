import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface EnvironmentCheckProps {
  children: React.ReactNode;
}

const EnvironmentCheck: React.FC<EnvironmentCheckProps> = ({ children }) => {
  console.log('EnvironmentCheck: Checking environment...');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isDevelopment = import.meta.env.DEV;

  console.log(
    'EnvironmentCheck: supabaseUrl:',
    supabaseUrl ? 'Set' : 'Not set'
  );
  console.log(
    'EnvironmentCheck: supabaseAnonKey:',
    supabaseAnonKey ? 'Set' : 'Not set'
  );
  console.log('EnvironmentCheck: isDevelopment:', isDevelopment);

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

  // In production, show warning but allow app to continue in demo mode
  if (!isDevelopment && !hasSupabaseConfig) {
    console.warn(
      'Production environment without Supabase config - running in demo mode'
    );
    return (
      <>
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">
                デモモードで動作中
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                本番環境の設定が完了していません。デモモードで動作しています。
                完全な機能を利用するには、管理者にお問い合わせください。
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-yellow-600 text-sm hover:text-yellow-700">
                  必要な設定を表示
                </summary>
                <div className="mt-2 p-3 bg-yellow-100 rounded-lg text-sm space-y-1">
                  <p>⚠️ 以下の環境変数が必要です:</p>
                  {!supabaseUrl && <p>• VITE_SUPABASE_URL</p>}
                  {!supabaseAnonKey && <p>• VITE_SUPABASE_ANON_KEY</p>}
                  <p className="mt-2 font-medium">
                    Vercelの環境変数設定で追加してください。
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
        {children}
      </>
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
