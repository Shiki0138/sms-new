import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Toaster as Sonner } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { PlanLimitsProvider } from './contexts/PlanLimitsContext';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import ReservationsPage from './pages/ReservationsPage';
import SettingsPage from './pages/SettingsPage';
import MessagesPage from './pages/MessagesPage';
import DesignBoardPage from './pages/DesignBoardPage';
import MarketingPage from './pages/marketing/MarketingPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlanLimitsProvider>
          <Router>
            <Routes>
              {/* 認証ページ */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              
              {/* 保護されたルート */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/reservations" element={<ReservationsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/marketing" element={<MarketingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/design-board" element={<DesignBoardPage />} />
              </Route>
              
              {/* デフォルトリダイレクト */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
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
            }}
          />
        </PlanLimitsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;