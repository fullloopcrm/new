import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item
// (244)'s ci.yml / tenant-config-reconcile.yml fix, continued onto
// db-backup.yml per the LEADER queue's item (2): "continue whichever surface
// (1) opens up". Same "missing-feature/UX-friction" class: db-backup.yml's
// own "Alert on failure (Telegram)" step said only "FullLoop nightly DB
// backup FAILED — run: <id>. Check the Action log." across 4 real steps
// (install pg_dump, dump, encrypt, upload) with no indication which one
// broke.
//
// Unlike ci.yml/tenant-config-reconcile.yml, this workflow's alert step lives
// in the SAME job as the steps it reports on (`backup`, not a separate
// `needs:`-wired notify-failure job) — so no job `outputs:`/`needs:`
// indirection is needed here: the alert step reads `steps.<id>.outcome`
// directly. Every real step now has an `id:` (install-pg-dump, dump, encrypt,
// upload), and the alert step's own run script checks each explicitly before
// building its Telegram text.
//
// Mutation-verified before writing this file: reverting the "failed step:"
// segment from the alert step's text left the full 497-file / 2521-test
// vitest suite green — db-backup-alert-guard.test.ts only pins the if:/env
// self-gate shape and the empty-secret bash guard, neither reads the message
// text's content past that.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as ci-notify-failure-step-detail-guard.test.ts /
// reconcile-notify-failure-step-detail-guard.test.ts.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function alertStepBody(yaml: string): string {
  const m = yaml.match(/- name:\s*Alert on failure[\s\S]*?(?=\n\s*- name:|\n*$)/)
  expect(m, 'could not locate the "Alert on failure" step block').not.toBeNull()
  return m![0]
}

describe('CI invariant — db-backup.yml alert names WHICH step actually broke', () => {
  it('the workflows directory and db-backup.yml exist where the guard expects them', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup.yml at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('every real step in the backup job has an explicit id (so its outcome is readable)', () => {
    const yaml = dbBackupYaml()
    const jobsIdx = yaml.indexOf('\njobs:')
    const jobBody = yaml.slice(jobsIdx)
    for (const id of ['install-pg-dump', 'dump', 'encrypt', 'upload']) {
      expect(
        new RegExp(`id:\\s*${id}\\b`).test(jobBody),
        `backup job is missing a step with id: ${id} — the alert step reads steps.${id}.outcome, and a renamed/removed id silently breaks that check`,
      ).toBe(true)
    }
  })

  it('the alert step checks every real step\'s outcome before building its Telegram text', () => {
    const body = alertStepBody(dbBackupYaml())
    for (const id of ['install-pg-dump', 'dump', 'encrypt', 'upload']) {
      expect(
        body.includes(`steps.${id}.outcome`),
        `the alert step never checks steps.${id}.outcome — a failure in that step would report "unknown" in the Telegram alert instead of naming it`,
      ).toBe(true)
    }
  })

  it('the Telegram text includes the computed failed step', () => {
    const body = alertStepBody(dbBackupYaml())
    expect(
      /text="[^"]*failed step:\s*\$\{failed\}/.test(body),
      'the alert step\'s Telegram text no longer includes the computed ${failed} step name',
    ).toBe(true)
  })

  it('still guards on empty TG_TOKEN/TG_CHAT before computing/using the failed step (unaffected by this change)', () => {
    const body = alertStepBody(dbBackupYaml())
    expect(/\[\s*-z\s*"\$TG_TOKEN"\s*\]/.test(body) && /\[\s*-z\s*"\$TG_CHAT"\s*\]/.test(body)).toBe(true)
  })
})
