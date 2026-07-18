import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item
// (248), continuing (246)/(247)'s "exit 1 is ambiguous between a real
// finding and a script crash" track onto the third owned workflow per the
// LEADER queue's item (2) ("continue whichever surface (1) opens up").
//
// (246) closed this for tenant-config-reconcile.yml's drift-gate step; (247)
// closed it for ci.yml's two custom-script guard steps. Both left
// db-backup.yml unexamined -- (244)/(245) already fixed "the alert doesn't
// say WHICH step broke" for this workflow, but two of its four real steps
// carry the identical deeper ambiguity that (246)/(247) target:
//
//   - "Dump full database": exit 1 means EITHER a real small-dump finding
//     (the explicit `if [ "$SIZE" -lt 100000 ]; then ... exit 1; fi` gate)
//     OR pg_dump itself failing (bad connection string, auth failure,
//     dropped connection) under `set -euo pipefail` -- indistinguishable
//     from the exit code alone.
//   - "Encrypt dump": exit 1 means EITHER the real, known
//     BACKUP_ENCRYPTION_KEY-missing finding (explicit gate) OR gpg itself
//     crashing (corrupt input, disk full) under the same `set -e`.
//
// Fixed the same way as (246)/(247): each step's body is now wrapped in a
// `{ ... } | tee <file>` group so the alert step (which lives in the SAME
// job here, unlike ci.yml/tenant-config-reconcile.yml's separate
// notify-failure job) can grep the captured output for the step's own
// explicit `::error::` line as the finding-vs-crash signal. Unlike ci.yml/
// tenant-config-reconcile.yml's single-command `set +e` + `tee` idiom, these
// two steps wrap a MULTI-command sequence and deliberately do NOT add
// `set +e` before the group -- `set -e` (already active from the step's
// existing `set -euo pipefail`) stays in effect inside the `{ }` group, so a
// failing pg_dump/gpg still halts immediately instead of falling through to
// the next command (stat on a partial dump / rm -f on a still-needed
// plaintext file) -- db-backup-dump-size-sanity-gate.test.ts's and
// db-backup-encrypt-fail-safe-purge-guard.test.ts's existing fail-fast
// contracts are unaffected.
//
// Mutation-verified before writing this file: reverted the entire db-backup.yml
// diff for this item via a saved patch + `git apply -R` (git stash is
// disabled in this worker worktree -- shared .git dir across all 4
// worktrees, blocked by a local hook) and re-ran this file alone -- every
// test below failed exactly as expected (the tee-wrap tests found no
// `tee dump-output.txt` / `tee encrypt-output.txt`, and the alert-branch
// tests found no `steps.dump.outcome` / `steps.encrypt.outcome` grep
// branches), then restored via `git apply` on the same patch and
// re-confirmed green.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as db-backup-notify-failure-step-detail-guard.test.ts /
// reconcile-notify-failure-drift-vs-error-guard.test.ts.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function stepBlock(yaml: string, namePattern: RegExp): string {
  const re = new RegExp(`- name:\\s*${namePattern.source}[\\s\\S]*?(?=\\n\\s*- name:|\\n*$)`)
  const m = yaml.match(re)
  expect(m, `could not locate a step matching ${namePattern}`).not.toBeNull()
  return m![0]
}

function dumpStepBody(): string {
  return stepBlock(dbBackupYaml(), /Dump full database/)
}

function encryptStepBody(): string {
  return stepBlock(dbBackupYaml(), /Encrypt dump/)
}

function alertStepBody(): string {
  return stepBlock(dbBackupYaml(), /Alert on failure/)
}

describe('CI invariant — db-backup.yml alert distinguishes real dump/encrypt findings from script crashes', () => {
  it('the workflows directory and db-backup.yml exist where the guard expects them', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup.yml at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the "Dump full database" step pipes its pg_dump/size-check body through tee to a captured file', () => {
    expect(
      /\}\s*2>&1\s*\|\s*tee\s+dump-output\.txt/.test(dumpStepBody()),
      'the "Dump full database" step no longer pipes its body through `tee dump-output.txt` — ' +
        'the alert step would have nothing to grep to tell a real small-dump finding apart ' +
        'from pg_dump itself crashing.',
    ).toBe(true)
  })

  it('the "Dump full database" step does not disable set -e before its tee group (fail-fast must stay intact)', () => {
    const body = dumpStepBody()
    expect(
      /^\s*set\s+\+e\s*$/m.test(body),
      'the "Dump full database" step now contains `set +e` — this would let a failing ' +
        'pg_dump fall through to `stat` a partial/missing dump file instead of halting ' +
        'immediately, reintroducing the exact gap db-backup-dump-size-sanity-gate.test.ts guards.',
    ).toBe(false)
  })

  it('the "Encrypt dump" step pipes its body through tee to a captured file', () => {
    expect(
      /\}\s*2>&1\s*\|\s*tee\s+encrypt-output\.txt/.test(encryptStepBody()),
      'the "Encrypt dump" step no longer pipes its body through `tee encrypt-output.txt` — ' +
        'the alert step would have nothing to grep to tell the real missing-key finding apart ' +
        'from gpg itself crashing.',
    ).toBe(true)
  })

  it('the "Encrypt dump" step does not disable set -e before its tee group (fail-fast must stay intact)', () => {
    const body = encryptStepBody()
    expect(
      /^\s*set\s+\+e\s*$/m.test(body),
      'the "Encrypt dump" step now contains `set +e` — this would let a failing/partial gpg ' +
        'call fall through to `rm -f "fullloop-$STAMP.dump"` instead of halting immediately, ' +
        'reintroducing the exact gap db-backup-encrypt-fail-safe-purge-guard.test.ts guards.',
    ).toBe(false)
  })

  it('the "Encrypt dump" step\'s run: block still opens with set -euo pipefail as its first line', () => {
    const body = encryptStepBody()
    const runIdx = body.indexOf('run: |')
    expect(runIdx, 'could not find run: | in the "Encrypt dump" step').toBeGreaterThan(-1)
    const firstLineAfterRun = body.slice(runIdx).split('\n')[1]?.trim()
    expect(
      firstLineAfterRun,
      'the "Encrypt dump" step\'s run: block no longer opens with `set -euo pipefail` as its ' +
        'literal first line — db-backup-encrypt-fail-safe-purge-guard.test.ts pins this exact shape.',
    ).toBe('set -euo pipefail')
  })

  it('the alert step branches on steps.dump.outcome and greps dump-output.txt for the small-dump marker', () => {
    const body = alertStepBody()
    expect(
      /if\s*\[\s*"\$\{\{\s*steps\.dump\.outcome\s*\}\}"\s*=\s*"failure"\s*\]/.test(body),
      'expected an `if [ "${{ steps.dump.outcome }}" = "failure" ]` branch — without it a ' +
        'failed dump step falls back to a flat "Dump full database" label with no ' +
        'finding-vs-crash distinction.',
    ).toBe(true)
    expect(
      /grep\s+-q\s+'::error::Dump suspiciously small'\s+dump-output\.txt/.test(body),
      "expected a `grep -q '::error::Dump suspiciously small' dump-output.txt` check inside " +
        'that branch — this is the disambiguating signal.',
    ).toBe(true)
  })

  it('the alert step branches on steps.encrypt.outcome and greps encrypt-output.txt for the missing-key marker', () => {
    const body = alertStepBody()
    expect(
      /if\s*\[\s*"\$\{\{\s*steps\.encrypt\.outcome\s*\}\}"\s*=\s*"failure"\s*\]/.test(body),
      'expected an `if [ "${{ steps.encrypt.outcome }}" = "failure" ]` branch — without it a ' +
        'failed encrypt step falls back to a flat "Encrypt dump" label with no ' +
        'finding-vs-crash distinction.',
    ).toBe(true)
    expect(
      /grep\s+-q\s+'::error::BACKUP_ENCRYPTION_KEY secret is not configured'\s+encrypt-output\.txt/.test(body),
      "expected a `grep -q '::error::BACKUP_ENCRYPTION_KEY secret is not configured' " +
        'encrypt-output.txt` check inside that branch — this is the disambiguating signal.',
    ).toBe(true)
  })

  it('a real small-dump finding is worded as such, not as a pg_dump crash', () => {
    expect(/dump suspiciously small \(not a script error/.test(alertStepBody())).toBe(true)
  })

  it('a pg_dump crash is worded as such, not as a size finding', () => {
    expect(/pg_dump itself failed \(bad connection string/.test(alertStepBody())).toBe(true)
  })

  it('a real missing-key finding is worded as such, not as a gpg crash', () => {
    expect(/BACKUP_ENCRYPTION_KEY secret is not configured \(not a script error/.test(alertStepBody())).toBe(true)
  })

  it('a gpg/script crash is worded as such, not as a missing-key finding', () => {
    expect(/gpg\/the script itself errored \(not a missing-secret finding/.test(alertStepBody())).toBe(true)
  })

  it('still checks every real step\'s outcome, including install-pg-dump and upload (unaffected by this change)', () => {
    const body = alertStepBody()
    for (const id of ['install-pg-dump', 'dump', 'encrypt', 'upload']) {
      expect(
        body.includes(`steps.${id}.outcome`),
        `the alert step no longer checks steps.${id}.outcome`,
      ).toBe(true)
    }
  })
})
