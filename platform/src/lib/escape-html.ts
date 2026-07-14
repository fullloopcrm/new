/**
 * Escape a value for safe interpolation into HTML **text/content** context
 * (e.g. email bodies built with template literals). Prevents stored/reflected
 * XSS when user-supplied fields (names, notes, messages, addresses) are placed
 * inside HTML we send to admins or other users.
 *
 * This is for text and double-quoted attribute contexts. It is NOT sufficient
 * for unquoted attributes, URLs, `<script>`/`<style>` bodies, or JS contexts.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
