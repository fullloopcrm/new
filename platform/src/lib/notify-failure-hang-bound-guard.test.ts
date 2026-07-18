import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, items (227)-(228).
//
// ci.yml's and tenant-config-reconcile.yml's `notify-failure` jobs each ran a
// single `curl` POST to a third-party API (api.telegram.org) with NEITHER a
// job-level `timeout-minutes` NOR a per-call `--max-time` bound -- unlike
// every OTHER job in this lane (`verify:`, `reconcile:`, `backup:`), which
// all carry an explicit `timeout-minutes` specifically so a hung step can't
// block the runner indefinitely (see ci-workflow-resilience-guard.test.ts /
// reconcile-gate-wiring.test.ts's own timeout checks). Grepping every guard
// test file in this lane for "max-time" turned up nothing, and neither
// notify-failure job appeared in either timeout-anchored regex (both are
// anchored to `verify:` / `backup:` specifically, by design, per that file's
// own comment about not wanting a timeout that silently migrated off the
// long-running job onto the trivial one).
//
// ci-workflow-resilience-guard.test.ts's own comment calls notify-failure
// "the trivial one-step notify-failure job" when explaining why its timeout
// checks are anchored elsewhere -- true for the shell logic around the curl
// call, but the curl call itself reaches an external, third-party network
// endpoint this job has zero control over. `curl` has no default response
// timeout: a DNS hang, a slow-drip response, or api.telegram.org simply not
// answering would block the step (and therefore the job) indefinitely.
// Without a job-level timeout-minutes, GitHub's own default of 360 minutes
// applies -- so a single network hiccup reaching Telegram would occupy a
// runner for up to six hours on a job whose only purpose is a fast failure
// ping, burning runner-minutes and -- worse -- leaving the actual CI/reconcile
// failure this job exists to announce unreported for that entire window
// instead of failing fast and moving on.
//
// Mutation-verified before writing the fix, two independent regressions per
// file (ci.yml and tenant-config-reconcile.yml each tested), each restored
// before the next:
//   1. deleted the `timeout-minutes: 5` line from the notify-failure job --
//      full suite green.
//   2. reverted `curl -s --max-time 30` back to `curl -s` (no --max-time) --
//      full suite green.
// All four mutations (2 regressions x 2 files) restored with `git diff
// --stat .github/workflows/` empty afterward.
//
// Fixed: added `timeout-minutes: 5` to both notify-failure jobs and
// `--max-time 30` to both curl calls (comfortably above a normal Telegram API
// round-trip, well under the job's own 5-minute bound).
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

// Isolate the notify-failure job's block, from its own header down to the
// next top-level job/key or EOF -- same "walk to the next unindented line"
// approach as reconcile-gate-exit-code-preservation.test.ts.
function notifyFailureJobBlock(yaml: string, file: string): string {
  const m = yaml.match(/\n {2}notify-failure:[\s\S]*?(?=\n {2}\S|\n*$)/)
  expect(m, `could not locate the notify-failure job block in ${file}`).not.toBeNull()
  return m![0]
}

describe.each([
  ['ci.yml', CI_WORKFLOW],
  ['tenant-config-reconcile.yml', RECONCILE_WORKFLOW],
])('CI invariant — %s\'s notify-failure job cannot hang unbounded on a Telegram network stall', (name, path) => {
  it(`${name} exists where the guard expects it`, () => {
    expect(existsSync(path), `no workflow at ${path}`).toBe(true)
  })

  it(`${name}'s notify-failure job still declares a job-level timeout-minutes (not left to GitHub's 360-minute default)`, () => {
    const block = notifyFailureJobBlock(yamlOf(path), name)
    expect(
      /timeout-minutes:\s*\d+/.test(block),
      `${name}'s notify-failure job no longer declares timeout-minutes -- a ` +
        'network hang reaching api.telegram.org would now block the runner up ' +
        "to GitHub's 360-minute default job timeout instead of failing fast.",
    ).toBe(true)
  })

  it(`${name}'s notify-failure curl call still bounds itself with --max-time (defense-in-depth under the job timeout)`, () => {
    const block = notifyFailureJobBlock(yamlOf(path), name)
    expect(
      /curl\s+-s\s+--max-time\s+\d+/.test(block),
      `${name}'s notify-failure job's curl call no longer sets --max-time -- ` +
        "curl itself has no default response timeout, so a slow-drip or hung " +
        "response from Telegram's API would sit until the job-level timeout " +
        'kills the whole job rather than the call failing fast on its own.',
    ).toBe(true)
  })
})
