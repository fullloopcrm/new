import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows).
// Continuation (step 2 of the queue) of item (217)'s surface -- that item
// closed a HOST-STATE isolation gap on tenant-config-reconcile.yml's
// token-guard verification step. Investigating the sibling supply-chain
// surface actions-sha-pin-guard.test.ts already covers (GitHub Actions
// `uses:` references pinned to a full commit SHA, not a mutable tag) turned
// up a DIFFERENT kind of unpinned third-party trust anchor in the SAME
// workflows directory: db-backup.yml's "Install latest pg_dump" step adds a
// brand-new apt package source AND trusts a GPG key fetched over plain
// `curl`, from two hardcoded `postgresql.org` URLs -- with zero regression
// coverage on either URL staying pointed at the legitimate domain.
//
// `actions-sha-pin-guard.test.ts` only walks `uses:` references (the GitHub
// Actions supply-chain surface); it never reads inside a step's `run:` shell
// script, so this step's raw `sh -c 'echo "deb http://apt.postgresql.org/..."'`
// + `curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg
// --dearmor ...` line is invisible to it. Grepping every guard test file in
// this lane for `postgresql.org` or `ACCC4CF8` turned up nothing.
//
// Why it matters: this step runs on every nightly backup (and every manual
// workflow_dispatch) with `sudo`, on a job that also handles
// `SUPABASE_DB_URL` and `BACKUP_ENCRYPTION_KEY` moments later. If either the
// apt source domain or the GPG key URL were silently repointed at an
// attacker-controlled domain (a plausible "swap to a mirror for speed"
// cleanup edit, or a malicious edit disguised as one), `apt-get install
// postgresql-client-17` would trust a key/package set the workflow author
// never intended, installing an arbitrary `pg_dump` binary that then runs
// with access to the live production database URL right after.
//
// Mutation-verified before writing the fix: (1) changed the GPG key curl URL
// from `https://www.postgresql.org/...` to `https://evil.example.com/...`
// (apt source line untouched) -- the full 479-file / 2394-test vitest suite
// stayed 100% green. (2) independently changed the apt source domain from
// `apt.postgresql.org` to `apt.evil.example.com` (GPG key URL untouched) --
// same result, full suite green. Both restores left
// `git diff --stat .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as actions-sha-pin-guard.test.ts / every other guard in this lane.
// vitest runs with the platform package root as cwd, so the workflows live
// one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

function installStepBlock(yaml: string): string | null {
  const m = yaml.match(/- name:\s*Install latest pg_dump[\s\S]*?(?=\n\s*- name:|\n*$)/)
  return m ? m[0] : null
}

describe('CI invariant — db-backup.yml pg_dump install step stays pinned to the real postgresql.org', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('the "Install latest pg_dump" step still exists (the surface it protects is not deleted)', () => {
    expect(
      installStepBlock(dbBackupYaml()),
      'db-backup.yml no longer has an "Install latest pg_dump" step',
    ).not.toBeNull()
  })

  it('the apt source line still points at the real apt.postgresql.org (not a mirror or lookalike domain)', () => {
    const block = installStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /deb http:\/\/apt\.postgresql\.org\/pub\/repos\/apt/.test(block!),
      'db-backup.yml no longer adds the apt source at http://apt.postgresql.org/pub/repos/apt — ' +
        'the pg_dump install step now trusts a different apt repository domain.',
    ).toBe(true)
  })

  it('the GPG key is still fetched from the real www.postgresql.org (not a lookalike/attacker domain)', () => {
    const block = installStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /curl -fsSL https:\/\/www\.postgresql\.org\/media\/keys\/ACCC4CF8\.asc/.test(block!),
      'db-backup.yml no longer fetches the apt signing key from ' +
        'https://www.postgresql.org/media/keys/ACCC4CF8.asc — an attacker-controlled key URL here ' +
        'would let apt trust arbitrary packages under the sudo-installed postgresql-client.',
    ).toBe(true)
  })

  it('the key is still piped straight into gpg --dearmor as a trusted apt key (the fetch is not orphaned)', () => {
    const block = installStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /curl[^\n]*\|\s*sudo gpg --dearmor -o \/etc\/apt\/trusted\.gpg\.d\/pgdg\.gpg/.test(block!),
      'db-backup.yml no longer pipes the fetched key into `sudo gpg --dearmor -o ' +
        '/etc/apt/trusted.gpg.d/pgdg.gpg` — either the trust step is gone, or the two are no longer ' +
        'wired together the same way this guard verified.',
    ).toBe(true)
  })

  it('still installs postgresql-client-17 specifically (not a silently different/older package)', () => {
    const block = installStepBlock(dbBackupYaml())
    expect(block).not.toBeNull()
    expect(
      /apt-get install -y postgresql-client-17\b/.test(block!),
      'db-backup.yml no longer installs postgresql-client-17 from the pinned apt source/key — the ' +
        'backup job\'s own pg_dump version guarantee ("client 17 — can dump any older server") no ' +
        'longer holds.',
    ).toBe(true)
  })
})
