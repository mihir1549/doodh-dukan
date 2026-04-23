import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { tenantApi, ledgerApi } from '../api';

export default function SuperAdminDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, active: 0 });
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [tenantsRes, pendingRes] = await Promise.all([
                tenantApi.list(),
                ledgerApi.getPendingCount().catch(() => ({ data: { data: { count: 0 } } })),
            ]);
            const shops = tenantsRes.data.data || [];
            setStats({
                total: shops.length,
                active: shops.filter((s: any) => s.is_active).length
            });
            setPendingApprovals(Number(pendingRes?.data?.data?.count ?? 0));
        } catch (error) {
            console.error('Failed to load platform stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        Management Portal
                    </div>
                    <h1>🛠️ Platform Admin</h1>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Global Shop Monitor & Governance
                    </p>
                </div>
                <button className="back-btn" onClick={logout}>Logout</button>
            </div>
            <div className="loading"><div className="spinner" /></div>
        </div>
    );

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        Management Portal
                    </div>
                    <h1>🛠️ Platform Admin</h1>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Global Shop Monitor & Governance
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

                <button
                    className="quick-action-btn"
                    onClick={() => navigate('/admin/pending-payments')}
                    style={{ position: 'relative' }}
                >
                    <div className="quick-action-icon">✅</div>
                    <div>
                        <div>Pending Approvals</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            Approve customer payments
                        </div>
                    </div>
                    {pendingApprovals > 0 && (
                        <span
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '14px',
                                background: 'var(--danger)',
                                color: '#fff',
                                borderRadius: '999px',
                                minWidth: '22px',
                                height: '22px',
                                padding: '0 7px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                boxShadow: '0 0 0 2px var(--bg-card)',
                            }}
                        >
                            {pendingApprovals > 99 ? '99+' : pendingApprovals}
                        </span>
                    )}
                </button>

                <button className="quick-action-btn" onClick={() => navigate('/portal/registration')}>
                    <div className="quick-action-icon">➕</div>
                    <div>
                        <div>Register New Shop</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            Direct link to shop creation portal
                        </div>
                    </div>
                </button>

                <button className="quick-action-btn" onClick={() => navigate('/test')}>
                    <div className="quick-action-icon">🧪</div>
                    <div>
                        <div>Test Navigation</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            Check if routing is working
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
