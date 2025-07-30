import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Toaster as Sonner } from 'sonner';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPageSimple';
import CustomersPage from './pages/customers/CustomersPage';
import ReservationsPage from './pages/reservations/ReservationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import MessagesPage from './pages/messages/MessagesPage';
import DesignBoardPage from './pages/DesignBoardPage';
import MarketingPage from './pages/marketing/MarketingPage';

import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContextSafe';

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <Routes>
              {/* 認証ページ */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route
                path="/auth/reset-password"
                element={<ResetPasswordPage />}
              />

              {/* 直接ルート（認証なし） */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/reservations" element={<ReservationsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/design-board" element={<DesignBoardPage />} />

              {/* デフォルトリダイレクト */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
