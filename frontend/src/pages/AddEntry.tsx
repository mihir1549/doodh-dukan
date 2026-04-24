import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactSortable } from 'react-sortablejs';
import {
    ChevronLeft, Search, RotateCcw, GripVertical,
    CheckCircle2, ArrowRight, Delete, Droplets, Package,
    AlertTriangle, Save, X, Users, Calendar, Pencil,
} from 'lucide-react';
import { customerApi, productApi, entryApi } from '../api';
import { useAuth } from '../AuthContext';
import { formatAddress, idBadgeFontSize } from '../utils/avatar';

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
    if (Array.isArray(message)) return message.join(', ');
    return message || 'Failed to save entry';
};

const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
    const [qtyStr, setQtyStr] = useState('');
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

    const saveTimerRef = useRef<any>(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        loadProducts();
        loadAllCustomers();
    }, []);

    const loadAllCustomers = async () => {
        setLoading(true);
        try {
            const res = await customerApi.list('', 1, 10000);
            const newData = res.data?.data?.data || [];
            const responseData = res.data?.data;
            const savedSeq: string[] = responseData?.customer_sequence || [];

            newData.sort((a: any, b: any) => {
                const indexA = savedSeq.indexOf(a.id);
                const indexB = savedSeq.indexOf(b.id);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
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

    const [orderDirty, setOrderDirty] = useState(false);

    const triggerSave = (newList: any[]) => {
        const fullSequence = newList.map((c) => c.id);
        customerApi.saveSequence(fullSequence)
            .then(() => {
                setShowSaveToast(true);
                setOrderDirty(false);
                setTimeout(() => setShowSaveToast(false), 2000);
            })
            .catch(() => {
                setError('Failed to save order to server');
            });
    };

    const handleReorder = (newState: any[]) => {
        if (search) return;
        if (!hasLoadedRef.current) return;
        if (allCustomers.length > 0 && newState.length === 0) return;

        const sliceIds = new Set(newState.map((c) => c.id));
        const rest = allCustomers.filter((c) => !sliceIds.has(c.id));
        const fullNewList = [...newState, ...rest];

        setAllCustomers(fullNewList);
        setOrderDirty(true);

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => triggerSave(fullNewList), 1500);
    };

    const resetOrder = async () => {
        if (window.confirm('Restore default customer ordering?')) {
            try {
                await customerApi.saveSequence([]);
                setTimeout(() => loadAllCustomers(), 300);
            } catch {
                setError('Failed to reset order');
            }
        }
    };

    const rawFiltered = allCustomers.filter((c) => {
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
        } catch {
            setProducts([]);
        }
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

    // ── Success screen ──────────────────────────────────────────────────
    if (successMessage) {
        return (
            <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}
                >
                    <CheckCircle2 size={40} strokeWidth={1.75} />
                </div>
                <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>Entry Saved</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{successMessage}</p>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <button
                    className="back-btn"
                    onClick={() => (step > 1 ? setStep(step - 1) : navigate('/'))}
                >
                    <ChevronLeft size={16} strokeWidth={2} />
                    {step > 1 ? 'Back' : 'Home'}
                </button>
                <h1>Add Entry</h1>
                <div style={{ width: 78 }} />
            </div>

            {/* Sequence-saved toast */}
            {showSaveToast && (
                <div
                    className="toast toast-success"
                    style={{ top: 20, bottom: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <CheckCircle2 size={16} />
                    Sequence saved
                </div>
            )}

            {/* Step pills */}
            <div className="steps">
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`step-dot ${s <= step ? 'active' : ''}`}
                    />
                ))}
            </div>

            {/* ── Step 1: Select Customer ─────────────────────────── */}
            {step === 1 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                            Select Customer
                        </h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {orderDirty && (
                                <button
                                    onClick={() => triggerSave(allCustomers)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: 'var(--success)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px 10px',
                                        borderRadius: 999,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    <Save size={12} />
                                    Save Order
                                </button>
                            )}
                            <button
                                onClick={resetOrder}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--brand-primary)',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                <RotateCcw size={12} />
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="search-box">
                        <span className="search-icon">
                            <Search size={16} strokeWidth={2} />
                        </span>
                        <input
                            placeholder="Search by name or ID…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div
                        id={SCROLL_CONTAINER_ID}
                        style={{
                            maxHeight: '62vh',
                            overflowY: 'auto',
                            paddingRight: 4,
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-lg)',
                        }}
                    >
                        <ReactSortable
                            list={filteredCustomers}
                            setList={handleReorder}
                            animation={250}
                            handle=".drag-handle"
                            disabled={search.length > 0}
                            scroll
                            forceFallback
                            ghostClass="sortable-ghost"
                            chosenClass="sortable-chosen"
                            dragClass="sortable-drag"
                            fallbackClass="sortable-drag"
                            scrollSensitivity={80}
                            scrollSpeed={10}
                            bubbleScroll
                        >
                            {filteredCustomers.map((c) => {
                                const shortAddress = formatAddress(c.address, 30);
                                return (
                                    <div
                                        key={c.id}
                                        className={`customer-item ${selectedCustomer?.id === c.id ? 'selected' : ''}`}
                                        onClick={() => { setSelectedCustomer(c); setStep(2); }}
                                        style={{
                                            cursor: search ? 'pointer' : 'grab',
                                            borderRadius: 0,
                                            borderBottom: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div
                                            className="customer-id-badge"
                                            style={{ fontSize: idBadgeFontSize(c.customer_number) }}
                                        >
                                            {c.customer_number}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="customer-name" style={{ marginBottom: 2 }}>
                                                {c.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: '0.78rem',
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                #{c.customer_number}
                                                {c.phone ? ` · ${c.phone}` : ''}
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

                                        {!search && (
                                            <div
                                                className="drag-handle"
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    padding: 10,
                                                    cursor: 'grab',
                                                    display: 'flex',
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <GripVertical size={18} strokeWidth={1.75} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </ReactSortable>

                        {rawFiltered.length > displayLimit && (
                            <button
                                onClick={() => setDisplayLimit((prev) => prev + 100)}
                                className="btn btn-outline btn-full"
                                style={{
                                    margin: 10,
                                    width: 'calc(100% - 20px)',
                                    borderStyle: 'dashed',
                                }}
                            >
                                Load More (+100) · {rawFiltered.length} total
                            </button>
                        )}

                        {loading && allCustomers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                                Loading…
                            </div>
                        )}
                        {!loading && filteredCustomers.length === 0 && (
                            <div className="empty-state">
                                <Users size={40} style={{ opacity: 0.4 }} />
                                <p style={{ marginTop: 8 }}>No customers found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Step 2: Select Product ──────────────────────────── */}
            {step === 2 && (
                <div>
                    <h3
                        style={{
                            marginBottom: 14,
                            color: 'var(--text-secondary)',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                        }}
                    >
                        Select Product for {selectedCustomer?.name}
                    </h3>

                    <div className="product-grid">
                        {products.map((p) => {
                            const isLoose =
                                p.category === 'LOOSE_MILK' ||
                                (p.name || '').toLowerCase().includes('loose') ||
                                (p.unit || '').toLowerCase().includes('litre');
                            const isSelected = selectedProduct?.id === p.id;
                            return (
                                <div
                                    key={p.id}
                                    className={`product-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => { setSelectedProduct(p); setStep(3); setQtyStr(''); }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            marginBottom: 8,
                                            color: 'var(--brand-primary)',
                                        }}
                                    >
                                        {isLoose ? (
                                            <Droplets size={28} strokeWidth={1.75} />
                                        ) : (
                                            <Package size={28} strokeWidth={1.75} />
                                        )}
                                    </div>
                                    <div className="product-name">{p.name}</div>
                                    <div className="product-price">
                                        ₹{Number(p.current_price || 0).toFixed(2)}
                                    </div>
                                    <div className="product-unit">per {p.unit}</div>
                                </div>
                            );
                        })}
                    </div>

                    {products.length === 0 && (
                        <div className="empty-state">
                            <Package size={40} style={{ opacity: 0.4 }} />
                            <p style={{ marginTop: 8 }}>No products available</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 3: Quantity ────────────────────────────────── */}
            {step === 3 &&
                (() => {
                    const isPacket = selectedProduct?.unit?.toLowerCase() === 'packet';
                    const price = Number(selectedProduct?.current_price || 0);

                    if (isPacket) {
                        return (
                            <div style={{ textAlign: 'center' }}>
                                <h3
                                    style={{
                                        marginBottom: 4,
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.88rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    How many {selectedProduct?.name}?
                                </h3>
                                <p
                                    style={{
                                        color: 'var(--text-muted)',
                                        marginBottom: 20,
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    ₹{price.toFixed(2)} / packet
                                </p>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: 10,
                                        maxWidth: 280,
                                        margin: '0 auto',
                                    }}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                                        const active = quantity === n;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => setQuantity(n)}
                                                style={{
                                                    padding: 16,
                                                    fontSize: '1.3rem',
                                                    fontWeight: 600,
                                                    fontFamily: 'var(--font-display)',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                                                    background: active ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                                                    color: active ? '#fff' : 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ marginTop: 24 }}>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>
                                        Total
                                    </div>
                                    <div className="amount-large amount-positive">
                                        ₹{(quantity * price).toFixed(2)}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            fontFamily: 'var(--font-mono)',
                                            marginTop: 4,
                                        }}
                                    >
                                        {quantity} packet × ₹{price.toFixed(2)}
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary btn-full btn-lg"
                                    style={{ marginTop: 24 }}
                                    onClick={() => setStep(4)}
                                >
                                    Continue <ArrowRight size={18} strokeWidth={2} />
                                </button>
                            </div>
                        );
                    }

                    // Loose / litre path
                    const displayQty = qtyStr || '0';
                    const numQty = parseFloat(qtyStr) || 0;

                    const handleDial = (key: string) => {
                        setQtyStr((prev) => {
                            if (key === 'backspace') return prev.slice(0, -1);
                            if (key === '.' && prev.includes('.')) return prev;
                            if (key === '.' && prev === '') return '0.';
                            if (prev.length >= 5) return prev;
                            return prev + key;
                        });
                    };

                    const handleContinue = () => {
                        const val = parseFloat(qtyStr);
                        if (!val || val <= 0) return;
                        setQuantity(val);
                        setStep(4);
                    };

                    return (
                        <div style={{ textAlign: 'center' }}>
                            <h3
                                style={{
                                    marginBottom: 4,
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.88rem',
                                    fontWeight: 600,
                                }}
                            >
                                How much {selectedProduct?.name}?
                            </h3>
                            <p
                                style={{
                                    color: 'var(--text-muted)',
                                    marginBottom: 16,
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.85rem',
                                }}
                            >
                                ₹{price.toFixed(2)} / {selectedProduct?.unit}
                            </p>

                            {/* Display */}
                            <div
                                style={{
                                    padding: '20px 16px',
                                    margin: '0 auto 10px',
                                    background: 'var(--bg-surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border-subtle)',
                                    maxWidth: 300,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '2.4rem',
                                        fontWeight: 500,
                                        color: 'var(--text-primary)',
                                        letterSpacing: '-0.02em',
                                        lineHeight: 1,
                                    }}
                                >
                                    {displayQty}
                                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginLeft: 6, fontWeight: 400 }}>
                                        {selectedProduct?.unit}
                                    </span>
                                </div>
                                <div
                                    className="amount-medium amount-positive"
                                    style={{ marginTop: 6 }}
                                >
                                    ₹{(numQty * price).toFixed(2)}
                                </div>
                            </div>

                            {/* Numpad */}
                            <div className="numpad" style={{ marginTop: 16 }}>
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((key) => (
                                    <button
                                        key={key}
                                        className="numpad-btn"
                                        onClick={() => handleDial(key)}
                                    >
                                        {key}
                                    </button>
                                ))}
                                <button
                                    className="numpad-btn"
                                    onClick={() => handleDial('backspace')}
                                    aria-label="Backspace"
                                >
                                    <Delete size={22} strokeWidth={1.75} />
                                </button>
                            </div>

                            <button
                                className="btn btn-primary btn-full btn-lg"
                                style={{ marginTop: 20, maxWidth: 340, margin: '20px auto 0' }}
                                onClick={handleContinue}
                                disabled={numQty <= 0}
                            >
                                Continue <ArrowRight size={18} strokeWidth={2} />
                            </button>
                        </div>
                    );
                })()}

            {/* ── Step 4: Confirm ─────────────────────────────────── */}
            {step === 4 && (
                <div>
                    <h3
                        style={{
                            marginBottom: 14,
                            color: 'var(--text-secondary)',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            textAlign: 'center',
                        }}
                    >
                        Review & Confirm
                    </h3>

                    <div className="confirm-card">
                        <div
                            style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                marginBottom: 12,
                                textAlign: 'center',
                            }}
                        >
                            Entry Receipt
                        </div>

                        <div className="confirm-row">
                            <span className="confirm-label">Customer</span>
                            <span className="confirm-value">
                                #{selectedCustomer?.customer_number} · {selectedCustomer?.name}
                            </span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Product</span>
                            <span className="confirm-value">{selectedProduct?.name}</span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Quantity</span>
                            <span
                                className="confirm-value"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                {quantity} {selectedProduct?.unit}
                            </span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Rate</span>
                            <span
                                className="confirm-value"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                ₹{Number(selectedProduct?.current_price || 0).toFixed(2)} / {selectedProduct?.unit}
                            </span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={13} />
                                    Date
                                </span>
                            </span>
                            <span className="confirm-value">
                                <label
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-default)',
                                        padding: '6px 10px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    <span>{formatDate(entryDate)}</span>
                                    <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                                    <input
                                        type="date"
                                        value={entryDate}
                                        max={today}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                        style={{
                                            position: 'absolute',
                                            opacity: 0,
                                            width: 0,
                                            height: 0,
                                            padding: 0,
                                            border: 'none',
                                        }}
                                    />
                                </label>
                            </span>
                        </div>
                        <div className="confirm-row">
                            <span className="confirm-label">Source</span>
                            <span className="badge badge-info">{sourceLabel}</span>
                        </div>
                        <div className="confirm-row" style={{ borderBottom: 'none', paddingTop: 14 }}>
                            <span className="confirm-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                TOTAL
                            </span>
                            <span className="confirm-total">₹{lineTotal}</span>
                        </div>
                    </div>

                    {isBackdated && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--warning-bg)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: 'var(--warning)',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <AlertTriangle size={16} strokeWidth={2} />
                            Adding a backdated entry for a previous date
                        </div>
                    )}

                    {error && <div className="error-msg">{error}</div>}

                    <button
                        className="btn btn-success btn-full btn-lg"
                        style={{ marginTop: 16 }}
                        onClick={() => handleSubmit()}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                Saving…
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} strokeWidth={2} />
                                Save Entry
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* ── Duplicate Modal ─────────────────────────────────── */}
            {duplicateState && (
                <div className="modal-backdrop" onClick={() => setDuplicateState(null)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: 'var(--warning-bg)',
                                        color: 'var(--warning)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <AlertTriangle size={18} strokeWidth={2} />
                                </div>
                                <h3 style={{ fontSize: '1.05rem' }}>Duplicate Entry</h3>
                            </div>
                            <button
                                className="icon-btn"
                                onClick={() => setDuplicateState(null)}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p
                            style={{
                                color: 'var(--text-secondary)',
                                marginBottom: 14,
                                fontSize: '0.88rem',
                            }}
                        >
                            A matching entry already exists for this customer, product, date, and source.
                        </p>

                        <div
                            style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                padding: 12,
                                marginBottom: 16,
                                fontSize: '0.85rem',
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <div>Quantity: {duplicateState.existingEntry.quantity} {selectedProduct?.unit}</div>
                            <div>Date: {duplicateState.existingEntry.entry_date}</div>
                            <div>Source: {duplicateState.existingEntry.source}</div>
                        </div>

                        {!duplicateState.editMode ? (
                            <>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={() =>
                                            setDuplicateState((current) =>
                                                current ? { ...current, editMode: true } : current,
                                            )
                                        }
                                        disabled={!duplicateState.canEditExisting}
                                    >
                                        Edit Existing Entry
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-full"
                                        onClick={() => handleSubmit({ forceCreate: true })}
                                        disabled={loading || !duplicateState.canForceCreate}
                                    >
                                        Create Anyway
                                    </button>
                                    <button
                                        className="btn btn-outline btn-full"
                                        onClick={() => setDuplicateState(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {!duplicateState.canEditExisting && (
                                    <p
                                        style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.8rem',
                                            marginTop: 10,
                                        }}
                                    >
                                        Only the creator can edit this entry.
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
                                <div style={{ display: 'grid', gap: 8 }}>
                                    <button
                                        className="btn btn-success btn-full"
                                        onClick={handleUpdateDuplicate}
                                        disabled={loading || Number(duplicateState.editQuantity) <= 0}
                                    >
                                        <CheckCircle2 size={16} />
                                        Save Existing Entry
                                    </button>
                                    <button
                                        className="btn btn-outline btn-full"
                                        onClick={() =>
                                            setDuplicateState((current) =>
                                                current ? { ...current, editMode: false } : current,
                                            )
                                        }
                                    >
                                        <ChevronLeft size={16} />
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
