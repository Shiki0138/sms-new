import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Toaster as Sonner } from 'sonner';
import { Suspense, lazy, useEffect } from 'react';

// 遅延読み込みでパフォーマンス最適化（エラーハンドリング付き）
const LoginPage = lazy(() => import('./pages/auth/LoginPage').catch(() => import('./pages/auth/LoginPage')));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').catch(() => import('./pages/auth/SignupPage')));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').catch(() => import('./pages/auth/ResetPasswordPage')));

// ダッシュボード（安全なラッパー使用）
const DashboardPage = lazy(() => import('./pages/DashboardPageSafeWrapper'));

// 各ページの安全な読み込み
const CustomersPage = lazy(() => 
  import('./pages/customers/CustomersPageAdvanced').catch((error) => {
    console.error('Failed to load CustomersPageAdvanced:', error);
    // フォールバック: シンプルバージョンを試す
    return import('./pages/customers/CustomersPageSimple').catch(() => {
      // それも失敗したら基本的なエラーページ
      return { default: () => <div className="p-6">顧客ページの読み込みに失敗しました</div> };
    });
  })
);

const ReservationsPage = lazy(() => 
  import('./pages/reservations/ReservationsPageAdvanced').catch(() => 
    import('./pages/reservations/ReservationsPageSimple').catch(() => ({
      default: () => <div className="p-6">予約ページの読み込みに失敗しました</div>
    }))
  )
);

const SettingsPage = lazy(() => 
  import('./pages/settings/SettingsPage').catch(() => ({
    default: () => <div className="p-6">設定ページの読み込みに失敗しました</div>
  }))
);

const LineIntegrationPage = lazy(() => 
  import('./pages/settings/LineIntegrationPage').catch(() => ({
    default: () => <div className="p-6">LINE連携ページの読み込みに失敗しました</div>
  }))
);

const MessagesPage = lazy(() => 
  import('./pages/messages/MessagesPage').catch(() => ({
    default: () => <div className="p-6">メッセージページの読み込みに失敗しました</div>
  }))
);

const DesignBoardPage = lazy(() => 
  import('./pages/DesignBoardPage').catch(() => ({
    default: () => <div className="p-6">デザインボードの読み込みに失敗しました</div>
  }))
);

const MarketingPage = lazy(() => 
  import('./pages/marketing/MarketingPage').catch(() => ({
    default: () => <div className="p-6">マーケティングページの読み込みに失敗しました</div>
  }))
);

const BulkMessagingPage = lazy(() => 
  import('./pages/marketing/BulkMessagingPage').catch(() => ({
    default: () => <div className="p-6">一斉送信ページの読み込みに失敗しました</div>
  }))
);

const BillingPage = lazy(() => 
  import('./pages/billing/BillingPage').catch(() => ({
    default: () => <div className="p-6">請求ページの読み込みに失敗しました</div>
  }))
);

const AdvancedReportsPage = lazy(() => 
  import('./pages/reports/AdvancedReportsPage').catch(() => ({
    default: () => <div className="p-6">レポートページの読み込みに失敗しました</div>
  }))
);

const TestPage = lazy(() => 
  import('./pages/TestPage').catch(() => ({
    default: () => <div className="p-6">テストページの読み込みに失敗しました</div>
  }))
);

import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContextSafe';
import { BusinessHoursProvider } from './contexts/BusinessHoursContext';
import AppLayout from './components/layout/AppLayoutSimple';
import OnboardingOverlay from './components/onboarding/OnboardingOverlay';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { PageLoading } from './components/common/LoadingStates';
import { DemoModeIndicator } from './components/demo/DemoModeIndicator';
import { useDemo } from './hooks/useDemo';
import { usePerformanceOptimization } from './hooks/usePerformanceOptimization';
import EnvironmentCheck from './components/EnvironmentCheck';
import PageErrorBoundary from './components/PageErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // ネットワークエラーの場合は再試行
        const err = error as { message?: string };
        if (err?.message?.includes('NetworkError')) {
          return failureCount < 3;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
      gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    },
  },
});

function App() {
  console.log('App.tsx: App component rendering...');
  
  // Hooks must be called unconditionally at the top level
  const { isDemoMode, initializeDemo, exitDemo } = useDemo();
  usePerformanceOptimization();
  
  // Use useEffect instead of useState for side effects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      initializeDemo();
    }
  }, [initializeDemo]);
  
  try {
    
    console.log('App.tsx: isDemoMode:', isDemoMode);

    return (
      <ErrorBoundary>
        <EnvironmentCheck>
          <QueryClientProvider client={queryClient}>
          <Router>
            <AuthProvider>
              <BusinessHoursProvider>
                {/* グローバルコンポーネント */}
                <OfflineIndicator />
                {isDemoMode && <DemoModeIndicator onExit={exitDemo} />}
                <OnboardingOverlay />

                <Suspense fallback={<PageLoading page="dashboard" />}>
                  <Routes>
                    {/* 認証ページ */}
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/signup" element={<SignupPage />} />
                    <Route
                      path="/auth/reset-password"
                      element={<ResetPasswordPage />}
                    />

                    {/* 保護されたルート（サイドバー付き） - 開発環境では認証をバイパス */}
                    <Route element={<AppLayout />}>
                      <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                      />
                      <Route path="/dashboard" element={
                        <PageErrorBoundary pageName="ダッシュボード">
                          <DashboardPage />
                        </PageErrorBoundary>
                      } />
                      <Route path="/customers" element={
                        <PageErrorBoundary pageName="顧客管理">
                          <CustomersPage />
                        </PageErrorBoundary>
                      } />
                      <Route
                        path="/reservations"
                        element={
                          <PageErrorBoundary pageName="予約管理">
                            <ReservationsPage />
                          </PageErrorBoundary>
                        }
                      />
                      <Route path="/messages" element={
                        <PageErrorBoundary pageName="メッセージ">
                          <MessagesPage />
                        </PageErrorBoundary>
                      } />
                      <Route path="/marketing" element={
                        <PageErrorBoundary pageName="マーケティング">
                          <MarketingPage />
                        </PageErrorBoundary>
                      } />
                      <Route
                        path="/marketing/bulk-messaging"
                        element={
                          <PageErrorBoundary pageName="一斉送信">
                            <BulkMessagingPage />
                          </PageErrorBoundary>
                        }
                      />
                      <Route path="/billing" element={
                        <PageErrorBoundary pageName="請求管理">
                          <BillingPage />
                        </PageErrorBoundary>
                      } />
                      <Route
                        path="/reports/advanced"
                        element={
                          <PageErrorBoundary pageName="レポート">
                            <AdvancedReportsPage />
                          </PageErrorBoundary>
                        }
                      />
                      <Route path="/settings" element={
                        <PageErrorBoundary pageName="設定">
                          <SettingsPage />
                        </PageErrorBoundary>
                      } />
                      <Route path="/settings/line" element={
                        <PageErrorBoundary pageName="LINE連携設定">
                          <LineIntegrationPage />
                        </PageErrorBoundary>
                      } />
                      <Route
                        path="/design-board"
                        element={
                          <PageErrorBoundary pageName="デザインボード">
                            <DesignBoardPage />
                          </PageErrorBoundary>
                        }
                      />
                    </Route>

                    {/* テストページ */}
                    <Route path="/test" element={<TestPage />} />
                    
                    {/* デフォルトリダイレクト */}
                    <Route
                      path="*"
                      element={<Navigate to="/dashboard" replace />}
                    />
                  </Routes>
                </Suspense>
              </BusinessHoursProvider>
            </AuthProvider>
          </Router>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
                style: {
                  background: '#065f46',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
                style: {
                  background: '#991b1b',
                },
              },
            }}
          />

          <Sonner
            position="bottom-right"
            richColors
            expand={true}
            theme="light"
            toastOptions={{
              duration: 4000,
              className: 'sonner-toast',
              style: {
                borderRadius: '12px',
                boxShadow:
                  '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              },
            }}
          />
          </QueryClientProvider>
        </EnvironmentCheck>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App.tsx: Fatal error in App component:', error);
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Application Error</h1>
        <p>An error occurred while initializing the application.</p>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }
}

export default App;
