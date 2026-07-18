import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  walkRoutes,
  collectCurrentSignatures,
  loadBaseline,
  diffAgainstBaseline,
} from '../../scripts/idor-lint-guard'

// scripts/idor-lint-guard.ts is the actual CLI entrypoint named by
// deploy-prep/idor-lint-guard.sample.yml's proposed CI job. Unlike
// src/lib/idor-route-guard.ts (the analyzer it wraps, tested in
// idor-route-guard.test.ts), the CLI's own route-walking, baseline-loading,
// and diffing logic had zero test coverage before this — the analyzer being
// well-tested doesn't cover bugs in the wrapper that reads/writes the
// baseline file and decides the exit code.

describe('idor-lint-guard CLI — walkRoutes', () => {
  let dir: string
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  it('collects route.ts files and skips sibling non-route files', () => {
    dir = mkdtempSync(join(tmpdir(), 'idor-lint-'))
    mkdirSync(join(dir, 'bookings'), { recursive: true })
    writeFileSync(join(dir, 'bookings', 'route.ts'), '')
    writeFileSync(join(dir, 'bookings', 'types.ts'), '')
    writeFileSync(join(dir, 'bookings', 'README.md'), '')
    const found = walkRoutes(dir)
    expect(found).toEqual([join(dir, 'bookings', 'route.ts')])
  })

  it('recurses into nested directories', () => {
    dir = mkdtempSync(join(tmpdir(), 'idor-lint-'))
    mkdirSync(join(dir, 'clients', '[id]', 'contacts'), { recursive: true })
    writeFileSync(join(dir, 'clients', 'route.ts'), '')
    writeFileSync(join(dir, 'clients', '[id]', 'route.ts'), '')
    writeFileSync(join(dir, 'clients', '[id]', 'contacts', 'route.ts'), '')
    expect(walkRoutes(dir).sort()).toEqual(
      [
        join(dir, 'clients', 'route.ts'),
        join(dir, 'clients', '[id]', 'route.ts'),
        join(dir, 'clients', '[id]', 'contacts', 'route.ts'),
      ].sort(),
    )
  })

  it('returns empty for a directory with no route.ts anywhere', () => {
    dir = mkdtempSync(join(tmpdir(), 'idor-lint-'))
    mkdirSync(join(dir, 'lib'), { recursive: true })
    writeFileSync(join(dir, 'lib', 'helper.ts'), '')
    expect(walkRoutes(dir)).toEqual([])
  })
})

describe('idor-lint-guard CLI — collectCurrentSignatures', () => {
  let dir: string
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  it('flags an unscoped by-id chain as file::table, deduped and sorted', () => {
    dir = mkdtempSync(join(tmpdir(), 'idor-lint-'))
    mkdirSync(join(dir, 'clients'), { recursive: true })
    mkdirSync(join(dir, 'bookings'), { recursive: true })
    writeFileSync(
      join(dir, 'clients', 'route.ts'),
      `await supabaseAdmin.from('clients').delete().eq('id', a)\nawait supabaseAdmin.from('clients').select('*').eq('id', b)`,
    )
    writeFileSync(
      join(dir, 'bookings', 'route.ts'),
      `await supabaseAdmin.from('bookings').eq('tenant_id', t).eq('id', c)`,
    )
    const sigs = collectCurrentSignatures(dir, dir)
    // clients::clients deduped to one entry despite two unsafe chains in the
    // same file; bookings is tenant-scoped so it never appears.
    expect(sigs).toEqual([join('clients', 'route.ts') + '::clients'])
  })

  it('returns an empty array when nothing is unscoped', () => {
    dir = mkdtempSync(join(tmpdir(), 'idor-lint-'))
    mkdirSync(join(dir, 'clean'), { recursive: true })
    writeFileSync(join(dir, 'clean', 'route.ts'), `await supabaseAdmin.from('clients').select('*').eq('status', 'open')`)
    expect(collectCurrentSignatures(dir, dir)).toEqual([])
  })
})

describe('idor-lint-guard CLI — loadBaseline', () => {
  let dir: string
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  // Real, reachable, security-relevant branch: a fresh clone or a checkout
  // that's missing the committed baseline.json must NOT crash the CI job --
  // it must fail open TO REPORTING (every current signature counts as new
  // and gets listed), not fail open to silently passing.
  it('treats a missing baseline file as an empty baseline, not a crash', () => {
    dir = mkdtempSync(join(tmpdir(), 'idor-lint-'))
    expect(loadBaseline(join(dir, 'does-not-exist.json'))).toEqual([])
  })

  it('parses an existing baseline file', () => {
    dir = mkdtempSync(join(tmpdir(), 'idor-lint-'))
    const path = join(dir, 'baseline.json')
    writeFileSync(path, JSON.stringify(['a/route.ts::clients', 'b/route.ts::invoices']))
    expect(loadBaseline(path)).toEqual(['a/route.ts::clients', 'b/route.ts::invoices'])
  })
})

describe('idor-lint-guard CLI — diffAgainstBaseline', () => {
  it('reports nothing new when current is a subset of baseline', () => {
    expect(diffAgainstBaseline(['a::t'], ['a::t', 'b::t'])).toEqual([])
  })

  it('reports entries in current not present in baseline', () => {
    expect(diffAgainstBaseline(['a::t', 'c::t'], ['a::t'])).toEqual(['c::t'])
  })

  it('an empty baseline (missing file) reports every current signature as new', () => {
    expect(diffAgainstBaseline(['a::t', 'b::t'], [])).toEqual(['a::t', 'b::t'])
  })
})
