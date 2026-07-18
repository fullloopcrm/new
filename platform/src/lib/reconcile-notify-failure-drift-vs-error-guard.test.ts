import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item (246),
// continuing the UX-friction track (244)/(245) opened per the LEADER queue's
// item (1) ("continue the UX-friction track").
//
// (244)/(245) fixed "the alert doesn't say WHICH step broke" across all three
// owned workflows. But naming the step wasn't enough for this job's single
// highest-traffic failure: reconcile-tenant-config.mjs's own `main()` exits 1
// for TWO structurally different reasons —
//   1. main() ran to completion and found gating CRIT drift
//      (`process.exit(gatingCrit ? 1 : 0)`), a real routing-config problem, or
//   2. an uncaught exception fired before main() finished
//      (`main().catch((e) => { console.error(e); process.exit(1) })`), a bug
//      in the gate/guard itself, not real drift.
// (244)'s own fix left this exact ambiguity in the alert TEXT, in writing:
// "if the drift gate step itself, this is EITHER gating CRIT drift OR the
// script erroring — check the run log to tell which of those two". That
// sentence is itself the admission this item closes.
//
// Fixed by reading the signal that's already captured on disk: the
// drift-gate step's own `tee reconcile-output.txt` only contains
// summarize()'s "Tenant-config reconcile — N tenants | CRIT:..." header line
// when main() ran to completion — a thrown exception exits before ever
// printing it. identify-failed-step (this job's existing `if: failure()`
// step) now greps reconcile-output.txt for that header and picks the
// resulting failed_step wording accordingly, so the alert states the real
// cause instead of asking the recipient to go find it.
//
// Mutation-verified before writing this file: reverting the new
// `if [ "${{ steps.reconcile-drift-gate.outcome }}" = "failure" ]` branch
// (restoring the flat `failed="Reconcile tenant config (read-only drift
// gate)"` line from (244)/(245)) left the full suite green apart from this
// file — none of the other reconcile-gate/notify-failure guard files read
// this deep into the drift-vs-error distinction.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as reconcile-notify-failure-step-detail-guard.test.ts.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function reconcileYaml(): string {
  return readFileSync(RECONCILE_WORKFLOW, 'utf8')
}

function reconcileJobBody(yaml: string): string {
  const start = yaml.indexOf('\njobs:')
  const nextJob = yaml.indexOf('\n  notify-failure:')
  return yaml.slice(start, nextJob === -1 ? undefined : nextJob)
}

function notifyFailureJobBody(yaml: string): string {
  const start = yaml.indexOf('\n  notify-failure:')
  return yaml.slice(start)
}

function identifyFailedStepBody(yaml: string): string {
  const body = reconcileJobBody(yaml)
  const start = body.indexOf('id: identify-failed-step')
  expect(start, 'identify-failed-step step not found in reconcile job').toBeGreaterThan(-1)
  return body.slice(start)
}

describe('CI invariant — tenant-config-reconcile.yml alert distinguishes gating CRIT drift from a script/guard error', () => {
  it('the workflows directory and tenant-config-reconcile.yml exist where the guard expects them', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(RECONCILE_WORKFLOW), `no tenant-config-reconcile.yml at ${RECONCILE_WORKFLOW}`).toBe(true)
  })

  it('identify-failed-step runs in github.workspace, not platform/, and greps the platform/-prefixed output file (item 264: platform/ only exists once checkout has succeeded)', () => {
    const body = reconcileJobBody(reconcileYaml())
    const stepMatch = body.match(/id:\s*identify-failed-step\s*\n\s*if:\s*failure\(\)[\s\S]*?\n\s*working-directory:\s*\$\{\{\s*github\.workspace\s*\}\}/)
    expect(
      stepMatch,
      'identify-failed-step no longer overrides working-directory to github.workspace — if it instead inherits (or hardcodes) working-directory: platform, then a checkout failure (platform/ never created) makes THIS diagnostic step itself fail on its own missing working directory before it can ever check steps.checkout.outcome, so the one case it exists to name ("Checkout") is the one case it silently can\'t (item 264)',
    ).not.toBeNull()
  })

  it('identify-failed-step branches on the reconcile-drift-gate outcome before deciding the wording, instead of a single flat label', () => {
    const stepBody = identifyFailedStepBody(reconcileYaml())
    expect(
      /if\s*\[\s*"\$\{\{\s*steps\.reconcile-drift-gate\.outcome\s*\}\}"\s*=\s*"failure"\s*\]/.test(stepBody),
      'expected an `if [ "${{ steps.reconcile-drift-gate.outcome }}" = "failure" ]` branch — without it the step falls back to a single flat "Reconcile tenant config (read-only drift gate)" label that cannot distinguish gating CRIT drift from a script error',
    ).toBe(true)
  })

  it('the branch greps reconcile-output.txt for the summarize() header line to detect a completed run', () => {
    const stepBody = identifyFailedStepBody(reconcileYaml())
    expect(
      /grep\s+-q\s+'Tenant-config reconcile — '\s+platform\/reconcile-output\.txt/.test(stepBody),
      'expected a `grep -q \'Tenant-config reconcile — \' platform/reconcile-output.txt` check — this is the only signal (short of parsing exit codes that are identical either way) that main() ran to completion rather than throwing. The platform/ prefix (item 264) is required because identify-failed-step overrides working-directory to github.workspace, not platform/',
    ).toBe(true)
  })

  it('a completed run (grep succeeds) is worded as gating CRIT drift, not a script error', () => {
    const stepBody = identifyFailedStepBody(reconcileYaml())
    expect(
      /gating CRIT drift found/.test(stepBody),
      'expected the grep-succeeds branch to say "gating CRIT drift found" — the whole point of this item is the alert stating the real cause instead of "check the log"',
    ).toBe(true)
  })

  it('a crash before the header prints is worded as a script/guard error, not real drift', () => {
    const stepBody = identifyFailedStepBody(reconcileYaml())
    expect(
      /script\/guard itself errored/.test(stepBody),
      'expected the grep-fails (else) branch to say the script/guard itself errored — an on-call reader must not read a tooling crash as real tenant-routing drift',
    ).toBe(true)
  })

  it("notify-failure's Telegram TEXT no longer hedges with \"check the run log to tell which of those two\" (the ambiguity this item resolves)", () => {
    const body = notifyFailureJobBody(reconcileYaml())
    expect(
      /tell which of those two/.test(body),
      'the TEXT still contains the old "check the run log to tell which of those two" hedge — the failed_step output computed above already resolves this, so the TEXT should no longer ask the recipient to go find it themselves',
    ).toBe(false)
  })
})
