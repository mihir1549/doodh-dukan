import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Check, X, Banknote, Smartphone, CreditCard,
    CheckCircle2, AlertCircle,
} from 'lucide-react';
import { ledgerApi } from '../api';
import { useAuth } from '../AuthContext';
import { avatarColor, avatarLetter } from '../utils/avatar';

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function formatAmount(n: number) {
    return `₹${Number(n).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function modeIcon(mode: string) {
    if (mode === 'CASH') return <Banknote size={14} strokeWidth={2} />;
    if (mode === 'ONLINE') return <Smartphone size={14} strokeWidth={2} />;
    if (mode === 'RAZORPAY') return <CreditCard size={14} strokeWidth={2} />;
    return null;
}

export default function PendingPayments() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    const isAdmin = ['OWNER', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase() ?? '');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const res = await ledgerApi.getPendingPayments();
            setPayments(res.data?.data || []);
        } catch {
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessing(id);
        try {
            await ledgerApi.approvePayment(id);
            setPayments((prev) => prev.filter((p) => p.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to approve');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!rejectId) return;
        setProcessing(rejectId);
        try {
            await ledgerApi.rejectPayment(rejectId, rejectReason);
            setPayments((prev) => prev.filter((p) => p.id !== rejectId));
            setRejectId(null);
            setRejectReason('');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reject');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={16} strokeWidth={2} />
                    Home
                </button>
                <h1>Pending Payments</h1>
                <div style={{ width: 72 }} />
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : payments.length === 0 ? (
                <div className="empty-state">
                    <CheckCircle2 size={44} style={{ opacity: 0.4, color: 'var(--success)' }} />
                    <p style={{ marginTop: 8 }}>No pending payments</p>
                    <p
                        style={{
                            marginTop: 4,
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                        }}
                    >
                        All caught up
                    </p>
                </div>
            ) : (
                payments.map((p) => {
                    const color = avatarColor(p.customer_name);
                    const letter = avatarLetter(p.customer_name);
                    const busy = processing === p.id;
                    return (
                        <div
                            key={p.id}
                            className="card"
                            style={{ marginBottom: 10, padding: 14 }}
                        >
                            {/* Customer + amount header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 10,
                                }}
                            >
                                <div
                                    className="customer-avatar"
                                    style={{
                                        background: color.bg,
                                        color: color.fg,
                                        width: 40,
                                        height: 40,
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    {letter}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontWeight: 600,
                                            fontSize: '0.98rem',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {p.customer_name}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.76rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        #{p.customer_number}
                                    </div>
                                </div>
                                <div
                                    className="amount-medium amount-positive"
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {formatAmount(p.amount)}
                                </div>
                            </div>

                            {/* Meta line */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                    fontSize: '0.78rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: 10,
                                }}
                            >
                                <span
                                    className="badge badge-info"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                    {modeIcon(p.payment_mode)}
                                    {p.payment_mode}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{p.transaction_date}</span>
                                <span>·</span>
                                <span>by {p.recorded_by_name ?? 'Unknown'}</span>
                                <span>·</span>
                                <span>{timeAgo(p.created_at)}</span>
                            </div>

                            {p.note && (
                                <div
                                    style={{
                                        fontSize: '0.82rem',
                                        color: 'var(--text-secondary)',
                                        padding: 8,
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: 10,
                                    }}
                                >
                                    {p.note}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-success"
                                    style={{ flex: 1, minHeight: 40 }}
                                    disabled={busy}
                                    onClick={() => handleApprove(p.id)}
                                >
                                    {busy ? (
                                        <div
                                            className="spinner"
                                            style={{ width: 14, height: 14, borderWidth: 2 }}
                                        />
                                    ) : (
                                        <>
                                            <Check size={16} strokeWidth={2.25} />
                                            Approve
                                        </>
                                    )}
                                </button>
                                <button
                                    className="btn btn-danger"
                                    style={{ flex: 1, minHeight: 40 }}
                                    disabled={busy}
                                    onClick={() => {
                                        setRejectId(p.id);
                                        setRejectReason('');
                                    }}
                                >
                                    <X size={16} strokeWidth={2.25} />
                                    Reject
                                </button>
                            </div>
                        </div>
                    );
                })
            )}

            {/* Reject reason modal */}
            {rejectId && (
                <div className="modal-backdrop" onClick={() => setRejectId(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 12,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: 'var(--danger-bg)',
                                        color: 'var(--danger)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <AlertCircle size={18} strokeWidth={2} />
                                </div>
                                <h3 style={{ fontSize: '1.05rem' }}>Reject Payment</h3>
                            </div>
                            <button
                                className="icon-btn"
                                onClick={() => setRejectId(null)}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="form-group">
                            <label>Reason (optional)</label>
                            <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Why is this being rejected?"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-outline"
                                style={{ flex: 1 }}
                                onClick={() => setRejectId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ flex: 1 }}
                                disabled={!!processing}
                                onClick={handleReject}
                            >
                                {processing ? '…' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
