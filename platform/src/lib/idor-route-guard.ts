// IDOR route guard — static analyzer (PROTOTYPE).
//
// Detects the cross-tenant IDOR class the fleet keeps finding: an API route
// handler that reads/writes a TENANT-OWNED table BY id — `.eq('id', …)` or
// `.in('id', …)` — through the service_role client WITHOUT a sibling
// `.eq('tenant_id', …)` scope in the same query chain.
//
// Why this is the bug: the platform runs every query through the service_role
// key, which BYPASSES Row-Level Security (see src/lib/tenant-db.ts header).
// Cross-tenant isolation therefore depends entirely on each route remembering
// to add `.eq('tenant_id', …)`. A chain that filters only by `id` will happily
// return / mutate ANOTHER tenant's row if the caller supplies its id — a
// classic Insecure Direct Object Reference.
//
// This module is pure text analysis (no TS AST, no DB). It parses supabase
// query chains out of source and classifies each one. It is the executable
// companion to deploy-prep/idor-lint-guard-spec.md — read that for the
// heuristic's precision/recall envelope, the allowlist rationale, and the
// graduation path to a blocking CI gate.
//
// SCOPE OF THE PROTOTYPE: heuristic, single-chain. Known blind spots (documented
// in the spec) — ownership proven by a *prior* fetch, split/reassigned builders
// (`let q = …; q = q.eq(...)`), dynamic table names, and ownership via `.or()`
// / RPC. Those produce false positives (safe code flagged) or false negatives
// (unsafe code missed). This is why it ships as a REPORTING prototype, not a
// blocking gate.

const UNSCOPED_ROOTS = ['supabaseAdmin', 'supabase'] as const

// Tables that are cross-tenant BY DESIGN — they either have no tenant_id column
// or are keyed by the tenant's own id. A `.eq('id', …)` on these is not an IDOR.
// Sourced from src/lib/tenant-db.ts's documented list plus platform-global
// tables. KEEP IN SYNC with the DB schema; an over-broad allowlist is how a real
// IDOR slips through, so additions must be justified in the spec.
export const CROSS_TENANT_TABLES: ReadonlySet<string> = new Set([
  'tenants', // keyed by the tenant's own id — self-scoping
  'inquiries', // pre-tenant funnel, cross-tenant by design
  'leads', // pre-tenant funnel
  'platform_settings', // global singleton config
  'changelog', // global product changelog
  'impersonation_events', // platform audit log (admin-only)
  'waitlist', // pre-tenant signup funnel
  'prospects', // pre-tenant sales funnel
])

// A scoped-db root (tenantDb(...).from / a `db` alias) auto-injects tenant_id and
// is therefore safe even without an explicit `.eq('tenant_id', …)`. Matched by a
// window before `.from(` so the chain scanner can whitelist it.
const SCOPED_ROOT_HINT = /\btenantDb\s*\(|(^|[^.\w])(db|tdb|tenantDb)\.from\s*\(\s*$/

export type IdorFinding = {
  file: string
  line: number
  table: string
  reason: string
  chain: string
}

type ScanInput = { file: string; source: string }

// Consume a balanced `( … )` starting at `src[open]` === '('. Returns the index
// just past the matching ')'. Tolerates strings so a ')' inside a quoted arg
// doesn't close the group early.
function skipParens(src: string, open: number): number {
  let depth = 0
  let i = open
  let quote: string | null = null
  for (; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') quote = c
    else if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return src.length
}

// From an index pointing at the '.' of `.from(`, capture the whole fluent chain
// text: `.from(...)` plus every subsequent `.method(...)` / `.prop` that is
// contiguously chained across whitespace and newlines (this codebase omits
// semicolons, so we cannot rely on `;` as a terminator). Stops at the first
// point where, after a chain segment, the next meaningful char is not `.`.
function captureChain(src: string, dotFrom: number): { chain: string; end: number } {
  // dotFrom points at '.', then 'from', then '('
  let i = src.indexOf('(', dotFrom)
  i = skipParens(src, i) // past .from(...)
  for (;;) {
    // skip whitespace/newlines between chained calls
    let j = i
    while (j < src.length && /\s/.test(src[j])) j++
    if (src[j] !== '.') break // chain ends
    // consume `.ident`
    let k = j + 1
    while (k < src.length && /[A-Za-z0-9_$]/.test(src[k])) k++
    if (src[k] === '(') {
      i = skipParens(src, k)
    } else {
      i = k // property access with no call, e.g. `.data` — keep going
    }
  }
  return { chain: src.slice(dotFrom, i), end: i }
}

function lineOf(src: string, index: number): number {
  let line = 1
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line++
  return line
}

const TABLE_RE = /^\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]/
const ID_FILTER_RE = /\.(eq|in)\(\s*['"`]id['"`]/
const TENANT_FILTER_RE = /\.eq\(\s*['"`]tenant_id['"`]/

/**
 * Analyze one source file's supabase query chains for the IDOR class.
 * Returns a finding per unsafe chain (empty array = clean).
 */
export function analyzeSource({ file, source }: ScanInput): IdorFinding[] {
  const findings: IdorFinding[] = []
  const fromRe = /\.from\s*\(/g
  let m: RegExpExecArray | null
  while ((m = fromRe.exec(source))) {
    const dotFrom = m.index
    // What is the root object of this `.from(`? Look back a small window.
    const back = source.slice(Math.max(0, dotFrom - 48), dotFrom)
    const rootMatch = back.match(/([A-Za-z0-9_$)\]]+)\s*$/)
    const rootTok = rootMatch ? rootMatch[1] : ''

    // Exclude non-DB `.from(` — Buffer.from / Array.from / .storage.from(bucket).
    if (rootTok === 'Buffer' || rootTok === 'Array' || /\bstorage$/.test(rootTok)) continue

    const isUnscopedRoot = UNSCOPED_ROOTS.some((r) => back.trimEnd().endsWith(r))
    const isScopedRoot = SCOPED_ROOT_HINT.test(back)
    // Only the service_role-direct roots are in scope. A scoped `db.from` auto-
    // adds tenant_id and is safe; anything we can't identify as an unscoped root
    // we skip (conservative: we only flag chains we're confident bypass RLS).
    if (isScopedRoot || !isUnscopedRoot) continue

    const { chain } = captureChain(source, dotFrom)
    const tableMatch = chain.match(TABLE_RE)
    if (!tableMatch) continue
    const table = tableMatch[1]

    const filtersById = ID_FILTER_RE.test(chain)
    if (!filtersById) continue
    if (TENANT_FILTER_RE.test(chain)) continue // has sibling tenant scope → safe
    if (CROSS_TENANT_TABLES.has(table)) continue // cross-tenant by design → safe

    findings.push({
      file,
      line: lineOf(source, dotFrom),
      table,
      reason: `supabaseAdmin.from('${table}') filtered by id without a sibling .eq('tenant_id', …)`,
      chain: chain.replace(/\s+/g, ' ').trim().slice(0, 200),
    })
  }
  return findings
}
