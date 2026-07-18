import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — item (212) fresh ground. tenant-config-reconcile.yml's
// own concurrency-group + timeout-minutes declarations are pinned by
// reconcile-gate-wiring.test.ts ("cancels superseded runs..." / "bounds the
// reconcile job with a timeout..."), but ci.yml (concurrency group
// `ci-${{ github.ref }}` + `timeout-minutes: 20` on `verify`) and
// db-backup.yml (concurrency group `db-backup` + `timeout-minutes: 30` on
// `backup`) declare the identical resilience knobs with ZERO regression
// coverage anywhere in this lane. Mutation-verified before writing this file:
// deleting either file's concurrency block, or either file's timeout-minutes
// line, left the full 474-file / 2375-test vitest suite green.
//
// Why it matters: no concurrency group means a stale run on an old commit can
// outlive a newer push, burning runner minutes re-checking dead state (ci.yml)
// or racing a second nightly backup attempt against a stuck one (db-backup.yml,
// which sets cancel-in-progress:false deliberately — a partial dump must not be
// cancelled mid-upload, but a second scheduled/dispatched run must still queue
// behind it, not run concurrently against the same encrypted-artifact stamp).
// No timeout-minutes means a hung `npx vitest run` / `npm ci` / `pg_dump` could
// block its runner indefinitely instead of failing loud.
//
// Continuation (step 2 of the queue): the timeout checks below are anchored to
// each file's SPECIFIC long-running job (`verify:` / `backup:`), not "the
// string timeout-minutes appears anywhere in the file" — an anywhere-in-file
// regex was mutation-verified to stay green even when timeout-minutes was
// moved off the long-running job onto the trivial one-step notify-failure job
// instead, leaving the job that actually needs bounding unbounded. The SAME
// blind spot existed in the pre-existing `reconcile-gate-wiring.test.ts` timeout
// check for tenant-config-reconcile.yml and was tightened identically there.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — matching
// every other guard in this lane. vitest runs with the platform package root as
// cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')

function workflowYaml(name: string): string {
  return readFileSync(join(WORKFLOWS_DIR, name), 'utf8')
}

describe('CI invariant — ci.yml and db-backup.yml keep their resilience knobs', () => {
  it('ci.yml cancels superseded runs on the same ref (concurrency group + cancel-in-progress: true)', () => {
    const yaml = workflowYaml('ci.yml')
    expect(
      /concurrency:\s*\n\s*group:\s*ci-.+\n\s*cancel-in-progress:\s*true/.test(yaml),
      'ci.yml no longer declares a concurrency group with cancel-in-progress: true ' +
        '— a stale run on an old commit could outlive a newer push and burn runner ' +
        'minutes re-checking dead state.',
    ).toBe(true)
  })

  it('ci.yml bounds the verify job — specifically — with a timeout (no unbounded hang on a stuck step)', () => {
    const yaml = workflowYaml('ci.yml')
    // Anchored to `verify:` + its own `runs-on:` line, not "timeout-minutes
    // appears anywhere in the file". A generic anywhere-in-file match would stay
    // green even if timeout-minutes were moved off the long-running verify job
    // (npm ci / tsc / vitest / eslint) onto the trivial one-step notify-failure
    // job instead — mutation-verified: doing exactly that left a same-shaped
    // anywhere-in-file regex passing while the job it's meant to bound went
    // unbounded (falls back to GitHub's 360-minute default).
    expect(
      /verify:\s*\n\s*runs-on:\s*ubuntu-latest\s*\n\s*timeout-minutes:\s*\d+/.test(yaml),
      'ci.yml no longer sets timeout-minutes directly on the verify job — a hung ' +
        'npm ci / tsc / vitest / eslint step could block the runner indefinitely.',
    ).toBe(true)
  })

  it('db-backup.yml serializes runs instead of racing them (concurrency group, cancel-in-progress: false)', () => {
    const yaml = workflowYaml('db-backup.yml')
    // Deliberately cancel-in-progress: false, not true — a partial dump must not
    // be killed mid-upload by a newer trigger. The group still queues a second
    // run behind the first instead of letting them race the same artifact stamp.
    expect(
      /concurrency:\s*\n\s*group:\s*db-backup\s*\n\s*cancel-in-progress:\s*false/.test(yaml),
      'db-backup.yml no longer declares `concurrency: group: db-backup, ' +
        'cancel-in-progress: false` — a manually-dispatched run could now race a ' +
        'scheduled nightly run (or vice versa) against the same encrypted artifact.',
    ).toBe(true)
  })

  it('db-backup.yml bounds the backup job — specifically — with a timeout (no unbounded hang on a stuck pg_dump)', () => {
    const yaml = workflowYaml('db-backup.yml')
    // Same job-anchored shape as the ci.yml check above — an anywhere-in-file
    // match would stay green even if timeout-minutes moved off `backup` onto
    // the trivial notify-failure job.
    expect(
      /backup:\s*\n\s*runs-on:\s*ubuntu-latest\s*\n\s*timeout-minutes:\s*\d+/.test(yaml),
      'db-backup.yml no longer sets timeout-minutes directly on the backup job — ' +
        'a hung pg_dump against a large/locked database could block the runner ' +
        'indefinitely.',
    ).toBe(true)
  })
})
