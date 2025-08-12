import { useCallback } from 'react';
import toast from 'react-hot-toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, options?: ErrorHandlerOptions) => {
    const {
      showToast = true,
      fallbackMessage = 'エラーが発生しました',
      onError,
    } = options || {};

    let errorMessage = fallbackMessage;
    let errorObject: Error;

    if (error instanceof Error) {
      errorMessage = error.message || fallbackMessage;
      errorObject = error;
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorObject = new Error(error);
    } else {
      errorObject = new Error(fallbackMessage);
    }

    // コンソールにエラーを出力
    console.error('Error:', errorObject);

    // トーストで通知
    if (showToast) {
      toast.error(errorMessage);
    }

    // カスタムエラーハンドラーを実行
    if (onError) {
      onError(errorObject);
    }

    return errorObject;
  }, []);

  return { handleError };
};

// Supabaseエラーのハンドリング
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    // 一般的なSupabaseエラーメッセージを日本語に変換
    const errorMessages: Record<string, string> = {
      'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
      'Email not confirmed': 'メールアドレスが確認されていません',
      'User already registered': 'このメールアドレスは既に登録されています',
      'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
      'Network request failed': 'ネットワークエラーが発生しました',
      'duplicate key value violates unique constraint': '既に同じデータが存在します',
    };

    for (const [key, value] of Object.entries(errorMessages)) {
      if (error.message.includes(key)) {
        return value;
      }
    }

    return error.message;
  }

  return 'エラーが発生しました';
};