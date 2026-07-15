/**
 * Safe construction of PostgREST `.or()` filter strings from untrusted search
 * input.
 *
 * WHY THIS EXISTS
 * ---------------
 * The pattern `query.or(`name.ilike.%${search}%,email.ilike.%${search}%,...`)`
 * interpolates a raw, user-supplied `search` value into a PostgREST filter
 * string. PostgREST treats `, . : ( )` as structural characters inside that
 * string: commas separate sibling conditions, and `and(...)` / `or(...)` group.
 * So a `search` value containing those characters does not stay a literal search
 * term — it becomes additional filter *syntax*.
 *
 * THE FIX PRIMITIVE
 * -----------------
 * PostgREST lets a value be wrapped in double quotes to force every reserved
 * character inside it to be treated literally; inside the quotes, only `\` and
 * `"` need escaping (backslash). `%` and `_` remain LIKE wildcards, which is what
 * an `ilike` search wants. This module wraps the value that way so injected
 * commas / parens / dots collapse back into an inert literal.
 *
 * NOTE: `.or(filters)` in @supabase/postgrest-js appends a single URL query
 * param `or=(filters)` (the whole string, URL-encoded). Injection is therefore
 * confined *inside* that one OR group and can never add a sibling top-level
 * query param, so a separate `.eq('tenant_id', …)` filter is structurally
 * AND-ed and unreachable. This helper closes the in-group manipulation; the
 * separate tenant `.eq()` is what enforces cross-tenant isolation.
 */

/**
 * Escape a single value for literal use inside a PostgREST filter string by
 * double-quoting it. Reserved chars (`,` `.` `:` `(` `)`) become literal; `\`
 * and `"` are backslash-escaped. LIKE wildcards (`%`, `_`) are preserved.
 */
export function escapePostgrestFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

/**
 * Build a safe PostgREST OR-filter string that ILIKE-matches `search` against
 * each of `columns`. The search term is wrapped `%…%` and quote-escaped, so a
 * malicious `search` cannot inject additional conditions or restructure the
 * group.
 *
 * @example
 *   buildIlikeOrFilter(['name', 'email', 'phone'], userSearch)
 *   // name.ilike."%userSearch%",email.ilike."%userSearch%",phone.ilike."%userSearch%"
 */
export function buildIlikeOrFilter(columns: readonly string[], search: string): string {
  const safeValue = escapePostgrestFilterValue(`%${search}%`)
  return columns.map((col) => `${col}.ilike.${safeValue}`).join(',')
}
