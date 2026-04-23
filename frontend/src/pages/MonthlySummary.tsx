import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight as ChevronRightIcon, Search, RefreshCw,
    Lock, Unlock, TrendingUp, BarChart3,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { summaryApi } from '../api';
import { avatarColor, avatarLetter } from '../utils/avatar';

export default function MonthlySummary() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [summaries, setSummaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(false);
    const [search, setSearch] = useState('');

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const monthYear = `${year}-${String(month).padStart(2, '0')}`;
    const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
    });

    useEffect(() => {
        loadSummaries();
    }, [monthYear]);

    const loadSummaries = async () => {
        setLoading(true);
        try {
            const res = await summaryApi.list(monthYear);
            setSummaries(res.data?.data || []);
        } catch {
            setSummaries([]);
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (delta: number) => {
        let m = month + delta;
        let y = year;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        setMonth(m);
        setYear(y);
    };

    const handleLock = async (id: string) => {
        if (!window.confirm('Lock this month? No more changes will be allowed.')) return;
        try {
            await summaryApi.lock(id);
            loadSummaries();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to lock');
        }
    };

    const handleUnlock = async (id: string) => {
        if (!window.confirm('Unlock this month? Changes will be allowed again.')) return;
        try {
            await summaryApi.unlock(id);
            loadSummaries();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to unlock');
        }
    };

    const handleRecalculate = async () => {
        setRecalculating(true);
        try {
            await summaryApi.recalculate(monthYear);
            await loadSummaries();
        } finally {
            setRecalculating(false);
        }
    };

    const grandTotal = summaries.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);

    const filtered = search.trim()
        ? summaries.filter((s: any) => {
            const q = search.trim().toLowerCase();
            const isNum = /^\d+$/.test(q);
            if (isNum) return String(s.customer_number) === q || s.customer_name?.toLowerCase().includes(q);
            return s.customer_name?.toLowerCase().includes(q);
        })
        : summaries;

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={16} strokeWidth={2} />
                    Home
                </button>
                <h1>Monthly Summary</h1>
                <div style={{ width: 80 }} />
            </div>

            {/* Month picker */}
            <div className="month-picker">
                <button onClick={() => changeMonth(-1)} aria-label="Previous month">
                    <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <span style={{ fontFamily: 'var(--font-display)' }}>{monthName}</span>
                <button onClick={() => changeMonth(1)} aria-label="Next month">
                    <ChevronRightIcon size={20} strokeWidth={2} />
                </button>
            </div>

            {/* Grand total card */}
            <div
                style={{
                    background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-overlay) 100%)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px 24px',
                    marginBottom: 16,
                }}
            >
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
                    Grand Total
                </div>
                <div className="amount-large amount-positive">
                    ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div
                    style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        marginTop: 4,
                    }}
                >
                    {summaries.length} {summaries.length === 1 ? 'customer' : 'customers'} · {monthName}
                </div>
            </div>

            {user?.role === 'OWNER' && (
                <button
                    className="btn btn-outline btn-full"
                    style={{ marginBottom: 16 }}
                    onClick={handleRecalculate}
                    disabled={recalculating}
                >
                    <RefreshCw
                        size={16}
                        strokeWidth={2}
                        style={{
                            animation: recalculating ? 'spin 1s linear infinite' : 'none',
                        }}
                    />
                    {recalculating ? 'Recalculating…' : 'Recalculate All'}
                </button>
            )}

            {/* Search */}
            <div className="search-box">
                <span className="search-icon">
                    <Search size={16} strokeWidth={2} />
                </span>
                <input
                    placeholder="Search customer…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <BarChart3 size={40} style={{ opacity: 0.4 }} />
                    <p style={{ marginTop: 8 }}>
                        {search ? 'No matching customers' : 'No entries this month'}
                    </p>
                </div>
            ) : (
                <div
                    style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                    }}
                >
                    {filtered.map((s: any, idx: number) => {
                        const color = avatarColor(s.customer_name);
                        const letter = avatarLetter(s.customer_name);
                        const isLast = idx === filtered.length - 1;

                        return (
                            <div
                                key={s.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '14px 16px',
                                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                                onClick={() => navigate(`/customers/${s.customer_id}?month=${monthYear}`)}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                                }}
                            >
                                <div
                                    className="customer-avatar"
                                    style={{
                                        background: color.bg,
                                        color: color.fg,
                                        width: 38,
                                        height: 38,
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    {letter}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'baseline',
                                            gap: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 600,
                                                fontSize: '0.98rem',
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {s.customer_name}
                                        </div>
                                        <div
                                            className="amount-medium"
                                            style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
                                        >
                                            ₹{Number(s.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            marginTop: 3,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.78rem',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            #{s.customer_number}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.78rem',
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            · {s.entry_count} {s.entry_count === 1 ? 'entry' : 'entries'}
                                        </span>
                                        <span className={s.is_locked ? 'badge badge-muted' : 'badge badge-success'}>
                                            {s.is_locked ? 'Locked' : 'Open'}
                                        </span>
                                    </div>

                                    {s.product_breakdown && s.product_breakdown.length > 0 && (
                                        <div
                                            style={{
                                                marginTop: 4,
                                                fontSize: '0.76rem',
                                                color: 'var(--text-muted)',
                                                fontFamily: 'var(--font-mono)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {s.product_breakdown
                                                .map((p: any) => `${p.qty}× ${p.name}`)
                                                .join(' · ')}
                                        </div>
                                    )}
                                </div>

                                {user?.role === 'OWNER' && (
                                    <button
                                        className="btn btn-outline"
                                        style={{
                                            padding: '5px 10px',
                                            minHeight: 'auto',
                                            fontSize: '0.78rem',
                                            flexShrink: 0,
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            s.is_locked ? handleUnlock(s.id) : handleLock(s.id);
                                        }}
                                    >
                                        {s.is_locked ? (
                                            <>
                                                <Unlock size={12} strokeWidth={2} />
                                                Unlock
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={12} strokeWidth={2} />
                                                Lock
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
