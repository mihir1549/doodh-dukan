import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactSortable } from 'react-sortablejs';
import { customerApi, productApi, entryApi } from '../api';
import { useAuth } from '../AuthContext';

const SCROLL_CONTAINER_ID = 'customer-list-scroll-container';

const getTodayDateValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getErrorMessage = (err: any) => {
    const message = err?.response?.data?.message;
    if (Array.isArray(message)) {
        return message.join(', ');
    }
    return message || 'Failed to save entry';
};

export default function AddEntry() {
    const navigate = useNavigate();
    const { user } = useAuth();
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
    const [successMessage, setSuccessMessage] = useState('');
    const [displayLimit, setDisplayLimit] = useState(100);
    const [entrySlot] = useState<'MORNING' | 'EVENING' | 'EXTRA'>('MORNING');
    const [showSaveToast, setShowSaveToast] = useState(false);
    const today = getTodayDateValue();
    const [entryDate, setEntryDate] = useState(today);
    const [duplicateState, setDuplicateState] = useState<null | {
        existingEntry: any;
        canForceCreate: boolean;
        canEditExisting: boolean;
        editMode: boolean;
        editQuantity: string;
    }>(null);

    const sourceLabel = user?.role === 'DELIVERY' ? 'DELIVERY' : 'SHOP';
    const isBackdated = entryDate < today;

    useEffect(() => {
        loadProducts();
        loadAllCustomers();
    }, []);

    const loadAllCustomers = async () => {
        setLoading(true);
        try {
            const res = await customerApi.list('', 1, 10000); // Load all customers initially
            const newData = res.data?.data?.data || [];
            console.log(`[AddEntry] Loaded ${newData.length} customers from API`);

            // Custom arrangement: load sequence from API response
            const responseData = res.data?.data;
            const savedSeq: string[] = responseData?.customer_sequence || []; // Now using UUIDs
            console.log(`[AddEntry] Sequence from API:`, savedSeq);

            newData.sort((a: any, b: any) => {
                const indexA = savedSeq.indexOf(a.id);
                const indexB = savedSeq.indexOf(b.id);

                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;

                // Fallback to numeric order if not in custom sequence
                return Number(a.customer_number || 0) - Number(b.customer_number || 0);
            });

            setAllCustomers(newData);
            hasLoadedRef.current = true;
        } catch {
            setAllCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-save debounced logic
    const saveTimerRef = useRef<any>(null);
    const hasLoadedRef = useRef(false);
    const [orderDirty, setOrderDirty] = useState(false);

    const triggerSave = (newList: any[]) => {
        const fullSequence = newList.map(c => c.id);
        console.log(`[AddEntry] SAVING sequence: ${fullSequence.length} IDs to backend.`);

        customerApi.saveSequence(fullSequence)
            .then((res) => {
                console.log("[AddEntry] SAVE successful. Response:", res.data);
                setShowSaveToast(true);
                setOrderDirty(false);
                setTimeout(() => setShowSaveToast(false), 2000);
            })
            .catch(err => {
                console.error("[AddEntry] SAVE failed:", err);
                setError("Failed to save order to server");
            });
    };

    const handleReorder = (newState: any[]) => {
        // GUARDS to prevent accidental data loss:
        if (search) return; // don't save sequence if user is actively searching
        if (!hasLoadedRef.current) return; // don't save if we haven't even finished the initial load
        if (allCustomers.length > 0 && newState.length === 0) {
            console.warn("[AddEntry] Guarded against saving empty sequence while customers exist.");
            return;
        }

        // 1. Synchronously update the state for instant UI feedback
        const sliceIds = new Set(newState.map(c => c.id));
        const rest = allCustomers.filter(c => !sliceIds.has(c.id));
        const fullNewList = [...newState, ...rest];

        setAllCustomers(fullNewList);

        // 2. Debounced backend update of the FULL sequence
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => triggerSave(fullNewList), 1500);
    };

    const resetOrder = async () => {
        if (window.confirm("Restore default customer ordering?")) {
            try {
                await customerApi.saveSequence([]);
                // Small delay to let DB update finish before reload
                setTimeout(() => loadAllCustomers(), 300);
            } catch (err) {
                setError("Failed to reset order");
            }
        }
    };

    const handlePin = async (customer: any) => {
        // Move this customer to the very top of the sequence
        const currentOrder = allCustomers.slice(0, displayLimit);
        const newSeq = [customer, ...currentOrder.filter(c => c.id !== customer.id)];

        const rest = allCustomers.filter(c => !newSeq.find(s => s.id === c.id));
        const fullNewList = [...newSeq, ...rest];

        setAllCustomers(fullNewList);
        setOrderDirty(true);
        triggerSave(fullNewList);

        // Scroll top
        setTimeout(() => {
            const container = document.getElementById(SCROLL_CONTAINER_ID);
            if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
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

    const handleDateChange = (value: string) => {
        const nextDate = value && value <= today ? value : today;
        setEntryDate(nextDate);
        setDuplicateState(null);
        setError('');
    };

    const handleSubmit = async (options?: { forceCreate?: boolean }) => {
        setLoading(true);
        setError('');
        try {
            await entryApi.create({
                customer_id: selectedCustomer.id,
                product_id: selectedProduct.id,
                entry_date: entryDate,
                quantity,
                entry_slot: entrySlot,
                force_create: options?.forceCreate,
            });
            setDuplicateState(null);
            setSuccessMessage(
                isBackdated
                    ? `Backdated entry saved for ${entryDate}.`
                    : 'Entry saved for today.',
            );
            setTimeout(() => navigate(isBackdated ? '/' : '/today'), 1500);
        } catch (err: any) {
            if (err.response?.status === 409 && err.response?.data?.code === 'DUPLICATE_ENTRY') {
                setDuplicateState({
                    existingEntry: err.response.data.duplicate,
                    canForceCreate: Boolean(err.response.data.actions?.can_force_create),
                    canEditExisting: Boolean(err.response.data.actions?.can_edit_existing),
                    editMode: false,
                    editQuantity: String(quantity),
                });
            } else {
                setError(getErrorMessage(err));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDuplicate = async () => {
        if (!duplicateState) return;

        setLoading(true);
        setError('');
        try {
            await entryApi.update(duplicateState.existingEntry.id, {
                quantity: Number(duplicateState.editQuantity),
            });
            setDuplicateState(null);
            setSuccessMessage(`Existing entry updated for ${entryDate}.`);
            setTimeout(() => navigate(isBackdated ? '/' : '/today'), 1500);
        } catch (err: any) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const lineTotal = selectedProduct
        ? (quantity * Number(selectedProduct.current_price || 0)).toFixed(2)
        : '0.00';

    if (successMessage) {
        return (
            <div className="page" style={{ textAlign: 'center', paddingTop: '80px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
                <h2 style={{ color: 'var(--success)', marginBottom: '8px' }}>Entry Saved!</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{successMessage}</p>
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

            {showSaveToast && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--success)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 9999,
                    pointerEvents: 'none',
                }}>
                    ✨ Sequence Saved
                </div>
            )}

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
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {orderDirty && (
                                <button
                                    onClick={() => triggerSave(allCustomers)}
                                    style={{
                                        background: 'var(--success)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    💾 Save Order
                                </button>
                            )}
                            <button
                                onClick={resetOrder}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                🔄 Reset Order
                            </button>
                        </div>
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
                            animation={250}
                            handle=".drag-handle"
                            disabled={search.length > 0}
                            scroll={true}
                            forceFallback={true}
                            ghostClass="sortable-ghost"
                            chosenClass="sortable-chosen"
                            dragClass="sortable-drag"
                            fallbackClass="sortable-drag"
                            scrollSensitivity={80}
                            scrollSpeed={10}
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
                            <span className="confirm-value">
                                <input
                                    type="date"
                                    value={entryDate}
                                    max={today}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-page)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.95rem',
                                        minWidth: '150px',
                                    }}
                                />
                            </span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Source</span>
                            <span className="confirm-value">{sourceLabel}</span>
                        </div>
                        <div className="confirm-row" style={{ borderBottom: 'none' }}>
                            <span className="confirm-label" style={{ fontSize: '1.1rem' }}>Total</span>
                            <span className="confirm-value confirm-total">₹{lineTotal}</span>
                        </div>
                    </div>

                    {isBackdated && (
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                color: '#92400e',
                                fontSize: '0.92rem',
                                fontWeight: 600,
                            }}
                        >
                            You are adding an entry for a previous date.
                        </div>
                    )}

                    {error && <div className="error-msg">{error}</div>}

                    <button
                        className="btn btn-success btn-full btn-lg"
                        onClick={() => handleSubmit()}
                        disabled={loading}
                    >
                        {loading ? '⏳ Saving...' : '✅ Save Entry'}
                    </button>
                </div>
            )}

            {duplicateState && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        zIndex: 1000,
                    }}
                    onClick={() => setDuplicateState(null)}
                >
                    <div
                        className="card"
                        style={{ width: '100%', maxWidth: '420px', padding: '24px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginBottom: '12px' }}>Duplicate Entry Found</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.92rem' }}>
                            A matching entry already exists for this customer, product, date, and source.
                        </p>

                        <div
                            style={{
                                background: 'var(--bg-page)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '12px',
                                marginBottom: '16px',
                                fontSize: '0.92rem',
                            }}
                        >
                            <div>Existing quantity: {duplicateState.existingEntry.quantity} {selectedProduct?.unit}</div>
                            <div>Date: {duplicateState.existingEntry.entry_date}</div>
                            <div>Source: {duplicateState.existingEntry.source}</div>
                        </div>

                        {!duplicateState.editMode ? (
                            <>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    <button
                                        className="btn btn-outline btn-full"
                                        onClick={() => setDuplicateState(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={() =>
                                            setDuplicateState((current) =>
                                                current
                                                    ? { ...current, editMode: true }
                                                    : current,
                                            )
                                        }
                                        disabled={!duplicateState.canEditExisting}
                                    >
                                        Edit Existing Entry
                                    </button>
                                    <button
                                        className="btn btn-success btn-full"
                                        onClick={() => handleSubmit({ forceCreate: true })}
                                        disabled={loading || !duplicateState.canForceCreate}
                                    >
                                        Create Anyway
                                    </button>
                                </div>

                                {!duplicateState.canEditExisting && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '12px' }}>
                                        This entry can only be edited by the user who originally created it.
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Updated quantity</label>
                                    <input
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={duplicateState.editQuantity}
                                        onChange={(e) =>
                                            setDuplicateState((current) =>
                                                current
                                                    ? { ...current, editQuantity: e.target.value }
                                                    : current,
                                            )
                                        }
                                    />
                                </div>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    <button
                                        className="btn btn-success btn-full"
                                        onClick={handleUpdateDuplicate}
                                        disabled={loading || Number(duplicateState.editQuantity) <= 0}
                                    >
                                        Save Existing Entry
                                    </button>
                                    <button
                                        className="btn btn-outline btn-full"
                                        onClick={() =>
                                            setDuplicateState((current) =>
                                                current
                                                    ? { ...current, editMode: false }
                                                    : current,
                                            )
                                        }
                                    >
                                        Back
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
