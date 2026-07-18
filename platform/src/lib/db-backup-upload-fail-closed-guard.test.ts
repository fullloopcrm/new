import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — item (214) fresh ground, continuing item (213)'s
// surface (the notify-failure alert-wiring lane) into db-backup.yml's own
// upload step. Investigating item (213) (ci.yml's notify-failure job silently
// never running without `needs: verify`) surfaced a sibling silent-failure
// class one step earlier in the SAME pipeline: db-backup.yml's "Upload
// encrypted dump as GitHub artifact" step has no `if-no-files-found:` pinned
// by any existing test.
//
// actions/upload-artifact@v4 defaults `if-no-files-found` to `warn`: if the
// expected `fullloop-$STAMP.dump.gpg` path doesn't exist at upload time (a bug
// in an earlier step, a $STAMP/$GITHUB_ENV mismatch, a merge that reorders
// steps) the step prints a warning and reports SUCCESS — the job goes green
// with an empty/no artifact for the night. And because the job never
// actually fails, the "Alert on failure" step right after it (gated on
// `if: failure()`, covered by db-backup-alert-guard.test.ts) never fires
// either — the exact same "red gate produces no visible signal" failure mode
// item (213) closed for ci.yml's job-level wiring, here at the step level one
// hop upstream of it.
//
// Mutation-verified before writing this file: deleted the
// `if-no-files-found: error` line from the upload step (leaving
// `retention-days: 90` and everything else intact) — the full 476-file /
// 2380-test vitest suite stayed green.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as db-backup-alert-guard.test.ts / db-backup-encryption-fail-closed.test.ts.
// vitest runs with the platform package root as cwd, so workflows live one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function uploadStepBlock(yaml: string): string | null {
  const m = yaml.match(/- name:\s*Upload encrypted dump as GitHub artifact[\s\S]*?(?=\n\s*- name:|\n*$)/)
  return m ? m[0] : null
}

describe('CI invariant — db-backup.yml fails loud, not warns quiet, when the encrypted dump is missing at upload time', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the upload step exists (the guard has something to check)', () => {
    const yaml = dbBackupYaml()
    expect(uploadStepBlock(yaml), 'could not locate the "Upload encrypted dump as GitHub artifact" step block').not.toBeNull()
  })

  it('the upload step sets if-no-files-found: error (no silent-warn-and-succeed on a missing dump)', () => {
    const yaml = dbBackupYaml()
    const body = uploadStepBlock(yaml)
    expect(body).not.toBeNull()
    expect(
      /if-no-files-found:\s*error/.test(body!),
      'db-backup.yml\'s upload step no longer sets `if-no-files-found: error` — ' +
        'actions/upload-artifact defaults this to `warn`, so a missing ' +
        '`fullloop-$STAMP.dump.gpg` (earlier-step bug, $STAMP mismatch, reordered ' +
        'steps) would report the job SUCCESS with no artifact uploaded, and the ' +
        'downstream "Alert on failure" step would never fire because the job never ' +
        'actually failed.',
    ).toBe(true)
  })
})
