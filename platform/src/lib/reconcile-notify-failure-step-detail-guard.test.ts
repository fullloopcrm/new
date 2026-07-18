import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item
// (244)'s ci.yml fix (ci-notify-failure-step-detail-guard.test.ts), continued
// onto this lane's OTHER gating job per the LEADER queue's item (2): "continue
// whichever surface (1) opens up". Same "missing-feature/UX-friction" class,
// same fix: tenant-config-reconcile.yml's own notify-failure alert said only
// "tenant-config-reconcile job FAILED (CRIT drift found, OR the gate
// script/guard itself errored — check the run log to tell which)" — leaving
// even the COARSEST distinction (did the token-guard contract step break, a
// guard bug, vs did the real drift-gate step fail, either gating CRIT or a
// script exception) invisible without a log dive.
//
// Fixed the same way as ci.yml: every real step in the `reconcile` job now has
// an `id:` (checkout, setup-node, verify-token-guard, reconcile-drift-gate), a
// same-job `if: failure()` step publishes the first failed one as a job
// output, and notify-failure's TEXT reads it via
// `needs.reconcile.outputs.failed_step`.
//
// Mutation-verified before writing this file: reverting the `failed step:`
// line from tenant-config-reconcile.yml's TEXT left the full 495-file /
// 2508-test vitest suite green — reconcile-gate-wiring.test.ts only pins the
// job-level `needs:`/`if:` wiring, telegram-alert-body-encoding-guard.test.ts
// only pins the curl flags, neither reads the TEXT's content past that.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as ci-notify-failure-step-detail-guard.test.ts.

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

describe('CI invariant — tenant-config-reconcile.yml notify-failure alert names WHICH step actually broke', () => {
  it('the workflows directory and tenant-config-reconcile.yml exist where the guard expects them', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(RECONCILE_WORKFLOW), `no tenant-config-reconcile.yml at ${RECONCILE_WORKFLOW}`).toBe(true)
  })

  it('every real step in the reconcile job has an explicit id (so its outcome is readable)', () => {
    const body = reconcileJobBody(reconcileYaml())
    for (const id of ['checkout', 'setup-node', 'verify-token-guard', 'reconcile-drift-gate']) {
      expect(
        new RegExp(`id:\\s*${id}\\b`).test(body),
        `reconcile job is missing a step with id: ${id} — the failed-step summary step reads steps.${id}.outcome, and a renamed/removed id silently breaks that check`,
      ).toBe(true)
    }
  })

  it('the reconcile job declares a `failed_step` output wired to the identify-failed-step step', () => {
    const body = reconcileJobBody(reconcileYaml())
    expect(
      /outputs:\s*\n\s*failed_step:\s*\$\{\{\s*steps\.identify-failed-step\.outputs\.failed_step\s*\}\}/.test(body),
      'reconcile job no longer exposes outputs.failed_step from steps.identify-failed-step — notify-failure would read an undefined value',
    ).toBe(true)
  })

  it('the identify-failed-step step only runs on failure() and is named so the no-if-on-gating-steps guard exempts it', () => {
    const body = reconcileJobBody(reconcileYaml())
    const stepMatch = body.match(/- name:\s*(.*Telegram.*)\n\s*id:\s*identify-failed-step\n\s*if:\s*failure\(\)/)
    expect(
      stepMatch,
      'expected a step named with "Telegram" (for ci-gate-conditional-skip-guard.test.ts\'s ALERT_STEP_NAME_RE exemption), id: identify-failed-step, if: failure() — in that order',
    ).not.toBeNull()
  })

  it('the identify-failed-step step checks every gating step\'s outcome, not just a subset', () => {
    const body = reconcileJobBody(reconcileYaml())
    const stepBodyStart = body.indexOf('id: identify-failed-step')
    const stepBody = body.slice(stepBodyStart)
    for (const id of ['checkout', 'setup-node', 'verify-token-guard', 'reconcile-drift-gate']) {
      expect(
        stepBody.includes(`steps.${id}.outcome`),
        `identify-failed-step never checks steps.${id}.outcome — a failure in that step would report "unknown" in the Telegram alert instead of naming it`,
      ).toBe(true)
    }
  })

  it('the reconcile-gate-exit-code-preservation guard still finds `exit "$exit_code"` as the reconcile-drift-gate step\'s own last line (the new identify-failed-step step\'s comment sits AFTER its own `run: |`, not before its `- name:`, so it cannot be mistaken for trailing content of the prior step)', () => {
    const body = reconcileJobBody(reconcileYaml())
    const m = body.match(/- name:\s*Reconcile tenant config[\s\S]*?(?=\n\s*- name:|\n\s*notify-failure:|\n*$)/)
    expect(m, 'could not locate the "Reconcile tenant config" step block').not.toBeNull()
    const lines = m![0].split('\n').map((l) => l.trim()).filter(Boolean)
    expect(lines[lines.length - 1]).toBe('exit "$exit_code"')
  })

  it('notify-failure\'s Telegram TEXT includes the failed step name from reconcile\'s output', () => {
    const body = notifyFailureJobBody(reconcileYaml())
    expect(
      /failed step:\s*\$\{\{\s*needs\.reconcile\.outputs\.failed_step\s*\}\}/.test(body),
      'notify-failure\'s TEXT no longer includes needs.reconcile.outputs.failed_step — the alert regresses to naming neither the guard step nor the drift-gate step',
    ).toBe(true)
  })
})
