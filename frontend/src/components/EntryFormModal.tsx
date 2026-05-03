import { useEffect, useMemo, useState } from 'react';
import {
    X, CheckCircle2, Droplets, Package, Delete, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { entryApi, productApi } from '../api';

interface ExistingEntry {
    id: string;
    product_id: string;
    quantity: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    customerId: string;
    customerName: string;
    date: string;            // YYYY-MM-DD
    existingEntry?: ExistingEntry;
    onSuccess: () => void;
}

function formatDate(yyyymmdd: string) {
    const dt = new Date(yyyymmdd + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatRupees(n: number) {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EntryFormModal({
    isOpen, onClose, mode, customerId, customerName, date, existingEntry, onSuccess,
}: Props) {
    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [qtyStr, setQtyStr] = useState<string>('');
    const [duplicate, setDuplicate] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEdit = mode === 'edit';

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setError('');
        setDuplicate(null);
        setLoadingProducts(true);
        productApi.list()
            .then((res) => {
                if (cancelled) return;
                const list = res.data?.data || [];
                setProducts(list);
                if (existingEntry) {
                    setSelectedProductId(existingEntry.product_id);
                    setQtyStr(String(existingEntry.quantity));
                } else if (list.length === 1) {
                    setSelectedProductId(list[0].id);
                    setQtyStr('');
                } else {
                    setSelectedProductId(null);
                    setQtyStr('');
                }
            })
            .catch(() => { if (!cancelled) setProducts([]); })
            .finally(() => { if (!cancelled) setLoadingProducts(false); });
        return () => { cancelled = true; };
    }, [isOpen, existingEntry?.id, existingEntry?.product_id, existingEntry?.quantity]);

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === selectedProductId),
        [products, selectedProductId],
    );

    const allowsDecimal = (selectedProduct?.unit || '').toLowerCase() === 'litre';
    const numericQty = parseFloat(qtyStr) || 0;
    const unitPrice = Number(selectedProduct?.current_price || 0);
    const lineTotal = numericQty * unitPrice;
    const canSave = !!selectedProductId && numericQty > 0;

    const handleDial = (key: string) => {
        setError('');
        setDuplicate(null);
        setQtyStr((prev) => {
            if (key === 'backspace') return prev.slice(0, -1);
            if (key === '.') {
                if (!allowsDecimal) return prev;
                if (prev.includes('.')) return prev;
                if (prev === '') return '0.';
                return prev + '.';
            }
            if (prev.length >= 5) return prev;
            return prev + key;
        });
    };

    const handleSave = async (forceCreate = false) => {
        if (!canSave || !selectedProductId) return;
        setSaving(true);
        setError('');
        try {
            if (isEdit && existingEntry) {
                // Existing API contract only allows quantity update
                await entryApi.update(existingEntry.id, { quantity: numericQty });
                toast.success('Entry updated');
            } else {
                await entryApi.create({
                    customer_id: customerId,
                    product_id: selectedProductId,
                    entry_date: date,
                    quantity: numericQty,
                    force_create: forceCreate,
                });
                toast.success('Entry added');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            const status = err.response?.status;
            const data = err.response?.data;
            const code = data?.code || data?.error?.code;
            const msg = data?.message || data?.error?.message || 'Failed to save';

            if (status === 409 && code === 'MONTH_LOCKED') {
                toast.error(msg);
                onSuccess();   // parent refetches summary so locked state shows
                onClose();
                return;
            }
            if (status === 409 && code === 'DUPLICATE_ENTRY') {
                setDuplicate(data?.duplicate ?? null);
                setError(msg);
                return;
            }
            setError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="modal-backdrop"
            onClick={(e) => {
                if (saving) return;
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 440 }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ fontSize: '1.05rem' }}>{isEdit ? 'Edit Entry' : 'Add Entry'}</h3>
                    <button
                        className="icon-btn"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div
                    style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        marginBottom: 16,
                    }}
                >
                    {customerName} · <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(date)}</span>
                </div>

                {/* Product chips */}
                <div className="form-group">
                    <label>Product</label>
                    {loadingProducts ? (
                        <div style={{ padding: '8px 0' }}>
                            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        </div>
                    ) : products.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No products configured</div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                gap: 8,
                                overflowX: 'auto',
                                paddingBottom: 4,
                                margin: '0 -2px',
                            }}
                        >
                            {products.map((p) => {
                                const active = selectedProductId === p.id;
                                const isLoose =
                                    p.category === 'LOOSE_MILK' ||
                                    (p.name || '').toLowerCase().includes('loose') ||
                                    (p.unit || '').toLowerCase().includes('litre');
                                const Icon = isLoose ? Droplets : Package;
                                const onPick = () => {
                                    if (isEdit) return; // product locked in edit mode
                                    setSelectedProductId(p.id);
                                    setError('');
                                    setDuplicate(null);
                                };
                                return (
                                    <button
                                        key={p.id}
                                        onClick={onPick}
                                        disabled={isEdit}
                                        title={isEdit ? 'Delete and re-add to change product' : ''}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            flexShrink: 0,
                                            padding: '8px 12px',
                                            border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                                            borderRadius: 999,
                                            background: active ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                                            color: active ? '#fff' : 'var(--text-primary)',
                                            fontFamily: 'var(--font-display)',
                                            fontWeight: active ? 700 : 500,
                                            fontSize: '0.85rem',
                                            cursor: isEdit ? 'default' : 'pointer',
                                            opacity: isEdit && !active ? 0.5 : 1,
                                            minHeight: 'auto',
                                        }}
                                    >
                                        <Icon size={14} strokeWidth={2} />
                                        {p.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {isEdit && (
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                            Product is fixed in edit mode. Delete and re-add to change product.
                        </small>
                    )}
                </div>

                {/* Quantity display */}
                <div className="form-group">
                    <label>Quantity</label>
                    <div
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px',
                            textAlign: 'center',
                            marginBottom: 10,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '1.8rem',
                                fontWeight: 500,
                                letterSpacing: '-0.02em',
                                color: 'var(--text-primary)',
                                lineHeight: 1,
                            }}
                        >
                            {qtyStr || '0'}
                            {selectedProduct?.unit && (
                                <span
                                    style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 400,
                                        marginLeft: 6,
                                    }}
                                >
                                    {selectedProduct.unit}
                                </span>
                            )}
                        </div>
                        {selectedProduct && numericQty > 0 && (
                            <div
                                style={{
                                    marginTop: 6,
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.85rem',
                                    color: 'var(--success)',
                                }}
                            >
                                {numericQty}{selectedProduct.unit ? ' ' + selectedProduct.unit : ''} ×{' '}
                                {formatRupees(unitPrice)} = {formatRupees(lineTotal)}
                            </div>
                        )}
                    </div>

                    {/* Numpad */}
                    <div className="numpad" style={{ maxWidth: 320 }}>
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                            <button key={k} className="numpad-btn" onClick={() => handleDial(k)} type="button">
                                {k}
                            </button>
                        ))}
                        <button
                            className="numpad-btn"
                            type="button"
                            onClick={() => handleDial('.')}
                            disabled={!allowsDecimal}
                            style={{ opacity: allowsDecimal ? 1 : 0.35, cursor: allowsDecimal ? 'pointer' : 'not-allowed' }}
                            aria-label="Decimal point"
                        >
                            .
                        </button>
                        <button className="numpad-btn" onClick={() => handleDial('0')} type="button">0</button>
                        <button
                            className="numpad-btn"
                            type="button"
                            onClick={() => handleDial('backspace')}
                            aria-label="Backspace"
                        >
                            <Delete size={20} strokeWidth={1.75} />
                        </button>
                    </div>
                </div>

                {/* Duplicate warning (with Create Anyway option) */}
                {duplicate && !isEdit && (
                    <div
                        style={{
                            display: 'flex',
                            gap: 8,
                            padding: '10px 12px',
                            background: 'var(--warning-bg)',
                            border: '1px solid rgba(245,158,11,0.3)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 12,
                            fontSize: '0.85rem',
                            color: 'var(--warning)',
                            alignItems: 'flex-start',
                        }}
                    >
                        <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>
                            An entry already exists for this product on this date.{' '}
                            <button
                                type="button"
                                onClick={() => handleSave(true)}
                                disabled={saving}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--warning)',
                                    fontWeight: 700,
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    minHeight: 'auto',
                                    padding: 0,
                                }}
                            >
                                Add another anyway
                            </button>
                        </span>
                    </div>
                )}

                {error && !duplicate && <div className="error-msg">{error}</div>}

                {/* Footer */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 2 }}
                        disabled={!canSave || saving}
                        onClick={() => handleSave(false)}
                    >
                        {saving ? (
                            <>
                                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                Saving…
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} strokeWidth={2} />
                                {isEdit ? 'Save Changes' : 'Add Entry'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
