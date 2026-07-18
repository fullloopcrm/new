import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — item (223) fresh ground. db-backup-upload-fail-closed-
// guard.test.ts pins the upload step's `if-no-files-found: error` (the
// job-goes-green-with-no-artifact failure mode) but its own doc comment names
// `retention-days: 90` as an untouched sibling line in that same mutation ("left
// `retention-days: 90` and everything else intact") — and no test anywhere in
// this lane actually asserts that value. Grepping every `db-backup-*.test.ts`
// and `ci-workflow-resilience-guard.test.ts` (the file that pins the sibling
// concurrency/timeout knobs) for "retention-days" turns up nothing but that one
// comment.
//
// Why it matters: GitHub's artifact retention is the entire DISASTER-RECOVERY
// WINDOW for this offsite backup — the whole point of this workflow (per its own
// header comment) is surviving a Supabase loss/suspension/compromise by keeping
// a copy on a different provider. A silent weakening (90 -> 1, or 90 -> 7, or the
// line deleted entirely so it falls back to whatever the repo's default Actions
// retention setting happens to be) produces a run that still uploads
// successfully, still passes `if-no-files-found: error`, and shows fully GREEN —
// the artifact is just gone days or weeks sooner than the runbook assumes, with
// no red signal anywhere until someone actually needs to restore from it and
// finds it already expired.
//
// Mutation-verified before writing this file: (1) `retention-days: 90` ->
// `retention-days: 1` (line present, value weakened) — the full 485-file /
// 2427-test vitest suite stayed 100% green. (2) the `retention-days: 90` line
// deleted entirely (upload step left with only `name:` + `path:`) — same
// result, full suite green. Both restores left `git diff --stat
// .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as db-backup-upload-fail-closed-guard.test.ts (the sibling guard on
// this exact step). vitest runs with the platform package root as cwd, so
// workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function uploadStepBlock(yaml: string): string | null {
  const m = yaml.match(/- name:\s*Upload encrypted dump as GitHub artifact[\s\S]*?(?=\n\s*- name:|\n*$)/)
  return m ? m[0] : null
}

describe('CI invariant — db-backup.yml keeps its offsite artifact for the full 90-day disaster-recovery window', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the upload step exists (the guard has something to check)', () => {
    const yaml = dbBackupYaml()
    expect(uploadStepBlock(yaml), 'could not locate the "Upload encrypted dump as GitHub artifact" step block').not.toBeNull()
  })

  it('the upload step pins retention-days: 90 (not silently shortened, not silently dropped)', () => {
    const yaml = dbBackupYaml()
    const body = uploadStepBlock(yaml)
    expect(body).not.toBeNull()
    expect(
      /retention-days:\s*90\b/.test(body!),
      'db-backup.yml\'s upload step no longer sets `retention-days: 90` (either ' +
        'weakened to a smaller number or removed entirely, falling back to the ' +
        'repo\'s default Actions retention setting). The run still succeeds and ' +
        'shows green either way — this is the entire disaster-recovery window for ' +
        'the offsite backup, and a silent shortening has no other signal until a ' +
        'restore is attempted against an already-expired artifact.',
    ).toBe(true)
  })
})
