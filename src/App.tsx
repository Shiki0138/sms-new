import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Toaster as Sonner } from 'sonner';
import { Suspense, lazy, useState } from 'react';

// 遅延読み込みでパフォーマンス最適化
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPageSimple'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPageAdvanced'));
const ReservationsPage = lazy(() => import('./pages/reservations/ReservationsPageAdvanced'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'));
const DesignBoardPage = lazy(() => import('./pages/DesignBoardPage'));
const MarketingPage = lazy(() => import('./pages/marketing/MarketingPage'));

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // ネットワークエラーの場合は再試行
        if (error?.message?.includes('NetworkError')) {
          return failureCount < 3;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
      cacheTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    },
  },
});

function App() {
  const { isDemoMode, demoData, initializeDemo, exitDemo } = useDemo();
  usePerformanceOptimization();

  // デモモードの自動開始（URLパラメータで制御）
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      initializeDemo();
    }
  });

  return (
    <ErrorBoundary>
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
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/reservations" element={<ReservationsPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/marketing" element={<MarketingPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/design-board" element={<DesignBoardPage />} />
                  </Route>

                  {/* デフォルトリダイレクト */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
