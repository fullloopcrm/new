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

// Schemes allowed in href/src attributes. `javascript:` and `data:` are NOT
// here on purpose — those are the XSS-bearing schemes.
const ALLOWED_URL_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'sms'])

/**
 * Allowlist + escape a URL for use in an href/src attribute. Returns an escaped
 * URL when it uses an allowlisted scheme (or is scheme-relative/relative), else
 * '#'. Blocks `javascript:`/`data:` and, via escaping, attribute breakout on `"`.
 */
export function safeUrl(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '#'
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)
  if (scheme && !ALLOWED_URL_SCHEMES.has(scheme[1].toLowerCase())) return '#'
  return escapeHtml(raw)
}
