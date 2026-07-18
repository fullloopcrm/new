import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Continuation
// of item (208)'s surface (ci-install-integrity-guard.test.ts): that guard
// established that `npm ci` on ci.yml's Install step matters because CI trusts
// it to enforce lockfile integrity. It did not follow the OTHER thing `npm ci`
// does on every run, unconditionally: it EXECUTES lifecycle scripts
// (preinstall/install/postinstall) from every package in the dependency tree
// -- third-party code this repo does not author or review line-by-line,
// running with the same filesystem/process access as the rest of the job.
//
// That is the exact threat model `actions/checkout`'s `persist-credentials:
// false` exists to blunt: without it, checkout writes the job's scoped
// GITHUB_TOKEN into `.git/config` inside the workspace so later git commands
// can authenticate. With it (the default is actually `true` upstream -- both
// workflows here explicitly opt OUT), no token ever touches disk. If a single
// `persist-credentials: false` line were dropped from either checkout step --
// a plausible "trim the config back to actions/checkout's own defaults"
// cleanup edit, since `false` is not the action's default -- the token would
// be sitting in `.git/config` by the time `npm ci` runs moments later and
// executes arbitrary postinstall scripts from the full dependency tree. Not
// hypothetical: `persist_credentials`-based token exfiltration via a
// compromised install-script dependency is a documented supply-chain attack
// pattern, not this repo's own invention. `permissions: contents: read` at
// the workflow level limits the token's scope if it WERE read, but it does
// not stop it being written to disk in the first place -- persist-credentials
// is the control for that, and today nothing pins that either checkout step
// keeps it set.
//
// Verified clean today: both `actions/checkout` uses in this repo's workflows
// (ci.yml:31, tenant-config-reconcile.yml:34) carry `persist-credentials:
// false` on the very next line. db-backup.yml never checks out the repo at
// all (only actions/upload-artifact), so it has no checkout step to guard.
//
// Mutation-verified before writing the fix: removed the `persist-credentials:
// false` line under ci.yml's checkout step entirely -- failed with the exact
// predicted message; separately flipped tenant-config-reconcile.yml's to
// `persist-credentials: true` -- failed with the exact predicted message.
// Both restores left `git diff --stat` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as every other guard in this lane. vitest runs with the platform
// package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))
}

// Every `- uses: actions/checkout@...` line, plus a small window of
// subsequent lines (its `with:` block) to look for persist-credentials in.
// A fixed line-count window (rather than parsing the `with:` block's actual
// extent) is deliberately generous -- false negatives here (missing a real
// checkout use) are the risk to guard against, not false positives from
// reading a few extra harmless lines.
const WITH_BLOCK_WINDOW = 6

function checkoutUses(): Array<{ file: string; line: number; withBlock: string }> {
  const out: Array<{ file: string; line: number; withBlock: string }> = []
  for (const file of workflowFiles()) {
    const lines = readFileSync(join(WORKFLOWS_DIR, file), 'utf8').split('\n')
    lines.forEach((raw, i) => {
      if (/-\s*uses:\s*actions\/checkout@/.test(raw)) {
        out.push({
          file,
          line: i + 1,
          withBlock: lines.slice(i + 1, i + 1 + WITH_BLOCK_WINDOW).join('\n'),
        })
      }
    })
  }
  return out
}

function hasPersistCredentialsFalse(withBlock: string): boolean {
  return /persist-credentials:\s*false\b/.test(withBlock)
}

function hasPersistCredentialsTrue(withBlock: string): boolean {
  return /persist-credentials:\s*true\b/.test(withBlock)
}

describe('CI invariant — every actions/checkout keeps persist-credentials: false (no token left for npm ci\'s lifecycle scripts to read)', () => {
  it('the workflows directory exists where the guard expects it', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
  })

  it('at least one workflow still checks out the repo (the surface this guards is not deleted)', () => {
    expect(
      checkoutUses().length,
      'no `uses: actions/checkout@...` step found in any workflow — nothing left to guard',
    ).toBeGreaterThan(0)
  })

  it('every actions/checkout step sets persist-credentials: false', () => {
    const offenders = checkoutUses().filter((c) => !hasPersistCredentialsFalse(c.withBlock))
    expect(
      offenders,
      'A checkout step is missing `persist-credentials: false` — the job\'s scoped ' +
        'GITHUB_TOKEN would be written to .git/config, readable by npm ci\'s ' +
        'preinstall/postinstall lifecycle scripts from every dependency in the tree:\n' +
        offenders.map((o) => `  ${o.file}:${o.line}`).join('\n'),
    ).toEqual([])
  })

  it('no actions/checkout step flips persist-credentials to true', () => {
    const offenders = checkoutUses().filter((c) => hasPersistCredentialsTrue(c.withBlock))
    expect(
      offenders,
      'A checkout step explicitly sets persist-credentials: true, persisting the job\'s ' +
        'GITHUB_TOKEN to disk for npm ci\'s lifecycle scripts to read:\n' +
        offenders.map((o) => `  ${o.file}:${o.line}`).join('\n'),
    ).toEqual([])
  })
})
