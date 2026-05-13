import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ToastProvider';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { lazy, Suspense } from 'react';

const Analytics      = lazy(() => import('./pages/Analytics'));
const Rooms           = lazy(() => import('./pages/Rooms'));
const Housekeeping    = lazy(() => import('./pages/Housekeeping'));
const Reservations    = lazy(() => import('./pages/Reservations'));
const Guests          = lazy(() => import('./pages/Guests'));
const ChannelManager  = lazy(() => import('./pages/ChannelManager'));
const Calendar        = lazy(() => import('./pages/Calendar'));
const NewReservation  = lazy(() => import('./pages/NewReservation'));
const Settings        = lazy(() => import('./pages/Settings'));
const Staff           = lazy(() => import('./pages/Staff'));
const BookingPage     = lazy(() => import('./pages/BookingPage'));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } });

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-900">
    <div className="animate-spin h-8 w-8 border-4 border-primary-500 dark:border-primary-400 border-t-transparent dark:border-t-transparent rounded-full" />
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/booking" element={<BookingPage />} />
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard" />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route
                      path="analytics"
                      element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>}
                    />
                    <Route
                      path="calendar"
                      element={<Suspense fallback={<PageLoader />}><Calendar /></Suspense>}
                    />
                    <Route
                      path="rooms"
                      element={<Suspense fallback={<PageLoader />}><Rooms /></Suspense>}
                    />
                    <Route
                      path="housekeeping"
                      element={<Suspense fallback={<PageLoader />}><Housekeeping /></Suspense>}
                    />
                    <Route
                      path="reservations"
                      element={<Suspense fallback={<PageLoader />}><Reservations /></Suspense>}
                    />
                    <Route
                      path="reservations/new"
                      element={<Suspense fallback={<PageLoader />}><NewReservation /></Suspense>}
                    />
                    <Route
                      path="guests"
                      element={<Suspense fallback={<PageLoader />}><Guests /></Suspense>}
                    />
                    <Route
                      path="settings"
                      element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>}
                    />
                    <Route
                      path="channels"
                      element={<Suspense fallback={<PageLoader />}><ChannelManager /></Suspense>}
                    />
                    <Route
                      path="staff"
                      element={<AdminRoute><Suspense fallback={<PageLoader />}><Staff /></Suspense></AdminRoute>}
                    />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </SocketProvider>
        </QueryClientProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}