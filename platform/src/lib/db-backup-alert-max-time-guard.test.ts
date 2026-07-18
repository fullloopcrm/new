import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item
// (229), continuation of items (227)-(228)'s surface
// (notify-failure-hang-bound-guard.test.ts) onto the third file that shares
// the same Telegram-curl shape.
//
// Items (227)/(228) fixed ci.yml's and tenant-config-reconcile.yml's
// separate `notify-failure` jobs: neither had a job-level `timeout-minutes`
// NOR a `curl --max-time` bound, so a network hang reaching
// api.telegram.org would ride GitHub's 360-minute default job timeout.
// db-backup.yml's own "Alert on failure" step (db-backup.yml:113-136) makes
// the SAME unbounded `curl -sS "https://api.telegram.org/..."` call with no
// `--max-time` — verified today: grepping db-backup.yml for "max-time"
// returns nothing, and db-backup-alert-guard.test.ts (the only existing
// guard over this step) checks the if:/env self-gate bug and the bash
// TG_TOKEN/TG_CHAT guard, but never reads the curl invocation itself.
//
// The blast radius here is smaller than (227)/(228), and this guard says so
// rather than reusing their "six hours unbounded" framing verbatim: this
// step is the LAST step of the SAME `backup` job (db-backup.yml:55), which
// already carries `timeout-minutes: 30` — so a hang here is bounded by
// whatever budget remains in that 30-minute job window, not GitHub's
// 360-minute job default. But `curl` still has no response timeout of its
// own, so a DNS hang or slow-drip response from Telegram would silently
// consume the rest of the nightly backup job's remaining timeout budget
// instead of failing in a couple seconds — on a step whose only job is a
// fast failure ping after the actual backup work (dump/encrypt/upload) is
// already done. Defense-in-depth under the existing job timeout, same shape
// as this lane's other "currently-bounded-by-something-coarser, tighten the
// specific control anyway" guards (items 210/216/217).
//
// Mutation-verified before writing the fix: this test file, run against the
// pre-fix db-backup.yml (bare `curl -sS ...`, no --max-time), fails with the
// exact predicted message below. Fixed by adding `--max-time 30` to the
// call (same bound chosen for (227)/(228), comfortably above a normal
// Telegram round-trip). Mutation-verified again after the fix: reverting
// `curl -sS --max-time 30` back to bare `curl -sS` — guard caught it,
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

function alertStepBlock(yaml: string): string {
  const m = yaml.match(/- name:\s*Alert on failure[\s\S]*?(?=\n\s*- name:|\n*$)/)
  expect(m, 'could not locate the "Alert on failure" step block in db-backup.yml').not.toBeNull()
  return m![0]
}

describe('CI invariant — db-backup.yml alert step cannot hang unbounded on a Telegram network stall', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the alert step\'s curl call still bounds itself with --max-time', () => {
    const block = alertStepBlock(dbBackupYaml())
    expect(
      /curl\s+-sS\s+--max-time\s+\d+/.test(block),
      "db-backup.yml's Alert on failure step's curl call no longer sets " +
        '--max-time — curl has no default response timeout, so a slow-drip ' +
        "or hung response from Telegram's API would silently consume the " +
        "rest of the backup job's remaining timeout-minutes budget instead " +
        'of failing fast on its own.',
    ).toBe(true)
  })
})
