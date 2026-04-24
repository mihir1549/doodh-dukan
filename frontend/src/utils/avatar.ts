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
