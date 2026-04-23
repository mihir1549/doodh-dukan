import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { entryApi, summaryApi, userApi, ledgerApi } from '../api';

type Tab = 'CARD' | 'PASSBOOK';

const ENTRY_LABELS: Record<string, string> = {
    OPENING_BALANCE: 'Opening Balance',
    BILL_POSTED: 'Monthly Bill',
    PAYMENT: 'Payment',
    CARRY_FORWARD: 'Carried Forward',
    ADVANCE_ADJUSTED: 'Advance Adjusted',
};

function formatLedgerDate(d: string) {
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
    return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function MilkCard() {
    const { user, logout } = useAuth();
    const [tab, setTab] = useState<Tab>('CARD');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [entries, setEntries] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Passbook state
    const [passbookEntries, setPassbookEntries] = useState<any[]>([]);
    const [passbookBalance, setPassbookBalance] = useState<number>(0);
    const [passbookLoading, setPassbookLoading] = useState(false);
    const [passbookLoaded, setPassbookLoaded] = useState(false);

    const [showSettings, setShowSettings] = useState(false);
    const [pinData, setPinData] = useState({ oldPin: '', newPin: '' });
    const [pinStatus, setPinStatus] = useState({ loading: false, error: '', success: '' });

    useEffect(() => {
        if (user?.customer_id && tab === 'CARD') {
            loadData();
        }
    }, [month, user, tab]);

    useEffect(() => {
        if (user?.customer_id && tab === 'PASSBOOK' && !passbookLoaded) {
            loadPassbook();
        }
    }, [tab, user, passbookLoaded]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [entriesRes, summaryRes] = await Promise.all([
                entryApi.listByMonth(month, user?.customer_id),
                summaryApi.list(month, user?.customer_id)
            ]);
            setEntries(entriesRes.data?.data || []);
            setSummary(summaryRes.data?.data?.[0] || null);
        } catch (err) {
            console.error('Failed to load milk card data', err);
        } finally {
            setLoading(false);
        }
    };

    const loadPassbook = async () => {
        if (!user?.customer_id) return;
        setPassbookLoading(true);
        try {
            const [ledgerRes, balRes] = await Promise.all([
                ledgerApi.getCustomerLedger(user.customer_id, { page: 1, limit: 100 }),
                ledgerApi.getCustomerBalance(user.customer_id),
            ]);
            setPassbookEntries(ledgerRes.data?.data?.data || []);
            setPassbookBalance(Number(balRes.data?.data?.current_balance ?? 0));
            setPassbookLoaded(true);
        } catch (err) {
            console.error('Failed to load passbook', err);
        } finally {
            setPassbookLoading(false);
        }
    };

    // Helper to get days in month
    const getDaysInMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-').map(Number);
        return new Date(year, month, 0).getDate();
    };

    const daysCount = getDaysInMonth(month);
    const dayRows = Array.from({ length: daysCount }, (_, i) => i + 1);

    // Group entries by day
    const entriesByDay = entries.reduce((acc: any, entry: any) => {
        const day = new Date(entry.entry_date).getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(entry);
        return acc;
    }, {});

    const handleChangePassword = async () => {
        if (pinData.oldPin.length < 4 || pinData.newPin.length < 4) {
            setPinStatus({ loading: false, error: 'PIN must be at least 4 digits', success: '' });
            return;
        }
        setPinStatus({ loading: true, error: '', success: '' });
        try {
            await userApi.changePassword(pinData);
            setPinStatus({ loading: false, error: '', success: 'Password changed successfully! Please login again.' });
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (err: any) {
            setPinStatus({ loading: false, error: err.response?.data?.message || 'Failed to change password', success: '' });
        }
    };

    return (
        <div className="page" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>My Milk Card</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.shop_name}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setShowSettings(true)}
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        ⚙️ <span className="hide-mobile">Profile</span>
                    </button>
                    <button
                        onClick={logout}
                        style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div style={{
                display: 'flex',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                padding: '4px',
                marginBottom: '20px',
                gap: '4px',
            }}>
                <button
                    onClick={() => setTab('CARD')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: tab === 'CARD' ? 'var(--accent)' : 'transparent',
                        color: tab === 'CARD' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: tab === 'CARD' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'all 0.15s',
                    }}
                >
                    🥛 My Card
                </button>
                <button
                    onClick={() => setTab('PASSBOOK')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: tab === 'PASSBOOK' ? 'var(--accent)' : 'transparent',
                        color: tab === 'PASSBOOK' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: tab === 'PASSBOOK' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'all 0.15s',
                    }}
                >
                    📒 My Passbook
                </button>
            </div>

            {/* Month Selector — only on Card tab */}
            {tab === 'CARD' && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        style={{
                            flex: 1, padding: '12px', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)', background: 'var(--bg-card)',
                            color: 'var(--text-primary)', fontSize: '1rem'
                        }}
                    />
                </div>
            )}

            {/* ========== CARD TAB ========== */}
            {tab === 'CARD' && (
            <>
            {/* Summary Info */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px'
            }}>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>This Month Total</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                        ₹{summary?.total_amount?.toFixed(2) || '0.00'}
                    </div>
                </div>
                <div style={{ background: 'var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Status</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {summary?.is_locked ? '✅ PAID' : '🕒 PENDING'}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '50px 1fr 60px 70px',
                        padding: '12px', background: 'var(--bg-page)', borderBottom: '2px solid var(--border)',
                        fontWeight: 700, fontSize: '0.8rem', textAlign: 'left', color: 'var(--text-secondary)'
                    }}>
                        <div style={{ textAlign: 'center' }}>DATE</div>
                        <div>DETAILS</div>
                        <div style={{ textAlign: 'center' }}>BY</div>
                        <div style={{ textAlign: 'right' }}>TIME</div>
                    </div>

                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {dayRows.map(day => {
                            const dayEntries = entriesByDay[day] || [];
                            const hasMilk = dayEntries.length > 0;

                            // Aggregate products by ID
                            const productTotals: Record<string, { qty: number; name: string; category: string }> = {};
                            dayEntries.forEach((e: any) => {
                                const pid = e.product?.id || 'unknown';
                                if (!productTotals[pid]) {
                                    productTotals[pid] = { qty: 0, name: e.product?.name || 'Item', category: e.product?.category || '' };
                                }
                                productTotals[pid].qty += Number(e.quantity);
                            });

                            const detailsStr = Object.values(productTotals).map(p => {
                                const qtyNum = Number(p.qty);
                                const isLoose = p.name.toLowerCase().includes('loose') || p.category === 'LOOSE_MILK';
                                if (isLoose) {
                                    return `${qtyNum.toFixed(1)}L`;
                                } else {
                                    return `${qtyNum}${p.name.split(' ')[0]}`;
                                }
                            }).join(', ');

                            const createdBy = hasMilk && dayEntries[dayEntries.length - 1].entered_by_user?.name
                                ? dayEntries[dayEntries.length - 1].entered_by_user.name.split(' ')[0]
                                : '-';

                            return (
                                <div key={day} style={{
                                    display: 'grid', gridTemplateColumns: '50px 1fr 60px 70px',
                                    padding: '12px', borderBottom: '1px solid var(--border)',
                                    alignItems: 'center', fontSize: '1rem',
                                    background: hasMilk ? 'transparent' : 'rgba(239, 68, 68, 0.05)'
                                }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>{day}</div>

                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                        {hasMilk ? detailsStr : <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>✕</span>}
                                    </div>

                                    <div style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {createdBy}
                                    </div>

                                    <div style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'right' }}>
                                        {hasMilk ? (
                                            new Date(dayEntries[dayEntries.length - 1].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                        ) : '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            )}

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing entries for {new Date(month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
            </>
            )}

            {/* ========== PASSBOOK TAB ========== */}
            {tab === 'PASSBOOK' && (
                <>
                    {/* Balance Card */}
                    <div style={{
                        background: passbookBalance > 0 ? 'var(--danger-light)' : passbookBalance < 0 ? 'var(--success-light)' : 'var(--bg-card)',
                        border: `1px solid ${passbookBalance > 0 ? 'var(--danger)' : passbookBalance < 0 ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '20px',
                        marginBottom: '20px',
                        textAlign: 'center',
                    }}>
                        {passbookBalance > 0 ? (
                            <>
                                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, marginBottom: '4px' }}>You owe</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)' }}>
                                    {formatAmount(passbookBalance)}
                                </div>
                            </>
                        ) : passbookBalance < 0 ? (
                            <>
                                <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginBottom: '4px' }}>Advance (credit)</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>
                                    {formatAmount(passbookBalance)}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginBottom: '4px' }}>Status</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                                    All settled ✅
                                </div>
                            </>
                        )}
                    </div>

                    {/* Passbook Table */}
                    {passbookLoading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : passbookEntries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📒</div>
                            <p>No passbook entries yet</p>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '70px 1fr 80px 80px',
                                gap: '4px',
                                padding: '10px',
                                background: 'var(--bg-secondary)',
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                fontWeight: 700,
                                borderBottom: '1px solid var(--border)',
                            }}>
                                <span>DATE</span>
                                <span>DESCRIPTION</span>
                                <span style={{ textAlign: 'right' }}>DEBIT</span>
                                <span style={{ textAlign: 'right' }}>CREDIT</span>
                            </div>

                            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {passbookEntries.map((e) => {
                                    const isDebit = e.direction === 'DEBIT';
                                    const isRejected = e.status === 'REJECTED';
                                    const isPending = e.status === 'PENDING';
                                    const modeSuffix = e.payment_mode ? ` (${e.payment_mode})` : '';

                                    let desc = ENTRY_LABELS[e.entry_type] ?? e.entry_type;
                                    if (e.entry_type === 'BILL_POSTED') {
                                        desc = `Bill – ${e.reference_month ? formatMonthYear(e.reference_month) : ''}`;
                                    } else if (e.entry_type === 'PAYMENT') {
                                        const suffix = isRejected ? '❌ Rejected' : isPending ? '⏳ Pending' : '✅';
                                        desc = `Payment${modeSuffix} ${suffix}`;
                                    }

                                    return (
                                        <div key={e.id} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '70px 1fr 80px 80px',
                                            gap: '4px',
                                            padding: '10px',
                                            borderBottom: '1px solid var(--border)',
                                            background: isRejected ? 'transparent' : isDebit ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)',
                                            opacity: isRejected ? 0.5 : 1,
                                            textDecoration: isRejected ? 'line-through' : 'none',
                                            fontSize: '0.85rem',
                                            alignItems: 'center',
                                        }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                {formatLedgerDate(e.transaction_date)}
                                            </span>
                                            <span>{desc}</span>
                                            <span style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: isDebit ? 700 : 400 }}>
                                                {isDebit ? formatAmount(e.amount) : ''}
                                            </span>
                                            <span style={{ textAlign: 'right', color: 'var(--success)', fontWeight: !isDebit ? 700 : 400 }}>
                                                {!isDebit ? formatAmount(e.amount) : ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Settings / Password Modal */}
            {showSettings && (
                <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>⚙️ Security Settings</h2>
                            <button className="icon-btn" onClick={() => setShowSettings(false)}>×</button>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Update your 6-digit PIN used for login.
                        </p>

                        <div className="form-group">
                            <label>Current PIN</label>
                            <input
                                type="password"
                                inputMode="numeric"
                                value={pinData.oldPin}
                                onChange={e => setPinData({ ...pinData, oldPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                placeholder="Enter current PIN"
                            />
                        </div>

                        <div className="form-group">
                            <label>New PIN</label>
                            <input
                                type="password"
                                inputMode="numeric"
                                value={pinData.newPin}
                                onChange={e => setPinData({ ...pinData, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                placeholder="Enter new 6-digit PIN"
                            />
                        </div>

                        {pinStatus.error && <div className="error-msg">{pinStatus.error}</div>}
                        {pinStatus.success && <div style={{ color: 'var(--success)', fontSize: '0.9rem', marginBottom: '16px', fontWeight: 600 }}>{pinStatus.success}</div>}

                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleChangePassword}
                            disabled={pinStatus.loading || pinStatus.success !== ''}
                        >
                            {pinStatus.loading ? 'Updating...' : 'Change PIN'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
