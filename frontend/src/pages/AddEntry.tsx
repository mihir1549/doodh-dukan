import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi, productApi, entryApi } from '../api';

export default function AddEntry() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [qtyStr, setQtyStr] = useState('');  // for loose milk numpad
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [entrySlot, setEntrySlot] = useState<'MORNING' | 'EVENING' | 'EXTRA'>('MORNING');

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadCustomers();
        loadProducts();
    }, []);

    const loadCustomers = async (q = '') => {
        try {
            const res = await customerApi.list(q, 1, 50);
            setCustomers(res.data?.data?.data || []);
        } catch { setCustomers([]); }
    };

    const loadProducts = async () => {
        try {
            const res = await productApi.list();
            setProducts(res.data?.data || []);
        } catch { setProducts([]); }
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        loadCustomers(val);
    };



    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            await entryApi.create({
                customer_id: selectedCustomer.id,
                product_id: selectedProduct.id,
                entry_date: today,
                quantity,
                entry_slot: entrySlot,
            });
            setSuccess(true);
            setTimeout(() => navigate('/today'), 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    const lineTotal = selectedProduct
        ? (quantity * Number(selectedProduct.current_price || 0)).toFixed(2)
        : '0.00';

    if (success) {
        return (
            <div className="page" style={{ textAlign: 'center', paddingTop: '80px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
                <h2 style={{ color: 'var(--success)', marginBottom: '8px' }}>Entry Saved!</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Redirecting to today's entries...</p>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}>
                    ← {step > 1 ? 'Back' : 'Home'}
                </button>
                <h1>Add Entry</h1>
            </div>

            {/* Step indicators */}
            <div className="steps">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className={`step-dot ${s === step ? 'active' : s < step ? 'active' : ''}`} />
                ))}
            </div>

            {/* Step 1: Select Customer */}
            {step === 1 && (
                <div>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Select Customer</h3>
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            placeholder="Search by name, number or phone..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                    <div>
                        {customers.map((c) => (
                            <div
                                key={c.id}
                                className={`customer-item ${selectedCustomer?.id === c.id ? 'selected' : ''}`}
                                onClick={() => { setSelectedCustomer(c); setStep(2); }}
                            >
                                <div className="customer-avatar">{c.customer_number || c.name?.charAt(0)?.toUpperCase()}</div>
                                <div>
                                    <div className="customer-name">#{c.customer_number} · {c.name}</div>
                                    {c.phone && <div className="customer-phone">{c.phone}</div>}
                                </div>
                            </div>
                        ))}
                        {customers.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">👤</div>
                                <p>No customers found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 2: Select Product */}
            {step === 2 && (
                <div>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                        Select Product for {selectedCustomer?.name}
                    </h3>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        {['MORNING', 'EVENING', 'EXTRA'].map((slot) => (
                            <button
                                key={slot}
                                onClick={() => setEntrySlot(slot as any)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '2px solid',
                                    fontWeight: 600, fontSize: '0.85rem',
                                    borderColor: entrySlot === slot ? 'var(--accent)' : 'var(--border)',
                                    background: entrySlot === slot ? 'var(--accent)' : 'var(--bg-card)',
                                    color: entrySlot === slot ? '#white' : 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>
                    <div className="product-grid">
                        {products.map((p) => (
                            <div
                                key={p.id}
                                className={`product-card ${selectedProduct?.id === p.id ? 'selected' : ''}`}
                                onClick={() => { setSelectedProduct(p); setStep(3); }}
                            >
                                <div className="product-name">{p.name}</div>
                                <div className="product-price">
                                    ₹{Number(p.current_price || 0).toFixed(2)}
                                </div>
                                <div className="product-unit">per {p.unit}</div>
                            </div>
                        ))}
                    </div>
                    {products.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">📦</div>
                            <p>No products available</p>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Enter Quantity */}
            {step === 3 && (() => {
                const isPacket = selectedProduct?.unit?.toLowerCase() === 'packet';
                const price = Number(selectedProduct?.current_price || 0);

                if (isPacket) {
                    // PACKET: Simple tap grid (1-5)
                    return (
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                How many {selectedProduct?.name}?
                            </h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                                ₹{price.toFixed(2)} per packet
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '280px', margin: '0 auto' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setQuantity(n)}
                                        style={{
                                            padding: '20px', fontSize: '1.5rem', fontWeight: 800,
                                            borderRadius: 'var(--radius-md)', border: '2px solid',
                                            borderColor: quantity === n ? 'var(--accent)' : 'var(--border)',
                                            background: quantity === n ? 'var(--accent)' : 'var(--bg-card)',
                                            color: quantity === n ? '#fff' : 'var(--text-primary)',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginTop: '28px' }}>
                                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total</div>
                                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)' }}>
                                    ₹{(quantity * price).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {quantity} packet × ₹{price.toFixed(2)}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-full btn-lg"
                                style={{ marginTop: '24px' }}
                                onClick={() => setStep(4)}
                            >
                                Continue →
                            </button>
                        </div>
                    );
                }

                // LOOSE MILK / LITRE: Numpad dial
                const displayQty = qtyStr || '0';
                const numQty = parseFloat(qtyStr) || 0;

                const handleDial = (key: string) => {
                    setQtyStr((prev) => {
                        if (key === 'backspace') return prev.slice(0, -1);
                        if (key === '.' && prev.includes('.')) return prev; // only one dot
                        if (key === '.' && prev === '') return '0.'; // start with 0.
                        if (prev.length >= 5) return prev; // max 5 chars
                        return prev + key;
                    });
                };

                // Sync quantity state when moving to step 4
                const handleContinue = () => {
                    const val = parseFloat(qtyStr);
                    if (!val || val <= 0) return;
                    setQuantity(val);
                    setStep(4);
                };

                const dialBtnStyle = {
                    padding: '16px', fontSize: '1.4rem', fontWeight: 700 as const,
                    borderRadius: 'var(--radius-md)', border: '2px solid var(--border)',
                    background: 'var(--bg-card)', color: 'var(--text-primary)',
                    cursor: 'pointer', transition: 'all 0.1s',
                };

                return (
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                            How much {selectedProduct?.name}?
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                            ₹{price.toFixed(2)} per {selectedProduct?.unit}
                        </p>

                        {/* Display */}
                        <div style={{
                            fontSize: '3rem', fontWeight: 800, color: 'var(--accent)',
                            padding: '12px 20px', margin: '0 auto 8px', minHeight: '60px',
                            background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                            border: '2px solid var(--border)',
                        }}>
                            {displayQty} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)' }}>{selectedProduct?.unit}</span>
                        </div>

                        {/* Total */}
                        <div style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>
                                ₹{(numQty * price).toFixed(2)}
                            </span>
                        </div>

                        {/* Numpad */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleDial(key)}
                                    style={{
                                        ...dialBtnStyle,
                                        ...(key === 'backspace' ? { fontSize: '1.2rem' } : {}),
                                        ...(key === '.' ? { fontSize: '2rem', fontWeight: 900 } : {}),
                                    }}
                                >
                                    {key === 'backspace' ? '⌫' : key}
                                </button>
                            ))}
                        </div>

                        <button
                            className="btn btn-primary btn-full btn-lg"
                            style={{ marginTop: '20px' }}
                            onClick={handleContinue}
                            disabled={numQty <= 0}
                        >
                            Continue →
                        </button>
                    </div>
                );
            })()}

            {/* Step 4: Confirm */}
            {step === 4 && (
                <div>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Confirm Entry
                    </h3>

                    <div className="confirm-card">
                        <div className="confirm-row">
                            <span className="confirm-label">Customer</span>
                            <span className="confirm-value">#{selectedCustomer?.customer_number} · {selectedCustomer?.name}</span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Product</span>
                            <span className="confirm-value">{selectedProduct?.name}</span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Quantity</span>
                            <span className="confirm-value">{quantity} {selectedProduct?.unit}</span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Price</span>
                            <span className="confirm-value">₹{Number(selectedProduct?.current_price || 0).toFixed(2)}/{selectedProduct?.unit}</span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Date</span>
                            <span className="confirm-value">{today}</span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Slot</span>
                            <span className="confirm-value">{entrySlot}</span>
                        </div>
                        <div className="confirm-row" style={{ borderBottom: 'none' }}>
                            <span className="confirm-label" style={{ fontSize: '1.1rem' }}>Total</span>
                            <span className="confirm-value confirm-total">₹{lineTotal}</span>
                        </div>
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button
                        className="btn btn-success btn-full btn-lg"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? '⏳ Saving...' : '✅ Save Entry'}
                    </button>
                </div>
            )}
        </div>
    );
}
