/**
 * Sanitize a value before interpolating it into a PostgREST filter string
 * (e.g. supabase `.or('name.ilike.%' + term + '%,...')`).
 *
 * PostgREST parses `.or()` / `.filter()` values as a small grammar:
 *   - `,`     separates sibling conditions
 *   - `(` `)` open/close nested and()/or() logic trees
 *   - `"`     quotes a value
 *   - `\`     escapes inside a quoted value
 *
 * If any of those reach the filter string from user input, an attacker can
 * break out of the intended `column.ilike.value` and inject extra conditions
 * (column enumeration, cross-column probing, query errors). Stripping the
 * structural characters keeps the value confined to its operator.
 *
 * Letters, digits, spaces, `@`, `.`, `-`, `+`, `%`, `_` are preserved so that
 * email/phone/name search continues to work (dots after `column.op.` are
 * literal to PostgREST, so they are safe to keep).
 */
export function sanitizePostgrestValue(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  return String(raw)
    .replace(/[,()"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Escape LIKE/ILIKE wildcard metacharacters (`%`, `_`) and the escape
 * character itself (`\`) so a value passed to `.ilike()` matches only
 * literally. Postgres' default LIKE escape character is `\`.
 *
 * sanitizePostgrestValue() deliberately preserves `%`/`_` because most of
 * its call sites build an intentional `%term%` substring search. This
 * helper is for the opposite case: an "exact match, case-insensitive"
 * `.ilike('column', value)` lookup, where a caller-controlled `%` or `_`
 * changes matching semantics instead of just being a literal character —
 * e.g. an anonymous request with `email: "%"` matching an arbitrary
 * existing row instead of failing to match anything.
 */
export function escapeLikeValue(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  return String(raw).replace(/[\\%_]/g, '\\$&')
}
