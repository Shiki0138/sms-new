import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { checkPageErrors } from '../utils/errorChecker';

const ErrorChecker: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkErrors = async () => {
      setIsChecking(true);
      
      // 基本的なエラーチェック
      const basicErrors = checkPageErrors();
      
      // ページ固有のエラーチェック
      const pageErrors: string[] = [];
      
      // Supabaseクライアントチェック
      try {
        const { supabase } = await import('../lib/supabase-safe');
        if (!supabase) {
          pageErrors.push('Supabaseクライアントが初期化されていません');
        }
      } catch (e) {
        pageErrors.push('Supabaseクライアントの読み込みに失敗しました');
      }
      
      // 認証コンテキストチェック
      try {
        const { AuthContext } = await import('../contexts/AuthContextSafe');
        if (!AuthContext) {
          pageErrors.push('認証コンテキストが利用できません');
        }
      } catch (e) {
        pageErrors.push('認証コンテキストの読み込みに失敗しました');
      }
      
      setErrors([...basicErrors, ...pageErrors]);
      setIsChecking(false);
    };
    
    checkErrors();
  }, []);

  if (isChecking) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">システムチェック中...</span>
        </div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800">すべてのシステムが正常です</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start space-x-2 mb-2">
        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">
            システムエラーが検出されました
          </h3>
          <ul className="mt-2 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-xs text-red-700">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ErrorChecker;