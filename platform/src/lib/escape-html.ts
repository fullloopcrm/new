/**
 * Escape HTML-significant characters so untrusted text cannot inject markup
 * when interpolated into an HTML string (e.g. admin-notification email bodies).
 *
 * Mirrors the local escapeHtml already used by /api/requests, but shared so the
 * public lead-capture routes can reuse it. Accepts unknown because these routes
 * read raw, unvalidated JSON bodies; null/undefined collapse to an empty string.
 */
export function escapeHtml(value: unknown): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return String(value ?? '').replace(/[&<>"']/g, (char) => map[char])
}
