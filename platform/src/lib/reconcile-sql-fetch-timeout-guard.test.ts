import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: reconcile gate + CI wiring). Item (231),
// fresh ground beyond the curl-call class items (227)-(230) closed: this
// gate's OWN sql() helper in scripts/reconcile-tenant-config.mjs makes the
// Supabase Management-API call directly via fetch() -- and fetch() has no
// default response timeout, the exact same unbounded-third-party-network-call
// shape as the curl calls those items fixed, just via a different API.
//
// sql() is called up to 5 times per run (4 inside the Promise.all for
// tenants/tenant_domains/allTenantDomains/allTenants, plus 1 more for Drift
// L's resolvableSlugs query when bespokeSet is non-empty -- which it always
// is in this repo). A DNS hang or slow-drip response from api.supabase.com on
// ANY one of those calls would silently consume the reconcile job's entire
// timeout-minutes budget (reconcile-gate-wiring.test.ts pins that job-level
// bound exists, but a per-call bound is defense-in-depth exactly like every
// curl --max-time in this lane sits under its own job-level timeout-minutes)
// before the drift report -- the entire point of the gate -- is ever
// produced, instead of failing fast on the one hung call and leaving the
// rest of the budget for a retry or a fast, diagnosable failure.
//
// Mutation-verified before writing the fix: this test, run against the
// pre-fix sql() (bare fetch(), no `signal:`), fails with the exact predicted
// message below. Fixed by adding `signal: AbortSignal.timeout(30_000)` to
// the fetch() call (same 30s bound already used for every curl --max-time in
// this lane). Mutation-verified again after the fix: removing the `signal:`
// line -- guard caught it, restored clean, `git diff --stat
// platform/scripts/reconcile-tenant-config.mjs` unchanged before and after
// the round-trip.
//
// PURE SOURCE-READING of the script -- no network, no DB, same approach as
// every other guard in this lane. vitest runs with the platform package root
// as cwd, so the script lives at scripts/reconcile-tenant-config.mjs.

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'reconcile-tenant-config.mjs')

function scriptSource(): string {
  return readFileSync(SCRIPT_PATH, 'utf8')
}

function sqlHelperBlock(source: string): string {
  const m = source.match(/const sql = async \(query\) => \{[\s\S]*?\n  \}/)
  expect(m, 'could not locate the sql() helper block in reconcile-tenant-config.mjs').not.toBeNull()
  return m![0]
}

describe('CI invariant — reconcile-tenant-config.mjs\'s sql() helper cannot hang unbounded on a Supabase Management-API network stall', () => {
  it('the reconcile script exists where the guard expects it', () => {
    expect(existsSync(SCRIPT_PATH), `no reconcile script at ${SCRIPT_PATH}`).toBe(true)
  })

  it('the sql() helper still exists (the surface it protects is not deleted or renamed)', () => {
    expect(sqlHelperBlock(scriptSource())).not.toBeNull()
  })

  it('the sql() helper\'s fetch() call still bounds itself with an AbortSignal timeout', () => {
    const block = sqlHelperBlock(scriptSource())
    expect(
      /signal:\s*AbortSignal\.timeout\(\s*\d+/.test(block),
      "reconcile-tenant-config.mjs's sql() helper no longer passes a " +
        '`signal: AbortSignal.timeout(...)` to fetch() -- fetch() has no ' +
        'default response timeout, so a DNS hang or slow-drip response from ' +
        'api.supabase.com on any of the up-to-5 calls this gate makes per run ' +
        "would silently consume the reconcile job's entire timeout-minutes " +
        'budget before the drift report is ever produced, instead of failing ' +
        'fast on the one hung call.',
    ).toBe(true)
  })
})
