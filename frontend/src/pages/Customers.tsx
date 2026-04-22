import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi, ledgerApi } from '../api';
import { useAuth } from '../AuthContext';
import SetOpeningBalanceModal from '../components/SetOpeningBalanceModal';

function formatBalance(n: number) {
    return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function Customers() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = ['OWNER', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase() ?? '');

    const [customers, setCustomers] = useState<any[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [openingFlags, setOpeningFlags] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [openingBalanceFor, setOpeningBalanceFor] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        const tid = setTimeout(() => { setPage(1); loadCustomers(search, 1); }, 300);
        return () => clearTimeout(tid);
    }, [search]);

    const loadCustomers = async (q = '', pageNum = 1) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await customerApi.list(q, pageNum, 50);
            const newData: any[] = res.data?.data?.data || [];

            if (pageNum === 1) {
                setCustomers(newData);
            } else {
                setCustomers((prev) => [...prev, ...newData]);
            }

            const meta = res.data?.data?.meta;
            if (meta) setHasMore(pageNum < meta.totalPages);
            else setHasMore(newData.length === 50);

            // Load balances for visible customers in background
            loadBalances(newData.map((c: any) => c.id));
        } catch {
            if (pageNum === 1) setCustomers([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadBalances = useCallback(async (ids: string[]) => {
        if (!ids.length) return;
        const results = await Promise.allSettled(
            ids.map((id) => ledgerApi.getCustomerBalance(id))
        );
        const newBalances: Record<string, number> = {};
        results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                newBalances[ids[i]] = Number(r.value.data?.data?.current_balance ?? 0);
            }
        });
        setBalances((prev) => ({ ...prev, ...newBalances }));
    }, []);

    const loadOpeningFlags = useCallback(async (ids: string[]) => {
        if (!isAdmin || !ids.length) return;
        const results = await Promise.allSettled(
            ids.map((id) => ledgerApi.hasOpeningBalance(id))
        );
        const newFlags: Record<string, boolean> = {};
        results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                newFlags[ids[i]] = r.value.data?.data?.has_opening_balance ?? false;
            }
        });
        setOpeningFlags((prev) => ({ ...prev, ...newFlags }));
    }, [isAdmin]);

    useEffect(() => {
        if (customers.length > 0) {
            loadOpeningFlags(customers.map((c) => c.id));
        }
    }, [customers, loadOpeningFlags]);

    const handleLoadMore = () => {
        if (hasMore && !loadingMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadCustomers(search, nextPage);
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return;
        setSaving(true);
        try {
            await customerApi.create(formData);
            setFormData({ name: '', phone: '', address: '', notes: '' });
            setShowForm(false);
            setPage(1);
            loadCustomers(search, 1);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save');
        } finally { setSaving(false); }
    };

    const handleOpeningBalanceSuccess = (customerId: string) => {
        setOpeningBalanceFor(null);
        setOpeningFlags((prev) => ({ ...prev, [customerId]: true }));
        loadBalances([customerId]);
    };

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
                <h1>Customers</h1>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div className="search-box" style={{ flex: 1, marginBottom: 0 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        placeholder="Search by name, phone, or #number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '44px' }}
                    />
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ whiteSpace: 'nowrap' }}>
                    {showForm ? '✕' : '+ Add'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '16px', border: '2px solid var(--accent)' }}>
                    <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}>New Customer</h3>
                    <div className="form-group">
                        <label>Name *</label>
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Customer name" />
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" />
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Address" />
                    </div>
                    <button className="btn btn-success btn-full" onClick={handleSave} disabled={saving}>
                        {saving ? '⏳ Saving...' : '✅ Save Customer'}
                    </button>
                </div>
            )}

            {loading && customers.length === 0 ? (
                <div className="loading"><div className="spinner" /></div>
            ) : !loading && customers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <p>No customers yet</p>
                </div>
            ) : (
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px', paddingBottom: '20px' }}>
                    {customers.map((c: any) => {
                        const bal = balances[c.id];
                        const hasBal = bal !== undefined;
                        const balColor = !hasBal ? 'var(--text-muted)'
                            : bal > 0 ? 'var(--danger)'
                                : bal < 0 ? 'var(--success)'
                                    : 'var(--text-muted)';
                        const hasOB = openingFlags[c.id];

                        return (
                            <div
                                key={c.id}
                                className="customer-item"
                                style={{ borderBottom: '1px solid var(--border)', flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}
                            >
                                {/* Main row */}
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                    onClick={() => navigate(`/customers/${c.id}`)}
                                >
                                    <div className="customer-avatar">{c.customer_number || c.name?.charAt(0)?.toUpperCase()}</div>
                                    <div style={{ flex: 1 }}>
                                        <div className="customer-name">#{c.customer_number} · {c.name}</div>
                                        {c.phone && <div className="customer-phone">{c.phone}</div>}
                                    </div>
                                    {/* Balance chip */}
                                    <div
                                        style={{ textAlign: 'right', cursor: 'pointer' }}
                                        onClick={(ev) => { ev.stopPropagation(); navigate(`/customers/${c.id}/ledger`); }}
                                    >
                                        {hasBal ? (
                                            <div style={{
                                                color: balColor,
                                                fontWeight: 600,
                                                fontSize: '0.88rem',
                                                background: bal > 0 ? 'var(--danger-light)' : bal < 0 ? 'var(--success-light)' : 'transparent',
                                                padding: bal !== 0 ? '3px 8px' : '0',
                                                borderRadius: 'var(--radius-sm)',
                                            }}>
                                                {bal === 0 ? '—' : formatBalance(bal)}
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</div>
                                        )}
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>›</span>
                                </div>

                                {/* Admin actions row */}
                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingLeft: '52px' }}>
                                        <button
                                            className="btn btn-outline"
                                            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                                            onClick={(e) => { e.stopPropagation(); setOpeningBalanceFor({ id: c.id, name: c.name }); }}
                                        >
                                            {hasOB === undefined ? '⚡ Opening Bal' : hasOB ? '✏️ Edit Opening Bal' : '+ Set Opening Bal'}
                                        </button>
                                        <button
                                            className="btn btn-outline"
                                            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}/ledger`); }}
                                        >
                                            📒 Passbook
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {hasMore && customers.length > 0 && !loading && (
                        <button
                            className="btn btn-outline btn-full"
                            style={{ marginTop: '10px' }}
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? 'Loading...' : 'Load More Customers'}
                        </button>
                    )}
                </div>
            )}

            {openingBalanceFor && (
                <SetOpeningBalanceModal
                    customerId={openingBalanceFor.id}
                    customerName={openingBalanceFor.name}
                    onSuccess={() => handleOpeningBalanceSuccess(openingBalanceFor.id)}
                    onClose={() => setOpeningBalanceFor(null)}
                />
            )}
        </div>
    );
}
