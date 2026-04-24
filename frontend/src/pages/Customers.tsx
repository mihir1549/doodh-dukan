import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Search, Plus, X, Wallet,
    BookOpen, Users, CheckCircle2,
} from 'lucide-react';
import { customerApi, ledgerApi } from '../api';
import { useAuth } from '../AuthContext';
import { formatAddress } from '../utils/avatar';
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
        } finally {
            setSaving(false);
        }
    };

    const handleOpeningBalanceSuccess = (customerId: string) => {
        setOpeningBalanceFor(null);
        setOpeningFlags((prev) => ({ ...prev, [customerId]: true }));
        loadBalances([customerId]);
    };

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={16} strokeWidth={2} />
                    Home
                </button>
                <h1>Customers</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        minHeight: 'auto',
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                    }}
                >
                    {showForm ? (
                        <X size={14} strokeWidth={2.25} />
                    ) : (
                        <>
                            <Plus size={14} strokeWidth={2.25} />
                            Add
                        </>
                    )}
                </button>
            </div>

            {/* Search */}
            <div className="search-box">
                <span className="search-icon">
                    <Search size={16} strokeWidth={2} />
                </span>
                <input
                    placeholder="Search by name, phone, or #number…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Add customer inline form */}
            {showForm && (
                <div
                    className="card card-elevated"
                    style={{
                        marginBottom: 16,
                        borderColor: 'var(--border-brand)',
                        padding: 16,
                    }}
                >
                    <h3 style={{ marginBottom: 12, fontSize: '0.95rem', fontFamily: 'var(--font-display)' }}>
                        New Customer
                    </h3>
                    <div className="form-group">
                        <label>Name *</label>
                        <input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Customer name"
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Phone number"
                        />
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <input
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Address"
                        />
                    </div>
                    <button
                        className="btn btn-success btn-full"
                        onClick={handleSave}
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
                                Save Customer
                            </>
                        )}
                    </button>
                </div>
            )}

            {loading && customers.length === 0 ? (
                <div className="loading"><div className="spinner" /></div>
            ) : !loading && customers.length === 0 ? (
                <div className="empty-state">
                    <Users size={40} style={{ opacity: 0.4 }} />
                    <p style={{ marginTop: 8 }}>No customers yet</p>
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
                    {customers.map((c: any, idx: number) => {
                        const bal = balances[c.id];
                        const hasBal = bal !== undefined;
                        const balColor = !hasBal ? 'var(--text-muted)'
                            : bal > 0 ? 'var(--danger)'
                                : bal < 0 ? 'var(--success)'
                                    : 'var(--text-muted)';
                        const balBg = !hasBal ? 'transparent'
                            : bal > 0 ? 'var(--danger-bg)'
                                : bal < 0 ? 'var(--success-bg)'
                                    : 'transparent';
                        const hasOB = openingFlags[c.id];
                        const shortAddress = formatAddress(c.address, 32);
                        const isLast = idx === customers.length - 1;

                        return (
                            <div
                                key={c.id}
                                style={{
                                    padding: '14px 16px',
                                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                                }}
                            >
                                {/* Main row */}
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                                    onClick={() => navigate(`/customers/${c.id}`)}
                                >
                                    <div className="customer-id-badge">
                                        #{c.customer_number}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 600,
                                                fontSize: '0.98rem',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            {c.name}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.78rem',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            {c.phone || '—'}
                                        </div>
                                        {shortAddress && (
                                            <div
                                                style={{
                                                    fontSize: '0.76rem',
                                                    color: 'var(--text-muted)',
                                                    marginTop: 2,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {shortAddress}
                                            </div>
                                        )}
                                    </div>

                                    {/* Balance chip */}
                                    <div
                                        style={{ textAlign: 'right' }}
                                        onClick={(ev) => { ev.stopPropagation(); navigate(`/customers/${c.id}/ledger`); }}
                                    >
                                        {hasBal && bal !== 0 ? (
                                            <div
                                                style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontWeight: 500,
                                                    fontSize: '0.85rem',
                                                    color: balColor,
                                                    background: balBg,
                                                    padding: '3px 8px',
                                                    borderRadius: 'var(--radius-sm)',
                                                }}
                                            >
                                                {formatBalance(bal)}
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {hasBal ? '—' : ''}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                                </div>

                                {/* Admin action buttons */}
                                {isAdmin && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 6,
                                            marginTop: 10,
                                            paddingLeft: 52,
                                        }}
                                    >
                                        <button
                                            className="btn btn-outline"
                                            style={{
                                                fontSize: '0.74rem',
                                                padding: '5px 9px',
                                                minHeight: 'auto',
                                            }}
                                            onClick={(e) => { e.stopPropagation(); setOpeningBalanceFor({ id: c.id, name: c.name }); }}
                                        >
                                            <Wallet size={12} strokeWidth={2} />
                                            {hasOB ? 'Edit Opening' : 'Opening Bal'}
                                        </button>
                                        <button
                                            className="btn btn-outline"
                                            style={{
                                                fontSize: '0.74rem',
                                                padding: '5px 9px',
                                                minHeight: 'auto',
                                            }}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}/ledger`); }}
                                        >
                                            <BookOpen size={12} strokeWidth={2} />
                                            Passbook
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {hasMore && customers.length > 0 && !loading && (
                <button
                    className="btn btn-outline btn-full"
                    style={{ marginTop: 10 }}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                >
                    {loadingMore ? 'Loading…' : 'Load More Customers'}
                </button>
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
