import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item
// (244) -- first "missing-feature/UX-friction" pass on this lane's surface,
// a new track distinct from every prior item here: (196)/(213)/(227)-(230)
// exhaustively proved the notify-failure Telegram alert FIRES on a real
// failure. None of them asked what the alert actually SAYS. Before this
// item, ci.yml's alert text was exactly "❌ CI failed — CI" plus
// branch/commit/run-link -- with 8 steps in the `verify` job (checkout,
// setup-node, install, typecheck, test, tenant-scope, protected-tenant,
// lint), whoever gets paged learns NOTHING about which one broke without
// clicking through to the run and reading the log. That is real
// operational friction on every red run, not a correctness bug -- the gate
// still gated correctly either way.
//
// Fixed by giving every step in `verify` an `id:`, adding a same-job
// `if: failure()` step ("Identify which step failed (for the Telegram
// alert)") that checks each `steps.<id>.outcome` explicitly (GitHub Actions
// expressions can't be parameterized by a shell variable, so this can't be a
// loop) and publishes the first failed one as a job `output`, and reading
// that output into the notify-failure job's TEXT via
// `needs.verify.outputs.failed_step`. The new step is named with "Telegram"
// so ci-gate-conditional-skip-guard.test.ts's ALERT_STEP_NAME_RE exemption
// (no gating step may carry an `if:`, on pain of silently reporting
// "skipped" instead of "failure" under branch protection) applies to it too
// -- it exists only to enrich the alert and is not itself a gate.
//
// Mutation-verified before writing this file: reverting the `failed step:`
// line from ci.yml's TEXT left the full 495-file / 2508-test vitest suite
// green with no other guard catching the regression -- this is genuinely
// new ground, not already pinned by ci-notify-failure-wiring-guard.test.ts
// (job-level `needs:`/`if:` only) or telegram-alert-body-encoding-guard
// .test.ts (curl flag correctness only).
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as every sibling guard in this lane.

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

function notifyFailureJobBody(yaml: string): string {
  const start = yaml.indexOf('\n  notify-failure:')
  return yaml.slice(start)
}

describe('CI invariant — ci.yml notify-failure alert names WHICH step actually broke', () => {
  it('the workflows directory and ci.yml exist where the guard expects them', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
  })

  it('every real step in the verify job has an explicit id (so its outcome is readable)', () => {
    const body = verifyJobBody(ciYaml())
    for (const id of ['checkout', 'setup-node', 'install', 'typecheck', 'test', 'tenant-scope', 'protected-tenant', 'lint']) {
      expect(
        new RegExp(`id:\\s*${id}\\b`).test(body),
        `verify job is missing a step with id: ${id} — the failed-step summary step reads steps.${id}.outcome, and a renamed/removed id silently breaks that check`,
      ).toBe(true)
    }
  })

  it('the verify job declares a `failed_step` output wired to the identify-failed-step step', () => {
    const body = verifyJobBody(ciYaml())
    expect(
      /outputs:\s*\n\s*failed_step:\s*\$\{\{\s*steps\.identify-failed-step\.outputs\.failed_step\s*\}\}/.test(body),
      'verify job no longer exposes outputs.failed_step from steps.identify-failed-step — notify-failure would read an undefined value',
    ).toBe(true)
  })

  it('the identify-failed-step step only runs on failure() and is named so the no-if-on-gating-steps guard exempts it', () => {
    const body = verifyJobBody(ciYaml())
    const stepMatch = body.match(/- name:\s*(.*Telegram.*)\n\s*id:\s*identify-failed-step\n\s*if:\s*failure\(\)/)
    expect(
      stepMatch,
      'expected a step named with "Telegram" (for ci-gate-conditional-skip-guard.test.ts\'s ALERT_STEP_NAME_RE exemption), id: identify-failed-step, if: failure() — in that order',
    ).not.toBeNull()
  })

  it('the identify-failed-step step checks every gating step\'s outcome, not just a subset', () => {
    const body = verifyJobBody(ciYaml())
    const stepBodyStart = body.indexOf('id: identify-failed-step')
    const stepBody = body.slice(stepBodyStart)
    for (const id of ['checkout', 'setup-node', 'install', 'typecheck', 'test', 'tenant-scope', 'protected-tenant', 'lint']) {
      expect(
        stepBody.includes(`steps.${id}.outcome`),
        `identify-failed-step never checks steps.${id}.outcome — a failure in that step would report "unknown" in the Telegram alert instead of naming it`,
      ).toBe(true)
    }
  })

  it('notify-failure\'s Telegram TEXT includes the failed step name from verify\'s output', () => {
    const body = notifyFailureJobBody(ciYaml())
    expect(
      /failed step:\s*\$\{\{\s*needs\.verify\.outputs\.failed_step\s*\}\}/.test(body),
      'notify-failure\'s TEXT no longer includes needs.verify.outputs.failed_step — the alert regresses to naming only the workflow, not which step broke',
    ).toBe(true)
  })
})
