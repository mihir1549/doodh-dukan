import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { entryApi, summaryApi } from '../api';

export default function MilkCard() {
    const { user, logout } = useAuth();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [entries, setEntries] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.customer_id) {
            loadData();
        }
    }, [month, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [entriesRes, summaryRes] = await Promise.all([
                entryApi.listByMonth(month, user?.customer_id),
                summaryApi.list(month, user?.customer_id)
            ]);
            setEntries(entriesRes.data?.data || []);
            setSummary(summaryRes.data?.data?.[0] || null);
        } catch (err) {
            console.error('Failed to load milk card data', err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get days in month
    const getDaysInMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-').map(Number);
        return new Date(year, month, 0).getDate();
    };

    const daysCount = getDaysInMonth(month);
    const dayRows = Array.from({ length: daysCount }, (_, i) => i + 1);

    // Group entries by day and slot
    const entriesByDay = entries.reduce((acc: any, entry: any) => {
        const day = new Date(entry.entry_date).getDate();
        if (!acc[day]) acc[day] = { MORNING: [], EVENING: [], EXTRA: [] };
        acc[day][entry.entry_slot].push(entry);
        return acc;
    }, {});

    return (
        <div className="page" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>My Milk Card</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.shop_name}</p>
                </div>
                <button
                    onClick={logout}
                    style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                    Logout
                </button>
            </div>

            {/* Month Selector */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{
                        flex: 1, padding: '12px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', background: 'var(--bg-card)',
                        color: 'var(--text-primary)', fontSize: '1rem'
                    }}
                />
            </div>

            {/* Summary Info */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px'
            }}>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>This Month Total</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                        ₹{summary?.total_amount?.toFixed(2) || '0.00'}
                    </div>
                </div>
                <div style={{ background: 'var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Status</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {summary?.is_locked ? '✅ PAID' : '🕒 PENDING'}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '50px 1fr 1fr 1fr',
                        padding: '12px', background: 'var(--bg-page)', borderBottom: '2px solid var(--border)',
                        fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-secondary)'
                    }}>
                        <div>DATE</div>
                        <div>MORNING</div>
                        <div>EVENING</div>
                        <div>EXTRA</div>
                    </div>

                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {dayRows.map(day => {
                            const dayEntries = entriesByDay[day] || { MORNING: [], EVENING: [], EXTRA: [] };
                            const hasMilk = dayEntries.MORNING.length > 0 || dayEntries.EVENING.length > 0 || dayEntries.EXTRA.length > 0;

                            return (
                                <div key={day} style={{
                                    display: 'grid', gridTemplateColumns: '50px 1fr 1fr 1fr',
                                    padding: '12px', borderBottom: '1px solid var(--border)',
                                    textAlign: 'center', fontSize: '1rem',
                                    background: hasMilk ? 'transparent' : 'rgba(239, 68, 68, 0.05)'
                                }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{day}</div>

                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {dayEntries.MORNING.map((e: any) => e.quantity).join(' + ') || (hasMilk ? '-' : <span style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>✕</span>)}
                                    </div>

                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {dayEntries.EVENING.map((e: any) => e.quantity).join(' + ') || (hasMilk ? '-' : <span style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>✕</span>)}
                                    </div>

                                    <div style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                        {dayEntries.EXTRA.map((e: any) => e.quantity).join(' + ') || '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing entries for {new Date(month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
        </div>
    );
}
