import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../api';

export default function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadCustomers(); }, []);

    const loadCustomers = async (q = '') => {
        setLoading(true);
        try {
            const res = await customerApi.list(q, 1, 100);
            setCustomers(res.data?.data?.data || []);
        } catch { setCustomers([]); }
        finally { setLoading(false); }
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        loadCustomers(val);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return;
        setSaving(true);
        try {
            await customerApi.create(formData);
            setFormData({ name: '', phone: '', address: '', notes: '' });
            setShowForm(false);
            loadCustomers();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save');
        } finally { setSaving(false); }
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
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ paddingLeft: '44px' }}
                    />
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ whiteSpace: 'nowrap' }}>
                    {showForm ? '✕' : '+ Add'}
                </button>
            </div>

            {/* Add customer form */}
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

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : customers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <p>No customers yet</p>
                </div>
            ) : (
                customers.map((c: any) => (
                    <div
                        key={c.id}
                        className="customer-item"
                        onClick={() => navigate(`/customers/${c.id}`)}
                        style={{ borderBottom: '1px solid var(--border)' }}
                    >
                        <div className="customer-avatar">{c.customer_number || c.name?.charAt(0)?.toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                            <div className="customer-name">#{c.customer_number} · {c.name}</div>
                            {c.phone && <div className="customer-phone">{c.phone}</div>}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>›</span>
                    </div>
                ))
            )}
        </div>
    );
}
