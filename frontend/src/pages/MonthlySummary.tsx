import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { summaryApi } from '../api';

export default function MonthlySummary() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [summaries, setSummaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
        } catch { setSummaries([]); }
        finally { setLoading(false); }
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

    const grandTotal = summaries.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);

    // Filter summaries by search (name or customer number)
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
                <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
                <h1>Monthly Summary</h1>
            </div>

            {/* Month Picker */}
            <div className="month-picker">
                <button onClick={() => changeMonth(-1)}>◀</button>
                <span>{monthName}</span>
                <button onClick={() => changeMonth(1)}>▶</button>
            </div>

            {/* Grand Total */}
            <div className="stat-card" style={{ marginBottom: '20px' }}>
                <div className="stat-value">₹{grandTotal.toFixed(2)}</div>
                <div className="stat-label">
                    Total for {monthName} · {summaries.length} customers
                </div>
            </div>

            {user?.role === 'OWNER' && (
                <button
                    className="btn btn-outline btn-full"
                    style={{ marginBottom: '16px' }}
                    onClick={async () => {
                        await summaryApi.recalculate(monthYear);
                        loadSummaries();
                    }}
                >
                    🔄 Recalculate All
                </button>
            )}

            {/* Search */}
            <div className="search-box" style={{ marginBottom: '16px' }}>
                <span className="search-icon">🔍</span>
                <input
                    placeholder="Search customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                />
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p>{search ? 'No matching customers' : 'No entries this month'}</p>
                </div>
            ) : (
                filtered.map((s: any) => (
                    <div key={s.id} className="card card-clickable" onClick={() => navigate(`/customers/${s.customer_id}?month=${monthYear}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div className="summary-name">{s.customer_name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                                    {s.entry_count} entries ·{' '}
                                    <span className={`badge ${s.is_locked ? 'badge-locked' : 'badge-open'}`}>
                                        {s.is_locked ? '🔒 Locked' : '🔓 Open'}
                                    </span>
                                </div>
                                {/* Product breakdown */}
                                {s.product_breakdown && s.product_breakdown.length > 0 && (
                                    <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {s.product_breakdown.map((p: any, i: number) => (
                                            <span key={i}>
                                                {i > 0 && ' · '}
                                                <span style={{ fontWeight: 600 }}>{p.qty}</span> {p.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="summary-amount">₹{Number(s.total_amount).toFixed(2)}</div>
                                {user?.role === 'OWNER' && (
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '4px 12px', fontSize: '0.75rem', minHeight: 'auto', marginTop: '4px' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            s.is_locked ? handleUnlock(s.id) : handleLock(s.id);
                                        }}
                                    >
                                        {s.is_locked ? 'Unlock' : 'Lock'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
