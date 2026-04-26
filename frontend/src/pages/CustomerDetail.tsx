import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Pencil, Package, Calendar,
    Lock, Unlock, X, CheckCircle2, Wallet, TrendingUp, BookOpen,
} from 'lucide-react';
import { customerApi, summaryApi, entryApi } from '../api';
import { idBadgeFontSize } from '../utils/avatar';

export default function CustomerDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const [customer, setCustomer] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', customer_number: '' });
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

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
                customer_number: String(custRes.data?.data?.customer_number ?? ''),
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
        setEditError('');
        try {
            const payload: any = {
                name: editForm.name,
                phone: editForm.phone || undefined,
                address: editForm.address || undefined,
            };
            const num = editForm.customer_number.trim();
            if (num) payload.customer_number = Number(num);

            await customerApi.update(id!, payload);
            setIsEditing(false);
            loadData();
        } catch (err: any) {
            if (err.response?.status === 409) {
                setEditError('Customer number already taken. Please use a different number.');
            } else {
                setEditError(err.response?.data?.message || 'Failed to update customer details');
            }
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

    // Group entries by day-of-month (same shape as MilkCard for consistent admin/customer view)
    const getDaysInMonth = (yearMonth: string) => {
        const [y, m] = yearMonth.split('-').map(Number);
        return new Date(y, m, 0).getDate();
    };
    const daysCount = getDaysInMonth(monthYear);
    const dayRows = Array.from({ length: daysCount }, (_, i) => i + 1);

    const entriesByDay: Record<number, any[]> = {};
    entries.forEach((e: any) => {
        const day = new Date(e.entry_date + 'T00:00:00').getDate();
        if (!entriesByDay[day]) entriesByDay[day] = [];
        entriesByDay[day].push(e);
    });

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
                        className="customer-id-badge"
                        style={{
                            width: 52,
                            height: 52,
                            minWidth: 52,
                            borderRadius: 12,
                            fontSize: idBadgeFontSize(customer.customer_number) + 3,
                        }}
                    >
                        {customer.customer_number}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
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

            {/* Day-by-day table (same format as customer's MilkCard) */}
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
            <div
                style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 60px 60px',
                        padding: '10px 14px',
                        background: 'var(--bg-elevated)',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}
                >
                    <div style={{ textAlign: 'center' }}>Date</div>
                    <div>Details</div>
                    <div style={{ textAlign: 'center' }}>By</div>
                    <div style={{ textAlign: 'right' }}>Time</div>
                </div>

                <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                    {dayRows.map((day) => {
                        const dayEntries = entriesByDay[day] || [];
                        const hasEntries = dayEntries.length > 0;

                        const productTotals: Record<string, { qty: number; name: string; category: string }> = {};
                        dayEntries.forEach((e: any) => {
                            const pid = e.product?.id || 'unknown';
                            if (!productTotals[pid]) {
                                productTotals[pid] = {
                                    qty: 0,
                                    name: e.product?.name || 'Item',
                                    category: e.product?.category || '',
                                };
                            }
                            productTotals[pid].qty += Number(e.quantity);
                        });

                        const detailsStr = Object.values(productTotals)
                            .map((p) => {
                                const qtyNum = Number(p.qty);
                                const isLoose =
                                    p.name.toLowerCase().includes('loose') ||
                                    p.category === 'LOOSE_MILK';
                                return isLoose
                                    ? `${qtyNum.toFixed(1)}L`
                                    : `${qtyNum}${p.name.split(' ')[0]}`;
                            })
                            .join(', ');

                        const lastEntry = dayEntries[dayEntries.length - 1];
                        const rawBy =
                            hasEntries && (lastEntry?.created_by_user?.name || lastEntry?.entered_by_user?.name)
                                ? (lastEntry.created_by_user?.name || lastEntry.entered_by_user?.name).split(' ')[0]
                                : '';
                        const byName = !rawBy
                            ? '—'
                            : rawBy.length > 8
                                ? rawBy.slice(0, 8) + '…'
                                : rawBy;

                        return (
                            <div
                                key={day}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1fr 60px 60px',
                                    padding: '10px 14px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    alignItems: 'center',
                                    fontSize: '0.88rem',
                                    background: hasEntries ? 'transparent' : 'rgba(255,255,255,0.015)',
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 500,
                                        color: hasEntries ? 'var(--text-secondary)' : 'var(--text-muted)',
                                        textAlign: 'center',
                                    }}
                                >
                                    {day}
                                </div>
                                <div
                                    style={{
                                        color: hasEntries ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontWeight: hasEntries ? 500 : 400,
                                        fontFamily: hasEntries ? 'var(--font-mono)' : 'var(--font-body)',
                                    }}
                                >
                                    {hasEntries ? detailsStr : '—'}
                                </div>
                                <div
                                    style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '0.72rem',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {byName}
                                </div>
                                <div
                                    style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '0.72rem',
                                        textAlign: 'right',
                                        fontFamily: 'var(--font-mono)',
                                    }}
                                >
                                    {hasEntries && lastEntry?.created_at
                                        ? new Date(lastEntry.created_at).toLocaleTimeString('en-IN', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: false,
                                          })
                                        : '—'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

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
                                <label>Customer Number</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    value={editForm.customer_number}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            customer_number: e.target.value.replace(/\D/g, ''),
                                        })
                                    }
                                    style={{ fontFamily: 'var(--font-mono)' }}
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

                            {editError && <div className="error-msg">{editError}</div>}

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
