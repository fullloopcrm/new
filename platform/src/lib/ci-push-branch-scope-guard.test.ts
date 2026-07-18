import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, item (222) -- continuation (step 2 of the queue) of
// item (221)'s surface. (221) found and fixed zero coverage on db-backup.yml's
// own `on:` trigger block; re-checking the SAME class of gap on ci.yml and
// tenant-config-reconcile.yml surfaced a sibling: both workflows' `push:`
// trigger is scoped with `branches: [main]`, and that scoping had ZERO
// regression coverage anywhere in this lane.
//
// reconcile-gate-wiring.test.ts's "runs on pull_request" check only pins the
// `pull_request:` key's presence, never reads the sibling `push:` block or
// its `branches:` filter. No ci.yml-focused test reads the `on:` block at
// all (grepped every ci-*.test.ts file for `branches:` or `\[main\]` --
// nothing). Without `branches: [main]`, `push:` fires on EVERY branch push
// (burning runner minutes re-running the full gate on every WIP push to
// every feature branch); with it silently pointed at the WRONG branch (e.g.
// a stale `[master]` surviving a default-branch rename, or a typo'd
// `[main ]`/`[Main]`), the gate would silently STOP running on push to the
// repo's real default branch -- a push directly to main (a squash-merge, an
// admin override bypassing PR review) would go completely unchecked, with
// nothing red anywhere: no failed run, because there would be no run at all.
// Same "present but silently wrong" shape as (221)'s cron-cadence mutation.
//
// Mutation-verified before writing the fix, two independent regressions per
// file (ci.yml and tenant-config-reconcile.yml each tested), each restored
// before the next:
//   1. `branches: [main]` -> `branches: [master]` (stale/wrong branch name,
//      the `push:`/`branches:` keys both still present) -- full suite green.
//   2. `branches: [main]` deleted entirely (bare `push:` with no scope,
//      firing on every branch) -- full suite green.
// All four mutations (2 regressions x 2 files) restored with
// `git diff --stat .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as every other guard in this lane. vitest runs with the platform
// package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function yamlOf(path: string): string {
  return readFileSync(path, 'utf8')
}

// Isolate the `on:` trigger block, same approach as
// db-backup-schedule-trigger-guard.test.ts.
function onBlock(yaml: string, file: string): string {
  const m = yaml.match(/^on:[\s\S]*?(?=\n\S)/m)
  expect(m, `could not locate the \`on:\` trigger block in ${file}`).not.toBeNull()
  return m![0]
}

describe.each([
  ['ci.yml', CI_WORKFLOW],
  ['tenant-config-reconcile.yml', RECONCILE_WORKFLOW],
])('CI invariant — %s scopes its push trigger to the real default branch', (name, path) => {
  it(`${name} exists where the guard expects it`, () => {
    expect(existsSync(path), `no workflow at ${path}`).toBe(true)
  })

  it(`${name} still declares a push: trigger`, () => {
    const block = onBlock(yamlOf(path), name)
    expect(
      /^\s*push:\s*$/m.test(block),
      `${name} no longer declares a \`push:\` trigger — the gate would only run on ` +
        'pull_request, never on a direct push to main (a squash-merge, an admin ' +
        'override bypassing PR review).',
    ).toBe(true)
  })

  it(`${name}'s push trigger is still scoped to branches: [main]`, () => {
    const block = onBlock(yamlOf(path), name)
    expect(
      /push:\s*\n\s*branches:\s*\[main\]/.test(block),
      `${name}'s \`push:\` trigger is no longer scoped to \`branches: [main]\` — either ` +
        'the scope was dropped entirely (the gate now re-runs on every push to every ' +
        'branch, burning runner minutes) or it points at the WRONG branch (e.g. a stale ' +
        '`[master]` surviving a default-branch rename), which would silently stop the ' +
        'gate from running on push to the actual default branch, with nothing red ' +
        'anywhere to signal it.',
    ).toBe(true)
  })
})

// A branches: [main] regex that matches EITHER file's exact text is only
// useful if the two files' `on:` blocks actually still share this shape —
// pin that assumption directly so a future divergence (one file scoped, the
// other not) is itself a visible finding rather than a silent asymmetry.
describe('CI invariant — ci.yml and tenant-config-reconcile.yml stay consistent on push scoping', () => {
  it('both files use the identical branches: [main] scoping (no silent asymmetry)', () => {
    const ciBlock = onBlock(yamlOf(CI_WORKFLOW), 'ci.yml')
    const reconcileBlock = onBlock(yamlOf(RECONCILE_WORKFLOW), 'tenant-config-reconcile.yml')
    const rx = /push:\s*\n\s*branches:\s*\[main\]/
    expect(rx.test(ciBlock)).toBe(true)
    expect(rx.test(reconcileBlock)).toBe(true)
  })
})
