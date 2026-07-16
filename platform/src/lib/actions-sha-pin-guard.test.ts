import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — GitHub Actions stay SHA-pinned (W3 lane: reconcile gate
// + CI wiring, PR9). Executable companion to
// deploy-prep/actions-sha-pinning-note.md, which was later applied in commit
// e7f1fd01 ("ci(security): SHA-pin third-party GitHub Actions across all 4
// workflows") — every `uses: owner/repo@vX` mutable-tag reference was pinned
// to the full 40-char commit SHA the tag resolved to at the time
// (`actions/checkout@34e114876b...# v4`), because a mutable tag can be
// retagged by a compromised maintainer account to point at malicious code
// that then runs with the workflow's GITHUB_TOKEN and any secrets in scope
// (the tj-actions/changed-files CVE-2025-30066 class the note cites). Two
// workflows in this pinned inventory (tenant-config-reconcile.yml,
// db-backup.yml) handle live Supabase credentials — a silently reverted pin
// there is a direct path to those secrets.
//
// That hardening was applied as a hand-edit with NOTHING enforcing it stays
// applied — a future PR that bumps `actions/checkout` back to `@v4` (a git
// tag, easy to type, looks like a normal version bump) would silently
// re-open the exact supply-chain hole the pin exists to close, with no CI
// signal. This test CODIFIES the invariant so a de-pin fails CI instead of
// relying on a reviewer noticing a 40-char hex string turned back into `v4`
// in the diff — same approach as reconcile-gate-wiring.test.ts and
// ci-full-suite-guard.test.ts (both W3-authored guards over this same
// workflows directory).
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner. vitest
// runs with the platform package root as cwd, so the workflows live one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')

// A remote third-party/first-party action reference: `owner/repo@ref` (repo
// may itself contain slashes, e.g. `owner/repo/subaction@ref`). A LOCAL
// action (`uses: ./some/local/action`) carries no supply-chain risk — it is
// checked out from this same repo at this same commit, nothing external to
// retag — so it is deliberately excluded from the pin requirement below.
const USES_RE = /^\s*(?:-\s*)?uses:\s*([^\s#]+)\s*(?:#.*)?$/
const FULL_SHA_RE = /^[0-9a-f]{40}$/

function usesReferences(): Array<{ file: string; line: number; ref: string }> {
  const out: Array<{ file: string; line: number; ref: string }> = []
  const files = readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))
  for (const file of files) {
    const src = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
    src.split('\n').forEach((raw, i) => {
      const m = raw.match(USES_RE)
      if (m) out.push({ file, line: i + 1, ref: m[1] })
    })
  }
  return out
}

describe('CI invariant — GitHub Actions stay SHA-pinned (no mutable-tag supply-chain hole)', () => {
  it('the workflows directory exists where the guard expects it', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
  })

  it('finds at least one remote `uses:` reference across the workflows (the check has something to verify)', () => {
    // If this fails either every workflow dropped its actions (unlikely — the
    // gate itself needs actions/checkout) or the USES_RE parser broke. Either
    // way a guard that silently checks zero references is worthless.
    const remote = usesReferences().filter((u) => !u.ref.startsWith('./'))
    expect(remote.length, 'no remote `uses:` references found in any workflow — the parser or the workflows themselves may be broken').toBeGreaterThan(0)
  })

  it('every remote action reference is pinned to a full 40-char commit SHA, not a mutable tag or branch', () => {
    const offenders = usesReferences()
      .filter((u) => !u.ref.startsWith('./')) // local actions: no external retag surface
      .filter((u) => {
        const at = u.ref.lastIndexOf('@')
        if (at === -1) return true // no ref at all — unpinned, always an offender
        const ref = u.ref.slice(at + 1)
        return !FULL_SHA_RE.test(ref)
      })
    expect(
      offenders,
      offenders
        .map((o) => `${o.file}:${o.line} uses "${o.ref}" — not pinned to a 40-char commit SHA (a mutable tag/branch can be retagged to run different code with this workflow's GITHUB_TOKEN and secrets)`)
        .join('\n'),
    ).toEqual([])
  })

  it('a local action reference (uses: ./...) is exempt from the pin requirement', () => {
    // Proves the exemption filter itself is doing real work, not silently
    // matching nothing — a local action checked out from this same repo at
    // this same commit has no external retag surface, so requiring a SHA on
    // it would be meaningless. Parses a synthetic snippet directly rather
    // than depending on any real workflow containing one today.
    const src = '      - uses: ./.github/actions/local-thing\n'
    const m = src.match(USES_RE)
    expect(m?.[1]).toBe('./.github/actions/local-thing')
    expect(m?.[1]?.startsWith('./')).toBe(true)
  })
})
