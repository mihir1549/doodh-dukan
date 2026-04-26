import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Package, Users as UsersIcon, Plus, X,
    CheckCircle2, Droplets, UserX, Trash2, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi, userApi } from '../api';

export default function Settings() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<'products' | 'users'>('products');
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showProductForm, setShowProductForm] = useState(false);
    const [productForm, setProductForm] = useState({
        name: '', category: 'LOOSE_MILK', unit: 'litre', initial_price: 0,
    });

    const [showUserForm, setShowUserForm] = useState(false);
    const [userForm, setUserForm] = useState({
        name: '', phone: '', pin: '', role: 'DELIVERY',
    });

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
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const saveProduct = async () => {
        if (!productForm.name || !productForm.initial_price) return;
        try {
            await productApi.create({
                ...productForm,
                initial_price: Number(productForm.initial_price),
            });
            toast.success('Product saved');
            setShowProductForm(false);
            setProductForm({ name: '', category: 'LOOSE_MILK', unit: 'litre', initial_price: 0 });
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save product');
        }
    };

    const updatePrice = async (productId: string) => {
        if (!newPrice) return;
        try {
            await productApi.setPrice(productId, { price_per_unit: Number(newPrice) });
            toast.success('Price updated');
            setPriceProductId(null);
            setNewPrice(0);
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update price');
        }
    };

    const saveUser = async () => {
        if (!userForm.name || !userForm.phone || !userForm.pin) return;
        try {
            await userApi.create(userForm);
            toast.success('Staff added');
            setShowUserForm(false);
            setUserForm({ name: '', phone: '', pin: '', role: 'DELIVERY' });
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to add staff');
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={16} strokeWidth={2} />
                    Home
                </button>
                <h1>Settings</h1>
                <div style={{ width: 80 }} />
            </div>

            {/* Tabs */}
            <div
                style={{
                    display: 'flex',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    padding: 4,
                    marginBottom: 20,
                    gap: 4,
                }}
            >
                {([
                    { val: 'products' as const, label: 'Products', Icon: Package },
                    { val: 'users' as const, label: 'Staff', Icon: UsersIcon },
                ]).map(({ val, label, Icon }) => {
                    const active = tab === val;
                    return (
                        <button
                            key={val}
                            onClick={() => setTab(val)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                background: active ? 'var(--brand-primary)' : 'transparent',
                                color: active ? '#fff' : 'var(--text-secondary)',
                                fontWeight: active ? 700 : 500,
                                fontFamily: 'var(--font-display)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Icon size={16} strokeWidth={2} />
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* PRODUCTS TAB */}
            {tab === 'products' && (
                <>
                    <button
                        className="btn btn-primary btn-full"
                        onClick={() => setShowProductForm(!showProductForm)}
                        style={{ marginBottom: 16 }}
                    >
                        {showProductForm ? (
                            <>
                                <X size={16} strokeWidth={2} />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Plus size={16} strokeWidth={2} />
                                Add Product
                            </>
                        )}
                    </button>

                    {showProductForm && (
                        <div
                            className="card card-elevated"
                            style={{ borderColor: 'var(--border-brand)', marginBottom: 16 }}
                        >
                            <div className="form-group">
                                <label>Product Name *</label>
                                <input
                                    value={productForm.name}
                                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                    placeholder="e.g. Loose Milk"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={productForm.category}
                                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                                    >
                                        <option value="LOOSE_MILK">Loose Milk</option>
                                        <option value="PACKAGED_MILK">Packaged Milk</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select
                                        value={productForm.unit}
                                        onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                                    >
                                        <option value="litre">Litre</option>
                                        <option value="packet">Packet</option>
                                        <option value="kg">KG</option>
                                        <option value="piece">Piece</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Initial Price (₹) *</label>
                                <input
                                    type="number"
                                    value={productForm.initial_price || ''}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, initial_price: Number(e.target.value) })
                                    }
                                    placeholder="e.g. 68"
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                />
                            </div>
                            <button className="btn btn-success btn-full" onClick={saveProduct}>
                                <CheckCircle2 size={16} strokeWidth={2} />
                                Save Product
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : products.length === 0 ? (
                        <div className="empty-state">
                            <Package size={40} style={{ opacity: 0.4 }} />
                            <p style={{ marginTop: 8 }}>No products yet</p>
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
                            {products.map((p: any, idx: number) => {
                                const isLoose =
                                    p.category === 'LOOSE_MILK' ||
                                    (p.name || '').toLowerCase().includes('loose');
                                const isLast = idx === products.length - 1;
                                return (
                                    <div
                                        key={p.id}
                                        style={{
                                            padding: '14px 16px',
                                            borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 10,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    flex: 1,
                                                    minWidth: 0,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--brand-primary-glow)',
                                                        color: 'var(--brand-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {isLoose ? (
                                                        <Droplets size={18} strokeWidth={1.75} />
                                                    ) : (
                                                        <Package size={18} strokeWidth={1.75} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontFamily: 'var(--font-display)',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {p.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.76rem',
                                                            color: 'var(--text-muted)',
                                                            fontFamily: 'var(--font-mono)',
                                                        }}
                                                    >
                                                        {p.category} · per {p.unit}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div
                                                    className="amount-medium amount-positive"
                                                    style={{ fontWeight: 500 }}
                                                >
                                                    ₹{Number(p.current_price || 0).toFixed(2)}
                                                </div>
                                                <button
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--brand-primary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.76rem',
                                                        fontWeight: 600,
                                                        marginTop: 2,
                                                        padding: 0,
                                                        minHeight: 'auto',
                                                    }}
                                                    onClick={() =>
                                                        setPriceProductId(priceProductId === p.id ? null : p.id)
                                                    }
                                                >
                                                    <Pencil size={11} />
                                                    Update Price
                                                </button>
                                            </div>
                                        </div>
                                        {priceProductId === p.id && (
                                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                <input
                                                    type="number"
                                                    value={newPrice || ''}
                                                    onChange={(e) => setNewPrice(Number(e.target.value))}
                                                    placeholder="New price"
                                                    style={{
                                                        flex: 1,
                                                        fontFamily: 'var(--font-mono)',
                                                    }}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => updatePrice(p.id)}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* USERS TAB */}
            {tab === 'users' && (
                <>
                    <button
                        className="btn btn-primary btn-full"
                        onClick={() => setShowUserForm(!showUserForm)}
                        style={{ marginBottom: 16 }}
                    >
                        {showUserForm ? (
                            <>
                                <X size={16} strokeWidth={2} />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Plus size={16} strokeWidth={2} />
                                Add Staff
                            </>
                        )}
                    </button>

                    {showUserForm && (
                        <div
                            className="card card-elevated"
                            style={{ borderColor: 'var(--border-brand)', marginBottom: 16 }}
                        >
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    value={userForm.name}
                                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                    placeholder="Staff name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone *</label>
                                <input
                                    value={userForm.phone}
                                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                                    placeholder="Phone number"
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>6-digit PIN *</label>
                                <input
                                    value={userForm.pin}
                                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })}
                                    placeholder="123456"
                                    maxLength={6}
                                    style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={userForm.role}
                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                >
                                    <option value="DELIVERY">Delivery Person</option>
                                    <option value="SHOP_STAFF">Shop Staff</option>
                                </select>
                            </div>
                            <button className="btn btn-success btn-full" onClick={saveUser}>
                                <CheckCircle2 size={16} strokeWidth={2} />
                                Save Staff
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : users.length === 0 ? (
                        <div className="empty-state">
                            <UserX size={40} style={{ opacity: 0.4 }} />
                            <p style={{ marginTop: 8 }}>No staff members yet</p>
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
                            {users.map((u: any, idx: number) => {
                                const isLast = idx === users.length - 1;
                                return (
                                    <div
                                        key={u.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                                            gap: 10,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontFamily: 'var(--font-display)',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {u.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: '0.78rem',
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                {u.phone}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="badge badge-info">{u.role}</span>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm(`Deactivate ${u.name}?`)) {
                                                        try {
                                                            await userApi.deactivate(u.id);
                                                            toast.success('Staff deactivated');
                                                            loadData();
                                                        } catch (err: any) {
                                                            toast.error(err.response?.data?.message || 'Failed to deactivate');
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    background: 'var(--danger-bg)',
                                                    border: 'none',
                                                    color: 'var(--danger)',
                                                    width: 36,
                                                    height: 36,
                                                    minHeight: 36,
                                                    padding: 0,
                                                    borderRadius: 'var(--radius-sm)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                                aria-label="Deactivate"
                                                title="Deactivate"
                                            >
                                                <Trash2 size={14} strokeWidth={1.75} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
