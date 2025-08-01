import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error }) => {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 p-4 bg-red-100 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            エラーが発生しました
          </h1>

          <p className="text-gray-600 mb-6">
            申し訳ございません。アプリケーションでエラーが発生しました。
          </p>

          {isDevelopment && error && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left w-full">
              <p className="text-sm font-mono text-gray-700 break-all">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    スタックトレース
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>ページを再読み込み</span>
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>ホームに戻る</span>
            </button>
          </div>

          {!isDevelopment && (
            <p className="mt-6 text-sm text-gray-500">
              問題が続く場合は、サポートまでお問い合わせください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
