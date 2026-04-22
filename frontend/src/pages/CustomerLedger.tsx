import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ledgerApi, customerApi } from '../api';
import { useAuth } from '../AuthContext';
import RecordPaymentModal from '../components/RecordPaymentModal';

const ENTRY_LABELS: Record<string, string> = {
    OPENING_BALANCE: 'Opening Balance',
    BILL_POSTED: 'Monthly Bill',
    PAYMENT: 'Payment',
    CARRY_FORWARD: 'Carry Forward',
    ADVANCE_ADJUSTED: 'Advance Adjusted',
};

const STATUS_BADGE: Record<string, { icon: string; color: string }> = {
    APPROVED: { icon: '✅', color: 'var(--success)' },
    PENDING: { icon: '⏳', color: 'var(--warning)' },
    REJECTED: { icon: '❌', color: 'var(--text-muted)' },
};

function formatDate(d: string) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y.slice(2)}`;
}

function formatAmount(n: number) {
    return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function CustomerLedger() {
    const { id: customerId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [customer, setCustomer] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const load = useCallback(async (page = 1) => {
        if (!customerId) return;
        try {
            const [ledgerRes, balRes, custRes] = await Promise.all([
                ledgerApi.getCustomerLedger(customerId, { page, limit: 20 }),
                ledgerApi.getCustomerBalance(customerId),
                customerApi.get(customerId),
            ]);
            const ledgerData = ledgerRes.data?.data;
            setEntries(page === 1 ? ledgerData.data : (prev: any[]) => [...prev, ...ledgerData.data]);
            setMeta(ledgerData.meta);
            setBalance(Number(balRes.data?.data?.current_balance ?? 0));
            setCustomer(custRes.data?.data);
        } catch {
            // keep stale data
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => { load(1); }, [load]);

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        load(1);
    };

    const balanceColor = balance > 0 ? 'var(--danger)' : balance < 0 ? 'var(--success)' : 'var(--text-muted)';
    const balanceLabel = balance > 0 ? 'Owes' : balance < 0 ? 'Advance' : 'Settled';

    const canRecord = ['OWNER', 'SHOP_STAFF', 'DELIVERY', 'CUSTOMER', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase() ?? '');

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(`/customers/${customerId}`)}>← Back</button>
                <h1>Passbook</h1>
            </div>

            {/* Customer + Balance Header */}
            {customer && (
                <div className="card" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                #{customer.customer_number} · {customer.name}
                            </div>
                            {customer.phone && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{customer.phone}</div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: balanceColor, fontWeight: 700, fontSize: '1.2rem' }}>
                                {formatAmount(balance)}
                            </div>
                            <div style={{ color: balanceColor, fontSize: '0.78rem' }}>{balanceLabel}</div>
                        </div>
                    </div>
                    {canRecord && (
                        <button
                            className="btn btn-primary btn-full"
                            style={{ marginTop: '14px' }}
                            onClick={() => setShowPaymentModal(true)}
                        >
                            + Record Payment
                        </button>
                    )}
                </div>
            )}

            {/* Ledger Table */}
            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : entries.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📒</div>
                    <p>No ledger entries yet</p>
                </div>
            ) : (
                <>
                    {/* Header row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 1fr 80px 80px',
                        gap: '4px',
                        padding: '8px 10px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                    }}>
                        <span>Date</span>
                        <span>Description</span>
                        <span style={{ textAlign: 'right' }}>Debit</span>
                        <span style={{ textAlign: 'right' }}>Credit</span>
                    </div>

                    {entries.map((e) => {
                        const isDebit = e.direction === 'DEBIT';
                        const isRejected = e.status === 'REJECTED';
                        const isPending = e.status === 'PENDING';
                        const badge = STATUS_BADGE[e.status] ?? STATUS_BADGE.APPROVED;
                        const label = ENTRY_LABELS[e.entry_type] ?? e.entry_type;
                        const desc = e.entry_type === 'PAYMENT'
                            ? `Payment (${e.payment_mode ?? ''}) ${badge.icon}`
                            : e.entry_type === 'BILL_POSTED'
                                ? `Bill – ${e.reference_month ? formatMonthYear(e.reference_month) : ''}`
                                : label;

                        return (
                            <div
                                key={e.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '70px 1fr 80px 80px',
                                    gap: '4px',
                                    padding: '10px',
                                    marginBottom: '3px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isRejected
                                        ? 'transparent'
                                        : isDebit
                                            ? 'rgba(239,68,68,0.07)'
                                            : 'rgba(34,197,94,0.07)',
                                    opacity: isRejected ? 0.5 : 1,
                                    textDecoration: isRejected ? 'line-through' : 'none',
                                    fontSize: '0.88rem',
                                    alignItems: 'center',
                                }}
                            >
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    {formatDate(e.transaction_date)}
                                </span>
                                <div>
                                    <div>{desc}</div>
                                    {isPending && (
                                        <span style={{
                                            fontSize: '0.72rem',
                                            background: 'var(--warning-light)',
                                            color: 'var(--warning)',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                        }}>Pending approval</span>
                                    )}
                                    {e.note && !isRejected && (
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.note}</div>
                                    )}
                                </div>
                                <span style={{
                                    textAlign: 'right',
                                    color: 'var(--danger)',
                                    fontWeight: isDebit ? 600 : 400,
                                }}>
                                    {isDebit ? formatAmount(e.amount) : ''}
                                </span>
                                <span style={{
                                    textAlign: 'right',
                                    color: 'var(--success)',
                                    fontWeight: !isDebit ? 600 : 400,
                                }}>
                                    {!isDebit ? formatAmount(e.amount) : ''}
                                </span>
                            </div>
                        );
                    })}

                    {/* Running balance row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 1fr 80px 80px',
                        gap: '4px',
                        padding: '10px',
                        borderTop: '1px solid var(--border)',
                        marginTop: '4px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                    }}>
                        <span />
                        <span style={{ color: 'var(--text-muted)' }}>Balance</span>
                        <span />
                        <span style={{ textAlign: 'right', color: balanceColor }}>
                            {formatAmount(balance)}
                        </span>
                    </div>

                    {meta.page < meta.totalPages && (
                        <button
                            className="btn btn-outline btn-full"
                            style={{ marginTop: '12px' }}
                            onClick={() => load(meta.page + 1)}
                        >
                            Load More
                        </button>
                    )}
                </>
            )}

            {showPaymentModal && customerId && (
                <RecordPaymentModal
                    customerId={customerId}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}
        </div>
    );
}

function formatMonthYear(my: string) {
    const [y, m] = my.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
}
