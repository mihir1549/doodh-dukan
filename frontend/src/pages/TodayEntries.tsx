import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { entryApi } from '../api';

export default function TodayEntries() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const today = new Date().toISOString().split('T')[0];
    const formattedDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        try {
            const res = await entryApi.list(today);
            setEntries(res.data?.data || []);
        } catch { setEntries([]); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            await entryApi.delete(id);
            loadEntries();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    // Group entries by customer
    const grouped = entries.reduce((acc: any, entry: any) => {
        const name = entry.customer?.name || 'Unknown';
        if (!acc[name]) acc[name] = [];
        acc[name].push(entry);
        return acc;
    }, {});

    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.line_total || 0), 0);

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
                <h1>Today's Entries</h1>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                {formattedDate}
            </p>

            {/* Summary bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border)' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Entries</div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{entries.length}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Amount</div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>₹{totalAmount.toFixed(2)}</div>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : entries.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <p>No entries yet today</p>
                    <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/add-entry')}>
                        Add First Entry
                    </button>
                </div>
            ) : (
                Object.entries(grouped).map(([customerName, customerEntries]: [string, any]) => (
                    <div key={customerName} className="card" style={{ marginBottom: '14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{customerName}</span>
                            <span style={{ color: 'var(--accent)' }}>
                                ₹{customerEntries.reduce((s: number, e: any) => s + Number(e.line_total || 0), 0).toFixed(2)}
                            </span>
                        </div>
                        {customerEntries.map((entry: any) => (
                            <div key={entry.id} className="entry-item">
                                <div className="entry-info">
                                    <h4>{entry.product?.name || 'Product'}</h4>
                                    <p>{Number(entry.quantity)} {entry.product?.unit} × ₹{Number(entry.unit_price).toFixed(2)}</p>
                                    <p>
                                        <span className="badge badge-role" style={{ fontSize: '0.65rem' }}>
                                            {entry.source}
                                        </span>
                                        <span className="badge" style={{ fontSize: '0.65rem', marginLeft: '4px', background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                            {entry.entry_slot}
                                        </span>
                                        {entry.created_by_user?.name && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                                by {entry.created_by_user.name}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="entry-amount">₹{Number(entry.line_total).toFixed(2)}</span>
                                    {user?.role === 'OWNER' && (
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            style={{ background: 'var(--danger-light)', border: 'none', color: 'var(--danger)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            🗑
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            )}

            <button
                className="btn btn-primary btn-full"
                style={{ marginTop: '16px' }}
                onClick={() => navigate('/add-entry')}
            >
                ➕ Add New Entry
            </button>
        </div>
    );
}
