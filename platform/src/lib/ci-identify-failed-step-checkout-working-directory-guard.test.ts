import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item (264)
// -- new fresh-ground surface on this lane's own gating jobs, not yet swept:
// both `ci.yml`'s and `tenant-config-reconcile.yml`'s "Identify which step
// failed (for the Telegram alert)" step (added by items (244)/(246)) ran
// under `working-directory: platform` -- ci.yml via the job-level
// `defaults.run.working-directory: platform`, tenant-config-reconcile.yml via
// an explicit `working-directory: platform` on the step itself. That
// directory is created by the `checkout` step, as part of checking out the
// repo -- it does not exist until checkout succeeds.
//
// This step's own shell script explicitly checks
// `steps.checkout.outcome = "failure"` and, if true, sets `failed="Checkout"`
// so the Telegram alert names it. But if checkout is the step that actually
// failed, `platform/` was never created, so THIS step -- whose
// `working-directory: platform` the runner must resolve before running any
// of its shell script -- fails immediately on "Unable to resolve action...
// working directory does not exist" (or the equivalent runner error) BEFORE
// it ever reaches its own `steps.checkout.outcome` check. `failed_step` is
// then never set (the step's own `id:`'s output never gets written), so
// notify-failure's Telegram TEXT renders "failed step: " with nothing after
// the colon -- for exactly the one failure case this diagnostic step was
// written to name.
//
// Every OTHER step's failure is unaffected: checkout succeeding is a
// precondition for setup-node/install/etc. to even run, so a failure in any
// of them implies platform/ already exists.
//
// Fixed by overriding `working-directory: ${{ github.workspace }}` on the
// identify-failed-step step in both workflows -- github.workspace is created
// by the runner before any step runs, unconditionally -- and prefixing the
// tee-captured files this step greps (`tenant-scope-output.txt`,
// `protected-tenant-output.txt`, `reconcile-output.txt`) with `platform/`,
// since the step no longer implicitly cd's there.
//
// Verified live: a `working-directory:` pointing at a nonexistent directory
// is a documented GitHub Actions runner failure mode (the step fails before
// its `run:` script executes at all), not a shell-level "no such file or
// directory" the script's own `set +e`/error handling could catch -- there is
// no in-script mitigation possible for this class of bug; only not depending
// on a directory whose existence is conditional on an earlier step's outcome
// closes it.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as every sibling guard in this lane.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function readYaml(path: string): string {
  return readFileSync(path, 'utf8')
}

function identifyFailedStepBody(yaml: string): string {
  const idIdx = yaml.indexOf('id: identify-failed-step')
  expect(idIdx, 'identify-failed-step step not found').toBeGreaterThan(-1)
  const nextStepIdx = yaml.indexOf('\n      - name:', idIdx)
  const nextJobIdx = yaml.indexOf('\n  notify-failure:', idIdx)
  const end = [nextStepIdx, nextJobIdx].filter((i) => i !== -1).sort((a, b) => a - b)[0]
  return yaml.slice(idIdx, end === undefined ? undefined : end)
}

describe('CI invariant — identify-failed-step never depends on a working directory that checkout itself might have failed to create', () => {
  it('the workflows directory and both owned workflows exist where the guard expects them', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
    expect(existsSync(RECONCILE_WORKFLOW), `no tenant-config-reconcile.yml at ${RECONCILE_WORKFLOW}`).toBe(true)
  })

  it('ci.yml: identify-failed-step overrides working-directory to github.workspace, not the job-default platform/', () => {
    const body = identifyFailedStepBody(readYaml(CI_WORKFLOW))
    expect(
      /working-directory:\s*\$\{\{\s*github\.workspace\s*\}\}/.test(body),
      'identify-failed-step must override working-directory to github.workspace — inheriting the job-default `working-directory: platform` means a checkout failure (which never creates platform/) makes this step fail on its own missing working directory before it can check steps.checkout.outcome, so the alert cannot name "Checkout" as the failed step (item 264)',
    ).toBe(true)
  })

  it('ci.yml: identify-failed-step greps the platform/-prefixed tee output files, not bare filenames', () => {
    const body = identifyFailedStepBody(readYaml(CI_WORKFLOW))
    expect(
      /grep\s+-q\s+'✗ tenant-scope guard:'\s+platform\/tenant-scope-output\.txt/.test(body),
      'expected the tenant-scope-output.txt grep to be prefixed platform/ — the step no longer runs with an implicit cd into platform/, so a bare filename would look in github.workspace root, where the file was never written',
    ).toBe(true)
    expect(
      /grep\s+-q\s+'PROTECTED-TENANT GUARD FAILED'\s+platform\/protected-tenant-output\.txt/.test(body),
      'expected the protected-tenant-output.txt grep to be prefixed platform/ — same reasoning as the tenant-scope-output.txt check above',
    ).toBe(true)
  })

  it('tenant-config-reconcile.yml: identify-failed-step overrides working-directory to github.workspace, not platform/', () => {
    const body = identifyFailedStepBody(readYaml(RECONCILE_WORKFLOW))
    expect(
      /working-directory:\s*\$\{\{\s*github\.workspace\s*\}\}/.test(body),
      'identify-failed-step must override working-directory to github.workspace — a hardcoded `working-directory: platform` means a checkout failure (which never creates platform/) makes this step fail on its own missing working directory before it can check steps.checkout.outcome, so the alert cannot name "Checkout" as the failed step (item 264)',
    ).toBe(true)
    expect(
      /working-directory:\s*platform\s*$/m.test(body),
      'identify-failed-step must NOT still declare a bare `working-directory: platform` line — that is the exact regression this item fixes',
    ).toBe(false)
  })

  it('tenant-config-reconcile.yml: identify-failed-step greps the platform/-prefixed reconcile-output.txt, not a bare filename', () => {
    const body = identifyFailedStepBody(readYaml(RECONCILE_WORKFLOW))
    expect(
      /grep\s+-q\s+'Tenant-config reconcile — '\s+platform\/reconcile-output\.txt/.test(body),
      'expected the reconcile-output.txt grep to be prefixed platform/ — the step no longer runs with an implicit cd into platform/, so a bare filename would look in github.workspace root, where the file was never written',
    ).toBe(true)
  })

  it('the reconcile-drift-gate step itself (which WRITES reconcile-output.txt) still runs under working-directory: platform, unaffected by this fix', () => {
    const yaml = readYaml(RECONCILE_WORKFLOW)
    const stepIdx = yaml.indexOf('id: reconcile-drift-gate')
    expect(stepIdx, 'reconcile-drift-gate step not found').toBeGreaterThan(-1)
    const nextStepIdx = yaml.indexOf('\n      - name:', stepIdx)
    const body = yaml.slice(stepIdx, nextStepIdx === -1 ? undefined : nextStepIdx)
    expect(
      /working-directory:\s*platform\b/.test(body),
      'reconcile-drift-gate must still run under working-directory: platform — it is the step that writes reconcile-output.txt via `tee`, and only identify-failed-step (a later, separate step that reads it back) needed to change',
    ).toBe(true)
  })
})
