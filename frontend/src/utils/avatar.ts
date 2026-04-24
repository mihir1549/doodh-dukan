const AVATAR_COLORS = [
    { bg: 'rgba(59, 130, 246, 0.2)',  fg: '#60a5fa' },
    { bg: 'rgba(16, 185, 129, 0.2)',  fg: '#34d399' },
    { bg: 'rgba(245, 158, 11, 0.2)',  fg: '#fbbf24' },
    { bg: 'rgba(236, 72, 153, 0.2)',  fg: '#f472b6' },
    { bg: 'rgba(139, 92, 246, 0.2)',  fg: '#a78bfa' },
    { bg: 'rgba(6, 182, 212, 0.2)',   fg: '#22d3ee' },
    { bg: 'rgba(239, 68, 68, 0.2)',   fg: '#f87171' },
    { bg: 'rgba(168, 85, 247, 0.2)',  fg: '#c084fc' },
];

export function avatarColor(name?: string | null) {
    if (!name) return AVATAR_COLORS[0];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function avatarLetter(name?: string | null) {
    return name?.trim().charAt(0)?.toUpperCase() || '?';
}

/**
 * Clean up address strings:
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
