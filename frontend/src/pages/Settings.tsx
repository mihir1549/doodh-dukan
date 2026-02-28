import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi, userApi } from '../api';

export default function Settings() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<'products' | 'users'>('products');
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Product form
    const [showProductForm, setShowProductForm] = useState(false);
    const [productForm, setProductForm] = useState({
        name: '', category: 'LOOSE_MILK', unit: 'litre', initial_price: 0,
    });

    // User form
    const [showUserForm, setShowUserForm] = useState(false);
    const [userForm, setUserForm] = useState({
        name: '', phone: '', pin: '', role: 'DELIVERY',
    });

    // Price update
    const [priceProductId, setPriceProductId] = useState<string | null>(null);
    const [newPrice, setNewPrice] = useState(0);

    useEffect(() => { loadData(); }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'products') {
                const res = await productApi.list();
                setProducts(res.data?.data || []);
            } else {
                const res = await userApi.list();
                setUsers(res.data?.data || []);
            }
        } catch { }
        finally { setLoading(false); }
    };

    const saveProduct = async () => {
        if (!productForm.name || !productForm.initial_price) return;
        try {
            await productApi.create({
                ...productForm,
                initial_price: Number(productForm.initial_price),
            });
            setShowProductForm(false);
            setProductForm({ name: '', category: 'LOOSE_MILK', unit: 'litre', initial_price: 0 });
            loadData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    const updatePrice = async (productId: string) => {
        if (!newPrice) return;
        try {
            await productApi.setPrice(productId, { price_per_unit: Number(newPrice) });
            setPriceProductId(null);
            setNewPrice(0);
            loadData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    const saveUser = async () => {
        if (!userForm.name || !userForm.phone || !userForm.pin) return;
        try {
            await userApi.create(userForm);
            setShowUserForm(false);
            setUserForm({ name: '', phone: '', pin: '', role: 'DELIVERY' });
            loadData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
                <h1>Settings</h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                    className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => setTab('products')}
                >
                    📦 Products
                </button>
                <button
                    className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => setTab('users')}
                >
                    👥 Users
                </button>
            </div>

            {/* PRODUCTS TAB */}
            {tab === 'products' && (
                <>
                    <button className="btn btn-success btn-full" onClick={() => setShowProductForm(!showProductForm)} style={{ marginBottom: '16px' }}>
                        {showProductForm ? '✕ Cancel' : '+ Add Product'}
                    </button>

                    {showProductForm && (
                        <div className="card" style={{ border: '2px solid var(--accent)', marginBottom: '16px' }}>
                            <div className="form-group">
                                <label>Product Name *</label>
                                <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. Loose Milk" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                                        <option value="LOOSE_MILK">Loose Milk</option>
                                        <option value="PACKAGED_MILK">Packaged Milk</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}>
                                        <option value="litre">Litre</option>
                                        <option value="packet">Packet</option>
                                        <option value="kg">KG</option>
                                        <option value="piece">Piece</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Initial Price (₹) *</label>
                                <input type="number" value={productForm.initial_price || ''} onChange={(e) => setProductForm({ ...productForm, initial_price: Number(e.target.value) })} placeholder="e.g. 68" />
                            </div>
                            <button className="btn btn-primary btn-full" onClick={saveProduct}>Save Product</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : (
                        products.map((p: any) => (
                            <div key={p.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.category} · {p.unit}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--success)' }}>₹{Number(p.current_price || 0).toFixed(2)}</div>
                                        <button
                                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem' }}
                                            onClick={() => setPriceProductId(priceProductId === p.id ? null : p.id)}
                                        >
                                            Update Price
                                        </button>
                                    </div>
                                </div>
                                {priceProductId === p.id && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <input type="number" value={newPrice || ''} onChange={(e) => setNewPrice(Number(e.target.value))} placeholder="New price" style={{ flex: 1 }} />
                                        <button className="btn btn-primary" onClick={() => updatePrice(p.id)}>Save</button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </>
            )}

            {/* USERS TAB */}
            {tab === 'users' && (
                <>
                    <button className="btn btn-success btn-full" onClick={() => setShowUserForm(!showUserForm)} style={{ marginBottom: '16px' }}>
                        {showUserForm ? '✕ Cancel' : '+ Add Staff'}
                    </button>

                    {showUserForm && (
                        <div className="card" style={{ border: '2px solid var(--accent)', marginBottom: '16px' }}>
                            <div className="form-group">
                                <label>Name *</label>
                                <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Staff name" />
                            </div>
                            <div className="form-group">
                                <label>Phone *</label>
                                <input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="Phone number" />
                            </div>
                            <div className="form-group">
                                <label>6-digit PIN *</label>
                                <input value={userForm.pin} onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })} placeholder="123456" maxLength={6} />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="DELIVERY">Delivery Person</option>
                                    <option value="SHOP_STAFF">Shop Staff</option>
                                </select>
                            </div>
                            <button className="btn btn-primary btn-full" onClick={saveUser}>Save Staff</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : users.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">👤</div>
                            <p>No staff members yet</p>
                        </div>
                    ) : (
                        users.map((u: any) => (
                            <div key={u.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{u.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.phone}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="badge badge-role">{u.role}</span>
                                        <button
                                            style={{ background: 'var(--danger-light)', border: 'none', color: 'var(--danger)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                                            onClick={async () => {
                                                if (window.confirm(`Deactivate ${u.name}?`)) {
                                                    await userApi.deactivate(u.id);
                                                    loadData();
                                                }
                                            }}
                                        >
                                            Deactivate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </>
            )}
        </div>
    );
}
