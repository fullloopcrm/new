import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — item (213) fresh ground. tenant-config-reconcile.yml's
// own notify-failure job is pinned to its parent gate by
// reconcile-gate-wiring.test.ts ("still alerts on failure (notify-failure job
// wired to the reconcile job)" — anchors `needs: reconcile` + `if: failure()`
// together in one regex). ci.yml declares the identical shape — a
// `notify-failure` job with `needs: verify` + `if: failure()` — but no test in
// this lane anchors ci.yml's `needs: verify` line at all.
//
// ci-gate-conditional-skip-guard.test.ts comes closest: it confirms
// ci.yml:notify-failure exists and carries SOME `if:` conditional (as the
// carve-out from its "no gating step/job may carry `if:`" rule), but it never
// reads the job's `needs:` key — a job matching NOTIFY_JOB_ID_RE with `if:
// failure()` satisfies every assertion there regardless of what it needs (or
// doesn't need) on.
//
// Mutation-verified before writing this file: deleted the `needs: verify`
// line from ci.yml's notify-failure job (leaving `if: failure()` in place) —
// the full 475-file / 2379-test vitest suite stayed green.
//
// Why it matters: without `needs: verify`, the notify-failure job runs
// unscheduled relative to verify — it starts immediately in parallel instead
// of waiting on verify's outcome, and its `if: failure()` (which resolves
// against the jobs it `needs:`, not the workflow at large) has nothing to
// evaluate, so the job is skipped every run. A red `verify` gate would then
// have NO Telegram alert firing — the exact silent-alert-loss failure mode
// item (196) already fixed once for a wrong secret name, this time via a
// wrong (missing) job dependency instead.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as reconcile-gate-wiring.test.ts's sibling check. vitest runs with
// the platform package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')

function ciYaml(): string {
  return readFileSync(join(WORKFLOWS_DIR, 'ci.yml'), 'utf8')
}

describe('CI invariant — ci.yml still alerts on failure (notify-failure job wired to the verify job)', () => {
  it('notify-failure is wired to `needs: verify` + `if: failure()` (item (196)\'s exact failure-alert-silently-lost class, via a missing dependency instead of a wrong secret name)', () => {
    const yaml = ciYaml()
    expect(
      /notify-failure:\s*\n\s*needs:\s*verify\s*\n\s*if:\s*failure\(\)/.test(yaml),
      'ci.yml no longer has a notify-failure job gated on `needs: verify` + ' +
        '`if: failure()` — a red verify gate could go unnoticed with no Telegram ' +
        'alert, because a notify-failure job with no `needs:` never runs at all ' +
        '(its `if: failure()` has no dependency outcome to evaluate).',
    ).toBe(true)
  })
})
