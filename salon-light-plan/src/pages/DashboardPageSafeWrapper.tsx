import React, { Suspense, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardPageSimple from './DashboardPageSimple';
import DashboardPageUltraSafe from './DashboardPageUltraSafe';

const DashboardPageSafeWrapper: React.FC = () => {
  const [hasError, setHasError] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('DashboardPageSafeWrapper - Auth state:', { user, loading });
  }, [user, loading]);

  // ローディング中は表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラーが発生した場合はUltraSafeバージョンを表示
  if (hasError) {
    return <DashboardPageUltraSafe />;
  }

  // 通常のダッシュボードを表示（エラーハンドリング付き）
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">ダッシュボードを読み込み中...</p>
          </div>
        </div>
      }
    >
      <ErrorBoundary onError={() => setHasError(true)}>
        <DashboardPageSimple />
      </ErrorBoundary>
    </Suspense>
  );
};

// シンプルなエラーバウンダリ
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    console.error('Dashboard Error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Dashboard Error Details:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-800 mb-2">
              ページの読み込みに失敗しました
            </h1>
            <p className="text-red-600 mb-4">
              ダッシュボードの表示中にエラーが発生しました。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardPageSafeWrapper;