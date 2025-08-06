// エラーチェッカーユーティリティ
export const checkPageErrors = () => {
  const errors: string[] = [];
  
  // 必須の環境変数チェック
  if (!import.meta.env.VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL が設定されていません');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY が設定されていません');
  }
  
  // ローカルストレージチェック
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    errors.push('ローカルストレージが使用できません');
  }
  
  // セッションストレージチェック
  try {
    sessionStorage.setItem('test', 'test');
    sessionStorage.removeItem('test');
  } catch (e) {
    errors.push('セッションストレージが使用できません');
  }
  
  return errors;
};

// ページ読み込みエラーハンドラー
export const handlePageLoadError = (error: Error, pageName: string) => {
  console.error(`${pageName} の読み込みエラー:`, error);
  
  // エラーレポート（開発環境のみ）
  if (import.meta.env.DEV) {
    console.group(`📋 ${pageName} エラー詳細`);
    console.error('エラーメッセージ:', error.message);
    console.error('スタックトレース:', error.stack);
    console.error('ページ名:', pageName);
    console.error('時刻:', new Date().toISOString());
    console.groupEnd();
  }
  
  // エラー通知（本番環境では外部サービスに送信）
  if (!import.meta.env.DEV) {
    // TODO: Sentryなどのエラー監視サービスに送信
  }
  
  return error;
};