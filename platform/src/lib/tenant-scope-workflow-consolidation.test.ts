import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows).
//
// FINDING (verified this session): .github/workflows/tenant-scope.yml and
// ci.yml's "Tenant-isolation guard" step both ran the EXACT same command
// (`node scripts/audit-tenant-scope.mjs`, same working directory) on the EXACT
// same triggers (push:[main] + pull_request) against the same single baseline
// file (scripts/.tenant-scope-baseline.json) — a pure duplicate, not
// defense-in-depth. Git history: tenant-scope.yml was created 2026-07-04
// 14:57 ET (60484d01); ci.yml was created the same evening, 20:35 ET
// (a8a22e3d), already baking in an identical "Tenant-isolation guard" step
// from its first commit — the second workflow duplicated the first rather
// than referencing it. This is the same "two independently hand-maintained
// copies of the same gate, nothing enforces they stay in sync" shape as
// Drift Z/AA in reconcile-tenant-config.mjs (robots.ts's MAIN_HOSTS/
// KILLED_ROUTES copies), just at the CI-workflow level instead of the
// source-parsing level: a future edit to one copy (e.g. adding a flag,
// changing the script path, loosening the gate) with no matching edit to the
// other would silently split the two "gates'" verdicts, and in the meantime
// every PR paid double runner-minutes for zero additional safety (branch
// protection is unconfigured on this repo today — verified via `gh api
// repos/.../branches/main/protection` -> 404 "Branch not protected" — so
// neither copy was even a required, separately-tracked status check).
//
// FIX: removed the standalone tenant-scope.yml. ci.yml's "Tenant-isolation
// guard" step already blocks the PR the same way (same script, same exit
// code semantics) as part of the `verify` job's existing gates. This test
// codifies BOTH halves so a future edit can't silently regress either: (1)
// the guard script is not deleted from CI outright now that there is only
// one copy left to drop, and (2) the duplicate workflow does not silently
// reappear (e.g. a merge conflict resolution re-adding an old copy of
// tenant-scope.yml, or a new file reintroducing the same duplicate command
// under a different filename) without a deliberate, reviewed decision.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as reconcile-gate-wiring.test.ts / protected-tenant-guard-wiring.
// test.ts. vitest runs with the platform package root as cwd, so the
// workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')
const GUARD_COMMAND = 'node scripts/audit-tenant-scope.mjs'

function ciYaml(): string {
  return readFileSync(CI_WORKFLOW, 'utf8')
}

// Every workflow file that shells out to the tenant-scope guard command,
// keyed by filename — used to assert exactly one survives.
function workflowsRunningGuard(): string[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .filter((f) => readFileSync(join(WORKFLOWS_DIR, f), 'utf8').includes(GUARD_COMMAND))
}

describe('CI invariant — tenant-scope guard runs from exactly one workflow (no duplicate wiring)', () => {
  it('ci.yml exists where the guard expects it', () => {
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
  })

  it('the standalone tenant-scope.yml workflow was removed (consolidated into ci.yml)', () => {
    expect(
      existsSync(join(WORKFLOWS_DIR, 'tenant-scope.yml')),
      '.github/workflows/tenant-scope.yml exists again — this was a pure duplicate ' +
        "of ci.yml's Tenant-isolation guard step (same command, same triggers, same " +
        'baseline file) and was removed. If it was deliberately reintroduced for a ' +
        'real reason (e.g. a distinct required-status-check name), update this test ' +
        'to reflect that reasoning rather than deleting it silently.',
    ).toBe(false)
  })

  it('ci.yml still runs the tenant-isolation guard (the only remaining copy is not dropped)', () => {
    const yaml = ciYaml()
    expect(
      yaml.includes(GUARD_COMMAND),
      "ci.yml no longer runs `node scripts/audit-tenant-scope.mjs` — now that the " +
        'standalone tenant-scope.yml workflow has been removed as a duplicate, this ' +
        'was the ONLY remaining copy of the tenant-isolation gate. Dropping it too ' +
        'means no workflow enforces the guard at all.',
    ).toBe(true)
  })

  it('exactly one workflow file runs the tenant-isolation guard command', () => {
    const runners = workflowsRunningGuard()
    expect(
      runners,
      `expected exactly one workflow to run \`${GUARD_COMMAND}\`, found: ${runners.join(', ') || '(none)'} — ` +
        'more than one means the duplicate-wiring bug this test guards against has come back ' +
        '(under a new filename, if not tenant-scope.yml itself); fewer than one means the gate ' +
        'was dropped entirely.',
    ).toEqual(['ci.yml'])
  })
})
