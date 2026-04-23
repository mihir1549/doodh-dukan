import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft, Plus, BookOpen, AlertCircle, CheckCircle2, Clock,
    XCircle, ArrowUpRight, ArrowDownLeft, Wallet,
} from 'lucide-react';
import { ledgerApi, customerApi } from '../api';
import { useAuth } from '../AuthContext';
import { avatarColor, avatarLetter } from '../utils/avatar';
import RecordPaymentModal from '../components/RecordPaymentModal';

const ENTRY_LABELS: Record<string, string> = {
    OPENING_BALANCE: 'Opening Balance',
    BILL_POSTED: 'Monthly Bill',
    PAYMENT: 'Payment',
    CARRY_FORWARD: 'Carried Forward',
    ADVANCE_ADJUSTED: 'Advance Adjusted',
};

function formatDate(d: string) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y.slice(2)}`;
}

function formatMonthYear(my: string) {
    const [y, m] = my.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatAmount(n: number) {
    return `₹${Math.abs(n).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
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
            if (page === 1) {
                setEntries(ledgerData.data);
            } else {
                setEntries((prev) => [...prev, ...ledgerData.data]);
            }
            setMeta(ledgerData.meta);
            setBalance(Number(balRes.data?.data?.current_balance ?? 0));
            setCustomer(custRes.data?.data);
        } catch {
            // keep stale
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => { load(1); }, [load]);

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        load(1);
    };

    const canRecord = ['OWNER', 'SHOP_STAFF', 'DELIVERY', 'SUPER_ADMIN'].includes(
        user?.role?.toUpperCase() ?? '',
    );

    const balanceMeta =
        balance > 0
            ? { label: 'Owes', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: <ArrowUpRight size={20} strokeWidth={2} /> }
            : balance < 0
                ? { label: 'Advance', color: 'var(--success)', bg: 'var(--success-bg)', icon: <ArrowDownLeft size={20} strokeWidth={2} /> }
                : { label: 'Settled', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)', icon: <CheckCircle2 size={20} strokeWidth={2} /> };

    const color = avatarColor(customer?.name);
    const letter = avatarLetter(customer?.name);

    return (
        <div className="page">
            <div className="page-header">
                <button
                    className="back-btn"
                    onClick={() => navigate(`/customers/${customerId}`)}
                >
                    <ChevronLeft size={16} strokeWidth={2} />
                    Back
                </button>
                <h1>Passbook</h1>
                <div style={{ width: 72 }} />
            </div>

            {/* Customer + Balance card */}
            {customer && (
                <div
                    className="card card-elevated"
                    style={{ marginBottom: 16, padding: 16 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div
                            className="customer-avatar"
                            style={{ background: color.bg, color: color.fg, width: 44, height: 44, fontSize: '1rem' }}
                        >
                            {letter}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {customer.name}
                            </div>
                            <div
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.78rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                #{customer.customer_number}
                                {customer.phone ? ` · ${customer.phone}` : ''}
                            </div>
                        </div>
                    </div>

                    {/* Balance strip */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 16px',
                            background: balanceMeta.bg,
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${balance !== 0 ? balanceMeta.color : 'var(--border-subtle)'}`,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: balanceMeta.color }}>
                            {balanceMeta.icon}
                            <div>
                                <div
                                    style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    {balanceMeta.label}
                                </div>
                                <div className="amount-medium" style={{ color: balanceMeta.color, marginTop: 2 }}>
                                    {formatAmount(balance)}
                                </div>
                            </div>
                        </div>

                        {canRecord && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowPaymentModal(true)}
                                style={{ minHeight: 'auto', padding: '10px 14px', fontSize: '0.85rem' }}
                            >
                                <Plus size={14} strokeWidth={2.25} />
                                Payment
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Ledger table */}
            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : entries.length === 0 ? (
                <div className="empty-state">
                    <BookOpen size={40} style={{ opacity: 0.4 }} />
                    <p style={{ marginTop: 8 }}>No ledger entries yet</p>
                </div>
            ) : (
                <div
                    style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Table header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '62px 1fr 78px 78px',
                            gap: 4,
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border-subtle)',
                            background: 'var(--bg-elevated)',
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}
                    >
                        <span>Date</span>
                        <span>Description</span>
                        <span style={{ textAlign: 'right' }}>Debit</span>
                        <span style={{ textAlign: 'right' }}>Credit</span>
                    </div>

                    {entries.map((e, idx) => {
                        const isDebit = e.direction === 'DEBIT';
                        const isRejected = e.status === 'REJECTED';
                        const isPending = e.status === 'PENDING';
                        const label = ENTRY_LABELS[e.entry_type] ?? e.entry_type;

                        let desc: string;
                        let statusIcon: React.ReactNode = null;
                        if (e.entry_type === 'BILL_POSTED') {
                            desc = `Bill · ${e.reference_month ? formatMonthYear(e.reference_month) : ''}`;
                        } else if (e.entry_type === 'PAYMENT') {
                            desc = `Payment${e.payment_mode ? ` (${e.payment_mode})` : ''}`;
                            if (isPending) statusIcon = <Clock size={12} strokeWidth={2} style={{ color: 'var(--warning)' }} />;
                            else if (isRejected) statusIcon = <XCircle size={12} strokeWidth={2} style={{ color: 'var(--danger)' }} />;
                            else statusIcon = <CheckCircle2 size={12} strokeWidth={2} style={{ color: 'var(--success)' }} />;
                        } else {
                            desc = label;
                        }

                        const isLast = idx === entries.length - 1;

                        return (
                            <div
                                key={e.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '62px 1fr 78px 78px',
                                    gap: 4,
                                    padding: '10px 14px',
                                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                                    borderLeft: isRejected
                                        ? 'none'
                                        : `3px solid ${isPending ? 'var(--warning)' : isDebit ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
                                    background: isPending
                                        ? 'var(--warning-bg)'
                                        : isRejected
                                            ? 'transparent'
                                            : 'transparent',
                                    opacity: isRejected ? 0.5 : 1,
                                    textDecoration: isRejected ? 'line-through' : 'none',
                                    fontSize: '0.85rem',
                                    alignItems: 'center',
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.72rem',
                                    }}
                                >
                                    {formatDate(e.transaction_date)}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {statusIcon}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</span>
                                    </div>
                                    {isPending && (
                                        <span
                                            className="badge badge-warning"
                                            style={{ marginTop: 3 }}
                                        >
                                            Pending
                                        </span>
                                    )}
                                    {e.note && !isRejected && (
                                        <div
                                            style={{
                                                fontSize: '0.72rem',
                                                color: 'var(--text-muted)',
                                                marginTop: 2,
                                            }}
                                        >
                                            {e.note}
                                        </div>
                                    )}
                                </div>
                                <span
                                    style={{
                                        textAlign: 'right',
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--danger)',
                                        fontWeight: isDebit ? 500 : 400,
                                    }}
                                >
                                    {isDebit ? formatAmount(e.amount) : ''}
                                </span>
                                <span
                                    style={{
                                        textAlign: 'right',
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--success)',
                                        fontWeight: !isDebit ? 500 : 400,
                                    }}
                                >
                                    {!isDebit ? formatAmount(e.amount) : ''}
                                </span>
                            </div>
                        );
                    })}

                    {/* Balance footer */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderTop: '1px solid var(--border-default)',
                            background: 'var(--bg-elevated)',
                        }}
                    >
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            <Wallet size={13} strokeWidth={2} />
                            Balance
                        </span>
                        <span className="amount-medium" style={{ color: balanceMeta.color }}>
                            {formatAmount(balance)}
                        </span>
                    </div>
                </div>
            )}

            {meta.page < meta.totalPages && (
                <button
                    className="btn btn-outline btn-full"
                    style={{ marginTop: 12 }}
                    onClick={() => load(meta.page + 1)}
                >
                    Load More
                </button>
            )}

            {/* Show an info note for non-admins on their own ledger */}
            {!canRecord && balance > 0 && (
                <div
                    style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        background: 'var(--info-bg)',
                        border: '1px solid var(--border-brand)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <AlertCircle size={16} strokeWidth={2} style={{ color: 'var(--brand-primary)' }} />
                    Please visit the shop to clear this balance.
                </div>
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
