import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Search, Plus, Building2, Phone, Calendar,
    PowerOff, Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tenantApi } from '../api';
import type { Tenant } from '../api';

export default function Shops() {
    const navigate = useNavigate();
    const [shops, setShops] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { loadShops(); }, []);

    const loadShops = async () => {
        setLoading(true);
        try {
            const res = await tenantApi.list();
            setShops(res.data.data || []);
        } catch (error) {
            console.error('Failed to load shops:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string) => {
        try {
            await tenantApi.toggleStatus(id);
            const updated = shops.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s));
            setShops(updated);
            const shop = updated.find((s) => s.id === id);
            toast.success(`${shop?.shop_name ?? 'Shop'} ${shop?.is_active ? 'activated' : 'deactivated'}`);
        } catch {
            toast.error('Failed to update shop status');
        }
    };

    const filteredShops = shops.filter(
        (s) =>
            s.shop_name.toLowerCase().includes(search.toLowerCase()) ||
            s.phone.includes(search),
    );

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={16} strokeWidth={2} />
                    Back
                </button>
                <h1>Shops</h1>
                <div style={{ width: 72 }} />
            </div>

            {/* Search */}
            <div className="search-box">
                <span className="search-icon">
                    <Search size={16} strokeWidth={2} />
                </span>
                <input
                    type="text"
                    placeholder="Search by name or phone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : filteredShops.length === 0 ? (
                <div className="empty-state">
                    <Building2 size={40} style={{ opacity: 0.4 }} />
                    <p style={{ marginTop: 8 }}>
                        {search ? `No shops matching "${search}"` : 'No shops yet'}
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
                    {filteredShops.map((shop, idx) => {
                        const isLast = idx === filteredShops.length - 1;
                        return (
                            <div
                                key={shop.id}
                                style={{
                                    padding: '14px 16px',
                                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                    }}
                                >
                                    <div className="customer-id-badge">
                                        <Building2 size={18} strokeWidth={1.75} />
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
                                            {shop.shop_name}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginTop: 2,
                                                fontSize: '0.76rem',
                                                color: 'var(--text-secondary)',
                                                fontFamily: 'var(--font-mono)',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <Phone size={11} strokeWidth={2} />
                                                {shop.phone}
                                            </span>
                                            <span>·</span>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <Calendar size={11} strokeWidth={2} />
                                                {new Date(shop.created_at).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={shop.is_active ? 'badge badge-success' : 'badge badge-muted'}>
                                        {shop.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <button
                                    className={shop.is_active ? 'btn btn-danger' : 'btn btn-success'}
                                    style={{
                                        marginTop: 10,
                                        marginLeft: 52,
                                        fontSize: '0.76rem',
                                        padding: '5px 10px',
                                        minHeight: 'auto',
                                    }}
                                    onClick={() => handleToggleStatus(shop.id)}
                                >
                                    {shop.is_active ? (
                                        <>
                                            <PowerOff size={12} strokeWidth={2} />
                                            Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <Power size={12} strokeWidth={2} />
                                            Activate
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floating action button */}
            <button
                className="fab"
                onClick={() => navigate('/register')}
                aria-label="Register new shop"
                title="Register new shop"
            >
                <Plus size={24} strokeWidth={2.25} />
            </button>
        </div>
    );
}
