/**
 * Format a Date as a local YYYY-MM-DD string
 */
export function toDateOnlyString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's local date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
    return toDateOnlyString(new Date());
}

/**
 * Parse a Date or YYYY-MM-DD string using local calendar semantics
 */
function parseDateInput(date: string | Date): Date {
    if (date instanceof Date) {
        return date;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    return new Date(date);
}

/**
 * Get current month-year string in 'YYYY-MM' format
 */
export function getCurrentMonthYear(): string {
    return getMonthYearFromDate(new Date());
}

/**
 * Get previous month-year string in 'YYYY-MM' format
 */
export function getPreviousMonthYear(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return getMonthYearFromDate(now);
}

/**
 * Extract 'YYYY-MM' from a date string or Date object
 */
export function getMonthYearFromDate(date: string | Date): string {
    const d = parseDateInput(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Format amount with currency symbol
 */
export function formatAmount(amount: number, symbol: string = '₹'): string {
    return `${symbol}${Number(amount).toFixed(2)}`;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Convert 'YYYY-MM' to 'Month YYYY' (e.g. '2026-04' -> 'April 2026').
 */
export function formatMonthYearLabel(monthYear: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(monthYear);
    if (!match) return monthYear;
    const [, year, mm] = match;
    const idx = Number(mm) - 1;
    return `${MONTH_NAMES[idx] ?? mm} ${year}`;
}
