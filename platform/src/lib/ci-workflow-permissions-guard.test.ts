import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, item (211).
//
// Items (204)-(210) covered every "outside the script" bypass on individual
// gating STEPS (continue-on-error/`|| true`/`if:`, scope-narrowing, argv
// flags, checkout token persistence). None of them checked the workflow-level
// `permissions:` block itself -- the thing that bounds what the job's
// GITHUB_TOKEN can do to the repo/packages/Actions no matter what any step
// inside the job does. `tenant-config-reconcile.yml`'s own `permissions:
// contents: read` declaration IS locked in, by reconcile-gate-wiring.test.ts
// ("stays least-privilege" + the `pull-requests: write` negative check). But
// grepping every guard test file in this lane for "permissions" turns up
// nothing else -- ci.yml's `permissions: contents: read` (ci.yml:13) and
// db-backup.yml's `permissions: {}` (db-backup.yml:48, the most restrictive
// possible value, chosen deliberately per that file's own comment because the
// job never calls the GitHub API with GITHUB_TOKEN at all) have ZERO
// regression coverage.
//
// That matters because GitHub Actions' default GITHUB_TOKEN scope (when a
// workflow declares no `permissions:` block at all) can be considerably
// broader than either of these explicit declarations, depending on the repo's
// own Settings > Actions > Workflow permissions setting -- and because a
// job-level `permissions:` block does not MERGE with the workflow-level one,
// it fully REPLACES it for that job. A plausible edit -- e.g. adding
// `pull-requests: write` to ci.yml to post a PR comment (the exact escalation
// tenant-config-reconcile.yml's own guard explicitly warns against), deleting
// either `permissions:` block during an "unrelated" cleanup pass, or adding a
// job-level `permissions:` override on ci.yml's `verify` job or db-backup.
// yml's `backup` job -- would silently widen the token's blast radius with no
// gating test noticing, on the two workflows in this lane that actually run
// on every PR (ci.yml) and hold a database credential + PII (db-backup.yml).
//
// Verified clean today: ci.yml:13-14 is exactly `permissions:\n  contents:
// read`, no job-level override on `verify` or `notify-failure`. db-backup.
// yml:48 is exactly `permissions: {}`, no job-level override on `backup`. Grep
// for `: write` (any write-scoped permission token) across both files returns
// no matches outside comments.
//
// Mutation-verified before writing the fix: (1) removed ci.yml's `permissions:`
// block entirely -- failed with the exact predicted message; restored. (2)
// changed db-backup.yml's `permissions: {}` to `permissions:\n  contents: read`
// -- failed with the exact predicted message; restored. (3) added
// `  pull-requests: write` on its own line under ci.yml's `permissions:` block
// -- failed with the exact predicted message; restored. (4) added a job-level
// `permissions:\n      contents: write` block under db-backup.yml's `backup:`
// job -- failed with the exact predicted message; restored. Each restore left
// `git diff --stat .github/workflows/` empty afterward.
//
// Continuation (step 2 of the queue): checked whether tenant-config-reconcile.
// yml's EXISTING permissions guard (reconcile-gate-wiring.test.ts) already
// closes this for all three workflows. It does not -- that guard's negative
// check only names `pull-requests: write` specifically, not any write scope.
// Mutation-verified: added `actions: write` to tenant-config-reconcile.yml's
// permissions block and re-ran reconcile-gate-wiring.test.ts directly -- all
// 9 of its assertions stayed green, confirming that gap was real too. Rather
// than duplicate a second narrow write-scope check there, the generic
// `<scope>: write` sweep below (added for ci.yml/db-backup.yml) now also
// covers tenant-config-reconcile.yml, closing all three workflows' blind spot
// from a single check instead of enumerating write scopes by name per file.
// Restore verified: `git diff --stat .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as every other guard in this lane. vitest runs with the platform
// package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function readWorkflow(path: string): string {
  return readFileSync(path, 'utf8')
}

// Any `<scope>: write` token anywhere in the file. Deliberately broad (not
// anchored to a `permissions:` block) so a write scope slipped in anywhere --
// workflow-level or job-level -- is caught, and so this doesn't need its own
// YAML-nesting parser to find job-level blocks.
const WRITE_SCOPE_RE = /^\s*[a-z-]+:\s*write\s*$/m

describe('CI invariant — ci.yml and db-backup.yml stay least-privilege (no permissions escalation)', () => {
  it('both workflow files exist where the guard expects them', () => {
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup.yml at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('ci.yml still declares permissions: contents: read at the workflow level', () => {
    const yaml = readWorkflow(CI_WORKFLOW)
    expect(
      /^permissions:\s*\n\s*contents:\s*read\b/m.test(yaml),
      'ci.yml no longer declares `permissions:\\n  contents: read` at the workflow ' +
        'level. Without it, every job in this workflow falls back to the repo\'s ' +
        'default Actions token scope, which can be broader than read-only — and ' +
        'this workflow runs on every PR from potentially untrusted branches.',
    ).toBe(true)
  })

  it('db-backup.yml still declares permissions: {} (zero scopes — it never calls the GitHub API with GITHUB_TOKEN)', () => {
    const yaml = readWorkflow(DB_BACKUP_WORKFLOW)
    expect(
      /^permissions:\s*\{\}\s*$/m.test(yaml),
      'db-backup.yml no longer declares `permissions: {}`. This job holds a full ' +
        'database dump (every tenant\'s PII) and never needs any GITHUB_TOKEN scope ' +
        'at all — pg_dump auths via SUPABASE_DB_URL and upload-artifact uses its own ' +
        'internal token, not GITHUB_TOKEN — so any non-empty permissions declaration ' +
        'here is an unnecessary, ungated widening.',
    ).toBe(true)
  })

  it('no workflow in this lane declares any write-scoped permission, at workflow or job level', () => {
    // Includes tenant-config-reconcile.yml, even though reconcile-gate-wiring.
    // test.ts already asserts its `permissions: contents: read` block exists
    // AND separately checks for `pull-requests: write` by name. That existing
    // check is narrower than it looks: it only names ONE write scope.
    // Mutation-verified this round: adding `actions: write` (a different write
    // scope) to tenant-config-reconcile.yml's permissions block left all 9 of
    // reconcile-gate-wiring.test.ts's assertions green — `pull-requests: write`
    // was never the only escalation risk, just the one that guard happened to
    // spell out. This generic `<scope>: write` sweep closes that blind spot for
    // ALL THREE workflows in this lane from one place, without needing every
    // future write-scope name enumerated individually.
    const offenders: Array<{ file: string; match: string }> = []
    for (const [name, path] of [
      ['ci.yml', CI_WORKFLOW],
      ['db-backup.yml', DB_BACKUP_WORKFLOW],
      ['tenant-config-reconcile.yml', RECONCILE_WORKFLOW],
    ] as const) {
      const yaml = readWorkflow(path)
      const m = yaml.match(WRITE_SCOPE_RE)
      if (m) offenders.push({ file: name, match: m[0].trim() })
    }
    expect(
      offenders,
      'A write-scoped permission (`<scope>: write`) was found in a workflow that ' +
        'should never need repo/package/PR write access — this could be a ' +
        'workflow-level widening or a job-level `permissions:` override (which ' +
        'REPLACES the workflow-level block for that job, not merges with it):\n' +
        offenders.map((o) => `  ${o.file}: ${o.match}`).join('\n'),
    ).toEqual([])
  })
})
