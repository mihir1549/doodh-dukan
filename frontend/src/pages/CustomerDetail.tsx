import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { customerApi, summaryApi, entryApi } from '../api';

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
                address: custRes.data?.data?.address || ''
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

    const handleEditSave = async (e: React.FormEvent) => {
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

    // Build product-wise breakdown from entries
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

    if (loading) return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                <h1>Customer</h1>
            </div>
            <div className="loading"><div className="spinner" /></div>
        </div>
    );
    if (!customer) return <div className="page"><div className="page-header"><button className="back-btn" onClick={() => navigate(-1)}>← Back</button><h1>Customer</h1></div><p style={{ marginTop: '20px' }}>Customer not found</p></div>;

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                <h1>Customer</h1>
            </div>

            {/* Customer Info Card */}
            <div className="card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="customer-avatar" style={{ width: '56px', height: '56px', fontSize: '1.4rem' }}>
                        {customer.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{customer.name}</div>
                        {customer.phone && <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{customer.phone}</div>}
                        {customer.address && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{customer.address}</div>}
                    </div>
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '1.5rem', padding: '8px' }}
                >
                    ✏️
                </button>
            </div>

            {/* Edit Profile Modal */}
            {isEditing && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                        <h2 style={{ marginBottom: '20px' }}>Edit Profile</h2>
                        <form onSubmit={handleEditSave}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    required
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Mobile No.</label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea
                                    value={editForm.address}
                                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                    placeholder="Optional"
                                    rows={2}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Month Picker */}
            <div className="month-picker">
                <button onClick={() => changeMonth(-1)}>◀</button>
                <span>{monthName}</span>
                <button onClick={() => changeMonth(1)}>▶</button>
            </div>

            {/* Monthly Total */}
            {summary ? (
                <div className="stat-card" style={{ marginBottom: '16px' }}>
                    <div className="stat-value">₹{Number(summary.total_amount).toFixed(2)}</div>
                    <div className="stat-label">
                        {summary.entry_count} entries ·{' '}
                        <span className={`badge ${summary.is_locked ? 'badge-locked' : 'badge-open'}`}>
                            {summary.is_locked ? '🔒 Locked' : '🔓 Open'}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="empty-state" style={{ padding: '24px' }}>
                    <p>No entries for {monthName}</p>
                </div>
            )}

            {/* Product-wise Breakdown */}
            {Object.keys(productBreakdown).length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        📦 Product Breakdown
                    </h3>
                    {Object.values(productBreakdown).map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < Object.keys(productBreakdown).length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div>
                                <span style={{ fontWeight: 700 }}>{p.name}</span>
                                <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '0.9rem' }}>
                                    {p.qty} {p.unit}
                                </span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{p.amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Day-by-Day Entries */}
            {Object.keys(entriesByDate).length > 0 && (
                <div>
                    <h3 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        📅 Day-by-Day Entries
                    </h3>
                    {Object.entries(entriesByDate).map(([date, dateEntries]) => (
                        <div key={date} className="card" style={{ marginBottom: '10px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                {formatDate(date)}
                            </div>
                            {dateEntries.map((entry: any) => (
                                <div key={entry.id} className="entry-item">
                                    <div className="entry-info">
                                        <h4>{entry.product?.name || 'Product'}</h4>
                                        <p>{Number(entry.quantity)} {entry.product?.unit} × ₹{Number(entry.unit_price).toFixed(2)}</p>
                                        {entry.entered_by_user?.name && (
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {entry.source_channel} · by {entry.entered_by_user.name}
                                            </p>
                                        )}
                                    </div>
                                    <span className="entry-amount">₹{Number(entry.line_total).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
