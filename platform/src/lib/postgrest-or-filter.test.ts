import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { escapePostgrestFilterValue, buildIlikeOrFilter } from './postgrest-or-filter'

/**
 * Guard: PostgREST `.or()` filter-string injection via user search input.
 *
 * BACKGROUND
 * ----------
 * Routes built a search filter as
 *   query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
 * PostgREST parses that string structurally: a top-level comma STARTS A NEW
 * CONDITION, and `and(...)`/`or(...)` group. So a raw `search` containing a comma
 * or parens is not a literal term — it is injected filter *syntax*.
 *
 * This file codifies three things:
 *   1. WITNESS — the raw interpolation pattern (what the routes did before this
 *      fix) lets a crafted `search` add extra conditions to the OR group.
 *      Modelled with a faithful top-level condition splitter (the exact surface
 *      PostgREST parses).
 *   2. GUARD — `buildIlikeOrFilter` (the parameterize/escape fix primitive)
 *      double-quotes the value so injected commas / parens / quotes collapse into
 *      an inert literal: exactly N conditions, payload contained, no cross-column
 *      or `tenant_id` predicate introduced.
 *   3. ISOLATION INVARIANT — a static scan proving every previously-raw `.or()`
 *      site on this branch now goes through the safe builder, and that
 *      tenant-scoped routes stay AND-ed with a sibling `.eq('tenant_id', …)`.
 *      Because injection is confined *inside* the single `or=(…)` query param
 *      (verified in @supabase/postgrest-js), it can never reach that separate
 *      tenant filter — so no `search` value can cross tenants.
 *
 * HONEST SCOPE: the splitter models PostgREST's *top-level condition* boundary
 * — the thing the injection actually attacks. It is not a full PostgREST
 * grammar.
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

/** The UNSAFE pattern the routes used before this fix (raw interpolation). For witnessing. */
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
    const malicious = 'x,status.eq.vip'
    const raw = buildRawIlikeOr(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(raw)

    expect(conditions.length).toBeGreaterThan(3)
    expect(conditions.some((c) => /(^|%)status\.eq\.vip/.test(c))).toBe(true)
  })

  it('a parenthesis in search can open a grouping the caller never wrote', () => {
    const malicious = 'x,or(email.ilike.%a%'
    const raw = buildRawIlikeOr(CLIENT_COLS, malicious)
    expect(raw).toContain('or(email.ilike.%a%')
  })
})

describe('GUARD — buildIlikeOrFilter neutralizes injection', () => {
  it('escapePostgrestFilterValue quotes and backslash-escapes " and \\', () => {
    expect(escapePostgrestFilterValue('plain')).toBe('"plain"')
    expect(escapePostgrestFilterValue('a"b')).toBe('"a\\"b"')
    expect(escapePostgrestFilterValue('a\\b')).toBe('"a\\\\b"')
    expect(escapePostgrestFilterValue('%a%')).toBe('"%a%"')
  })

  it('a comma-injection search still yields EXACTLY 3 conditions', () => {
    const malicious = 'x,status.eq.vip'
    const safe = buildIlikeOrFilter(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(safe)

    expect(conditions).toHaveLength(3)
    expect(conditions).toEqual([
      'name.ilike."%x,status.eq.vip%"',
      'email.ilike."%x,status.eq.vip%"',
      'phone.ilike."%x,status.eq.vip%"',
    ])
    expect(conditions.some((c) => /^status\.eq/.test(c.trim()))).toBe(false)
  })

  it('a quote-breakout attempt cannot terminate the literal early', () => {
    const malicious = '%","x":"'
    const safe = buildIlikeOrFilter(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(safe)
    expect(conditions).toHaveLength(3)
    for (const c of conditions) {
      expect(c).toMatch(/^(name|email|phone)\.ilike\."/)
    }
  })

  it('a cross-tenant payload cannot introduce a top-level tenant_id predicate', () => {
    const otherTenant = '00000000-0000-0000-0000-000000000000'
    const malicious = `a%,tenant_id.neq.${otherTenant},name.ilike.%b`
    const safe = buildIlikeOrFilter(CLIENT_COLS, malicious)
    const conditions = splitTopLevelConditions(safe)

    expect(conditions).toHaveLength(3)
    expect(conditions.some((c) => /^tenant_id\./.test(c.trim()))).toBe(false)
    for (const c of conditions) expect(c).toContain(`.ilike."`)
  })
})

// ---------------------------------------------------------------------------
// ISOLATION INVARIANT — every tenant-scoped client-search `.or()` is AND-ed with
// a sibling `.eq('tenant_id', …)`, and now goes through `buildIlikeOrFilter`
// instead of raw interpolation. The two admin super-admin views (admin/clients,
// admin/activity) are intentionally cross-tenant and are covered separately
// below (RAW-INTERPOLATION REGRESSION GUARD), not here.
// ---------------------------------------------------------------------------
const API_ROOT = path.join(process.cwd(), 'src', 'app', 'api')

const TENANT_SCOPED_SEARCH_ROUTES = [
  'clients/route.ts',
  'admin/comhub/search-recipients/route.ts',
  'admin/ai-chat/route.ts',
  'ai/assistant/route.ts',
] as const

// Every other site (in-repo, this branch) that interpolates request-influenced
// input into a `.or()` filter string. Fixed by wrapping the value in
// `escapePostgrestFilterValue`/`buildIlikeOrFilter`.
const OTHER_FIXED_OR_ROUTES = [
  'admin/clients/route.ts',
  'admin/activity/route.ts',
  'admin/comhub/templates/route.ts',
  'webhooks/telnyx-voice/route.ts',
  'finance/bank-transactions/[id]/match/route.ts',
  'cron/recurring-expenses/route.ts',
  'announcements/unread/route.ts',
] as const

const ALL_FIXED_OR_ROUTES = [...TENANT_SCOPED_SEARCH_ROUTES, ...OTHER_FIXED_OR_ROUTES] as const

/** Old vulnerable shape: `.or(` + a template literal containing raw `${…}` interpolation, unguarded by the escape helpers. */
function findRawInterpolatedOrOffenders(rel: string): string[] {
  const full = path.join(API_ROOT, rel)
  const lines = fs.readFileSync(full, 'utf8').split('\n')
  const offenders: string[] = []
  lines.forEach((line, idx) => {
    const looksInjectable = /\.or\(\s*`/.test(line) && line.includes('${')
    if (!looksInjectable) return
    const isGuarded = line.includes('escapePostgrestFilterValue(') || line.includes('buildIlikeOrFilter(')
    if (!isGuarded) offenders.push(`${rel}:${idx + 1} — ${line.trim()}`)
  })
  return offenders
}

describe('ISOLATION INVARIANT — .or() searches use the safe builder and tenant-scoped ones stay AND-ed with tenant_id', () => {
  it('the enumerated route files all exist (guards against a vacuous pass)', () => {
    for (const rel of ALL_FIXED_OR_ROUTES) {
      const full = path.join(API_ROOT, rel)
      expect(fs.existsSync(full), `expected route file at ${full}`).toBe(true)
    }
  })

  it('every tenant-scoped route imports and calls buildIlikeOrFilter, alongside a tenant_id .eq()', () => {
    const offenders: string[] = []
    for (const rel of TENANT_SCOPED_SEARCH_ROUTES) {
      const src = fs.readFileSync(path.join(API_ROOT, rel), 'utf8')
      const importsBuilder = /from ['"]@\/lib\/postgrest-or-filter['"]/.test(src) && src.includes('buildIlikeOrFilter')
      const callsBuilder = /buildIlikeOrFilter\(/.test(src)
      const hasTenantEq = /\.eq\(\s*['"]tenant_id['"]/.test(src)
      if (!importsBuilder || !callsBuilder || !hasTenantEq) {
        offenders.push(`${rel} — importsBuilder=${importsBuilder} callsBuilder=${callsBuilder} hasTenantEq=${hasTenantEq}`)
      }
    }
    expect(offenders, `Tenant-scoped search routes must import+call buildIlikeOrFilter and stay AND-ed with tenant_id:\n${offenders.join('\n')}`).toEqual([])
  })

  it('RAW-INTERPOLATION REGRESSION GUARD — none of the previously-flagged .or() sites interpolate unguarded template literals anymore', () => {
    const offenders = ALL_FIXED_OR_ROUTES.flatMap(findRawInterpolatedOrOffenders)
    expect(
      offenders,
      `These .or() call sites interpolate raw request-influenced input without going through ` +
        `escapePostgrestFilterValue/buildIlikeOrFilter (dead-sanitizer regression):\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('sanity: the scan actually found guarded .or() usage in every enumerated route (not a vacuous pass)', () => {
    let matches = 0
    for (const rel of ALL_FIXED_OR_ROUTES) {
      const src = fs.readFileSync(path.join(API_ROOT, rel), 'utf8')
      if (src.includes('escapePostgrestFilterValue(') || src.includes('buildIlikeOrFilter(')) matches++
    }
    expect(matches).toBe(ALL_FIXED_OR_ROUTES.length)
  })
})
