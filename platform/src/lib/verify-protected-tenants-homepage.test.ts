import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hasProtectedTenantHomepage } from '../../scripts/verify-protected-tenants.mjs'

// Fresh ground, same "closure with zero test coverage, and only resolved ONE
// level of route-group nesting instead of the full chain" bug class
// reconcile-tenant-config.mjs's own hasHomePage had before item (238) fixed
// it there — this file's OWN independent homepage check was previously an
// inline main() closure in verify-protected-tenants.mjs with the identical
// one-level-only bug, and NO test file for this script existed at all.
// verify-protected-tenants.mjs is the actual npm `prebuild` step (see
// prebuild-guard-wiring.test.ts) — a false "no homepage" here blocks
// `next build`, and therefore every Vercel deploy, for a PROTECTED tenant
// whose homepage legitimately renders two-or-more route groups deep.
describe('hasProtectedTenantHomepage', () => {
  let dir: string | undefined
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  it('returns false for a directory that does not exist', () => {
    expect(hasProtectedTenantHomepage(join(tmpdir(), 'verify-protected-does-not-exist-xyz'))).toBe(false)
  })

  it('returns true for a direct page.tsx', () => {
    dir = mkdtempSync(join(tmpdir(), 'verify-protected-home-'))
    writeFileSync(join(dir, 'page.tsx'), '')
    expect(hasProtectedTenantHomepage(dir)).toBe(true)
  })

  it('returns true for a page.tsx one route group deep (the live shape, e.g. site/<slug>/(marketing)/page.tsx)', () => {
    dir = mkdtempSync(join(tmpdir(), 'verify-protected-home-'))
    mkdirSync(join(dir, '(marketing)'), { recursive: true })
    writeFileSync(join(dir, '(marketing)', 'page.tsx'), '')
    expect(hasProtectedTenantHomepage(dir)).toBe(true)
  })

  it('returns false when there is no page.tsx anywhere', () => {
    dir = mkdtempSync(join(tmpdir(), 'verify-protected-home-'))
    mkdirSync(join(dir, '(marketing)', 'about'), { recursive: true })
    writeFileSync(join(dir, '(marketing)', 'about', 'page.tsx'), '')
    expect(hasProtectedTenantHomepage(dir)).toBe(false)
  })

  // Mutation-verified live: reverting to the OLD one-level-only check
  // (`readdirSync(dir).some(e => e.startsWith('(') && e.endsWith(')') &&
  // existsSync(join(dir, e, 'page.tsx')))`, with no recursion) makes this
  // assertion fail — the old code only looks ONE route group deep, so a
  // page.tsx behind a SECOND, nested route group is invisible to it, wrongly
  // failing `next build` for a PROTECTED tenant whose homepage renders fine
  // in production.
  it('returns true for a page.tsx behind a CHAIN of nested route groups', () => {
    dir = mkdtempSync(join(tmpdir(), 'verify-protected-home-'))
    mkdirSync(join(dir, '(outer)', '(inner)'), { recursive: true })
    writeFileSync(join(dir, '(outer)', '(inner)', 'page.tsx'), '')
    expect(hasProtectedTenantHomepage(dir)).toBe(true)
  })
})
