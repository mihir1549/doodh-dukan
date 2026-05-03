import { useState, useEffect } from 'react';
import {
    Milk, BookOpen, Settings as SettingsIcon, LogOut, X,
    CheckCircle2, Clock, XCircle, ArrowUpRight, ArrowDownLeft,
    Lock, Unlock, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { entryApi, summaryApi, userApi, ledgerApi } from '../api';

type Tab = 'CARD' | 'PASSBOOK';

const ENTRY_LABELS: Record<string, string> = {
    OPENING_BALANCE: 'Opening Balance',
    BILL_POSTED: 'Monthly Bill',
    PAYMENT: 'Payment',
    CARRY_FORWARD: 'Carried Forward',
    ADVANCE_ADJUSTED: 'Advance Adjusted',
    BILL_REVERSED: 'Bill reversed — month reopened',
};

function formatLedgerDate(d: string) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y.slice(2)}`;
}

function formatMonthYear(my: string) {
    const [y, m] = my.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatAmount(n: number) {
    return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function PassbookRow({ entry: e }: { entry: any }) {
    const isDebit = e.direction === 'DEBIT';
    const isRejected = e.status === 'REJECTED';
    const isPending = e.status === 'PENDING';
    const modeSuffix = e.payment_mode ? ` (${e.payment_mode})` : '';

    let desc = ENTRY_LABELS[e.entry_type] ?? e.entry_type;
    let statusIcon: React.ReactNode = null;
    if (e.entry_type === 'BILL_POSTED') {
        desc = `Bill · ${e.reference_month ? formatMonthYear(e.reference_month) : ''}`;
    } else if (e.entry_type === 'PAYMENT') {
        desc = `Payment${modeSuffix}`;
        if (isPending) statusIcon = <Clock size={13} strokeWidth={2} style={{ color: 'var(--warning)', flexShrink: 0 }} />;
        else if (isRejected) statusIcon = <XCircle size={13} strokeWidth={2} style={{ color: 'var(--danger)', flexShrink: 0 }} />;
        else statusIcon = <CheckCircle2 size={13} strokeWidth={2} style={{ color: 'var(--success)', flexShrink: 0 }} />;
    } else if (e.entry_type === 'BILL_REVERSED') {
        statusIcon = <RotateCcw size={13} strokeWidth={2} style={{ color: 'var(--success)', flexShrink: 0 }} />;
    }

    const sideColor = isPending
        ? 'var(--warning)'
        : isDebit
            ? 'rgba(239,68,68,0.5)'
            : 'rgba(16,185,129,0.5)';
    const amountColor = isDebit ? 'var(--danger)' : 'var(--success)';

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '12px 14px',
                background: isPending ? 'var(--warning-bg)' : 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderLeft: isRejected ? '1px solid var(--border-subtle)' : `3px solid ${sideColor}`,
                borderRadius: 'var(--radius-md)',
                opacity: isRejected ? 0.55 : 1,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        fontSize: '0.92rem',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {statusIcon}
                    <span style={{ wordBreak: 'break-word' }}>{desc}</span>
                </div>
                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    {formatLedgerDate(e.transaction_date)}
                </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {isPending && <span className="badge badge-warning">Pending</span>}
                    {isRejected && <span className="badge badge-muted">Rejected</span>}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, marginLeft: 'auto' }}>
                    <span
                        className="amount-medium"
                        style={{
                            color: amountColor,
                            textDecoration: isRejected ? 'line-through' : 'none',
                        }}
                    >
                        {formatAmount(e.amount)}
                    </span>
                    <span
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: amountColor,
                            textTransform: 'uppercase',
                        }}
                    >
                        {isDebit ? 'Debit' : 'Credit'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function MilkCard() {
    const { user, logout } = useAuth();
    const [tab, setTab] = useState<Tab>('CARD');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
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
        if (user?.customer_id && tab === 'CARD') loadData();
    }, [month, user, tab]);

    useEffect(() => {
        if (user?.customer_id && tab === 'PASSBOOK' && !passbookLoaded) loadPassbook();
    }, [tab, user, passbookLoaded]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [entriesRes, summaryRes] = await Promise.all([
                entryApi.listByMonth(month, user?.customer_id),
                summaryApi.list(month, user?.customer_id),
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

    const getDaysInMonth = (yearMonth: string) => {
        const [year, m] = yearMonth.split('-').map(Number);
        return new Date(year, m, 0).getDate();
    };

    const daysCount = getDaysInMonth(month);
    const dayRows = Array.from({ length: daysCount }, (_, i) => i + 1);

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
            setTimeout(() => logout(), 2000);
        } catch (err: any) {
            setPinStatus({ loading: false, error: err.response?.data?.message || 'Failed to change password', success: '' });
        }
    };

    const oweTopChip =
        passbookBalance > 0 ? (
            <div
                style={{
                    background: 'var(--danger-bg)',
                    border: `1px solid var(--danger)`,
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.85rem',
                    color: 'var(--danger)',
                    fontWeight: 600,
                }}
            >
                <ArrowUpRight size={16} strokeWidth={2} />
                <span>Balance due:</span>
                <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                    {formatAmount(passbookBalance)}
                </span>
            </div>
        ) : null;

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontSize: '1.15rem' }}>My Milk Card</h1>
                    <p
                        style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            marginTop: 2,
                        }}
                    >
                        {user?.shop_name}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        className="icon-btn"
                        onClick={() => setShowSettings(true)}
                        aria-label="Profile settings"
                        title="Profile"
                    >
                        <SettingsIcon size={18} strokeWidth={1.75} />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={logout}
                        aria-label="Logout"
                        title="Logout"
                        style={{ color: 'var(--danger)' }}
                    >
                        <LogOut size={18} strokeWidth={1.75} />
                    </button>
                </div>
            </div>

            {/* Balance chip at top if owing */}
            {oweTopChip}

            {/* Tab Switcher */}
            <div
                style={{
                    display: 'flex',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    padding: 4,
                    marginBottom: 20,
                    gap: 4,
                }}
            >
                {(['CARD', 'PASSBOOK'] as const).map((t) => {
                    const active = tab === t;
                    const label = t === 'CARD' ? 'My Card' : 'My Passbook';
                    const Icon = t === 'CARD' ? Milk : BookOpen;
                    return (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                background: active ? 'var(--brand-primary)' : 'transparent',
                                color: active ? '#fff' : 'var(--text-secondary)',
                                fontWeight: active ? 700 : 500,
                                fontFamily: 'var(--font-display)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Icon size={16} strokeWidth={2} />
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ========== CARD TAB ========== */}
            {tab === 'CARD' && (
                <>
                    {/* Month selector */}
                    <div style={{ marginBottom: 16 }}>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            style={{ fontFamily: 'var(--font-display)', textAlign: 'center' }}
                        />
                    </div>

                    {/* Summary */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 10,
                            marginBottom: 20,
                        }}
                    >
                        <div className="stat-card">
                            <div
                                style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                This Month
                            </div>
                            <div className="amount-medium amount-positive" style={{ marginTop: 4 }}>
                                ₹{Number(summary?.total_amount ?? 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div
                                style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Status
                            </div>
                            <div style={{ marginTop: 6 }}>
                                <span className={summary?.is_locked ? 'badge badge-muted' : 'badge badge-success'}>
                                    {summary?.is_locked ? (
                                        <>
                                            <Lock size={10} strokeWidth={2} /> Locked
                                        </>
                                    ) : (
                                        <>
                                            <Unlock size={10} strokeWidth={2} /> Open
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : (
                        <div
                            style={{
                                background: 'var(--bg-surface)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-subtle)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1fr 60px 60px',
                                    padding: '10px 14px',
                                    background: 'var(--bg-elevated)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                <div style={{ textAlign: 'center' }}>Date</div>
                                <div>Details</div>
                                <div style={{ textAlign: 'center' }}>By</div>
                                <div style={{ textAlign: 'right' }}>Time</div>
                            </div>

                            <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                                {dayRows.map((day) => {
                                    const dayEntries = entriesByDay[day] || [];
                                    const hasMilk = dayEntries.length > 0;

                                    const productTotals: Record<string, { qty: number; name: string; category: string }> = {};
                                    dayEntries.forEach((e: any) => {
                                        const pid = e.product?.id || 'unknown';
                                        if (!productTotals[pid]) {
                                            productTotals[pid] = {
                                                qty: 0,
                                                name: e.product?.name || 'Item',
                                                category: e.product?.category || '',
                                            };
                                        }
                                        productTotals[pid].qty += Number(e.quantity);
                                    });

                                    const detailsStr = Object.values(productTotals)
                                        .map((p) => {
                                            const qtyNum = Number(p.qty);
                                            const isLoose =
                                                p.name.toLowerCase().includes('loose') ||
                                                p.category === 'LOOSE_MILK';
                                            return isLoose
                                                ? `${qtyNum.toFixed(1)}L`
                                                : `${qtyNum}${p.name.split(' ')[0]}`;
                                        })
                                        .join(', ');

                                    const lastEntry = dayEntries[dayEntries.length - 1];
                                    const rawBy =
                                        hasMilk && (lastEntry?.entered_by_user?.name || lastEntry?.created_by_user?.name)
                                            ? (lastEntry.entered_by_user?.name || lastEntry.created_by_user?.name).split(' ')[0]
                                            : '';
                                    const createdBy = !rawBy
                                        ? '—'
                                        : rawBy.length > 8
                                            ? rawBy.slice(0, 8) + '…'
                                            : rawBy;

                                    return (
                                        <div
                                            key={day}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '40px 1fr 60px 60px',
                                                padding: '10px 14px',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                alignItems: 'center',
                                                fontSize: '0.88rem',
                                                background: hasMilk ? 'transparent' : 'rgba(255,255,255,0.015)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontWeight: 500,
                                                    color: hasMilk ? 'var(--text-secondary)' : 'var(--text-muted)',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {day}
                                            </div>
                                            <div
                                                style={{
                                                    color: hasMilk ? 'var(--text-primary)' : 'var(--text-muted)',
                                                    fontWeight: hasMilk ? 500 : 400,
                                                    fontSize: '0.88rem',
                                                    fontFamily: hasMilk ? 'var(--font-mono)' : 'var(--font-body)',
                                                }}
                                            >
                                                {hasMilk ? detailsStr : '—'}
                                            </div>
                                            <div
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    fontWeight: 400,
                                                    fontSize: '0.72rem',
                                                    textAlign: 'center',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {createdBy}
                                            </div>
                                            <div
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    fontWeight: 400,
                                                    fontSize: '0.72rem',
                                                    textAlign: 'right',
                                                    fontFamily: 'var(--font-mono)',
                                                }}
                                            >
                                                {hasMilk && lastEntry?.created_at
                                                    ? new Date(lastEntry.created_at).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false,
                                                    })
                                                    : '—'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <p
                        style={{
                            marginTop: 16,
                            textAlign: 'center',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                        }}
                    >
                        Showing entries for {new Date(month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </p>
                </>
            )}

            {/* ========== PASSBOOK TAB ========== */}
            {tab === 'PASSBOOK' && (
                <>
                    {/* Balance card */}
                    <div
                        style={{
                            background:
                                passbookBalance > 0
                                    ? 'var(--danger-bg)'
                                    : passbookBalance < 0
                                        ? 'var(--success-bg)'
                                        : 'var(--bg-elevated)',
                            border: `1px solid ${
                                passbookBalance > 0
                                    ? 'var(--danger)'
                                    : passbookBalance < 0
                                        ? 'var(--success)'
                                        : 'var(--border-subtle)'
                            }`,
                            borderRadius: 'var(--radius-lg)',
                            padding: '20px',
                            marginBottom: 16,
                            textAlign: 'center',
                        }}
                    >
                        {passbookBalance > 0 ? (
                            <>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: '0.72rem',
                                        color: 'var(--danger)',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: 6,
                                    }}
                                >
                                    <ArrowUpRight size={13} strokeWidth={2} />
                                    You owe
                                </div>
                                <div className="amount-large" style={{ color: 'var(--danger)' }}>
                                    {formatAmount(passbookBalance)}
                                </div>
                            </>
                        ) : passbookBalance < 0 ? (
                            <>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: '0.72rem',
                                        color: 'var(--success)',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: 6,
                                    }}
                                >
                                    <ArrowDownLeft size={13} strokeWidth={2} />
                                    Advance (credit)
                                </div>
                                <div className="amount-large" style={{ color: 'var(--success)' }}>
                                    {formatAmount(passbookBalance)}
                                </div>
                            </>
                        ) : (
                            <>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: '0.72rem',
                                        color: 'var(--success)',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: 6,
                                    }}
                                >
                                    <CheckCircle2 size={13} strokeWidth={2} />
                                    All settled
                                </div>
                                <div className="amount-large" style={{ color: 'var(--success)' }}>
                                    ₹0
                                </div>
                            </>
                        )}
                    </div>

                    {passbookLoading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : passbookEntries.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={40} style={{ opacity: 0.4 }} />
                            <p style={{ marginTop: 8 }}>No passbook entries yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {passbookEntries.map((e) => (
                                <PassbookRow key={e.id} entry={e} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Settings / PIN Modal */}
            {showSettings && (
                <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <h2 style={{ fontSize: '1.05rem' }}>Security Settings</h2>
                            <button
                                className="icon-btn"
                                onClick={() => setShowSettings(false)}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p
                            style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                marginBottom: 14,
                            }}
                        >
                            Update your 6-digit PIN used for login.
                        </p>
                        <div className="form-group">
                            <label>Current PIN</label>
                            <input
                                type="password"
                                inputMode="numeric"
                                value={pinData.oldPin}
                                onChange={(e) =>
                                    setPinData({
                                        ...pinData,
                                        oldPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                                    })
                                }
                                placeholder="Enter current PIN"
                                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>New PIN</label>
                            <input
                                type="password"
                                inputMode="numeric"
                                value={pinData.newPin}
                                onChange={(e) =>
                                    setPinData({
                                        ...pinData,
                                        newPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                                    })
                                }
                                placeholder="Enter new 6-digit PIN"
                                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}
                            />
                        </div>
                        {pinStatus.error && <div className="error-msg">{pinStatus.error}</div>}
                        {pinStatus.success && (
                            <div
                                style={{
                                    color: 'var(--success)',
                                    fontSize: '0.85rem',
                                    marginBottom: 14,
                                    fontWeight: 600,
                                }}
                            >
                                {pinStatus.success}
                            </div>
                        )}
                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleChangePassword}
                            disabled={pinStatus.loading || pinStatus.success !== ''}
                        >
                            {pinStatus.loading ? 'Updating…' : 'Change PIN'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
