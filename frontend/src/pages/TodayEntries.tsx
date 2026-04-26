import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Plus, Trash2, Calendar, Wallet,
    ClipboardList,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { entryApi } from '../api';
import { formatAddress, idBadgeFontSize } from '../utils/avatar';

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
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            await entryApi.delete(id);
            loadEntries();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    // Group entries by customer_id (more reliable than name)
    const grouped = entries.reduce((acc: Record<string, any>, entry: any) => {
        const key = entry.customer?.id || entry.customer?.name || 'unknown';
        if (!acc[key]) {
            acc[key] = { customer: entry.customer, entries: [] };
        }
        acc[key].entries.push(entry);
        return acc;
    }, {});

    const totalAmount = entries.reduce((s: number, e: any) => s + Number(e.line_total || 0), 0);

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={16} strokeWidth={2} />
                    Home
                </button>
                <h1>Today's Entries</h1>
                <div style={{ width: 80 }} />
            </div>

            <p
                style={{
                    color: 'var(--text-secondary)',
                    marginBottom: 16,
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-body)',
                }}
            >
                {formattedDate}
            </p>

            {/* Stat bar */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
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
                        <Calendar size={13} strokeWidth={2} />
                        Entries
                    </div>
                    <div className="stat-value amount-neutral">{entries.length}</div>
                </div>
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
                        <Wallet size={13} strokeWidth={2} />
                        Total
                    </div>
                    <div className="stat-value amount-positive">
                        ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : entries.length === 0 ? (
                <div className="empty-state">
                    <ClipboardList size={40} style={{ opacity: 0.4 }} />
                    <p style={{ marginTop: 8 }}>No entries yet today</p>
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 16 }}
                        onClick={() => navigate('/add-entry')}
                    >
                        <Plus size={16} strokeWidth={2} />
                        Add First Entry
                    </button>
                </div>
            ) : (
                Object.values(grouped).map((group: any) => {
                    const c = group.customer;
                    const subtotal = group.entries.reduce(
                        (s: number, e: any) => s + Number(e.line_total || 0),
                        0,
                    );
                    const shortAddress = formatAddress(c?.address, 34);

                    return (
                        <div
                            key={c?.id || c?.name}
                            className="card"
                            style={{ marginBottom: 12, padding: 14 }}
                        >
                            {/* Customer header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                <div
                                    className="customer-id-badge"
                                    style={{ fontSize: idBadgeFontSize(c?.customer_number) }}
                                >
                                    {c?.customer_number ?? '—'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
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
                                        {c?.name || 'Unknown'}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.76rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {c?.phone || '—'}
                                    </div>
                                    {shortAddress && (
                                        <div
                                            style={{
                                                fontSize: '0.74rem',
                                                color: 'var(--text-muted)',
                                                marginTop: 1,
                                            }}
                                        >
                                            {shortAddress}
                                        </div>
                                    )}
                                </div>
                                <span
                                    className="amount-medium amount-positive"
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    ₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* Entry rows */}
                            <div
                                style={{
                                    borderTop: '1px solid var(--border-subtle)',
                                    paddingTop: 6,
                                }}
                            >
                                {group.entries.map((entry: any) => (
                                    <div
                                        key={entry.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 0',
                                            borderBottom: '1px solid var(--border-subtle)',
                                            gap: 10,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: 500,
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {entry.product?.name || 'Product'}
                                                <span
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        color: 'var(--text-secondary)',
                                                        marginLeft: 6,
                                                        fontSize: '0.82rem',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    {Number(entry.quantity)}{entry.product?.unit || ''} × ₹{Number(entry.unit_price).toFixed(2)}
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    marginTop: 4,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <span className="badge badge-info">{entry.source}</span>
                                                <span className="badge badge-muted">{entry.entry_slot}</span>
                                                {entry.created_by_user?.name && (
                                                    <span
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            color: 'var(--text-muted)',
                                                        }}
                                                    >
                                                        by {entry.created_by_user.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span
                                                className="amount-small amount-positive"
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                ₹{Number(entry.line_total).toFixed(2)}
                                            </span>
                                            {user?.role === 'OWNER' && (
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    aria-label="Delete entry"
                                                    style={{
                                                        background: 'var(--danger-bg)',
                                                        border: 'none',
                                                        color: 'var(--danger)',
                                                        width: 44,
                                                        height: 44,
                                                        minHeight: 44,
                                                        padding: 0,
                                                        borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Trash2 size={16} strokeWidth={1.75} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Floating Action Button */}
            <button
                className="fab"
                onClick={() => navigate('/add-entry')}
                aria-label="Add new entry"
                title="Add new entry"
            >
                <Plus size={24} strokeWidth={2.25} />
            </button>
        </div>
    );
}
