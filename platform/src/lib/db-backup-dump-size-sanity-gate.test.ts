import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Codifies
// db-backup.yml's OTHER fail-closed contract on the "Dump full database"
// step -- distinct from item (202)'s "Encrypt dump" leak backstop. This step
// guards data INTEGRITY, not confidentiality: `set -euo pipefail` must halt
// the step immediately if `pg_dump` itself fails (a bad SUPABASE_DB_URL, an
// auth failure, a dropped connection), and the SIZE sanity check
// (`[ "$SIZE" -lt 100000 ]`) must fail closed (`exit 1`) if pg_dump exits 0
// but produced a suspiciously small/empty file. Without `set -e`, a failed
// pg_dump would fall through to `stat` a partial or missing file; without the
// size gate, a partial dump (e.g. connection dropped mid-table-dump, still
// producing more than 100KB of a huge database) would sail past silently.
// Either gap would let the "Encrypt dump" and "Upload" steps run against
// garbage, so the nightly backup job goes GREEN while the actual restorable
// data is corrupt or empty -- a silent backup-integrity failure with no
// existing test catching it (db-backup-encryption-fail-closed.test.ts only
// covers the encrypt/upload steps; db-backup-alert-guard.test.ts only covers
// the failure-alert step).
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as db-backup-encryption-fail-closed.test.ts / reconcile-gate-
// wiring.test.ts. vitest runs with the platform package root as cwd, so
// workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function stepBlock(yaml: string, namePattern: RegExp): string | null {
  const re = new RegExp(`- name:\\s*${namePattern.source}[\\s\\S]*?(?=\\n\\s*- name:|\\n*$)`)
  const m = yaml.match(re)
  return m ? m[0] : null
}

describe('CI invariant — db-backup.yml dump step fails closed on pg_dump errors and undersized dumps', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('still has a "Dump full database" step (the backup source is not deleted)', () => {
    const block = stepBlock(dbBackupYaml(), /Dump full database/)
    expect(
      block,
      'db-backup.yml no longer has a "Dump full database" step — there would be ' +
        'nothing for the encrypt/upload steps to act on.',
    ).not.toBeNull()
  })

  it('the dump step still runs with `set -euo pipefail` before invoking pg_dump', () => {
    const block = stepBlock(dbBackupYaml(), /Dump full database/)!
    const setLineIdx = block.search(/set\s+-euo\s+pipefail/)
    const pgDumpIdx = block.indexOf('pg_dump ')
    expect(
      setLineIdx,
      'the "Dump full database" step no longer runs `set -euo pipefail` — a failed ' +
        'pg_dump (bad connection string, auth failure, dropped connection) would no ' +
        'longer halt the step immediately; it would fall through to stat a missing ' +
        'or partial dump file instead of failing the job.',
    ).toBeGreaterThan(-1)
    expect(pgDumpIdx, 'could not locate the pg_dump invocation in this step').toBeGreaterThan(-1)
    expect(
      setLineIdx < pgDumpIdx,
      '`set -euo pipefail` no longer runs BEFORE pg_dump in this step — it must be ' +
        'in effect while pg_dump runs, not added after the fact.',
    ).toBe(true)
  })

  it('the dump step still computes SIZE from the actual dump file via stat', () => {
    const block = stepBlock(dbBackupYaml(), /Dump full database/)!
    expect(
      /SIZE=\$\(stat\s+-c%s\s+"fullloop-\$STAMP\.dump"\)/.test(block),
      'the "Dump full database" step no longer computes SIZE via `stat -c%s` on the ' +
        'dump file — the sanity gate below has nothing real to check against.',
    ).toBe(true)
  })

  it('the dump step still gates on SIZE -lt 100000 and fails closed with a real exit 1', () => {
    const block = stepBlock(dbBackupYaml(), /Dump full database/)!
    const sizeBranch = block.match(/\[\s*"\$SIZE"\s*-lt\s*100000\s*\][\s\S]*?fi\b/)
    expect(
      sizeBranch,
      'the "Dump full database" step no longer checks SIZE -lt 100000 — a near-empty ' +
        'or truncated dump (e.g. a partial pg_dump that still exits 0) would silently ' +
        'be treated as a valid nightly backup.',
    ).not.toBeNull()
    expect(
      /exit\s+1\b/.test(sizeBranch![0]),
      'the undersized-dump branch no longer exits 1 — it would fall through to encrypt ' +
        'and upload a suspiciously small dump as if it were a valid full-database backup, ' +
        'with the job still going green.',
    ).toBe(true)
  })

  it('the SIZE sanity check runs BEFORE the step ends (nothing bypasses it after the dump)', () => {
    const block = stepBlock(dbBackupYaml(), /Dump full database/)!
    const pgDumpIdx = block.indexOf('pg_dump ')
    const sizeIdx = block.search(/SIZE=\$\(stat/)
    expect(pgDumpIdx, 'could not locate the pg_dump invocation').toBeGreaterThan(-1)
    expect(sizeIdx, 'could not locate the SIZE computation').toBeGreaterThan(-1)
    expect(
      pgDumpIdx < sizeIdx,
      'the SIZE sanity check no longer runs after pg_dump in this same step — the gate ' +
        'must inspect the dump pg_dump just produced, not a stale artifact from a prior run.',
    ).toBe(true)
  })
})
