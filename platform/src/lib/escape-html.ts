// HTML-escaping helpers for building HTML strings out of untrusted data
// (email bodies, dangerouslySetInnerHTML). Prevents HTML/content injection and
// DOM-XSS from customer/tenant-controlled fields. Use these instead of raw
// `${value}` interpolation anywhere a string lands inside markup.

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escape a value for safe interpolation into HTML text or a quoted attribute.
 * Nullish becomes an empty string. `&` is escaped first so already-escaped
 * entities are not double-decoded.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}

// Schemes allowed in href/src attributes. `javascript:` and `data:` are NOT
// here on purpose — those are the XSS-bearing schemes.
const ALLOWED_URL_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'sms'])

/**
 * Allowlist + escape a URL for use in an href/src attribute. Returns an escaped
 * URL when it uses an allowlisted scheme (or is scheme-relative/relative), else
 * '#'. Blocks `javascript:`/`data:` and, via escaping, attribute breakout on `"`.
 */
export function safeUrl(url: unknown): string {
  const raw = String(url ?? '').trim()
  if (!raw) return '#'
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)
  if (scheme && !ALLOWED_URL_SCHEMES.has(scheme[1].toLowerCase())) return '#'
  return escapeHtml(raw)
}

/**
 * Serialize a value for injection into a `<script type="application/ld+json">`
 * via dangerouslySetInnerHTML. Escapes `<` to its `<` unicode form so a
 * `</script>` sequence inside a string value cannot break out of the script
 * element (the JSON-LD XSS vector). This is the canonical JSON-LD serializer —
 * use it for every JSON-LD sink instead of a bare `JSON.stringify`.
 *
 * NOTE: do NOT use escapeHtml() here — inside JSON, `<` must become `<`,
 * not `&lt;`. `&lt;` would corrupt the structured-data payload that crawlers
 * parse, while still (incidentally) blocking the breakout. The unicode escape
 * is both safe AND preserves valid JSON.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
