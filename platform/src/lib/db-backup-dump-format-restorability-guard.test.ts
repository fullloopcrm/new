import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — item (224) continuation of item (223)'s surface. Item
// (223) found db-backup.yml's UPLOAD step's own `retention-days: 90` — the
// disaster-recovery WINDOW — silently mutable with zero coverage. Walking one
// step earlier in the same pipeline to the DUMP step itself surfaces the
// sibling gap: whether the dump is actually USABLE for a restore at all is
// controlled by two pg_dump flags — `-Fc` (custom format, required by
// `pg_restore`; without it pg_dump falls back to plain-text SQL) and
// `--no-owner --no-privileges` (strips OWNER TO / GRANT / REVOKE statements
// tied to the original database's roles, required to restore cleanly into a
// fresh project with different role names, per this file's own header
// comment: "restores cleanly into a fresh project") — and NEITHER flag has
// any regression coverage anywhere in this lane.
// db-backup-dump-size-sanity-gate.test.ts pins `set -euo pipefail` and the
// `SIZE -lt 100000` sanity check on this exact step, but never reads the
// `pg_dump` invocation's own flags. Grepping every `db-backup-*.test.ts` file
// for `-Fc`, `no-owner`, or `no-privileges` turns up nothing.
//
// Why it matters: dropping either flag produces a dump that still succeeds,
// still clears the SIZE sanity gate (a plain-text SQL dump of the same data is
// not smaller — often larger), still encrypts, still uploads, and still
// passes `if-no-files-found: error` — the run shows fully GREEN. The failure
// is invisible until someone actually runs the restore command this file's
// own header documents (`pg_restore ...`, which requires -Fc's custom format
// and cannot read plain SQL the same way) or hits ownership/grant errors
// restoring into a fresh Supabase project — at the exact moment a real
// disaster-recovery restore is needed, the worst possible time to discover a
// backup silently isn't usable.
//
// Mutation-verified before writing this file: (1) dropped `-Fc` from the
// pg_dump invocation (leaving `--no-owner --no-privileges -f "fullloop-
// $STAMP.dump"`, falling back to plain-text format) — the full 486-file /
// 2430-test vitest suite stayed 100% green. (2) independently dropped
// `--no-owner --no-privileges` (leaving `-Fc -f "fullloop-$STAMP.dump"`) —
// same result, full suite green. Both restores left `git diff --stat
// .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as db-backup-dump-size-sanity-gate.test.ts (the sibling guard on
// this exact step). vitest runs with the platform package root as cwd, so
// workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function dumpStepBlock(yaml: string): string | null {
  const m = yaml.match(/- name:\s*Dump full database[\s\S]*?(?=\n\s*- name:|\n*$)/)
  return m ? m[0] : null
}

describe('CI invariant — db-backup.yml produces a dump that is actually restorable, not just present', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the dump step exists (the guard has something to check)', () => {
    const yaml = dbBackupYaml()
    expect(dumpStepBlock(yaml), 'could not locate the "Dump full database" step block').not.toBeNull()
  })

  it('pg_dump still writes custom format (-Fc), not a silent fallback to plain-text SQL', () => {
    const yaml = dbBackupYaml()
    const block = dumpStepBlock(yaml)
    expect(block).not.toBeNull()
    const pgDumpIdx = block!.indexOf('pg_dump ')
    expect(pgDumpIdx, 'could not locate the pg_dump invocation').toBeGreaterThan(-1)
    const invocation = block!.slice(pgDumpIdx)
    expect(
      /-Fc\b/.test(invocation),
      'db-backup.yml\'s pg_dump invocation no longer passes -Fc (custom format). ' +
        'Without it, pg_dump falls back to plain-text SQL — the dump still succeeds, ' +
        'passes the SIZE sanity gate, encrypts, and uploads (fully green), but the ' +
        'restore command this file\'s own header documents (`pg_restore ...`) needs ' +
        'the custom-format archive and cannot restore a plain SQL dump the same way.',
    ).toBe(true)
  })

  it('pg_dump still strips ownership/grants (--no-owner --no-privileges), required to restore into a fresh project', () => {
    const yaml = dbBackupYaml()
    const block = dumpStepBlock(yaml)
    expect(block).not.toBeNull()
    const pgDumpIdx = block!.indexOf('pg_dump ')
    expect(pgDumpIdx, 'could not locate the pg_dump invocation').toBeGreaterThan(-1)
    const invocation = block!.slice(pgDumpIdx)
    expect(
      /--no-owner\b/.test(invocation) && /--no-privileges\b/.test(invocation),
      'db-backup.yml\'s pg_dump invocation no longer passes both --no-owner and ' +
        '--no-privileges. Without them the dump still succeeds and uploads fully ' +
        'green, but embeds OWNER TO / GRANT / REVOKE statements tied to the ' +
        'original database\'s roles — a restore into a fresh Supabase project ' +
        '(different role names) can fail or silently misassign ownership, exactly ' +
        'the case this file\'s own header comment says these flags exist to avoid ' +
        '("restores cleanly into a fresh project").',
    ).toBe(true)
  })
})
