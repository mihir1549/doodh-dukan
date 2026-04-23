import { useState } from 'react';
import {
    X, CheckCircle2, ArrowUpRight, ArrowDownLeft, Wallet,
} from 'lucide-react';
import { ledgerApi } from '../api';

interface Props {
    customerId: string;
    customerName: string;
    onSuccess: () => void;
    onClose: () => void;
}

const GO_LIVE = '2026-05-01';

const TYPES = [
    {
        val: 'ZERO' as const,
        label: 'Zero',
        desc: 'No balance',
        icon: CheckCircle2,
        color: 'var(--brand-primary)',
        bg: 'var(--brand-primary-glow)',
    },
    {
        val: 'DEBIT' as const,
        label: 'Owes',
        desc: 'Customer owes',
        icon: ArrowUpRight,
        color: 'var(--danger)',
        bg: 'var(--danger-bg)',
    },
    {
        val: 'CREDIT' as const,
        label: 'Advance',
        desc: 'Has credit',
        icon: ArrowDownLeft,
        color: 'var(--success)',
        bg: 'var(--success-bg)',
    },
];

export default function SetOpeningBalanceModal({ customerId, customerName, onSuccess, onClose }: Props) {
    const [type, setType] = useState<'DEBIT' | 'CREDIT' | 'ZERO'>('ZERO');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(GO_LIVE);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (type === 'ZERO') {
            onSuccess();
            return;
        }
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) {
            setError('Enter a valid amount');
            return;
        }
        if (!date) {
            setError('Date is required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await ledgerApi.setOpeningBalance({
                customer_id: customerId,
                direction: type,
                amount: amt,
                as_of_date: date,
                note: note.trim() || undefined,
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to set opening balance');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: 'var(--brand-primary-glow)',
                                color: 'var(--brand-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Wallet size={18} strokeWidth={2} />
                        </div>
                        <h3 style={{ fontSize: '1.05rem' }}>Opening Balance</h3>
                    </div>
                    <button
                        className="icon-btn"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        marginBottom: 16,
                    }}
                >
                    {customerName}
                </div>

                <div className="form-group">
                    <label>Balance Type</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {TYPES.map(({ val, label, icon: Icon, color, bg }) => {
                            const active = type === val;
                            return (
                                <button
                                    key={val}
                                    onClick={() => setType(val)}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4,
                                        padding: '10px 4px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${active ? color : 'var(--border-subtle)'}`,
                                        background: active ? bg : 'var(--bg-elevated)',
                                        color: active ? color : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        fontWeight: active ? 700 : 500,
                                        fontFamily: 'var(--font-display)',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <Icon size={18} strokeWidth={1.75} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {type !== 'ZERO' && (
                    <>
                        <div className="form-group">
                            <label>Amount (₹) *</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '1.2rem',
                                    textAlign: 'center',
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label>As of Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{ fontFamily: 'var(--font-mono)' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Note (optional)</label>
                            <input
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. Balance from old register"
                            />
                        </div>
                    </>
                )}

                {error && <div className="error-msg">{error}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        style={{ flex: 2 }}
                        disabled={saving}
                        onClick={handleSubmit}
                    >
                        {saving ? (
                            <>
                                <div
                                    className="spinner"
                                    style={{ width: 14, height: 14, borderWidth: 2 }}
                                />
                                Saving…
                            </>
                        ) : type === 'ZERO' ? (
                            'Set as Zero'
                        ) : (
                            <>
                                <CheckCircle2 size={16} strokeWidth={2} />
                                Save Opening Balance
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
