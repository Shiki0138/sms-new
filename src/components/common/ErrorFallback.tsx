import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SalonErrorMessages } from '../../services/salon-error-messages';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorCode?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError,
  errorCode 
}) => {
  const navigate = useNavigate();
  
  // エラーコードに基づいてメッセージを取得
  const salonError = errorCode 
    ? SalonErrorMessages.getSystemErrors(errorCode)
    : SalonErrorMessages.getGenericError('UNKNOWN_ERROR');

  const handleGoHome = () => {
    navigate('/dashboard');
    resetError();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center bg-gray-50 p-4"
    >
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* エラーアイコン */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6"
          >
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </motion.div>

          {/* エラータイトル */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {salonError.title}
          </h1>

          {/* エラーメッセージ */}
          <p className="text-gray-600 mb-8">
            {salonError.message}
          </p>

          {/* 提案メッセージ */}
          {salonError.suggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                💡 {salonError.suggestion}
              </p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <RefreshCw className="h-5 w-5" />
              <span>もう一度試す</span>
            </button>

            <button
              onClick={handleGoHome}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <Home className="h-5 w-5" />
              <span>ホームに戻る</span>
            </button>
          </div>

          {/* サポート情報 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">
              問題が解決しない場合は
            </p>
            <a
              href="tel:0120-XXX-XXX"
              className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <Phone className="h-4 w-4" />
              <span>サポートに連絡</span>
            </a>
          </div>

          {/* 開発者向けエラー情報（開発環境のみ） */}
          {import.meta.env.DEV && (
            <details className="mt-6 text-left">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                詳細情報（開発者向け）
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-x-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ネットワークエラー専用コンポーネント
export const NetworkErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        インターネット接続を確認してください
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm">
        サーバーとの通信ができません。インターネット接続を確認してから、もう一度お試しください。
      </p>
      <button
        onClick={onRetry}
        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        <span>再試行</span>
      </button>
    </motion.div>
  );
};