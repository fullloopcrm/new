import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface: every prior guard in this lane (items 204-207) asked
// what happens to a step AFTER it starts running (neutered via continue-on-
// error/`|| true`, skipped via `if:`, or silently narrowed via a flag on tsc/
// eslint/vitest). None of them looked at the one step every other gating step
// depends on to even have correct code to check: "Install dependencies"
// (ci.yml:42, `run: npm ci`).
//
// `npm ci` is NOT interchangeable with `npm install` despite both leaving a
// populated node_modules/ behind. `npm ci` requires package-lock.json to
// exactly match package.json and FAILS the step if they've drifted (a
// dependency bumped in package.json without regenerating the lock, or a
// manually hand-edited lockfile). `npm install` does not fail on that same
// drift -- it silently rewrites the lockfile to match and continues. Swapping
// `ci` for `install` (a plausible "same thing, npm install is more familiar"
// edit) makes the Install step keep exiting 0, keep printing a normal
// dependency-install log, while quietly disabling the one built-in check that
// catches a lockfile out of sync with package.json -- exactly the kind of
// gate that then ships whatever the drifted lockfile happens to resolve to,
// with no red X and nothing in the diff pointing at ci.yml.
//
// Verified clean today: ci.yml:42 is `run: npm ci`, the only install-family
// invocation in any workflow file (tenant-config-reconcile.yml's job never
// installs npm dependencies at all -- reconcile-tenant-config.mjs uses only
// Node built-ins).
//
// Mutation-verified before writing the fix: changed ci.yml:42 to
// `run: npm install` and confirmed this guard's assertion fails with the
// exact predicted message; separately changed it to `run: npm i` and
// confirmed the same. Both reverted afterward (`git diff --stat ci.yml`
// empty).
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as ci-lint-scope-guard.test.ts / ci-typecheck-scope-guard.test.ts.
// vitest runs with the platform package root as cwd, so ci.yml lives one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')

function ciYaml(): string {
  return readFileSync(CI_WORKFLOW, 'utf8')
}

// Any line that shells out to npm's install family (ci/install/i/add) as a
// step's `run:`. Matching `npm` generically (not just `npm ci`) so a swap to
// `npm install` is still caught by the same finder, not missed by it.
function npmInstallFamilyLines(yaml: string): Array<{ line: number; cmd: string }> {
  const out: Array<{ line: number; cmd: string }> = []
  yaml.split('\n').forEach((raw, i) => {
    if (/\bnpm\s+(ci|install|i|add)\b/.test(raw) && /\brun:/.test(raw)) {
      out.push({ line: i + 1, cmd: raw.trim() })
    }
  })
  return out
}

// The lockfile-sync check only exists under `npm ci`. `install`/`i`/`add`
// silently rewrite package-lock.json on drift instead of failing.
function usesCi(cmd: string): boolean {
  return /\bnpm\s+ci\b/.test(cmd)
}

describe('CI invariant — Install step stays `npm ci` (lockfile-drift check can\'t be silently dropped)', () => {
  it('ci.yml exists where the guard expects it', () => {
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
  })

  it('ci.yml still contains an npm install-family step (the surface it protects is not deleted)', () => {
    expect(
      npmInstallFamilyLines(ciYaml()).length,
      'ci.yml has no `run: … npm ci/install/i/add …` step — the dependency-install gate is gone',
    ).toBeGreaterThan(0)
  })

  it('every npm install-family invocation uses `npm ci`, not `install`/`i`/`add`', () => {
    const offenders = npmInstallFamilyLines(ciYaml()).filter((v) => !usesCi(v.cmd))
    expect(
      offenders,
      'An install step uses npm install/i/add instead of npm ci — this silently drops ' +
        'the lockfile-drift check (npm ci fails on package.json/package-lock.json mismatch; ' +
        'npm install just rewrites the lockfile and continues):\n' +
        offenders.map((o) => `  ci.yml:${o.line}\n    ${o.cmd}`).join('\n'),
    ).toEqual([])
  })
})
