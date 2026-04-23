import { useState } from 'react';
import {
    X, Banknote, Smartphone, CreditCard, CheckCircle2,
} from 'lucide-react';
import { ledgerApi } from '../api';

interface Props {
    customerId: string;
    onSuccess: () => void;
    onClose: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const MODES = [
    { val: 'CASH' as const,     label: 'Cash',     icon: Banknote },
    { val: 'ONLINE' as const,   label: 'Online',   icon: Smartphone },
    { val: 'RAZORPAY' as const, label: 'Razorpay', icon: CreditCard },
];

export default function RecordPaymentModal({ customerId, onSuccess, onClose }: Props) {
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'CASH' | 'ONLINE' | 'RAZORPAY'>('CASH');
    const [date, setDate] = useState(today());
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
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
            await ledgerApi.recordPayment({
                customer_id: customerId,
                amount: amt,
                payment_mode: mode,
                transaction_date: date,
                note: note.trim() || undefined,
            });
            setDone(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {done ? (
                    <>
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <div
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: 'var(--success-bg)',
                                    color: 'var(--success)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px',
                                }}
                            >
                                <CheckCircle2 size={36} strokeWidth={1.75} />
                            </div>
                            <h3 style={{ marginBottom: 4, color: 'var(--success)' }}>
                                Payment Submitted
                            </h3>
                            <p
                                style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.88rem',
                                    marginTop: 6,
                                }}
                            >
                                Awaiting approval from admin
                            </p>
                        </div>
                        <button className="btn btn-primary btn-full" onClick={onSuccess}>
                            Done
                        </button>
                    </>
                ) : (
                    <>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <h3 style={{ fontSize: '1.05rem' }}>Record Payment</h3>
                            <button
                                className="icon-btn"
                                onClick={onClose}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

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
                            <label>Payment Mode</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {MODES.map(({ val, label, icon: Icon }) => {
                                    const active = mode === val;
                                    return (
                                        <button
                                            key={val}
                                            onClick={() => setMode(val)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 4,
                                                padding: '10px 4px',
                                                borderRadius: 'var(--radius-md)',
                                                border: `1px solid ${active ? 'var(--border-brand)' : 'var(--border-subtle)'}`,
                                                background: active ? 'var(--brand-primary-glow)' : 'var(--bg-elevated)',
                                                color: active ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem',
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

                        <div className="form-group">
                            <label>Date *</label>
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
                                placeholder="e.g. UPI ref 123456"
                            />
                        </div>

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
                                className="btn btn-success"
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
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} strokeWidth={2} />
                                        Submit
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
