import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
    Plus, Calendar, TrendingUp, Users, CheckCircle, Settings as SettingsIcon,
    Wallet, LogOut, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { entryApi, summaryApi, ledgerApi } from '../api';
import SuperAdminDashboard from './SuperAdminDashboard';

type MenuColor = 'blue' | 'cyan' | 'amber' | 'green' | 'red' | 'slate';

const COLOR_MAP: Record<MenuColor, { bg: string; fg: string }> = {
    blue:  { bg: 'rgba(59, 130, 246, 0.22)',  fg: '#60a5fa' },
    cyan:  { bg: 'rgba(6, 182, 212, 0.22)',   fg: '#22d3ee' },
    amber: { bg: 'rgba(245, 158, 11, 0.22)',  fg: '#fbbf24' },
    green: { bg: 'rgba(16, 185, 129, 0.22)',  fg: '#34d399' },
    red:   { bg: 'rgba(239, 68, 68, 0.22)',   fg: '#f87171' },
    slate: { bg: 'rgba(148, 163, 184, 0.18)', fg: '#cbd5e1' },
};

interface MenuCardProps {
    icon: ReactNode;
    color: MenuColor;
    title: string;
    subtitle: string;
    onClick: () => void;
    badge?: number;
}

function MenuCard({ icon, color, title, subtitle, onClick, badge }: MenuCardProps) {
    const c = COLOR_MAP[color];
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: 'var(--bg-surface)',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'background 0.15s',
                textAlign: 'left',
                width: '100%',
                position: 'relative',
                fontFamily: 'var(--font-display)',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: c.bg,
                    color: c.fg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {title}
                </div>
                <div
                    style={{
                        fontSize: '0.8rem',
                        fontWeight: 400,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-body)',
                        marginTop: 2,
                    }}
                >
                    {subtitle}
                </div>
            </div>
            {badge !== undefined && badge > 0 && (
                <span
                    style={{
                        background: 'var(--danger)',
                        color: '#fff',
                        borderRadius: 999,
                        minWidth: 22,
                        height: 22,
                        padding: '0 7px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                    }}
                >
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
            <ChevronRight size={18} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        </button>
    );
}

function ShopDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [todayCount, setTodayCount] = useState(0);
    const [monthTotal, setMonthTotal] = useState(0);
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [loading, setLoading] = useState(true);

    const role = user?.role?.toUpperCase();
    const isOwner = role === 'OWNER';
    const isDelivery = role === 'DELIVERY';
    // Pending Approvals: OWNER + SHOP_STAFF can see (matches backend role grant)
    const canSeePending = isOwner || role === 'SHOP_STAFF';

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [entriesRes, summaryRes, pendingRes] = await Promise.all([
                entryApi.list(today).catch(() => ({ data: { data: [] } })),
                !isDelivery
                    ? summaryApi.list(currentMonth).catch(() => ({ data: { data: [] } }))
                    : Promise.resolve({ data: { data: [] } }),
                canSeePending
                    ? ledgerApi.getPendingCount().catch(() => ({ data: { data: { count: 0 } } }))
                    : Promise.resolve({ data: { data: { count: 0 } } }),
            ]);

            const entries = entriesRes.data?.data || [];
            setTodayCount(Array.isArray(entries) ? entries.length : 0);

            const summaries = summaryRes?.data?.data || [];
            const total = Array.isArray(summaries)
                ? summaries.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0)
                : 0;
            setMonthTotal(total);

            // Response interceptor wraps as { success, data: { count } } but tolerate other shapes
            const countRaw =
                pendingRes?.data?.data?.count ??
                pendingRes?.data?.count ??
                0;
            setPendingApprovals(Number(countRaw) || 0);
        } catch (error) {
            console.error('Dashboard load failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {user?.shop_name || 'Doodh Dukan'}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {user?.name}
                        </span>
                        <span className="badge badge-role">{user?.role}</span>
                    </div>
                </div>
                <button
                    className="icon-btn"
                    onClick={logout}
                    aria-label="Logout"
                    title="Logout"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <LogOut size={20} strokeWidth={1.75} />
                </button>
            </div>

            {/* Stats */}
            {!isDelivery && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {loading ? (
                        <>
                            <div className="stat-card skeleton" style={{ height: 78, borderLeft: 'none' }} />
                            <div className="stat-card skeleton" style={{ height: 78, borderLeft: 'none' }} />
                        </>
                    ) : (
                        <>
                            <div className="stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                    <TrendingUp size={13} strokeWidth={2} />
                                    Today
                                </div>
                                <div className="stat-value amount-neutral">{todayCount}</div>
                                <div className="stat-label">entries</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                    <Wallet size={13} strokeWidth={2} />
                                    This Month
                                </div>
                                <div className="stat-value amount-positive">
                                    ₹{monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <div className="stat-label">total</div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Menu */}
            <div
                style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                }}
            >
                <MenuCard
                    icon={<Plus size={20} strokeWidth={2} />}
                    color="blue"
                    title="Add New Entry"
                    subtitle="Record a sale or delivery"
                    onClick={() => navigate('/add-entry')}
                />
                <MenuCard
                    icon={<Calendar size={20} strokeWidth={2} />}
                    color="cyan"
                    title="Today's Entries"
                    subtitle="View all entries for today"
                    onClick={() => navigate('/today')}
                />
                {!isDelivery && (
                    <>
                        <MenuCard
                            icon={<TrendingUp size={20} strokeWidth={2} />}
                            color="amber"
                            title="Monthly Summary"
                            subtitle="Check monthly totals"
                            onClick={() => navigate('/summary')}
                        />
                        <MenuCard
                            icon={<Users size={20} strokeWidth={2} />}
                            color="green"
                            title="Customers"
                            subtitle="Manage your customers"
                            onClick={() => navigate('/customers')}
                        />
                    </>
                )}
                {canSeePending && (
                    <MenuCard
                        icon={<CheckCircle size={20} strokeWidth={2} />}
                        color="red"
                        title="Pending Approvals"
                        subtitle={isOwner ? 'Approve customer payments' : 'View pending payments'}
                        onClick={() => navigate('/admin/pending-payments')}
                        badge={pendingApprovals}
                    />
                )}
                {isOwner && (
                    <MenuCard
                        icon={<SettingsIcon size={20} strokeWidth={2} />}
                        color="slate"
                        title="Settings"
                        subtitle="Products, users & more"
                        onClick={() => navigate('/settings')}
                    />
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="page">
                <div className="page-header">
                    <h1>Doodh Dukan</h1>
                </div>
                <div className="loading"><div className="spinner" /></div>
            </div>
        );
    }

    if (user?.role?.toUpperCase() === 'SUPER_ADMIN') {
        return <SuperAdminDashboard />;
    }

    if (user?.role?.toUpperCase() === 'CUSTOMER') {
        return <Navigate to="/card" replace />;
    }

    return <ShopDashboard />;
}
