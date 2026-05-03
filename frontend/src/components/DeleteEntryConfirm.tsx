import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { entryApi } from '../api';

interface EntryToDelete {
    id: string;
    date: string;            // YYYY-MM-DD
    product_name: string;
    quantity: number;
    unit: string;
    line_total: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    entry: EntryToDelete | null;
    onSuccess: () => void;
}

function formatDate(yyyymmdd: string) {
    const dt = new Date(yyyymmdd + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatRupees(n: number) {
    return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DeleteEntryConfirm({ isOpen, onClose, entry, onSuccess }: Props) {
    const [deleting, setDeleting] = useState(false);

    if (!isOpen || !entry) return null;

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await entryApi.delete(entry.id);
            toast.success('Entry deleted');
            onSuccess();
            onClose();
        } catch (err: any) {
            const data = err.response?.data;
            const code = data?.code || data?.error?.code;
            const msg = data?.message || data?.error?.message || 'Failed to delete entry';

            if (err.response?.status === 409 && code === 'MONTH_LOCKED') {
                toast.error(msg);
                onSuccess();
                onClose();
                return;
            }
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div
            className="modal-backdrop"
            onClick={(e) => {
                if (deleting) return;
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 380, textAlign: 'center', padding: 24 }}
            >
                {/* Close — top right */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
                    <button
                        className="icon-btn"
                        onClick={onClose}
                        disabled={deleting}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Danger icon */}
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                    }}
                >
                    <Trash2 size={28} strokeWidth={1.75} />
                </div>

                <h3 style={{ marginBottom: 12, fontSize: '1.05rem' }}>Delete this entry?</h3>

                {/* Entry summary */}
                <div
                    style={{
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        marginBottom: 14,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                    }}
                >
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 2 }}>
                        {formatDate(entry.date)}
                    </div>
                    <div>
                        {entry.product_name} · {entry.quantity}{entry.unit ? ' ' + entry.unit : ''} ·{' '}
                        <span style={{ color: 'var(--success)' }}>{formatRupees(entry.line_total)}</span>
                    </div>
                </div>

                <p
                    style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        marginBottom: 16,
                        textAlign: 'left',
                    }}
                >
                    This will be removed from this customer's monthly card.
                    The action can be reversed by re-adding the entry.
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        style={{
                            flex: 1,
                            background: 'var(--danger)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 20px',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: deleting ? 'default' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <>
                                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} strokeWidth={2} />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
