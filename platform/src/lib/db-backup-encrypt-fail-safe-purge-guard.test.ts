import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows).
// Continuation (step 2 of the queue) of item (219)'s surface -- that item
// pinned the "Encrypt dump" step's own cipher strength and passphrase-
// delivery mechanism. Re-reading the SAME step while writing that guard
// surfaced two sibling gaps, one integrity and one confidentiality, both
// still unpinned by any test in this lane after (219):
//
//   1. `set -euo pipefail` at the top of THIS step's own run: block is a
//      DIFFERENT instance than the one db-backup-dump-size-sanity-gate.test.ts
//      already pins on the "Dump full database" step (item 203) -- that
//      guard is scoped by name to `/Dump full database/` and never reads the
//      "Encrypt dump" step's body. Without `set -e` here, a failing/partial
//      `gpg` invocation would NOT halt the step: execution would fall
//      through to `rm -f "fullloop-$STAMP.dump"`, deleting the only
//      plaintext copy of the night's backup, while a corrupt or empty
//      `.dump.gpg` gets uploaded as if it were a valid encrypted backup --
//      the job goes green with no restorable backup for that night at all.
//   2. `rm -f "fullloop-$STAMP.dump"` (the plaintext purge, immediately
//      after the gpg call) had zero regression coverage anywhere in this
//      lane -- grepping every guard test file in this lane for `rm -f`
//      turned up nothing before this file. db-backup-encryption-fail-
//      closed.test.ts pins that the UPLOAD step's path ends in `.dump.gpg`,
//      but never checked whether the plaintext `.dump` this step produces as
//      an intermediate is actually deleted afterward. Not a live exploit
//      today (the runner workspace is destroyed with the job; nothing else
//      reads it) -- same "close the currently-inert other half" shape as
//      items (210)/(216)/(217) -- but it matters the moment a future step is
//      added that archives/uploads more of the workspace, or the upload
//      step's `path:` is ever glob-ified instead of pinned to the exact
//      `.dump.gpg` name db-backup-encryption-fail-closed.test.ts already
//      locks in.
//
// Mutation-verified before writing the fix: (1) deleted the
// `rm -f "fullloop-$STAMP.dump"` line entirely (leaving the gpg call
// untouched) -- the full 482-file / 2411-test vitest suite stayed 100%
// green. (2) independently deleted `set -euo pipefail` from the "Encrypt
// dump" step's run: block only (leaving every other line, including item
// (203)'s "Dump full database" step's own copy, untouched) -- same result,
// full suite green. Both restores left `git diff --stat
// .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as db-backup-encrypt-strength-guard.test.ts / db-backup-dump-
// size-sanity-gate.test.ts. vitest runs with the platform package root as
// cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function encryptStepBlock(yaml: string): string | null {
  const m = yaml.match(/- name:\s*Encrypt dump[\s\S]*?(?=\n\s*- name:|\n*$)/)
  return m ? m[0] : null
}

describe('CI invariant — db-backup.yml encrypt step fails fast and purges the plaintext dump', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the "Encrypt dump" step still exists (the surface it protects is not deleted)', () => {
    expect(
      encryptStepBlock(dbBackupYaml()),
      'db-backup.yml no longer has an "Encrypt dump" step',
    ).not.toBeNull()
  })

  it("this step's own run: block still opens with set -euo pipefail (its own copy, not the Dump step's)", () => {
    const block = encryptStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    const runIdx = block!.indexOf('run: |')
    expect(runIdx, 'could not find run: | in the "Encrypt dump" step').toBeGreaterThan(-1)
    const firstLineAfterRun = block!
      .slice(runIdx)
      .split('\n')[1]
      ?.trim()
    expect(
      firstLineAfterRun,
      'the "Encrypt dump" step\'s run: block no longer opens with `set -euo pipefail` — ' +
        'a failing/partial gpg call would fall through to the plaintext-purge line below ' +
        'instead of halting the step, deleting the only readable copy of the backup while ' +
        'a corrupt encrypted artifact still gets uploaded as if it were valid.',
    ).toBe('set -euo pipefail')
  })

  it('still purges the plaintext dump with rm -f "fullloop-$STAMP.dump" after encrypting', () => {
    const block = encryptStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /rm -f "fullloop-\$STAMP\.dump"/.test(block!),
      'db-backup.yml\'s "Encrypt dump" step no longer purges the plaintext ' +
        '"fullloop-$STAMP.dump" file after encrypting it — an intermediate plaintext ' +
        'copy of every tenant\'s PII would linger in the runner workspace for the rest ' +
        'of the job.',
    ).toBe(true)
  })

  it('the plaintext purge runs AFTER the gpg encrypt call, not before (ordering matters)', () => {
    const block = encryptStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    const gpgIdx = block!.search(/gpg --batch/)
    const rmIdx = block!.search(/rm -f "fullloop-\$STAMP\.dump"/)
    expect(gpgIdx, 'could not find the gpg invocation').toBeGreaterThan(-1)
    expect(rmIdx, 'could not find the plaintext purge line').toBeGreaterThan(-1)
    expect(
      gpgIdx < rmIdx,
      'db-backup.yml\'s "Encrypt dump" step purges the plaintext dump BEFORE the gpg ' +
        'call — gpg would then have nothing to read, encrypting nothing (or failing) ' +
        'while the plaintext is already gone.',
    ).toBe(true)
  })
})
