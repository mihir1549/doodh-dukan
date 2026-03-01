import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { tenantApi } from '../api';

export default function SuperAdminDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, active: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await tenantApi.list();
            const shops = res.data.data || [];
            setStats({
                total: shops.length,
                active: shops.filter((s: any) => s.is_active).length
            });
        } catch (error) {
            console.error('Failed to load platform stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>🛠️ Platform Admin</h1>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Global Management Monitor
                    </p>
                </div>
                <button className="back-btn" onClick={logout}>Logout</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Shops</div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="stat-value">{stats.active}</div>
                    <div className="stat-label">Active Shops</div>
                </div>
            </div>

            <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => navigate('/shops')}>
                    <div className="quick-action-icon">🏢</div>
                    <div>
                        <div>Manage Shops</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            View, activate, or register shops
                        </div>
                    </div>
                </button>

                <button className="quick-action-btn" onClick={() => navigate('/register')}>
                    <div className="quick-action-icon">➕</div>
                    <div>
                        <div>Register New Shop</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            Create a new shop tenant
                        </div>
                    </div>
                </button>

                <div className="quick-action-btn" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <div className="quick-action-icon">📄</div>
                    <div>
                        <div>System Logs</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            Coming soon: Platform activity
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
