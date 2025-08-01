import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Toaster as Sonner } from 'sonner';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import ErrorFallback from './components/ErrorFallback';
import LoadingScreen from './components/LoadingScreen';
import { AuthProvider } from './contexts/AuthContextSafe';
import { BusinessHoursProvider } from './contexts/BusinessHoursContext';
import AppLayout from './components/layout/AppLayoutSimple';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Lazy loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPageSimple'));
const CustomersPage = lazy(
  () => import('./pages/customers/CustomersPageAdvanced')
);
const ReservationsPage = lazy(
  () => import('./pages/reservations/ReservationsPageAdvanced')
);
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'));

// Create QueryClient with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors
        const err = error as {
          response?: { status?: number };
          message?: string;
        };
        if (
          err?.response?.status &&
          err.response.status >= 400 &&
          err.response.status < 500
        ) {
          return false;
        }
        // Retry network errors up to 3 times
        if (
          err?.message?.includes('NetworkError') ||
          err?.message?.includes('Failed to fetch')
        ) {
          return failureCount < 3;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <BusinessHoursProvider>
              {/* Global components */}
              <OfflineIndicator />

              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  {/* Auth routes */}
                  <Route path="/auth/login" element={<LoginPage />} />
                  <Route path="/auth/signup" element={<SignupPage />} />
                  <Route
                    path="/auth/reset-password"
                    element={<ResetPasswordPage />}
                  />

                  {/* Protected routes with layout */}
                  <Route element={<AppLayout />}>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route
                      path="/reservations"
                      element={<ReservationsPage />}
                    />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>

                  {/* Fallback route */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Suspense>
            </BusinessHoursProvider>
          </AuthProvider>
        </Router>

        {/* Toast notifications */}
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
    </ErrorBoundary>
  );
}

export default App;
