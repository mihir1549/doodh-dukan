/**
 * Get current month-year string in 'YYYY-MM' format
 */
export function getCurrentMonthYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get previous month-year string in 'YYYY-MM' format
 */
export function getPreviousMonthYear(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Extract 'YYYY-MM' from a date string or Date object
 */
export function getMonthYearFromDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
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
