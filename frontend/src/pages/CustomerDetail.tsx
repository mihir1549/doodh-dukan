import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Pencil, Package, Calendar,
    Lock, Unlock, X, CheckCircle2, Wallet, TrendingUp, BookOpen,
} from 'lucide-react';
import { customerApi, summaryApi, entryApi } from '../api';
import { avatarColor, avatarLetter } from '../utils/avatar';

export default function CustomerDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const [customer, setCustomer] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', address: '' });
    const [saving, setSaving] = useState(false);

    const now = new Date();
    const initialMonth = searchParams.get('month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [monthYear, setMonthYear] = useState(initialMonth);

    const [yearNum, monthNum] = monthYear.split('-').map(Number);
    const monthName = new Date(yearNum, monthNum - 1).toLocaleDateString('en-IN', {
        month: 'long', year: 'numeric',
    });

    useEffect(() => {
        if (id) loadData();
    }, [id, monthYear]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [custRes, summRes, entriesRes] = await Promise.all([
                customerApi.get(id!),
                summaryApi.list(monthYear, id),
                entryApi.listByMonth(monthYear, id),
            ]);
            setCustomer(custRes.data?.data);
            const sums = summRes.data?.data || [];
            setSummary(sums.length > 0 ? sums[0] : null);
            setEntries(entriesRes.data?.data || []);
            setEditForm({
                name: custRes.data?.data?.name || '',
                phone: custRes.data?.data?.phone || '',
                address: custRes.data?.data?.address || '',
            });
        } catch {
            setCustomer(null);
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (delta: number) => {
        let m = monthNum + delta;
        let y = yearNum;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        setMonthYear(`${y}-${String(m).padStart(2, '0')}`);
    };

    const handleEditSave = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        setSaving(true);
        try {
            await customerApi.update(id!, editForm);
            setIsEditing(false);
            loadData();
        } catch (err) {
            console.error('Failed to update customer', err);
            alert('Failed to update customer details');
        } finally {
            setSaving(false);
        }
    };

    // Product breakdown
    const productBreakdown: Record<string, { name: string; qty: number; unit: string; amount: number }> = {};
    entries.forEach((e: any) => {
        const pId = e.product_id;
        const pName = e.product?.name || 'Unknown';
        const pUnit = e.product?.unit || '';
        if (!productBreakdown[pId]) {
            productBreakdown[pId] = { name: pName, qty: 0, unit: pUnit, amount: 0 };
        }
        productBreakdown[pId].qty += Number(e.quantity);
        productBreakdown[pId].amount += Number(e.line_total);
    });

    // Group entries by date
    const entriesByDate: Record<string, any[]> = {};
    entries.forEach((e: any) => {
        const date = e.entry_date;
        if (!entriesByDate[date]) entriesByDate[date] = [];
        entriesByDate[date].push(e);
    });

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className="page">
                <div className="page-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ChevronLeft size={16} strokeWidth={2} />
                        Back
                    </button>
                    <h1>Customer</h1>
                    <div style={{ width: 80 }} />
                </div>
                <div className="loading"><div className="spinner" /></div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="page">
                <div className="page-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ChevronLeft size={16} strokeWidth={2} />
                        Back
                    </button>
                    <h1>Customer</h1>
                    <div style={{ width: 80 }} />
                </div>
                <p style={{ marginTop: 20, color: 'var(--text-muted)' }}>Customer not found</p>
            </div>
        );
    }

    const color = avatarColor(customer.name);
    const letter = avatarLetter(customer.name);

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={16} strokeWidth={2} />
                    Back
                </button>
                <h1>Customer</h1>
                <button
                    className="icon-btn"
                    onClick={() => navigate(`/customers/${id}/ledger`)}
                    aria-label="Passbook"
                    title="Passbook"
                >
                    <BookOpen size={18} strokeWidth={1.75} />
                </button>
            </div>

            {/* Profile card */}
            <div
                className="card card-elevated"
                style={{ marginBottom: 20, padding: 16 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                        className="customer-avatar"
                        style={{
                            width: 52,
                            height: 52,
                            fontSize: '1.3rem',
                            background: color.bg,
                            color: color.fg,
                        }}
                    >
                        {letter}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                color: 'var(--text-primary)',
                            }}
                        >
                            {customer.name}
                        </div>
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                marginTop: 2,
                            }}
                        >
                            #{customer.customer_number}
                            {customer.phone ? ` · ${customer.phone}` : ''}
                        </div>
                        {customer.address && (
                            <div
                                style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--text-muted)',
                                    marginTop: 2,
                                }}
                            >
                                {customer.address}
                            </div>
                        )}
                    </div>
                    <button
                        className="icon-btn"
                        onClick={() => setIsEditing(true)}
                        aria-label="Edit profile"
                    >
                        <Pencil size={16} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Month Picker */}
            <div className="month-picker">
                <button onClick={() => changeMonth(-1)} aria-label="Previous month">
                    <ChevronLeft size={18} strokeWidth={2} />
                </button>
                <span style={{ fontFamily: 'var(--font-display)' }}>{monthName}</span>
                <button onClick={() => changeMonth(1)} aria-label="Next month">
                    <ChevronRight size={18} strokeWidth={2} />
                </button>
            </div>

            {/* Stat cards */}
            {summary ? (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
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
                            <Wallet size={13} strokeWidth={2} />
                            This Month
                        </div>
                        <div className="amount-medium amount-positive">
                            ₹{Number(summary.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
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
                            <TrendingUp size={13} strokeWidth={2} />
                            Entries
                        </div>
                        <div className="amount-medium amount-neutral">
                            {summary.entry_count}
                        </div>
                        <div style={{ marginTop: 4 }}>
                            <span className={summary.is_locked ? 'badge badge-muted' : 'badge badge-success'}>
                                {summary.is_locked ? (
                                    <>
                                        <Lock size={10} strokeWidth={2} /> Locked
                                    </>
                                ) : (
                                    <>
                                        <Unlock size={10} strokeWidth={2} /> Open
                                    </>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="empty-state" style={{ padding: 24, marginBottom: 16 }}>
                    <p>No entries for {monthName}</p>
                </div>
            )}

            {/* Product breakdown */}
            {Object.keys(productBreakdown).length > 0 && (
                <>
                    <h3
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 600,
                            marginBottom: 10,
                        }}
                    >
                        <Package size={14} strokeWidth={2} />
                        Product Breakdown
                    </h3>
                    <div
                        className="card"
                        style={{ marginBottom: 20, padding: '4px 16px' }}
                    >
                        {Object.values(productBreakdown).map((p, i, arr) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 0',
                                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                }}
                            >
                                <div>
                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                    <span
                                        style={{
                                            color: 'var(--text-secondary)',
                                            marginLeft: 8,
                                            fontSize: '0.85rem',
                                            fontFamily: 'var(--font-mono)',
                                        }}
                                    >
                                        {p.qty} {p.unit}
                                    </span>
                                </div>
                                <span
                                    className="amount-small amount-positive"
                                    style={{ fontWeight: 500 }}
                                >
                                    ₹{p.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Day-by-day entries */}
            {Object.keys(entriesByDate).length > 0 && (
                <>
                    <h3
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 600,
                            marginBottom: 10,
                        }}
                    >
                        <Calendar size={14} strokeWidth={2} />
                        Day-by-Day
                    </h3>
                    {Object.entries(entriesByDate).map(([date, dateEntries]) => (
                        <div
                            key={date}
                            className="card"
                            style={{ marginBottom: 10, padding: '10px 16px' }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.8rem',
                                    color: 'var(--brand-primary)',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-display)',
                                    marginBottom: 6,
                                    paddingBottom: 6,
                                    borderBottom: '1px solid var(--border-subtle)',
                                }}
                            >
                                <span>{formatDate(date)}</span>
                                <span
                                    className="amount-small amount-positive"
                                    style={{ fontWeight: 500 }}
                                >
                                    ₹{dateEntries.reduce((s, e) => s + Number(e.line_total || 0), 0).toFixed(2)}
                                </span>
                            </div>
                            {dateEntries.map((entry: any) => {
                                const byName = entry.created_by_user?.name || entry.entered_by_user?.name;
                                return (
                                    <div
                                        key={entry.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '6px 0',
                                            gap: 10,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-primary)',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {entry.product?.name || 'Product'}
                                                <span
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        color: 'var(--text-secondary)',
                                                        marginLeft: 6,
                                                        fontSize: '0.8rem',
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
                                                    marginTop: 2,
                                                    fontSize: '0.72rem',
                                                    color: 'var(--text-muted)',
                                                }}
                                            >
                                                {entry.source && (
                                                    <span className="badge badge-muted">{entry.source}</span>
                                                )}
                                                {byName && <span>by {byName}</span>}
                                            </div>
                                        </div>
                                        <span
                                            className="amount-small amount-positive"
                                            style={{ fontWeight: 500 }}
                                        >
                                            ₹{Number(entry.line_total).toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </>
            )}

            {/* Edit Profile Modal */}
            {isEditing && (
                <div className="modal-backdrop" onClick={() => setIsEditing(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <h2 style={{ fontSize: '1.1rem' }}>Edit Profile</h2>
                            <button
                                className="icon-btn"
                                onClick={() => setIsEditing(false)}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSave}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Mobile No.</label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    placeholder="Optional"
                                    rows={2}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ flex: 1 }}
                                    onClick={() => setIsEditing(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} strokeWidth={2} />
                                            Save
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
