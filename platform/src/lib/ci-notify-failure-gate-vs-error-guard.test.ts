import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item
// (247), continuing (246)'s surface per the LEADER queue's item (2)
// ("continue whichever surface (1) opens up").
//
// (246) fixed tenant-config-reconcile.yml's own drift-gate step: exit 1
// there is ambiguous between real gating CRIT drift and the script/guard
// itself crashing, and (244)'s "name which step failed" fix left that
// ambiguity in writing ("check the run log to tell which of those two").
//
// Re-reading ci.yml's OWN two custom-script gating steps with that same
// question in mind surfaced the identical shape, previously unexamined:
//   - Tenant-isolation guard (scripts/audit-tenant-scope.mjs) exits 1 for
//     TWO reasons -- `process.exit(ALL ? 0 : 1)` after finding NEW unscoped
//     queries (a real leak), OR an uncaught exception at the script's own
//     top level (it has no try/catch of its own around its main body --
//     see e.g. the `execSync` call and its narrow `err.status === 1` guard,
//     which rethrows anything else) that Node's default uncaught-exception
//     handler turns into exit 1 with a bare stack trace.
//   - Protected-tenant guard (scripts/verify-protected-tenants.mjs) exits 1
//     for TWO reasons the same way -- `process.exit(1)` after finding a real
//     PROTECTED-tenant violation (a live tenant would lose its site), OR an
//     uncaught exception before main() ever gets there (main() here is a
//     bare synchronous call with no try/catch at all, unlike reconcile-
//     tenant-config.mjs's own main().catch(...) wrapper).
// Both were previously reported by identify-failed-step as a single flat
// label ("Tenant-isolation guard" / "Protected-tenant guard") with no way
// to tell a real finding from a script bug short of a log dive -- the exact
// friction (244)/(245)/(246) already closed for the sibling
// tenant-config-reconcile.yml workflow, just never closed here.
//
// Fixed the same way (246) did: both steps now pipe their script's stdout
// through `tee` to a captured file, and identify-failed-step greps that
// file for a signal only the SCRIPT ITSELF prints when it ran to completion
// and found a real problem -- audit-tenant-scope.mjs's own
// "✗ tenant-scope guard: N NEW unscoped quer(y/ies)..." line, and
// verify-protected-tenants.mjs's own "PROTECTED-TENANT GUARD FAILED" banner.
// Neither string is ever printed by an uncaught exception (Node prints a
// stack trace instead), so its presence in the captured output is the
// real-finding-vs-crash signal, exactly mirroring (246)'s
// "Tenant-config reconcile — " summarize() header check.
//
// Mutation-verified before writing this file: reverting the two new
// `if [ "${{ steps.tenant-scope.outcome }}" = "failure" ]` / `steps.
// protected-tenant.outcome` branches (restoring the flat
// `[ ... ] && failed="Tenant-isolation guard"` / `="Protected-tenant guard"`
// one-liners from (244)) left the full suite green apart from this file --
// none of the other CI guard files in this lane read this deep into either
// step's own exit-1 ambiguity.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as reconcile-notify-failure-drift-vs-error-guard.test.ts.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')

function ciYaml(): string {
  return readFileSync(CI_WORKFLOW, 'utf8')
}

function verifyJobBody(yaml: string): string {
  const start = yaml.indexOf('\n  verify:')
  const nextJob = yaml.indexOf('\n  notify-failure:')
  return yaml.slice(start, nextJob === -1 ? undefined : nextJob)
}

function identifyFailedStepBody(yaml: string): string {
  const body = verifyJobBody(yaml)
  const start = body.indexOf('id: identify-failed-step')
  expect(start, 'identify-failed-step step not found in verify job').toBeGreaterThan(-1)
  return body.slice(start)
}

function stepBody(yaml: string, stepId: string): string {
  const body = verifyJobBody(yaml)
  const idIdx = body.indexOf(`id: ${stepId}`)
  expect(idIdx, `step id: ${stepId} not found in verify job`).toBeGreaterThan(-1)
  const nextStepIdx = body.indexOf('\n      - name:', idIdx)
  return body.slice(idIdx, nextStepIdx === -1 ? undefined : nextStepIdx)
}

describe('CI invariant — ci.yml alert distinguishes a real gate finding from a script/guard error (tenant-scope + protected-tenant)', () => {
  it('the workflows directory and ci.yml exist where the guard expects them', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
  })

  it('the Tenant-isolation guard step captures its output via tee and preserves the real exit code through PIPESTATUS', () => {
    const body = stepBody(ciYaml(), 'tenant-scope')
    expect(
      /node scripts\/audit-tenant-scope\.mjs \| tee tenant-scope-output\.txt/.test(body),
      'expected the Tenant-isolation guard step to pipe through `tee tenant-scope-output.txt`',
    ).toBe(true)
    expect(
      /exit_code=\$\{PIPESTATUS\[0\]\}/.test(body),
      'expected PIPESTATUS[0] to preserve the real node exit code through the tee pipe',
    ).toBe(true)
  })

  it('the Protected-tenant guard step captures its output via tee and preserves the real exit code through PIPESTATUS', () => {
    const body = stepBody(ciYaml(), 'protected-tenant')
    expect(
      /node scripts\/verify-protected-tenants\.mjs \| tee protected-tenant-output\.txt/.test(body),
      'expected the Protected-tenant guard step to pipe through `tee protected-tenant-output.txt`',
    ).toBe(true)
    expect(
      /exit_code=\$\{PIPESTATUS\[0\]\}/.test(body),
      'expected PIPESTATUS[0] to preserve the real node exit code through the tee pipe',
    ).toBe(true)
  })

  it('identify-failed-step branches on the tenant-scope outcome before deciding the wording, instead of a single flat label', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /if\s*\[\s*"\$\{\{\s*steps\.tenant-scope\.outcome\s*\}\}"\s*=\s*"failure"\s*\]/.test(body),
      'expected an `if [ "${{ steps.tenant-scope.outcome }}" = "failure" ]` branch — without it the step falls back to a flat "Tenant-isolation guard" label that cannot distinguish a real leak from a script error',
    ).toBe(true)
  })

  it('identify-failed-step branches on the protected-tenant outcome before deciding the wording, instead of a single flat label', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /if\s*\[\s*"\$\{\{\s*steps\.protected-tenant\.outcome\s*\}\}"\s*=\s*"failure"\s*\]/.test(body),
      'expected an `if [ "${{ steps.protected-tenant.outcome }}" = "failure" ]` branch — without it the step falls back to a flat "Protected-tenant guard" label that cannot distinguish a real violation from a script error',
    ).toBe(true)
  })

  it('the tenant-scope branch greps for the script\'s own finding-report line to detect a real leak', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /grep\s+-q\s+'✗ tenant-scope guard:'\s+tenant-scope-output\.txt/.test(body),
      "expected a `grep -q '✗ tenant-scope guard:' tenant-scope-output.txt` check — this line is only ever printed by audit-tenant-scope.mjs itself after it ran to completion and found a real leak, never by an uncaught exception",
    ).toBe(true)
  })

  it('the protected-tenant branch greps for the script\'s own failure banner to detect a real violation', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /grep\s+-q\s+'PROTECTED-TENANT GUARD FAILED'\s+protected-tenant-output\.txt/.test(body),
      "expected a `grep -q 'PROTECTED-TENANT GUARD FAILED' protected-tenant-output.txt` check — this banner is only ever printed by verify-protected-tenants.mjs itself after it ran to completion and found a real violation, never by an uncaught exception",
    ).toBe(true)
  })

  it('a real tenant-scope leak is worded as a finding, not a script error', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /new unscoped quer\(y\/ies\) found/.test(body),
      'expected the grep-succeeds branch to say the leak was found — the whole point of this item is stating the real cause instead of asking the reader to check the log',
    ).toBe(true)
  })

  it('a real protected-tenant violation is worded as a finding, not a script error', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /a live tenant would lose its site/.test(body),
      'expected the grep-succeeds branch to say a live tenant would lose its site',
    ).toBe(true)
  })

  it('a tenant-scope crash before the finding line prints is worded as a script error, not a real leak', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /Tenant-isolation guard -- the script itself errored/.test(body),
      'expected the grep-fails (else) branch to say the script itself errored — an on-call reader must not read a tooling crash as a real cross-tenant leak',
    ).toBe(true)
  })

  it('a protected-tenant crash before the banner prints is worded as a script error, not a real violation', () => {
    const body = identifyFailedStepBody(ciYaml())
    expect(
      /Protected-tenant guard -- the script itself errored/.test(body),
      'expected the grep-fails (else) branch to say the script itself errored — an on-call reader must not read a tooling crash as a live tenant actually losing its site',
    ).toBe(true)
  })
})
