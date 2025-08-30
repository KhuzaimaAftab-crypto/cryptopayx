import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';

// Components
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';

// Layout Components
import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Wallet = React.lazy(() => import('./pages/Wallet'));
const SendPayment = React.lazy(() => import('./pages/SendPayment'));
const ReceivePayment = React.lazy(() => import('./pages/ReceivePayment'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const PaymentRequest = React.lazy(() => import('./pages/PaymentRequest'));
const PaymentPage = React.lazy(() => import('./pages/PaymentPage'));
const Profile = React.lazy(() => import('./pages/Profile'));
const MerchantDashboard = React.lazy(() => import('./pages/MerchantDashboard'));
const MerchantRegistration = React.lazy(() => import('./pages/MerchantRegistration'));
const Settings = React.lazy(() => import('./pages/Settings'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#8ba4f0',
      dark: '#4f5bb8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#764ba2',
      light: '#9a73c7',
      dark: '#5a3780',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#4a5568',
    },
    success: {
      main: '#48bb78',
      light: '#68d391',
      dark: '#38a169',
    },
    error: {
      main: '#f56565',
      light: '#fc8181',
      dark: '#e53e3e',
    },
    warning: {
      main: '#ed8936',
      light: '#f6ad55',
      dark: '#dd6b20',
    },
    info: {
      main: '#4299e1',
      light: '#63b3ed',
      dark: '#3182ce',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.25,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.45,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1a202c',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

// Global styles
const globalStyles = (
  <GlobalStyles
    styles={{
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        height: '100%',
      },
      body: {
        height: '100%',
        margin: 0,
        padding: 0,
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        backgroundColor: '#f8fafc',
      },
      '#root': {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
      // Custom scrollbar styles
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: '#f1f1f1',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#c1c1c1',
        borderRadius: '4px',
        '&:hover': {
          background: '#a8a8a8',
        },
      },
      // Animation keyframes
      '@keyframes fadeIn': {
        from: { opacity: 0, transform: 'translateY(20px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '@keyframes slideIn': {
        from: { transform: 'translateX(-100%)' },
        to: { transform: 'translateX(0)' },
      },
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
      },
      // Utility classes
      '.fade-in': {
        animation: 'fadeIn 0.5s ease-out',
      },
      '.slide-in': {
        animation: 'slideIn 0.3s ease-out',
      },
      '.pulse': {
        animation: 'pulse 2s infinite',
      },
    }}
  />
);

function App() {
  // Performance monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Log performance metrics in development
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Performance monitoring in development only
        }
      });
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    }
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {globalStyles}
            <AuthProvider>
              <Web3Provider>
                <Router>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route
                        path="/login"
                        element={
                          <PublicRoute>
                            <AuthLayout>
                              <Login />
                            </AuthLayout>
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/register"
                        element={
                          <PublicRoute>
                            <AuthLayout>
                              <Register />
                            </AuthLayout>
                          </PublicRoute>
                        }
                      />
                      
                      {/* Public payment page */}
                      <Route
                        path="/pay/:requestId"
                        element={
                          <AuthLayout>
                            <PaymentPage />
                          </AuthLayout>
                        }
                      />

                      {/* Protected Routes */}
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Dashboard />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={<Navigate to="/" replace />}
                      />
                      <Route
                        path="/wallet"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Wallet />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/send"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <SendPayment />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/receive"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <ReceivePayment />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/transactions"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Transactions />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/request"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <PaymentRequest />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Profile />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Settings />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* Merchant Routes */}
                      <Route
                        path="/merchant/register"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <MerchantRegistration />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/merchant/dashboard"
                        element={
                          <ProtectedRoute requireMerchant>
                            <Layout>
                              <MerchantDashboard />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      {/* 404 Route */}
                      <Route
                        path="*"
                        element={
                          <AuthLayout>
                            <NotFound />
                          </AuthLayout>
                        }
                      />
                    </Routes>
                  </Suspense>
                </Router>

                {/* Toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '14px',
                    },
                    success: {
                      style: {
                        background: '#10b981',
                      },
                    },
                    error: {
                      style: {
                        background: '#ef4444',
                      },
                    },
                  }}
                />

                {/* React Query DevTools (development only) */}
                {process.env.NODE_ENV === 'development' && (
                  <ReactQueryDevtools initialIsOpen={false} />
                )}
              </Web3Provider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;