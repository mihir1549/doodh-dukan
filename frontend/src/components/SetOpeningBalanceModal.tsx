import { useState, useEffect } from 'react';
import { ledgerApi } from '../api';

interface Props {
    customerId: string;
    customerName: string;
    onSuccess: () => void;
    onClose: () => void;
}

const GO_LIVE = '2026-05-01';

export default function SetOpeningBalanceModal({ customerId, customerName, onSuccess, onClose }: Props) {
    const [type, setType] = useState<'DEBIT' | 'CREDIT' | 'ZERO'>('ZERO');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(GO_LIVE);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (type === 'ZERO') { onSuccess(); return; }

        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
        if (!date) { setError('Date is required'); return; }

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
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Opening Balance</h3>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
                </div>

                <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '14px' }}>
                    {customerName}
                </div>

                <div className="form-group">
                    <label>Balance Type</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {([
                            { val: 'ZERO', label: '✓ Zero', desc: 'No balance' },
                            { val: 'DEBIT', label: '↑ Owes', desc: 'Customer owes money' },
                            { val: 'CREDIT', label: '↓ Advance', desc: 'Customer has advance' },
                        ] as const).map(({ val, label }) => (
                            <button
                                key={val}
                                onClick={() => setType(val)}
                                style={{
                                    flex: 1,
                                    padding: '10px 4px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `2px solid ${type === val
                                        ? val === 'DEBIT' ? 'var(--danger)' : val === 'CREDIT' ? 'var(--success)' : 'var(--accent)'
                                        : 'var(--border)'}`,
                                    background: type === val
                                        ? val === 'DEBIT' ? 'var(--danger-light)' : val === 'CREDIT' ? 'var(--success-light)' : 'var(--accent-light)'
                                        : 'var(--bg-input)',
                                    color: type === val
                                        ? val === 'DEBIT' ? 'var(--danger)' : val === 'CREDIT' ? 'var(--success)' : 'var(--text-accent)'
                                        : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                    fontWeight: type === val ? 700 : 400,
                                }}
                            >
                                {label}
                            </button>
                        ))}
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
                            />
                        </div>

                        <div className="form-group">
                            <label>As of Date</label>
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
                                placeholder="e.g. Balance from old register"
                            />
                        </div>
                    </>
                )}

                {error && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        style={{ flex: 2 }}
                        disabled={saving}
                        onClick={handleSubmit}
                    >
                        {saving ? '⏳ Saving...' : type === 'ZERO' ? 'Set as Zero' : 'Save Opening Balance'}
                    </button>
                </div>
            </div>
        </div>
    );
}
