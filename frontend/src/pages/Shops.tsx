import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi } from '../api';
import type { Tenant } from '../api';

export default function Shops() {
    const navigate = useNavigate();
    const [shops, setShops] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadShops();
    }, []);

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
            setShops(shops.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
        } catch (error) {
            alert('Failed to update shop status');
        }
    };

    const filteredShops = shops.filter(s =>
        s.shop_name.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.includes(search)
    );

    if (loading) return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
                <h1>🏢 Manage Shops</h1>
            </div>
            <div className="loading"><div className="spinner" /></div>
        </div>
    );

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
                <h1>🏢 Manage Shops</h1>
            </div>

            <div className="search-container" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="list-container">
                {filteredShops.map((shop) => (
                    <div key={shop.id} className="list-item" style={{ padding: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{shop.shop_name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📞 {shop.phone}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Registered: {new Date(shop.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className={`badge ${shop.is_active ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: '8px' }}>
                                {shop.is_active ? 'Active' : 'Inactive'}
                            </div>
                            <button
                                className={`back-btn ${shop.is_active ? 'btn-danger' : 'btn-success'}`}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'block' }}
                                onClick={() => handleToggleStatus(shop.id)}
                            >
                                {shop.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </div>
                ))}

                {filteredShops.length === 0 && (
                    <div className="empty-state">No shops found matching "{search}"</div>
                )}
            </div>

            <button
                className="add-fab"
                onClick={() => navigate('/register')}
                style={{ position: 'fixed', bottom: '24px', right: '24px' }}
            >
                ➕
            </button>
        </div>
    );
}
