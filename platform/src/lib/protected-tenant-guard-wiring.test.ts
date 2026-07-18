import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — the protected-tenant guard (scripts/verify-protected-
// tenants.mjs, the backstop for the 2026-07-08 "route ALL tenants except
// nycmaid to the template" outage class) stays wired into ci.yml.
//
// The script only ran via npm's `prebuild` hook ahead of `next build` — this
// repo's ci.yml never calls `next build` (or any full `npm run build`), so a
// PR that removed a protected slug from BESPOKE_SITE_TENANTS or deleted a
// protected tenant's /site/<slug> folder passed tsc, the full vitest suite,
// the tenant-isolation guard, AND eslint, all green, with the break only
// surfacing when a deploy's own build ran prebuild post-merge. Mutation-
// verified: with 'nyc-tow' removed from src/middleware.ts's
// BESPOKE_SITE_TENANTS, tsc/vitest(454 files, 2155 tests)/eslint/
// audit-tenant-scope.mjs all stayed green; only
// `node scripts/verify-protected-tenants.mjs` caught it (exit 1). Now wired
// as its own ci.yml step. This test CODIFIES that wiring so a future edit
// can't silently drop the step again — same approach as
// reconcile-gate-wiring.test.ts / ci-full-suite-guard.test.ts.
//
// PURE SOURCE-READING of the workflow YAML (no YAML lib, no runner). vitest
// runs with the platform package root as cwd, so the workflows live one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')
const GUARD_SCRIPT = join(process.cwd(), 'scripts', 'verify-protected-tenants.mjs')

function ciYaml(): string {
  return readFileSync(CI_WORKFLOW, 'utf8')
}

// Continuation of item (210) (ci-tenant-scope-invocation-guard.test.ts):
// that guard closed a LIVE bypass on the sibling Tenant-isolation guard step
// because audit-tenant-scope.mjs reads its own dangerous argv flags
// (--all, --update-baseline) and this file's wiring checks only ever used
// `.includes()`, which doesn't notice trailing tokens. verify-protected-
// tenants.mjs takes NO argv flags at all (grepped: its only `process.argv`
// use is the entrypoint self-check, not a behavior switch), so appending a
// token to its ci.yml invocation today is inert, not a live bypass -- this
// addition is deliberate symmetry/future-proofing, not a second live finding:
// it stops the identical `.includes()` blind spot from becoming exploitable
// the moment anyone later adds a flag to verify-protected-tenants.mjs
// itself, without anyone having to remember to update this wiring test too.
function protectedTenantInvocationLines(yaml: string): Array<{ line: number; cmd: string }> {
  const out: Array<{ line: number; cmd: string }> = []
  yaml.split('\n').forEach((raw, i) => {
    if (/\bverify-protected-tenants\.mjs\b/.test(raw) && /\brun:/.test(raw)) {
      out.push({ line: i + 1, cmd: raw.trim() })
    }
  })
  return out
}

function extraTokensAfterScript(cmd: string): string[] {
  const m = cmd.match(/\bverify-protected-tenants\.mjs\s+(.*)$/)
  if (!m) return []
  return m[1].split(/\s+/).filter(Boolean)
}

describe('CI invariant — protected-tenant guard wiring is intact', () => {
  it('ci.yml and the guard script exist where the test expects them', () => {
    // If this fails something moved/renamed — update the paths above rather
    // than letting the guard silently pass on a file it can no longer read.
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
    expect(existsSync(GUARD_SCRIPT), `no guard script at ${GUARD_SCRIPT}`).toBe(true)
  })

  it('ci.yml runs the protected-tenant guard directly (not only via next build)', () => {
    const yaml = ciYaml()
    expect(
      yaml.includes('node scripts/verify-protected-tenants.mjs'),
      'ci.yml no longer runs `node scripts/verify-protected-tenants.mjs` — the ' +
        '2026-07-08-outage-class backstop is either deleted from CI, or once again ' +
        'only reachable via npm prebuild inside an actual `next build`, which ci.yml ' +
        'does not invoke. A PR that breaks a protected tenant would pass CI green.',
    ).toBe(true)
  })

  it('the protected-tenant guard step runs in the same job as the other PR gates', () => {
    const yaml = ciYaml()
    // Confirms it sits in the `verify` job (not an orphaned job with no PR-blocking
    // effect) by checking it appears between the job header and the next job's
    // header (`notify-failure:` at column 0).
    const jobStart = yaml.indexOf('\njobs:')
    const verifyStart = yaml.indexOf('\n  verify:', jobStart)
    const nextJobStart = yaml.indexOf('\n  notify-failure:', verifyStart)
    expect(verifyStart, 'no `verify:` job found in ci.yml').toBeGreaterThan(-1)
    expect(nextJobStart, 'no `notify-failure:` job found after `verify:` in ci.yml').toBeGreaterThan(verifyStart)
    const verifyJobBody = yaml.slice(verifyStart, nextJobStart)
    expect(
      verifyJobBody.includes('node scripts/verify-protected-tenants.mjs'),
      'the protected-tenant guard step is not inside the `verify` job — a step ' +
        'outside it would not block the PR the same way the other gates do.',
    ).toBe(true)
  })

  it('the verify-protected-tenants.mjs invocation carries no trailing flags', () => {
    const offenders = protectedTenantInvocationLines(ciYaml())
      .map((v) => ({ ...v, extra: extraTokensAfterScript(v.cmd) }))
      .filter((v) => v.extra.length > 0)
    expect(
      offenders,
      'The Protected-tenant guard step passes extra tokens to verify-protected-tenants.mjs. ' +
        'The script reads no argv flags today, so this is pre-emptive: if a future edit adds ' +
        'a flag that changes the exit-code behavior (mirroring audit-tenant-scope.mjs\'s ' +
        '--all/--update-baseline), this test forces a deliberate update instead of silently ' +
        'passing:\n' +
        offenders.map((o) => `  ci.yml:${o.line} — extra: ${o.extra.join(', ')}\n    ${o.cmd}`).join('\n'),
    ).toEqual([])
  })
})
