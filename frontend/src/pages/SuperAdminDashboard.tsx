import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, UserPlus, CheckCircle, LogOut, Shield,
    ChevronRight, TrendingUp, Power,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { tenantApi, ledgerApi } from '../api';

type MenuColor = 'blue' | 'cyan' | 'amber' | 'green' | 'red' | 'slate';

const COLOR_MAP: Record<MenuColor, { bg: string; fg: string }> = {
    blue:  { bg: 'rgba(59, 130, 246, 0.15)',  fg: '#3b82f6' },
    cyan:  { bg: 'rgba(6, 182, 212, 0.15)',   fg: '#06b6d4' },
    amber: { bg: 'rgba(245, 158, 11, 0.15)',  fg: '#f59e0b' },
    green: { bg: 'rgba(16, 185, 129, 0.15)',  fg: '#10b981' },
    red:   { bg: 'rgba(239, 68, 68, 0.15)',   fg: '#ef4444' },
    slate: { bg: 'rgba(148, 163, 184, 0.12)', fg: '#94a3b8' },
};

interface MenuCardProps {
    icon: ReactNode;
    color: MenuColor;
    title: string;
    subtitle: string;
    onClick?: () => void;
    badge?: number;
    disabled?: boolean;
}

function MenuCard({ icon, color, title, subtitle, onClick, badge, disabled }: MenuCardProps) {
    const c = COLOR_MAP[color];
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: 'var(--bg-surface)',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                textAlign: 'left',
                width: '100%',
                position: 'relative',
                fontFamily: 'var(--font-display)',
                opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
                if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
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
            {!disabled && (
                <ChevronRight size={18} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            )}
        </button>
    );
}

export default function SuperAdminDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, active: 0 });
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        try {
            const [tenantsRes, pendingRes] = await Promise.all([
                tenantApi.list(),
                ledgerApi.getPendingCount().catch(() => ({ data: { data: { count: 0 } } })),
            ]);
            const shops = tenantsRes.data.data || [];
            setStats({
                total: shops.length,
                active: shops.filter((s: any) => s.is_active).length,
            });
            setPendingApprovals(Number(pendingRes?.data?.data?.count ?? 0));
        } catch (error) {
            console.error('Failed to load platform stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: 'var(--brand-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: 2,
                        }}
                    >
                        <Shield size={11} strokeWidth={2} />
                        Platform
                    </div>
                    <h1 style={{ fontSize: '1.15rem' }}>Admin Dashboard</h1>
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
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
                {loading ? (
                    <>
                        <div className="stat-card skeleton" style={{ height: 78, borderLeft: 'none' }} />
                        <div
                            className="stat-card skeleton"
                            style={{ height: 78, borderLeft: 'none' }}
                        />
                    </>
                ) : (
                    <>
                        <div className="stat-card">
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: 6,
                                }}
                            >
                                <Building2 size={13} strokeWidth={2} />
                                Total Shops
                            </div>
                            <div className="stat-value amount-neutral">{stats.total}</div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: 6,
                                }}
                            >
                                <TrendingUp size={13} strokeWidth={2} />
                                Active
                            </div>
                            <div className="stat-value" style={{ color: 'var(--success)' }}>
                                {stats.active}
                            </div>
                        </div>
                    </>
                )}
            </div>

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
                    icon={<Building2 size={20} strokeWidth={2} />}
                    color="blue"
                    title="Manage Shops"
                    subtitle="View, activate, or register shops"
                    onClick={() => navigate('/shops')}
                />
                <MenuCard
                    icon={<UserPlus size={20} strokeWidth={2} />}
                    color="cyan"
                    title="Register New Shop"
                    subtitle="Direct link to shop creation portal"
                    onClick={() => navigate('/portal/registration')}
                />
                <MenuCard
                    icon={<CheckCircle size={20} strokeWidth={2} />}
                    color="red"
                    title="Pending Approvals"
                    subtitle="Approve customer payments"
                    onClick={() => navigate('/admin/pending-payments')}
                    badge={pendingApprovals}
                />
                <MenuCard
                    icon={<Power size={20} strokeWidth={2} />}
                    color="slate"
                    title="System Logs"
                    subtitle="Coming soon — platform activity"
                    disabled
                />
            </div>
        </div>
    );
}
