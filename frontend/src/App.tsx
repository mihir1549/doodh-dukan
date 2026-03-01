import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddEntry from './pages/AddEntry';
import TodayEntries from './pages/TodayEntries';
import MonthlySummary from './pages/MonthlySummary';
import CustomerDetail from './pages/CustomerDetail';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Register from './pages/Register';
import MilkCard from './pages/MilkCard';
import Shops from './pages/Shops';
import './index.css';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <div className="app-container">{children}</div>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;
  // Allow Super Admin to access PublicRoutes (like Register) without being redirected home
  if (user && user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />;
  return <div className="app-container">{children}</div>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/add-entry" element={<ProtectedRoute><AddEntry /></ProtectedRoute>} />
      <Route path="/today" element={<ProtectedRoute><TodayEntries /></ProtectedRoute>} />
      <Route path="/summary" element={<ProtectedRoute><MonthlySummary /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/card" element={<ProtectedRoute><MilkCard /></ProtectedRoute>} />
      <Route path="/shops" element={<ProtectedRoute><Shops /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
