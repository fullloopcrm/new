import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — the tenant-config reconcile gate's exit code must
// survive its own `tee` pipe (W3 lane: reconcile gate + CI wiring, PR9).
//
// tenant-config-reconcile.yml's "Reconcile tenant config" step pipes
// `node scripts/reconcile-tenant-config.mjs` through `tee reconcile-output.txt`
// so the drift report can ALSO be written to $GITHUB_STEP_SUMMARY, then
// deliberately `set +e`s so that summary write still runs even when the
// script found a gating CRIT (exit 1) — capturing the real exit code via
// bash's `PIPESTATUS[0]` array (tee's own exit status, not node's, is what a
// bare `$?` would give afterward) and re-asserting it with an explicit
// `exit "$exit_code"` as the step's last line.
//
// That final `exit "$exit_code"` line is load-bearing and easy to lose in a
// future edit (a merge-conflict resolution, a "cleanup trailing lines" pass,
// or someone deciding the tee dance looks like unnecessary boilerplate and
// deleting the tail of the script). If it goes missing, `set +e` is still in
// effect, so the step's actual exit status becomes whatever the LAST command
// in the script returned — the summary-file append, which always succeeds —
// regardless of whether the reconcile script found a gating CRIT. Verified
// empirically: `set +e; false | tee out; code=${PIPESTATUS[0]}; echo ok >>
// out2` exits 0 even though `code` correctly captured 1. The Job Summary
// would still show the CRIT findings in plain text, but the PR check itself
// would go green — a silent, review-proof defeat of the exact 2026-07-10
// outage-class gate this workflow exists to enforce. Nothing else in this
// lane's existing coverage (reconcile-gate-wiring.test.ts) reads past the
// `tee` invocation to check what happens to the captured exit code
// afterward, so this specific shape had zero regression coverage.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as reconcile-gate-wiring.test.ts / db-backup-alert-guard.test.ts.
// vitest runs with the platform package root as cwd, so workflows live one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function reconcileYaml(): string {
  return readFileSync(RECONCILE_WORKFLOW, 'utf8')
}

// Isolate the "Reconcile tenant config" step's own run block — from its
// `- name:` line up to (not including) the next `- name:` step or the next
// top-level job key (`notify-failure:`), whichever comes first.
function reconcileStepBlock(yaml: string): string {
  const m = yaml.match(/- name:\s*Reconcile tenant config[\s\S]*?(?=\n\s*- name:|\n\s*notify-failure:|\n*$)/)
  expect(m, 'could not locate the "Reconcile tenant config" step block').not.toBeNull()
  return m![0]
}

describe('CI invariant — reconcile gate exit code survives its own tee pipe', () => {
  it('the reconcile workflow exists where the guard expects it', () => {
    expect(existsSync(RECONCILE_WORKFLOW), `no reconcile workflow at ${RECONCILE_WORKFLOW}`).toBe(true)
  })

  it('the step still disables errexit before the pipe (set +e)', () => {
    const block = reconcileStepBlock(reconcileYaml())
    expect(
      /(^|\s)set \+e(\s|$)/m.test(block),
      'the "Reconcile tenant config" step no longer has `set +e` — without it, ' +
        'a gating CRIT (node exit 1) would abort the script before the Job ' +
        'Summary write, silently dropping the drift report from the run summary.',
    ).toBe(true)
  })

  it('captures the real exit code via PIPESTATUS[0], not a bare $? after tee', () => {
    const block = reconcileStepBlock(reconcileYaml())
    expect(
      /\$\{PIPESTATUS\[0\]\}/.test(block),
      'the "Reconcile tenant config" step no longer captures `${PIPESTATUS[0]}` ' +
        '— a bare `$?` read after `tee` reflects tee\'s own exit status (always 0 ' +
        'on a successful write), not the reconcile script\'s real exit code, so a ' +
        'gating CRIT would silently stop failing the step.',
    ).toBe(true)
  })

  it('re-asserts the captured exit code as the step\'s actual exit status', () => {
    const block = reconcileStepBlock(reconcileYaml())
    const captureMatch = block.match(/(\w+)=\$\{PIPESTATUS\[0\]\}/)
    expect(captureMatch, 'could not find the `<var>=${PIPESTATUS[0]}` capture to cross-check against').not.toBeNull()
    const varName = captureMatch![1]

    // Must exit with the CAPTURED variable specifically — not a hardcoded
    // `exit 0`, and not a dangling script that falls through to whatever the
    // last command (the summary-file append) happens to return.
    const exitRx = new RegExp(`exit\\s+"?\\$${varName}"?\\b`)
    expect(
      exitRx.test(block),
      `the "Reconcile tenant config" step no longer ends with \`exit "$${varName}"\` ` +
        '(the captured real exit code). Without it, `set +e` leaves the step\'s exit ' +
        'status as whatever the summary-file append returns (always 0 on success), ' +
        'so a gating CRIT drift finding would print correctly in the Job Summary but ' +
        'the PR check would still show green — a silent, review-proof defeat of the ' +
        '2026-07-10 outage-class gate.',
    ).toBe(true)

    // And that exit call must be the LAST executable line of the step (not
    // just present somewhere earlier and then overridden/no-op'd by trailing
    // commands that could reset $?).
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const lastLine = lines[lines.length - 1]
    expect(
      exitRx.test(lastLine),
      `the captured exit code is referenced but is not the step's final line ` +
        `(final line was: "${lastLine}") — a trailing command after it could ` +
        'silently reset the step\'s real exit status.',
    ).toBe(true)
  })
})
