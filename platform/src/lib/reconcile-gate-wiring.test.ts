import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — the tenant-config reconcile GATE stays wired (W3 lane:
// reconcile gate + CI wiring, PR9). Executable companion to the reconcile
// workflow (.github/workflows/tenant-config-reconcile.yml).
//
// The reconcile gate is the read-only drift check over the sources that decide
// which domain renders which tenant (tenants.domain, tenant_domains,
// BESPOKE_SITE_TENANTS, /site/<slug> folders) — the 2026-07-10 outage class. It
// only bites on merge if it actually runs on PRs, and its "no Management-API
// secret ⇒ exit 0 green" contract only holds if that contract stays verified in
// CI (otherwise a regression in the skip path would silently red-gate every fork
// and secret-less branch — or worse, a broken skip could mask a real query
// failure). Both facts are workflow YAML today; a Jeff-gated edit could drop
// either. This test CODIFIES them so a weakening edit fails CI instead of
// relying on a reviewer noticing the diff — same approach as
// ci-full-suite-guard.test.ts.
//
// PURE SOURCE-READING of the workflow YAML (no YAML lib, no runner). vitest runs
// with the platform package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function reconcileYaml(): string {
  return readFileSync(RECONCILE_WORKFLOW, 'utf8')
}

describe('CI invariant — reconcile gate wiring is intact', () => {
  it('the reconcile workflow exists where the guard expects it', () => {
    // If this fails the workflow moved/renamed — update the path rather than
    // letting the guard silently pass on a file it can no longer read.
    expect(
      existsSync(RECONCILE_WORKFLOW),
      `no reconcile workflow at ${RECONCILE_WORKFLOW}`,
    ).toBe(true)
  })

  it('still runs the reconcile drift script (the gate is not deleted)', () => {
    const yaml = reconcileYaml()
    // Substring rather than a `run: node ...` anchor: the step's run block is
    // a multi-line `|` script (piped through tee for the step-summary write),
    // not a single-line `run:`, so a rigid same-line anchor would false-fail
    // on that legitimate shape. The distinctive command string is still
    // enough to catch the gate actually being deleted.
    expect(
      yaml.includes('node scripts/reconcile-tenant-config.mjs'),
      'tenant-config-reconcile.yml no longer runs `node scripts/reconcile-tenant-config.mjs` — the drift gate is gone.',
    ).toBe(true)
  })

  it('still verifies the token-guard clean-skip contract (no secret ⇒ green)', () => {
    const yaml = reconcileYaml()
    // The contract step forces an empty secret and asserts the script prints its
    // clean-skip marker. Keying on the asserted marker string means a rename of
    // the step label can't fool the guard.
    expect(
      /skipping \(exit 0\)/.test(yaml),
      'The "no Management-API secret ⇒ exit 0 green" contract is no longer ' +
        'verified in tenant-config-reconcile.yml (the clean-skip assertion step ' +
        'was removed). A regression in the skip path could now red-gate forks / ' +
        'secret-less branches unnoticed.',
    ).toBe(true)
  })

  it('runs on pull_request so the gate bites BEFORE merge, not only on main', () => {
    const yaml = reconcileYaml()
    expect(
      /^\s*pull_request\s*:?\s*$/m.test(yaml),
      'tenant-config-reconcile.yml no longer triggers on pull_request — the ' +
        'drift gate would only run post-merge on main, too late to block a bad PR.',
    ).toBe(true)
  })

  it('stays least-privilege (permissions: contents: read — no write escalation)', () => {
    const yaml = reconcileYaml()
    expect(
      /permissions:\s*\n\s*contents:\s*read\b/.test(yaml),
      'tenant-config-reconcile.yml no longer declares `permissions: contents: read`. ' +
        'A read-only drift gate must never gain write scopes on the repo/packages/actions.',
    ).toBe(true)
  })

  it('cancels superseded runs on the same ref (concurrency group + cancel-in-progress)', () => {
    const yaml = reconcileYaml()
    expect(
      /concurrency:\s*\n\s*group:.+\n\s*cancel-in-progress:\s*true/.test(yaml),
      'tenant-config-reconcile.yml no longer declares a concurrency group with ' +
        'cancel-in-progress: true — a stale run on an old commit could outlive a ' +
        'newer push and burn runner minutes re-checking dead state.',
    ).toBe(true)
  })

  it('bounds the reconcile job with a timeout (no unbounded hang on a stuck query)', () => {
    const yaml = reconcileYaml()
    expect(
      /timeout-minutes:\s*\d+/.test(yaml),
      'tenant-config-reconcile.yml no longer sets timeout-minutes on the reconcile ' +
        'job — a hung Supabase Management-API call could block the runner indefinitely.',
    ).toBe(true)
  })

  it('still alerts on failure (notify-failure job wired to the reconcile job)', () => {
    const yaml = reconcileYaml()
    expect(
      /notify-failure:\s*\n\s*needs:\s*reconcile\s*\n\s*if:\s*failure\(\)/.test(yaml),
      'tenant-config-reconcile.yml no longer has a notify-failure job gated on ' +
        '`needs: reconcile` + `if: failure()` — a red gate could go unnoticed with ' +
        'no Telegram alert.',
    ).toBe(true)
  })

  it('writes the drift report to the Job Summary (visible without a log dive)', () => {
    const yaml = reconcileYaml()
    expect(
      /GITHUB_STEP_SUMMARY/.test(yaml),
      'tenant-config-reconcile.yml no longer writes the reconcile output to ' +
        '$GITHUB_STEP_SUMMARY — a red gate would be visible only by opening the raw ' +
        'Actions log, not the run summary page.',
    ).toBe(true)
    // The fix must use the zero-privilege $GITHUB_STEP_SUMMARY file, never a PR
    // comment (which needs `pull-requests: write` and would break the
    // least-privilege invariant asserted above).
    expect(
      /pull-requests:\s*write/.test(yaml),
      'tenant-config-reconcile.yml gained a `pull-requests: write` permission — the ' +
        'Job Summary approach exists specifically to avoid this escalation.',
    ).toBe(false)
  })
})
