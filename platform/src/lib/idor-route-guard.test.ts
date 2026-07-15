import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { analyzeSource, CROSS_TENANT_TABLES } from './idor-route-guard'

// PROTOTYPE guard for the cross-tenant IDOR class the fleet keeps finding:
// an API route reading/writing a tenant-owned table BY id through the
// service_role client (which bypasses RLS) WITHOUT a sibling
// `.eq('tenant_id', …)`. See deploy-prep/idor-lint-guard-spec.md for the full
// heuristic, precision/recall envelope, and graduation path.
//
// Two layers here:
//   1. FIXTURE tests — deterministic proof that the analyzer flags the unsafe
//      shape and passes every safe shape. These verify the DETECTOR itself.
//   2. TREE RATCHET — runs the analyzer over the real route tree and asserts no
//      NEW (file, table) offender appears beyond the committed baseline. This is
//      the "new routes cannot reintroduce it" guard. The baseline is a snapshot
//      of EXISTING heuristic hits PENDING TRIAGE — it is NOT an assertion that
//      those 178 chains are safe (many are admin/cross-tenant-by-design or prove
//      ownership via a prior fetch; some may be real and need fixing). Its only
//      job is to stop the surface from GROWING.
//
// This test intentionally does NOT edit any .github/workflows file — it rides
// the existing unfiltered vitest CI gate, exactly like jsonld-sink-guard.test.ts
// and ci-full-suite-guard.test.ts. Wiring a dedicated blocking job is Jeff-gated.

describe('IDOR route guard — analyzer fixtures', () => {
  const scan = (source: string) => analyzeSource({ file: 'fixture.ts', source })

  it('FLAGS an unscoped by-id read on a tenant-owned table', () => {
    const src = `
      const { data } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single()
    `
    const f = scan(src)
    expect(f).toHaveLength(1)
    expect(f[0].table).toBe('bookings')
  })

  it('FLAGS an unscoped .in(id, …) batch read', () => {
    const src = `await supabaseAdmin.from('invoices').select('*').in('id', ids)`
    expect(scan(src).map((x) => x.table)).toEqual(['invoices'])
  })

  it('FLAGS an unscoped by-id update and delete', () => {
    const upd = `await supabaseAdmin.from('clients').update(u).eq('id', id)`
    const del = `await supabaseAdmin.from('clients').delete().eq('id', id)`
    expect(scan(upd)).toHaveLength(1)
    expect(scan(del)).toHaveLength(1)
  })

  it('PASSES when a sibling .eq(tenant_id, …) scopes the chain (order-independent)', () => {
    const before = `await supabaseAdmin.from('bookings').eq('tenant_id', t).eq('id', id).single()`
    const after = `await supabaseAdmin.from('bookings').update(u).eq('id', id).eq('tenant_id', t)`
    expect(scan(before)).toEqual([])
    expect(scan(after)).toEqual([])
  })

  it('PASSES the auto-scoping tenantDb(...) wrapper (tenant_id injected implicitly)', () => {
    const src = `await tenantDb(ctx.tenantId).from('bookings').select('*').eq('id', id).single()`
    expect(scan(src)).toEqual([])
  })

  it('PASSES a `db` alias of the scoped wrapper', () => {
    const src = `const db = tenantDb(t); await db.from('quotes').update(u).eq('id', id)`
    expect(scan(src)).toEqual([])
  })

  it('PASSES cross-tenant-by-design tables keyed by their own id', () => {
    const src = `await supabaseAdmin.from('tenants').select('*').eq('id', tenantId).single()`
    expect(scan(src)).toEqual([])
    // sanity: the allowlist is the reason, and it is non-empty
    expect(CROSS_TENANT_TABLES.has('tenants')).toBe(true)
  })

  it('IGNORES non-DB `.from(` — Buffer / Array / storage buckets', () => {
    const src = `
      const b = Buffer.from(bytes)
      const a = Array.from(list)
      await supabaseAdmin.storage.from('avatars').remove([path])
    `
    expect(scan(src)).toEqual([])
  })

  it('does NOT flag a chain with no id filter at all', () => {
    const src = `await supabaseAdmin.from('bookings').select('*').eq('status', 'open')`
    expect(scan(src)).toEqual([])
  })

  it('flags each unsafe chain independently within one file', () => {
    const src = `
      await supabaseAdmin.from('clients').delete().eq('id', a)
      await supabaseAdmin.from('bookings').eq('tenant_id', t).eq('id', b)
      await supabaseAdmin.from('invoices').update(u).eq('id', c)
    `
    // clients + invoices flagged; bookings (scoped) passes
    expect(scan(src).map((x) => x.table).sort()).toEqual(['clients', 'invoices'])
  })
})

// ---- Real route-tree ratchet ------------------------------------------------

const API_ROOT = join(process.cwd(), 'src', 'app', 'api')
const BASELINE_PATH = join(process.cwd(), 'src', 'lib', 'idor-route-guard.baseline.json')

function walkRoutes(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walkRoutes(full))
    else if (entry === 'route.ts') out.push(full)
  }
  return out
}

function currentSignatures(): string[] {
  const findings = walkRoutes(API_ROOT).flatMap((f) =>
    analyzeSource({ file: relative(process.cwd(), f), source: readFileSync(f, 'utf8') }),
  )
  return Array.from(new Set(findings.map((f) => `${f.file}::${f.table}`))).sort()
}

describe('IDOR route guard — tree ratchet (no NEW offenders)', () => {
  const baseline: string[] = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  const baselineSet = new Set(baseline)

  it('the API route root exists where the guard expects it', () => {
    expect(statSync(API_ROOT).isDirectory()).toBe(true)
  })

  it('introduces no by-id-without-tenant_id chain beyond the committed baseline', () => {
    const current = currentSignatures()
    const newOffenders = current.filter((s) => !baselineSet.has(s))
    expect(
      newOffenders,
      'A route now reads/writes a tenant-owned table by id WITHOUT a sibling ' +
        ".eq('tenant_id', …) — the cross-tenant IDOR class.\n" +
        'Fix by scoping the query (add .eq(\'tenant_id\', tenantId) or use ' +
        'tenantDb(tenantId).from(...)). If the table is genuinely cross-tenant, ' +
        'add it to CROSS_TENANT_TABLES in src/lib/idor-route-guard.ts with a ' +
        'justification.\nNew offenders:\n' +
        newOffenders.map((s) => `  ${s}`).join('\n'),
    ).toEqual([])
  })
})
