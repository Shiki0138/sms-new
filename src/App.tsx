import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';
import NewCustomerPage from './pages/customers/NewCustomerPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import CustomerEditPage from './pages/customers/CustomerEditPage';
import ReservationsPage from './pages/reservations/ReservationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import MenuManagePage from './pages/settings/MenuManagePage';
import SalesReportPage from './pages/reports/SalesReportPage';
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
              <Route path="/customers/new" element={<NewCustomerPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers/:id/edit" element={<CustomerEditPage />} />
              <Route path="/reservations" element={<ReservationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/menus" element={<MenuManagePage />} />
              <Route path="/reports/sales" element={<SalesReportPage />} />
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;