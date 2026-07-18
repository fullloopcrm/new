import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item
// (230), fresh ground surfaced while re-reading
// db-backup-pg-dump-source-pin-guard.test.ts's own "Install latest pg_dump"
// step block for the unrelated URL-pin check it already performs (items
// 217/218): that step's own `curl -fsSL https://www.postgresql.org/media/
// keys/ACCC4CF8.asc | sudo gpg --dearmor ...` GPG-key fetch has NO
// `--max-time` bound — the fourth unbounded third-party curl call in this
// lane, after items (227)/(228)/(229) closed the same class on ci.yml's,
// tenant-config-reconcile.yml's, and db-backup.yml's OWN Telegram
// notify-failure curls. Grepping every guard test file in this lane for
// "max-time" before writing this guard turned up exactly two hits
// (db-backup-alert-max-time-guard.test.ts and
// notify-failure-hang-bound-guard.test.ts), neither of which reads this
// step — db-backup-pg-dump-source-pin-guard.test.ts pins the URL/domain
// staying correct but never reads the curl invocation's own flags.
//
// This instance is WORSE-positioned than (227)/(228)/(229): those were all
// trailing best-effort alert steps, bounded (229's case) by whatever
// budget remained after the real backup work already finished. This is the
// FIRST step of the `backup` job (db-backup.yml:55, timeout-minutes: 30) —
// a DNS hang or slow-drip response from postgresql.org here would silently
// consume the ENTIRE 30-minute job budget before the dump/encrypt/upload
// steps ever run, turning a transient network blip into a fully-skipped
// nightly backup with no partial progress to fall back on, instead of
// failing in a couple seconds and (per items 227-229's own reasoning)
// leaving the rest of the budget free for a retry or at least a fast,
// diagnosable failure.
//
// Mutation-verified before writing the fix: this test file, run against the
// pre-fix db-backup.yml (`curl -fsSL https://www.postgresql.org/...`, no
// --max-time), fails with the exact predicted message below. Fixed by
// adding `--max-time 30` to the call (same bound chosen for 227/228/229).
// Mutation-verified again after the fix: reverting
// `curl -fsSL --max-time 30` back to bare `curl -fsSL` — guard caught it,
// restored clean, `git diff --stat .github/workflows/db-backup.yml`
// unchanged before and after the round-trip.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as every other guard in this lane. vitest runs with the platform
// package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function installStepBlock(yaml: string): string {
  const m = yaml.match(/- name:\s*Install latest pg_dump[\s\S]*?(?=\n\s*- name:|\n*$)/)
  expect(m, 'could not locate the "Install latest pg_dump" step block in db-backup.yml').not.toBeNull()
  return m![0]
}

describe('CI invariant — db-backup.yml pg_dump-install GPG-key fetch cannot hang unbounded on a postgresql.org network stall', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the "Install latest pg_dump" step still exists (the surface it protects is not deleted)', () => {
    expect(installStepBlock(dbBackupYaml())).not.toBeNull()
  })

  it('the GPG-key curl call still bounds itself with --max-time', () => {
    const block = installStepBlock(dbBackupYaml())
    expect(
      /curl\s+-fsSL\s+--max-time\s+\d+\s+https:\/\/www\.postgresql\.org\/media\/keys\/ACCC4CF8\.asc/.test(block),
      'db-backup.yml\'s "Install latest pg_dump" step\'s GPG-key curl call no ' +
        'longer sets --max-time — curl has no default response timeout, so a ' +
        'DNS hang or slow-drip response from postgresql.org would silently ' +
        "consume this FIRST step's remaining share of the backup job's 30-" +
        'minute budget before the dump/encrypt/upload steps ever run, instead ' +
        'of failing fast on its own.',
    ).toBe(true)
  })
})
