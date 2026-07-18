import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, item (221).
//
// db-backup.yml's own `on:` trigger block had ZERO regression coverage.
// Every existing guard in this lane (db-backup-alert-guard.test.ts,
// db-backup-encryption-fail-closed.test.ts, db-backup-dump-size-sanity-
// gate.test.ts, db-backup-pg-dump-source-pin-guard.test.ts, db-backup-
// encrypt-strength-guard.test.ts, db-backup-encrypt-fail-safe-purge-guard.
// test.ts, db-backup-upload-fail-closed-guard.test.ts, ci-workflow-
// resilience-guard.test.ts, ci-workflow-permissions-guard.test.ts) reads
// deep into the job's steps or its concurrency/permissions block, but none
// of them ever reads the workflow's `on:` block. Grepping every guard test
// file in this lane for `cron` or `workflow_dispatch` (as an assertion
// target, not incidental text) turned up nothing.
//
// This is not a hypothetical: unlike every other job in this repo (ci.yml /
// tenant-config-reconcile.yml run on `push`/`pull_request`, so a broken
// trigger would be immediately visible — the workflow just wouldn't run on
// the very next PR), db-backup.yml's PRIMARY trigger is `schedule:`, which
// fires unattended, off-PR, with no human watching. A silently dropped or
// weakened `schedule:` block is exactly the kind of regression this gate
// exists to catch: the job would simply stop running (or run less often)
// with NOTHING red — no failed PR check, no failed run, because there would
// be no run at all. The only way anyone would notice is discovering, during
// an actual restore, that the most recent backup artifact is weeks old.
// `workflow_dispatch: {}` is the operator's own manual escape hatch for a
// test/restore-drill per the step's own comment; losing it wouldn't stop
// the nightly job, but it would silently remove the only way to run an
// on-demand backup ahead of a risky migration.
//
// Mutation-verified before writing the fix, three independent regressions,
// each restored before the next:
//   1. Deleted the entire `schedule:` block (leaving only
//      `workflow_dispatch: {}`) — the full 483-file / 2416-test vitest
//      suite stayed 100% green.
//   2. Left `schedule:` in place but weakened the cron expression from
//      daily to weekly (`'0 9 * * *'` -> `'0 9 * * 0'`) — same result, full
//      suite green. This is the more dangerous of the two: the `schedule:`
//      key is still present, so a reviewer skimming the diff for "is there
//      still a schedule:" would see nothing wrong, yet the backup cadence
//      silently dropped from nightly to weekly.
//   3. Deleted `workflow_dispatch: {}` (leaving `schedule:` untouched) —
//      same result, full suite green.
// All three restores left `git diff --stat .github/workflows/` empty
// afterward.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as every other guard in this lane. vitest runs with the platform
// package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

// Isolate the `on:` trigger block — from `^on:` up to the next top-level
// key (`permissions:`), not the whole file, so a cron-shaped string
// anywhere else in the YAML (e.g. a comment) can't false-pass this guard.
function onBlock(yaml: string): string {
  const m = yaml.match(/^on:[\s\S]*?(?=\n\S)/m)
  expect(m, 'could not locate the `on:` trigger block in db-backup.yml').not.toBeNull()
  return m![0]
}

describe('CI invariant — db-backup.yml keeps its unattended nightly trigger', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('still declares a schedule: trigger (the nightly run is not silently dropped)', () => {
    const block = onBlock(dbBackupYaml())
    expect(
      /^\s*schedule:\s*$/m.test(block),
      'db-backup.yml no longer declares a `schedule:` trigger — the nightly backup ' +
        'would stop running with nothing red: no failed PR check, no failed run, ' +
        'because there would be no run at all.',
    ).toBe(true)
  })

  it('the cron expression is still pinned to daily at 09:00 UTC, not silently weakened', () => {
    const block = onBlock(dbBackupYaml())
    expect(
      /cron:\s*'0 9 \* \* \*'/.test(block),
      "db-backup.yml's cron expression is no longer `'0 9 * * *'` (09:00 UTC daily) — " +
        'a change here (e.g. to a weekly or monthly cadence) leaves the `schedule:` key ' +
        'present, so a diff skim would show nothing obviously wrong, while the real ' +
        'backup cadence silently degrades.',
    ).toBe(true)
  })

  it('still declares workflow_dispatch (the manual test/restore-drill escape hatch)', () => {
    const block = onBlock(dbBackupYaml())
    expect(
      /^\s*workflow_dispatch:\s*\{\}/m.test(block),
      'db-backup.yml no longer declares `workflow_dispatch: {}` — the only way to run ' +
        'an on-demand backup ahead of a risky migration, or to test/restore-drill ' +
        'without waiting for the nightly cron, would be gone.',
    ).toBe(true)
  })
})
