import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddEntry from './pages/AddEntry';

const TodayEntries = lazy(() => import('./pages/TodayEntries'));
const MonthlySummary = lazy(() => import('./pages/MonthlySummary'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Customers = lazy(() => import('./pages/Customers'));
const Settings = lazy(() => import('./pages/Settings'));
const Register = lazy(() => import('./pages/Register'));
const MilkCard = lazy(() => import('./pages/MilkCard'));
const Shops = lazy(() => import('./pages/Shops'));
const CustomerLedger = lazy(() => import('./pages/CustomerLedger'));
const PendingPayments = lazy(() => import('./pages/PendingPayments'));
import './index.css';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <div className="app-container">{children}</div>;
}

// Pending Payments is shop-level customer financial data — SUPER_ADMIN excluded
function ShopAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  const role = user?.role?.toUpperCase();
  if (role !== 'OWNER' && role !== 'SHOP_STAFF') return <Navigate to="/" replace />;
  return <div className="app-container">{children}</div>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  // If Super Admin, let them see EVERYTHING (no redirection)
  if (user?.role?.toUpperCase() === 'SUPER_ADMIN') return <div className="app-container">{children}</div>;
  if (user) return <Navigate to="/" replace />;
  return <div className="app-container">{children}</div>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="page"><div className="loading"><div className="spinner" /></div></div>}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/portal/registration" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/test" element={<div className="page"><h1>Test Page</h1><button className="btn" onClick={() => window.history.back()}>Back</button></div>} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/add-entry" element={<ProtectedRoute><AddEntry /></ProtectedRoute>} />
        <Route path="/today" element={<ProtectedRoute><TodayEntries /></ProtectedRoute>} />
        <Route path="/summary" element={<ProtectedRoute><MonthlySummary /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
        <Route path="/customers/:id/ledger" element={<ProtectedRoute><CustomerLedger /></ProtectedRoute>} />
        <Route path="/admin/pending-payments" element={<ShopAdminRoute><PendingPayments /></ShopAdminRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/card" element={<ProtectedRoute><MilkCard /></ProtectedRoute>} />
        <Route path="/shops" element={<ProtectedRoute><Shops /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              maxWidth: '92vw',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'white' },
              duration: 5000,
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
