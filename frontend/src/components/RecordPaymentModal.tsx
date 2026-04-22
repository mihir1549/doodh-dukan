import { useState } from 'react';
import { ledgerApi } from '../api';

interface Props {
    customerId: string;
    onSuccess: () => void;
    onClose: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

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
        if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
        if (!date) { setError('Date is required'); return; }

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
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                {done ? (
                    <>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✅</div>
                            <h3>Payment Submitted</h3>
                            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>
                                Awaiting approval from admin
                            </p>
                        </div>
                        <button className="btn btn-primary btn-full" onClick={onSuccess}>Done</button>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Record Payment</h3>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
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
                            />
                        </div>

                        <div className="form-group">
                            <label>Payment Mode</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(['CASH', 'ONLINE', 'RAZORPAY'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 4px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: `2px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
                                            background: mode === m ? 'var(--accent-light)' : 'var(--bg-input)',
                                            color: mode === m ? 'var(--text-accent)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: mode === m ? 700 : 400,
                                        }}
                                    >
                                        {m === 'CASH' ? '💵' : m === 'ONLINE' ? '📱' : '💳'} {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Date *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
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

                        {error && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                            <button
                                className="btn btn-success"
                                style={{ flex: 2 }}
                                disabled={saving}
                                onClick={handleSubmit}
                            >
                                {saving ? '⏳ Submitting...' : 'Submit Payment'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
