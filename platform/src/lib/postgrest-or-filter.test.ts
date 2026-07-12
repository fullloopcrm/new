import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { escapePostgrestFilterValue, buildIlikeOrFilter } from './postgrest-or-filter'

/**
 * Guard: PostgREST `.or()` filter-string injection via user search input.
 *
 * BACKGROUND (see deploy-prep/or-filter-injection-determination.md)
 * -----------------------------------------------------------------
 * Routes build a search filter as
 *   query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
 * PostgREST parses that string structurally: a top-level comma STARTS A NEW
 * CONDITION, and `and(...)`/`or(...)` group. So a raw `search` containing a comma
 * or parens is not a literal term — it is injected filter *syntax*.
 *
 * This file codifies two things:
 *   1. WITNESS — the raw interpolation pattern (what the routes do today) lets a
 *      crafted `search` add extra conditions to the OR group. Modelled with a
 *      faithful top-level condition splitter (the exact surface PostgREST parses).
 *   2. GUARD — `buildIlikeOrFilter` (the parameterize/escape fix primitive)
 *      double-quotes the value so injected commas / parens / quotes collapse into
 *      an inert literal: exactly N conditions, payload contained, no cross-column
 *      or `tenant_id` predicate introduced.
 *   3. ISOLATION INVARIANT — a static scan proving every tenant-scoped injectable
 *      `.or()` is AND-ed with a sibling `.eq('tenant_id', …)`. Because injection
 *      is confined *inside* the single `or=(…)` query param (verified in
 *      @supabase/postgrest-js), it can never reach that separate tenant filter —
 *      so no `search` value can cross tenants. If a refactor drops the tenant
 *      `.eq()`, this scan goes RED.
 *
 * HONEST SCOPE:
 *   • The splitter models PostgREST's *top-level condition* boundary — the thing
 *     the injection actually attacks. It is not a full PostgREST grammar.
 *   • The isolation scan asserts line-adjacency of `.eq('tenant_id')` to the
 *     injectable `.or()` in the four tenant-scoped client-search routes. It does
 *     NOT re-derive PostgREST AND-composition (that is argued in the doc); it
 *     guards that the tenant filter is still present and chained.
 *   • This test does not by itself fix the routes — the routes still interpolate
 *     raw today. It guards the fix primitive and the isolation boundary so the
 *     eventual wiring (or a regression) is verifiable.
 */

// ---------------------------------------------------------------------------
// Model of the surface PostgREST actually parses: split a `.or()` filter string
// into its top-level conditions. A comma delimits a condition ONLY when it is
// not inside double quotes and not inside a parenthesised and()/or() group.
// This mirrors why the injection works and why quoting defeats it.
// ---------------------------------------------------------------------------
function splitTopLevelConditions(filters: string): string[] {
  const out: string[] = []
  let depth = 0
  let inQuote = false
  let cur = ''
  for (let i = 0; i < filters.length; i++) {
    const c = filters[i]
    if (inQuote) {
      if (c === '\\') {
        // Escaped char inside a quoted value — consume the next char literally.
        cur += c + (filters[i + 1] ?? '')
        i++
        continue
      }
      if (c === '"') {
        inQuote = false
        cur += c
        continue
      }
      cur += c
      continue
    }
    if (c === '"') { inQuote = true; cur += c; continue }
    if (c === '(') { depth++; cur += c; continue }
    if (c === ')') { depth--; cur += c; continue }
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  if (cur.length > 0) out.push(cur)
  return out
}

/** The UNSAFE pattern the routes use today (raw interpolation). For witnessing. */
function buildRawIlikeOr(columns: readonly string[], search: string): string {
  return columns.map((c) => `${c}.ilike.%${search}%`).join(',')
}

const CLIENT_COLS = ['name', 'email', 'phone'] as const

describe('splitTopLevelConditions — model sanity', () => {
  it('splits a benign 3-condition filter into exactly 3', () => {
    const raw = buildRawIlikeOr(CLIENT_COLS, 'alice')
    expect(splitTopLevelConditions(raw)).toEqual([
      'name.ilike.%alice%',
      'email.ilike.%alice%',
      'phone.ilike.%alice%',
    ])
  })

  it('does NOT split on a comma inside a double-quoted value', () => {
    expect(splitTopLevelConditions('name.ilike."%a,b%"')).toEqual(['name.ilike."%a,b%"'])
  })

  it('does NOT split on a comma inside an and(...) group', () => {
    expect(splitTopLevelConditions('a.eq.1,and(b.eq.2,c.eq.3)')).toEqual([
      'a.eq.1',
      'and(b.eq.2,c.eq.3)',
    ])
  })
})

describe('WITNESS — raw interpolation is injectable', () => {
  it('a comma in search injects extra OR conditions (filter structure changes)', () => {
    // Attacker wants to add a predicate on a column they did not intend to query.
    const malicious = 'x,status.eq.vip'
    const raw = buildRawIlikeOr(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(raw)

    // Intended: 3 conditions. Injected: more than 3.
    expect(conditions.length).toBeGreaterThan(3)
    // And a `status.eq.*` predicate the caller never asked for now exists.
    expect(conditions.some((c) => /(^|%)status\.eq\.vip/.test(c))).toBe(true)
  })

  it('a parenthesis in search can open a grouping the caller never wrote', () => {
    const malicious = 'x,or(email.ilike.%a%'
    const raw = buildRawIlikeOr(CLIENT_COLS, malicious)
    // The raw string now contains attacker `or(` grouping syntax verbatim.
    expect(raw).toContain('or(email.ilike.%a%')
  })
})

describe('GUARD — buildIlikeOrFilter neutralizes injection', () => {
  it('escapePostgrestFilterValue quotes and backslash-escapes " and \\', () => {
    expect(escapePostgrestFilterValue('plain')).toBe('"plain"')
    expect(escapePostgrestFilterValue('a"b')).toBe('"a\\"b"')
    expect(escapePostgrestFilterValue('a\\b')).toBe('"a\\\\b"')
    // LIKE wildcards are preserved (intended for ilike).
    expect(escapePostgrestFilterValue('%a%')).toBe('"%a%"')
  })

  it('a comma-injection search still yields EXACTLY 3 conditions', () => {
    const malicious = 'x,status.eq.vip'
    const safe = buildIlikeOrFilter(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(safe)

    expect(conditions).toHaveLength(3)
    // Each condition is a well-formed ilike on an intended column with the whole
    // payload trapped inside one quoted literal.
    expect(conditions).toEqual([
      'name.ilike."%x,status.eq.vip%"',
      'email.ilike."%x,status.eq.vip%"',
      'phone.ilike."%x,status.eq.vip%"',
    ])
    // No top-level `status.eq` predicate leaked out of the quotes.
    expect(conditions.some((c) => /^status\.eq/.test(c.trim()))).toBe(false)
  })

  it('a quote-breakout attempt cannot terminate the literal early', () => {
    // Attacker tries to close the double-quote and inject `,is_admin.eq.true`.
    const malicious = '%","x":"'
    const safe = buildIlikeOrFilter(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(safe)
    // Quoting + backslash-escaping keeps it to the intended column count.
    expect(conditions).toHaveLength(3)
    for (const c of conditions) {
      expect(c).toMatch(/^(name|email|phone)\.ilike\."/)
    }
  })

  it('a cross-tenant payload cannot introduce a top-level tenant_id predicate', () => {
    // Attacker tries to inject `tenant_id.neq.<other>` into the OR group.
    const otherTenant = '00000000-0000-0000-0000-000000000000'
    const malicious = `a%,tenant_id.neq.${otherTenant},name.ilike.%b`
    const safe = buildIlikeOrFilter(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(safe)

    expect(conditions).toHaveLength(3)
    // No condition is a bare tenant_id predicate — the payload is inert text
    // inside each quoted ilike value.
    expect(conditions.some((c) => /^tenant_id\./.test(c.trim()))).toBe(false)
    for (const c of conditions) expect(c).toContain(`.ilike."`)
  })
})

// ---------------------------------------------------------------------------
// ISOLATION INVARIANT — every tenant-scoped client-search `.or()` is AND-ed with
// a sibling `.eq('tenant_id', …)`. These are the sites enumerated in
// deploy-prep/or-filter-injection-determination.md. The two admin super-admin
// views (admin/clients, admin/activity) are intentionally cross-tenant and are
// NOT in this list.
// ---------------------------------------------------------------------------
const API_ROOT = path.join(process.cwd(), 'src', 'app', 'api')

const TENANT_SCOPED_SEARCH_ROUTES = [
  'clients/route.ts',
  'admin/comhub/search-recipients/route.ts',
  'admin/ai-chat/route.ts',
  'ai/assistant/route.ts',
] as const

describe('ISOLATION INVARIANT — tenant-scoped .or() searches stay AND-ed with tenant_id', () => {
  it('the enumerated route files all exist (guards against a vacuous pass)', () => {
    for (const rel of TENANT_SCOPED_SEARCH_ROUTES) {
      const full = path.join(API_ROOT, rel)
      expect(fs.existsSync(full), `expected route file at ${full}`).toBe(true)
    }
  })

  it('every interpolated `.or(...ilike...${...})` has a tenant_id .eq() just above it', () => {
    const offenders: string[] = []

    for (const rel of TENANT_SCOPED_SEARCH_ROUTES) {
      const full = path.join(API_ROOT, rel)
      const lines = fs.readFileSync(full, 'utf8').split('\n')

      lines.forEach((line, idx) => {
        // An injectable OR: `.or(` + template literal containing `ilike` and `${`.
        const isInjectableOr =
          /\.or\(\s*`/.test(line) && line.includes('ilike') && line.includes('${')
        if (!isInjectableOr) return

        // Look back a few lines for the sibling tenant filter in the same chain.
        const window = lines.slice(Math.max(0, idx - 6), idx).join('\n')
        if (!/\.eq\(\s*['"]tenant_id['"]/.test(window)) {
          offenders.push(`${rel}:${idx + 1} — ${line.trim()}`)
        }
      })
    }

    expect(
      offenders,
      `Tenant-scoped client-search .or() must be AND-ed with a sibling .eq('tenant_id'). ` +
        `Offenders (injectable OR with no adjacent tenant filter):\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('sanity: the scan actually matched injectable .or() lines (not zero)', () => {
    let matches = 0
    for (const rel of TENANT_SCOPED_SEARCH_ROUTES) {
      const src = fs.readFileSync(path.join(API_ROOT, rel), 'utf8')
      for (const line of src.split('\n')) {
        if (/\.or\(\s*`/.test(line) && line.includes('ilike') && line.includes('${')) matches++
      }
    }
    // 4 files, ≥1 injectable OR each (search-recipients has 2).
    expect(matches).toBeGreaterThanOrEqual(4)
  })
})
