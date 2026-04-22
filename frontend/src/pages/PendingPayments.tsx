import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ledgerApi } from '../api';
import { useAuth } from '../AuthContext';

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
    return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const MODE_ICONS: Record<string, string> = { CASH: '💵', ONLINE: '📱', RAZORPAY: '💳' };

export default function PendingPayments() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    const isAdmin = ['OWNER', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase());

    useEffect(() => {
        if (!isAdmin) { navigate('/'); return; }
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
                <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
                <h1>Pending Payments</h1>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : payments.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <p>No pending payments</p>
                </div>
            ) : (
                payments.map((p) => (
                    <div key={p.id} className="card" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>
                                    #{p.customer_number} · {p.customer_name}
                                </div>
                                <div style={{ fontSize: '1.1rem', color: 'var(--success)', fontWeight: 700, margin: '4px 0' }}>
                                    {formatAmount(p.amount)} {MODE_ICONS[p.payment_mode] ?? ''} {p.payment_mode}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Date: {p.transaction_date} · by {p.recorded_by_name ?? 'Unknown'} · {timeAgo(p.created_at)}
                                </div>
                                {p.note && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        {p.note}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                            <button
                                className="btn btn-success"
                                style={{ flex: 1 }}
                                disabled={processing === p.id}
                                onClick={() => handleApprove(p.id)}
                            >
                                {processing === p.id ? '...' : '✅ Approve'}
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ flex: 1 }}
                                disabled={processing === p.id}
                                onClick={() => { setRejectId(p.id); setRejectReason(''); }}
                            >
                                ❌ Reject
                            </button>
                        </div>
                    </div>
                ))
            )}

            {/* Reject reason modal */}
            {rejectId && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '20px',
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                        <h3 style={{ marginBottom: '14px' }}>Reject Payment</h3>
                        <div className="form-group">
                            <label>Reason (optional)</label>
                            <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Why is this being rejected?"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setRejectId(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ flex: 1 }}
                                disabled={!!processing}
                                onClick={handleReject}
                            >
                                {processing ? '...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
