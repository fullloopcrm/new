import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  slugify,
  gitAddDates,
  gitFollowAddDate,
  deterministicFallbackDate,
  resolveAddDate,
  timestampFor,
} from './migrate-legacy-to-cli.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..') // scripts/ -> platform/ -> repo root
const SCRIPT_PATH = join(__dirname, 'migrate-legacy-to-cli.mjs')

describe('slugify', () => {
  it('strips legacy numeric and dated prefixes', () => {
    expect(slugify('004_foo_bar.sql')).toBe('foo_bar')
    expect(slugify('2026_07_28_rls_gap_closure.sql')).toBe('rls_gap_closure')
  })
})

describe('deterministicFallbackDate -- the idempotency fix', () => {
  it('never touches the wall clock: same content produces the same date every time', () => {
    const content = '-- some migration SQL\nALTER TABLE foo ADD COLUMN bar text;\n'
    const first = deterministicFallbackDate(content)
    // Deliberately called again well after the first call -- if this were
    // still Date.now()-based (the sec-08 bug), these could differ even a
    // few milliseconds apart.
    const second = deterministicFallbackDate(content)
    expect(second).toBe(first)
  })

  it('produces a different date for different content (collision sanity)', () => {
    const a = deterministicFallbackDate('content A')
    const b = deterministicFallbackDate('content B')
    expect(a).not.toBe(b)
  })

  it('returns a valid parseable ISO date', () => {
    const iso = deterministicFallbackDate('anything')
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false)
  })
})

describe('gitAddDates vs gitFollowAddDate -- the renamed-file root cause', () => {
  // 063_nycmaid_routing_reconcile.sql was renumbered from 061 in its real
  // git history (sec-08 finding, 2026-08-01). The plain, directory-wide,
  // non-follow bulk lookup cannot find its true add date under the CURRENT
  // filename; the per-file --follow lookup can. This is the exact bug the
  // fix targets, reproduced here against this repo's real git history (not
  // a mock).
  const REL_DIR = 'platform/src/lib/migrations'
  const REL_FILE = 'platform/src/lib/migrations/063_nycmaid_routing_reconcile.sql'

  it('bulk lookup does not resolve the renamed file (reproduces the original bug)', () => {
    const bulk = gitAddDates(REL_DIR, { cwd: REPO_ROOT })
    expect(bulk.has('063_nycmaid_routing_reconcile.sql')).toBe(false)
  })

  it('the --follow per-file fallback DOES resolve it, and resolves it identically on repeated calls', () => {
    const first = gitFollowAddDate(REL_FILE, { cwd: REPO_ROOT })
    const second = gitFollowAddDate(REL_FILE, { cwd: REPO_ROOT })
    expect(first).not.toBeNull()
    expect(second).toBe(first)
    // Known real add date for this file (2026-07-12, pre-renumber) --
    // confirmed via `git log --follow` during the sec-08 audit.
    expect(first).toMatch(/^2026-07-12T/)
  })

  it('resolveAddDate composes both: falls through to --follow when bulk misses', () => {
    const bulk = gitAddDates(REL_DIR, { cwd: REPO_ROOT })
    const resolved = resolveAddDate({
      file: '063_nycmaid_routing_reconcile.sql',
      content: 'irrelevant for this path -- git history wins over content hash',
      bulkDates: bulk,
      fileRelToRepo: REL_FILE,
      cwd: REPO_ROOT,
    })
    expect(resolved).toMatch(/^2026-07-12T/)
  })

  it('resolveAddDate falls back to the content hash only when git has no history at all', () => {
    const bulk = new Map() // no bulk match
    const resolved = resolveAddDate({
      file: 'totally-fictional-never-committed-file.sql',
      content: 'stable content',
      bulkDates: bulk,
      fileRelToRepo: 'platform/src/lib/migrations/totally-fictional-never-committed-file.sql',
      cwd: REPO_ROOT,
    })
    expect(resolved).toBe(deterministicFallbackDate('stable content'))
  })
})

describe('timestampFor', () => {
  it('formats to UTC YYYYMMDDHHMMSS', () => {
    expect(timestampFor('2026-07-12T15:06:52-04:00')).toBe('20260712190652')
  })
})

describe('end-to-end idempotency: real CLI, two separate process invocations', () => {
  // This is the concrete proof the task asked for: run the actual script
  // (not a mock, not an in-process re-call) twice as separate `node`
  // subprocesses against this repo's real, unmodified migrations pile, and
  // assert byte-identical stdout. Before the fix, the 3 files affected by
  // the idempotency bug would each get a fresh Date.now()-based (or
  // lookup-failure-based) timestamp on every invocation -- two runs, even
  // seconds apart, could print different "Would write" filenames. --dry-run
  // guarantees this never writes to the repo.
  it('produces byte-identical --dry-run output across two separate invocations', () => {
    const run = () =>
      execFileSync('node', [SCRIPT_PATH, '--dry-run'], { cwd: REPO_ROOT, encoding: 'utf8' })

    const first = run()
    const second = run()

    expect(second).toBe(first)
  })

  it('the 3 previously-broken files resolve to the same real timestamp in both runs, not an incrementing one', () => {
    const run = () =>
      execFileSync('node', [SCRIPT_PATH, '--dry-run'], { cwd: REPO_ROOT, encoding: 'utf8' })

    const first = run()
    const second = run()

    // Real git-history-derived timestamps confirmed during the sec-08
    // audit (--follow finds 2026-07-12T11:06:52-04:00 for both renumbered
    // files, and the bulk lookup already finds 2026-07-28T12:46:17-04:00
    // for the RLS file now that it's committed). Before the fix, these
    // varied run-to-run; now both runs must print the exact same filename.
    for (const expected of [
      '20260712150652_nycmaid_routing_reconcile.sql',
      '20260712150653_nycmaid_routing_reconcile_verify.sql',
      '20260728164617_rls_gap_closure_post_july15.sql',
    ]) {
      expect(first).toContain(expected)
      expect(second).toContain(expected)
    }
  })
})
