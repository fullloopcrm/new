import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Codifies
// db-backup.yml's own security invariant, stated in its header comment but
// never enforced by a test until now: fullloopcrm/new is a PUBLIC repo, and
// GitHub Actions artifacts are downloadable by ANY GitHub account with read
// access — not just collaborators. The nightly dump contains every tenant's
// full data, including PINs/payroll/SSN-last4. The "Encrypt dump" step is the
// ONLY thing standing between that data and a public, unauthenticated leak:
// it must refuse (exit 1, fail closed) to proceed when BACKUP_ENCRYPTION_KEY
// is unset, and the artifact actually uploaded afterward must be the
// encrypted `.dump.gpg` output, never the plaintext `.dump` file.
//
// No existing test (db-backup-alert-guard.test.ts covers only the failure
// *alert*, not the dump/encrypt/upload steps themselves) pins either half of
// this. A future edit — someone "simplifying" the bash, or a merge-conflict
// resolution that drops the `if [ -z ... ]; then ... exit 1; fi` block, or a
// typo'd `path:` on the upload step pointing at the pre-encryption file —
// would silently turn every nightly backup into a public leak of every
// tenant's PII, with the job still going green (upload-artifact would
// succeed either way; only the CONTENT changes).
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as db-backup-alert-guard.test.ts / reconcile-gate-wiring.test.ts.
// vitest runs with the platform package root as cwd, so workflows live one
// level up.

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

describe('CI invariant — db-backup.yml encrypt step fails closed (public-repo PII leak backstop)', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('still has an "Encrypt dump" step (the leak backstop is not deleted)', () => {
    const block = stepBlock(dbBackupYaml(), /Encrypt dump/)
    expect(
      block,
      'db-backup.yml no longer has an "Encrypt dump" step — the plaintext dump ' +
        'would be uploaded as-is to this PUBLIC repo\'s artifact store.',
    ).not.toBeNull()
  })

  it('the encrypt step checks BACKUP_ENCRYPTION_KEY for empty before doing anything else', () => {
    const block = stepBlock(dbBackupYaml(), /Encrypt dump/)!
    expect(
      /\[\s*-z\s*"\$\{?BACKUP_ENCRYPTION_KEY\}?"\s*\]/.test(block),
      'the "Encrypt dump" step no longer checks BACKUP_ENCRYPTION_KEY for empty — ' +
        'a repo/fork without that secret configured would either crash gpg or, worse, ' +
        'silently skip encryption instead of refusing to proceed.',
    ).toBe(true)
  })

  it('the empty-key branch fails closed with a real exit 1 (not a warn-and-continue)', () => {
    const block = stepBlock(dbBackupYaml(), /Encrypt dump/)!
    const emptyKeyBranch = block.match(/\[\s*-z\s*"\$\{?BACKUP_ENCRYPTION_KEY\}?"\s*\][\s\S]*?fi\b/)
    expect(emptyKeyBranch, 'could not isolate the empty-key if/fi branch').not.toBeNull()
    expect(
      /exit\s+1\b/.test(emptyKeyBranch![0]),
      'the empty-BACKUP_ENCRYPTION_KEY branch no longer exits 1 — a missing secret ' +
        'would fall through to gpg (which would itself either crash or, with an empty ' +
        'passphrase, produce a weak/predictable encrypted artifact) instead of failing ' +
        'the job closed before any upload can happen.',
    ).toBe(true)
  })

  it('the encrypt step runs BEFORE the upload step (encryption cannot be bypassed by reordering)', () => {
    const yaml = dbBackupYaml()
    const encryptIdx = yaml.indexOf('- name: Encrypt dump')
    const uploadIdx = yaml.indexOf('- name: Upload encrypted dump')
    expect(encryptIdx, '"Encrypt dump" step not found').toBeGreaterThan(-1)
    expect(uploadIdx, '"Upload encrypted dump" step not found').toBeGreaterThan(-1)
    expect(
      encryptIdx < uploadIdx,
      'the "Encrypt dump" step no longer runs before "Upload encrypted dump" — ' +
        'the artifact could be uploaded before (or without) encryption ever running.',
    ).toBe(true)
  })

  it('the upload step\'s artifact path points at the encrypted .dump.gpg file, never the plaintext .dump', () => {
    const block = stepBlock(dbBackupYaml(), /Upload encrypted dump/)!
    const pathLine = block.match(/^\s*path:\s*.*$/m)
    expect(pathLine, 'the "Upload encrypted dump" step has no path: line').not.toBeNull()
    expect(
      /\.dump\.gpg\s*$/.test(pathLine![0].trim()),
      `the upload step's path (${pathLine![0].trim()}) no longer ends in .dump.gpg — ` +
        'a plaintext .dump path here would upload every tenant\'s unencrypted PII ' +
        '(PINs/payroll/SSN-last4) to this PUBLIC repo\'s artifact store.',
    ).toBe(true)
  })
})
