import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactSortable } from 'react-sortablejs';
import { customerApi, productApi, entryApi } from '../api';

const SCROLL_CONTAINER_ID = 'customer-list-scroll-container';

export default function AddEntry() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [allCustomers, setAllCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [qtyStr, setQtyStr] = useState('');  // for loose milk numpad
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(100);
    const [entrySlot] = useState<'MORNING' | 'EVENING' | 'EXTRA'>('MORNING');
    const [showSaveToast, setShowSaveToast] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadProducts();
        loadAllCustomers();
    }, []);

    const loadAllCustomers = async () => {
        setLoading(true);
        try {
            const res = await customerApi.list('', 1, 10000); // Load all customers initially
            const newData = res.data?.data?.data || [];

            // Custom arrangement: load local storage sequence (v6 uses stable customer_number)
            let savedSeq: string[] = [];
            try {
                const raw = localStorage.getItem('myCustomerSequence_v6');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        savedSeq = parsed.map(String);
                    }
                }
            } catch (e) {
                savedSeq = [];
            }

            newData.sort((a: any, b: any) => {
                const valA = String(a.customer_number || '');
                const valB = String(b.customer_number || '');
                const indexA = savedSeq.indexOf(valA);
                const indexB = savedSeq.indexOf(valB);

                // If both are in the sequence, sort by their order in sequence
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only A is in sequence, A comes first
                if (indexA !== -1) return -1;
                // If only B is in sequence, B comes first
                if (indexB !== -1) return 1;
                // Otherwise keep their original order
                return 0;
            });

            setAllCustomers(newData);
        } catch {
            setAllCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleReorder = (newState: any[]) => {
        if (search) return; // don't save sequence if user is actively searching

        // Extract the stable customer numbers in their new order
        const newSequence = newState.map(c => String(c.customer_number || ''));
        localStorage.setItem('myCustomerSequence_v6', JSON.stringify(newSequence));

        // Reconstruct allCustomers: reordered slice followed by the rest
        const topNums = new Set(newSequence);
        const rest = allCustomers.filter(c => !topNums.has(String(c.customer_number || '')));
        setAllCustomers([...newState, ...rest]);

        // Show save feedback
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2000);
    };

    const resetOrder = () => {
        if (window.confirm("Restore default customer ordering?")) {
            localStorage.removeItem('myCustomerSequence_v6');
            loadAllCustomers();
        }
    };

    const handlePin = (customer: any) => {
        // Move this customer to the very top of the sequence
        const savedSeq: string[] = JSON.parse(localStorage.getItem('myCustomerSequence_v6') || '[]').map(String);
        const targetNum = String(customer.customer_number || '');
        const newSeq = [targetNum, ...savedSeq.filter((num: string) => num !== targetNum)];
        localStorage.setItem('myCustomerSequence_v6', JSON.stringify(newSeq));

        // Clear search to show the customer at the top
        setSearch('');
        setDisplayLimit(100);

        // Reload/Re-sort customers
        loadAllCustomers();

        // Show save feedback
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2000);

        // Scroll the container to top after pinning so user sees the result
        setTimeout(() => {
            const container = document.getElementById(SCROLL_CONTAINER_ID);
            if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    };

    const rawFiltered = allCustomers.filter(c => {
        if (!search) return true;
        const lowerSearch = search.toLowerCase();
        const nameMatch = c.name?.toLowerCase().includes(lowerSearch);
        const idMatch = c.customer_number?.toString().includes(lowerSearch);
        return nameMatch || idMatch;
    });

    const filteredCustomers = rawFiltered.slice(0, displayLimit);

    const loadProducts = async () => {
        try {
            const res = await productApi.list();
            setProducts(res.data?.data || []);
        } catch { setProducts([]); }
    };

    const handleSearch = (val: string) => {
        setSearch(val);
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

            {showSaveToast && <div className="save-toast">✨ Sequence Saved</div>}

            {/* Step indicators */}
            <div className="steps">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className={`step-dot ${s === step ? 'active' : s < step ? 'active' : ''}`} />
                ))}
            </div>

            {/* Step 1: Select Customer */}
            {step === 1 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ color: 'var(--text-secondary)' }}>Select Customer</h3>
                        <button
                            onClick={resetOrder}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                            🔄 Reset Order
                        </button>
                    </div>
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            placeholder="Search by name or ID..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                    <div
                        id={SCROLL_CONTAINER_ID}
                        style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}
                    >
                        <ReactSortable
                            list={filteredCustomers}
                            setList={handleReorder}
                            animation={150}
                            handle=".drag-handle"
                            disabled={search.length > 0}
                            scroll={true}
                            forceFallback={true}
                            scrollSensitivity={150} // high sensitivity for better scrolling
                            scrollSpeed={25}        // fast but controlled scroll
                            bubbleScroll={true}
                        >
                            {filteredCustomers.map((c) => (
                                <div
                                    key={c.id}
                                    className={`customer-item ${selectedCustomer?.id === c.id ? 'selected' : ''}`}
                                    onClick={() => { setSelectedCustomer(c); setStep(2); }}
                                    style={{ cursor: search ? 'pointer' : 'grab' }}
                                >
                                    <div className="customer-avatar">{c.customer_number || c.name?.charAt(0)?.toUpperCase()}</div>
                                    <div>
                                        <div className="customer-name">#{c.customer_number} · {c.name}</div>
                                        {c.phone && <div className="customer-phone">{c.phone}</div>}
                                    </div>

                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePin(c); }}
                                            title="Move to Top"
                                            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.6 }}
                                        >
                                            📌
                                        </button>
                                        {!search && (
                                            <div className="drag-handle" style={{ color: '#ccc', padding: '10px' }}>
                                                ☰
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </ReactSortable>

                        {rawFiltered.length > displayLimit && (
                            <button
                                onClick={() => setDisplayLimit(prev => prev + 100)}
                                className="btn btn-secondary btn-full"
                                style={{ marginTop: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border)' }}
                            >
                                Load More (+100) ... Total {rawFiltered.length}
                            </button>
                        )}

                        {loading && allCustomers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
                        )}
                        {!loading && filteredCustomers.length === 0 && (
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
