import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { entryApi, summaryApi } from '../api';
import SuperAdminDashboard from './SuperAdminDashboard';

function ShopDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [todayCount, setTodayCount] = useState(0);
    const [monthTotal, setMonthTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [entriesRes, summaryRes] = await Promise.all([
                entryApi.list(today).catch(() => ({ data: { data: [] } })),
                user?.role !== 'DELIVERY'
                    ? summaryApi.list(currentMonth).catch(() => ({ data: { data: [] } }))
                    : Promise.resolve({ data: { data: [] } }),
            ]);

            const entries = entriesRes.data?.data || [];
            setTodayCount(Array.isArray(entries) ? entries.length : 0);

            const summaries = summaryRes?.data?.data || [];
            const total = Array.isArray(summaries)
                ? summaries.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0)
                : 0;
            setMonthTotal(total);
        } catch (error) {
            console.error('Dashboard load failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>🥛 {user?.shop_name || 'Doodh Dukan'}</h1>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Welcome, {user?.name} <span className="badge badge-role">{user?.role}</span>
                    </p>
                </div>
                <button className="back-btn" onClick={logout}>Logout</button>
            </div>

            {/* Stats */}
            {user?.role !== 'DELIVERY' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div className="stat-card">
                        <div className="stat-value">{todayCount}</div>
                        <div className="stat-label">Today's Entries</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">₹{monthTotal.toFixed(0)}</div>
                        <div className="stat-label">This Month Total</div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => navigate('/add-entry')}>
                    <div className="quick-action-icon">📝</div>
                    <div>
                        <div>Add New Entry</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            Record a sale or delivery
                        </div>
                    </div>
                </button>

                <button className="quick-action-btn" onClick={() => navigate('/today')}>
                    <div className="quick-action-icon">📋</div>
                    <div>
                        <div>Today's Entries</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            View all entries for today
                        </div>
                    </div>
                </button>

                {user?.role !== 'DELIVERY' && (
                    <>
                        <button className="quick-action-btn" onClick={() => navigate('/summary')}>
                            <div className="quick-action-icon">📊</div>
                            <div>
                                <div>Monthly Summary</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                    Check monthly totals
                                </div>
                            </div>
                        </button>

                        <button className="quick-action-btn" onClick={() => navigate('/customers')}>
                            <div className="quick-action-icon">👥</div>
                            <div>
                                <div>Customers</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                    Manage your customers
                                </div>
                            </div>
                        </button>
                    </>
                )}

                {user?.role === 'OWNER' && (
                    <button className="quick-action-btn" onClick={() => navigate('/settings')}>
                        <div className="quick-action-icon">⚙️</div>
                        <div>
                            <div>Settings</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                Products, users & more
                            </div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user, loading } = useAuth();

    if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;

    if (user?.role?.toUpperCase() === 'SUPER_ADMIN') {
        return <SuperAdminDashboard />;
    }

    if (user?.role?.toUpperCase() === 'CUSTOMER') {
        return <Navigate to="/card" replace />;
    }

    return <ShopDashboard />;
}
