import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, found while re-reading db-backup.yml's own "Encrypt
// dump" step alongside db-backup-encryption-fail-closed.test.ts: that
// existing guard pins the fail-CLOSED contract (empty BACKUP_ENCRYPTION_KEY
// -> exit 1, upload path ends in .dump.gpg) but never reads the gpg
// invocation's OWN flags -- so nothing in this lane pins the actual
// encryption STRENGTH or the SECRECY of how the passphrase reaches gpg.
//
// Two independent regressions are both currently invisible to every guard in
// this repo:
//   1. `--cipher-algo AES256` silently weakened (e.g. to `3DES`, or dropped
//      entirely so gpg falls back to its own default) -- the step still
//      "encrypts", the job still goes green, but the backstop this repo's
//      own header comment relies on ("this repo is PUBLIC... the encrypt
//      step below fails the job closed") would be weaker than the comment
//      claims.
//   2. `--passphrase-fd 0` (secret delivered over a file descriptor, off the
//      process command line) silently swapped for `--passphrase
//      "$BACKUP_ENCRYPTION_KEY"` (secret interpolated directly onto the gpg
//      argv) -- gpg still succeeds, the artifact is still encrypted, but the
//      passphrase itself would be visible to anything that can read process
//      listings on the runner (`ps aux`, `/proc/<pid>/cmdline`) for the
//      duration of the call, an information-disclosure regression with zero
//      externally visible symptom.
//
// Grepping every guard test file in this lane for `cipher-algo`,
// `passphrase-fd`, `AES256`, or `pinentry-mode` turned up nothing before
// this file.
//
// Mutation-verified before writing the fix: changed
// `--passphrase-fd 0 --pinentry-mode loopback \n --symmetric --cipher-algo
// AES256` to `--passphrase "$BACKUP_ENCRYPTION_KEY" --pinentry-mode loopback
// \n --symmetric --cipher-algo 3DES` (both regressions applied together) --
// the full 481-file / 2405-test vitest suite stayed 100% green. Restore left
// `git diff --stat .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as db-backup-encryption-fail-closed.test.ts / db-backup-pg-dump-
// source-pin-guard.test.ts. vitest runs with the platform package root as
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

describe('CI invariant — db-backup.yml encrypt step stays strong-cipher and passphrase off argv', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the "Encrypt dump" step still exists (the surface it protects is not deleted)', () => {
    expect(
      encryptStepBlock(dbBackupYaml()),
      'db-backup.yml no longer has an "Encrypt dump" step',
    ).not.toBeNull()
  })

  it('still pins --cipher-algo AES256 (not silently weakened or dropped)', () => {
    const block = encryptStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /--cipher-algo\s+AES256\b/.test(block!),
      'db-backup.yml\'s "Encrypt dump" step no longer pins --cipher-algo AES256 — ' +
        'the gpg invocation could be silently weakened (e.g. to 3DES, or gpg\'s own ' +
        'unpinned default) while the step still reports success.',
    ).toBe(true)
  })

  it('still delivers the passphrase via --passphrase-fd 0 (never --passphrase on argv)', () => {
    const block = encryptStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /--passphrase-fd\s+0\b/.test(block!),
      'db-backup.yml\'s "Encrypt dump" step no longer delivers the passphrase via ' +
        '--passphrase-fd 0 — a switch to --passphrase "$BACKUP_ENCRYPTION_KEY" would ' +
        'put the secret directly on the gpg process argv, visible to `ps`/`/proc` for ' +
        'the duration of the call, with the step still succeeding either way.',
    ).toBe(true)
  })

  it('never passes --passphrase (the literal-argv form) anywhere in the step', () => {
    const block = encryptStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /--passphrase(?!-fd)\b/.test(block!),
      'db-backup.yml\'s "Encrypt dump" step now contains a bare --passphrase flag ' +
        '(distinct from --passphrase-fd) — this is the literal-argv secret-delivery ' +
        'form this guard exists to keep out.',
    ).toBe(false)
  })

  it('the passphrase is still piped in via the here-string, matching --passphrase-fd 0', () => {
    const block = encryptStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /<<<\s*"\$BACKUP_ENCRYPTION_KEY"\s*$/m.test(block!),
      'db-backup.yml\'s "Encrypt dump" step no longer feeds $BACKUP_ENCRYPTION_KEY to ' +
        'gpg via a here-string (`<<< "$BACKUP_ENCRYPTION_KEY"`) — --passphrase-fd 0 ' +
        'reads the passphrase from stdin, so if the delivery mechanism changes without ' +
        'this, gpg would read from the wrong fd or hang waiting on it.',
    ).toBe(true)
  })
})
