import { useEffect, type ReactNode } from 'react';
import {
    Plus, PlusCircle, Pencil, Trash2, Lock, ArrowRight,
} from 'lucide-react';

export type RowState = 'EMPTY' | 'FILLED' | 'LOCKED';

interface ExistingEntrySummary {
    id: string;
    product_name: string;
    quantity: number;
    unit: string;
    line_total: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    date: string;                  // already formatted, e.g. "2 April 2026"
    rowState: RowState;
    existingEntry?: ExistingEntrySummary;
    onAdd: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onGoToSummary: () => void;
}

function formatAmount(n: number) {
    return `₹${Number(n).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export default function EntryActionSheet({
    isOpen,
    onClose,
    date,
    rowState,
    existingEntry,
    onAdd,
    onEdit,
    onDelete,
    onGoToSummary,
}: Props) {
    // Lock body scroll while open
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    if (!isOpen) return null;

    const summaryLine = existingEntry
        ? `${existingEntry.product_name} · ${existingEntry.quantity}${existingEntry.unit ? ' ' + existingEntry.unit : ''} · ${formatAmount(existingEntry.line_total)}`
        : null;

    return (
        <>
            <div className="sheet-backdrop" onClick={onClose} />
            <div className="sheet-content" role="dialog" aria-modal="true">
                <div className="sheet-handle" />

                {/* Header */}
                <div
                    style={{
                        padding: '8px 20px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <div
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {date}
                    </div>
                    {summaryLine && (
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.82rem',
                                color: 'var(--text-secondary)',
                                marginTop: 4,
                            }}
                        >
                            {summaryLine}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div role="menu" style={{ padding: '4px 0 12px' }}>
                    {rowState === 'LOCKED' ? (
                        <>
                            <Row
                                disabled
                                icon={<Lock size={18} strokeWidth={1.75} />}
                                label="Locked — month is closed"
                                helper="Unlock from Monthly Summary to edit entries."
                            />
                            <div style={{ padding: '4px 16px 8px' }}>
                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={() => { onClose(); onGoToSummary(); }}
                                >
                                    Go to Monthly Summary
                                    <ArrowRight size={16} strokeWidth={2} />
                                </button>
                            </div>
                        </>
                    ) : rowState === 'EMPTY' ? (
                        <Row
                            icon={<Plus size={18} strokeWidth={2} />}
                            label="Add Entry"
                            onClick={() => { onClose(); onAdd(); }}
                        />
                    ) : (
                        <>
                            <Row
                                icon={<PlusCircle size={18} strokeWidth={2} />}
                                label="Add Another"
                                onClick={() => { onClose(); onAdd(); }}
                            />
                            <Row
                                icon={<Pencil size={18} strokeWidth={2} />}
                                label="Edit"
                                onClick={() => { onClose(); onEdit(); }}
                            />
                            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                            <Row
                                danger
                                icon={<Trash2 size={18} strokeWidth={2} />}
                                label="Delete"
                                onClick={() => { onClose(); onDelete(); }}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function Row({
    icon, label, helper, onClick, danger, disabled,
}: {
    icon: ReactNode;
    label: string;
    helper?: string;
    onClick?: () => void;
    danger?: boolean;
    disabled?: boolean;
}) {
    const fg = danger ? 'var(--danger)' : 'var(--text-primary)';
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            role="menuitem"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                minHeight: 56,
                padding: '0 20px',
                background: 'transparent',
                border: 'none',
                color: fg,
                fontFamily: 'var(--font-display)',
                fontSize: '0.98rem',
                fontWeight: 600,
                cursor: disabled ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
                if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-overlay)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', color: fg, flexShrink: 0 }}>{icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
                <div>{label}</div>
                {helper && (
                    <div
                        style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 400,
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                        }}
                    >
                        {helper}
                    </div>
                )}
            </span>
        </button>
    );
}
