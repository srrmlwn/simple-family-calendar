/**
 * Escapes a string for safe interpolation into HTML.
 * Prevents XSS when user-controlled data is embedded in email templates.
 */
export function escapeHtml(str: string | null | undefined): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
