/**
 * Clean up address strings for display:
 * - Add space between a leading number and the following letters ("46Krupalu" → "46 Krupalu")
 * - Collapse consecutive whitespace
 * - Trim and optionally truncate with ellipsis
 */
export function formatAddress(raw?: string | null, maxLen = 34): string {
    if (!raw) return '';
    let s = raw.replace(/^(\d+)([A-Za-z])/, '$1 $2').replace(/\s+/g, ' ').trim();
    if (s.length > maxLen) s = s.slice(0, maxLen).trimEnd() + '…';
    return s;
}

/**
 * Font size for the .customer-id-badge based on how many digits we need to fit.
 * Default (1-2 digits) = 15px, 3 digits = 12px, 4+ digits = 10px.
 */
export function idBadgeFontSize(id?: number | string | null): number {
    if (id === undefined || id === null || id === '') return 15;
    const len = String(id).length;
    if (len >= 4) return 10;
    if (len === 3) return 12;
    return 15;
}
