import { describe, it, expect } from 'vitest'
import {
  parseBespokeSet,
  parseProtectedSlugs,
  parseStaticTenantMap,
  parseNextConfigRedirects,
  parseRobotsKilledRoutes,
} from '../../scripts/reconcile-tenant-config.mjs'
import { parseBespokeSetFromMiddleware } from '../../scripts/verify-protected-tenants.mjs'

// Fresh-ground bug (W3 lane: reconcile gate + CI wiring, items 174-175),
// found by NOT trusting (172)/(173)'s own closing note that "no second
// instance of (172)'s bug class" existed — that swept CI-wiring gaps, not
// the parsing logic of the scripts this gate itself runs.
//
// Every parseX function here (and verify-protected-tenants.mjs's twin,
// parseBespokeSetFromMiddleware) extracts quoted string literals out of an
// array/object-literal block via a bare `['"]([^'"]+)['"]` regex. That regex
// does not know what a comment is: a slug commented out mid-edit
// (`// 'nyc-tow',` or `/* 'nyc-tow', */` — e.g. left behind by a merge
// conflict resolution, or a dev debugging locally) still matches and is
// silently reported as present.
//
// Mutation-verified against the live repo before fixing (not just reasoned
// about): commenting out 'nyc-tow' in src/middleware.ts's BESPOKE_SITE_TENANTS
// left the pre-fix `node scripts/verify-protected-tenants.mjs` printing
// "✅ ... OK" (exit 0) — the exact backstop for the 2026-07-08 outage class
// blind to the outage condition it exists to catch, because middleware would
// actually route that request to /site/template at runtime. Restored clean,
// reconfirmed green, before writing the fix.
//
// Fixed with a shared `stripComments()` helper (strips `//` and `/* */`
// before the quote-extraction regex runs) applied at all 15 call sites in
// reconcile-tenant-config.mjs plus the one in verify-protected-tenants.mjs
// (which also gained an exported parseBespokeSetFromMiddleware, extracted
// from what was previously unexported top-level script code with no test
// coverage at all — same export-pure-logic-for-testing convention this file's
// sibling reconcile-tenant-config.mjs already documents in its own header).
//
// These tests cover the distinct regex SHAPES this fix touches, not every
// call site 1:1 (which would just be 15 near-identical tests of the same
// stripComments helper): a plain matchAll Set-literal (parseBespokeSet), a
// `key: 'value'` object-array (parseProtectedSlugs), a multi-group exec loop
// (parseStaticTenantMap, parseNextConfigRedirects), a wrapped-call pattern
// (parseRobotsKilledRoutes), and verify-protected-tenants.mjs's now-exported
// standalone twin of parseBespokeSet.

describe('reconcile-gate parsers ignore commented-out entries', () => {
  it('parseBespokeSet: a // line-commented slug is not read as present', () => {
    const src = `
      const BESPOKE_SITE_TENANTS = new Set<string>([
        'nycmaid',
        // 'nyc-tow',
        'we-pay-you-junk',
      ])
    `
    const set = parseBespokeSet(src)
    expect(set.has('nyc-tow')).toBe(false)
    expect(set.has('nycmaid')).toBe(true)
    expect(set.has('we-pay-you-junk')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('parseBespokeSet: a /* */ block-commented slug is not read as present', () => {
    const src = `
      const BESPOKE_SITE_TENANTS = new Set<string>([
        'nycmaid',
        /* 'nyc-tow', */
        'we-pay-you-junk',
      ])
    `
    const set = parseBespokeSet(src)
    expect(set.has('nyc-tow')).toBe(false)
    expect(set.size).toBe(2)
  })

  it('parseBespokeSet: a live (uncommented) slug is unaffected by the strip', () => {
    // Guards against the stripComments regex being over-broad and eating real
    // entries — every value these parsers extract is a bare slug/path/host
    // with no `//` or `/*` inside it, so this must still see all three.
    const src = `
      const BESPOKE_SITE_TENANTS = new Set<string>([
        'nycmaid',
        'nyc-tow',
        'we-pay-you-junk',
      ])
    `
    expect(parseBespokeSet(src).size).toBe(3)
  })

  it('parseProtectedSlugs: a commented-out { slug: ... } entry is not read as present', () => {
    const src = `
      const PROTECTED = [
        { slug: 'nycmaid', domain: 'thenycmaid.com' },
        // { slug: 'nyc-tow', domain: 'nyctow' },
        { slug: 'we-pay-you-junk', domain: 'wepayyoujunkremoval.com' },
      ]
    `
    const set = parseProtectedSlugs(src)
    expect(set.has('nyc-tow')).toBe(false)
    expect(set.size).toBe(2)
  })

  it('parseStaticTenantMap: a commented-out hostname entry is not read as present', () => {
    const src = `
      const STATIC_TENANT_MAP: Record<string, { id: string; slug: string }> = {
        'thenycmaid.com': { id: 'abc-123', slug: 'nycmaid' },
        // 'nyctow.com': { id: 'xyz-789', slug: 'nyc-tow' },
      }
    `
    const map = parseStaticTenantMap(src)
    expect(map.has('nyctow.com')).toBe(false)
    expect(map.get('thenycmaid.com')).toEqual({ id: 'abc-123', slug: 'nycmaid' })
    expect(map.size).toBe(1)
  })

  it('parseNextConfigRedirects: a commented-out redirect entry is not read as present', () => {
    const src = `
      async redirects() {
        return [
          { source: '/old', destination: '/new', permanent: true },
          // { source: '/apply', destination: '/careers', permanent: true },
        ]
      }
    `
    const out = parseNextConfigRedirects(src)
    expect(out.find((r) => r.source === '/apply')).toBeUndefined()
    expect(out).toEqual([{ source: '/old', destination: '/new' }])
  })

  it('parseRobotsKilledRoutes: a commented-out disallow.push is not read as present', () => {
    const src = `
      if (isMainHost) {
        disallow.push('/admin')
        // disallow.push('/apply')
      }
    `
    const set = parseRobotsKilledRoutes(src)
    expect(set.has('/apply')).toBe(false)
    expect(set.has('/admin')).toBe(true)
    expect(set.size).toBe(1)
  })

  it('verify-protected-tenants.mjs: parseBespokeSetFromMiddleware ignores a commented-out slug too', () => {
    // The sibling copy of this bug, in the OTHER script this gap's own (172)
    // fix wired into ci.yml as the direct 2026-07-08-outage-class backstop —
    // this is the one whose false negative was mutation-verified live above.
    const src = `
      const BESPOKE_SITE_TENANTS = new Set<string>([
        'nycmaid',
        // 'nyc-tow',
        'we-pay-you-junk',
      ])
    `
    const { bespokeSet, error } = parseBespokeSetFromMiddleware(src)
    expect(error).toBeNull()
    if (!bespokeSet) throw new Error('expected a non-null bespokeSet when error is null')
    expect(bespokeSet.has('nyc-tow')).toBe(false)
    expect(bespokeSet.has('nycmaid')).toBe(true)
    expect(bespokeSet.size).toBe(2)
  })

  it('verify-protected-tenants.mjs: reports an error, not a throw, when the set is absent', () => {
    const { bespokeSet, error } = parseBespokeSetFromMiddleware('export const x = 1')
    expect(bespokeSet).toBeNull()
    expect(error).toMatch(/could not find the BESPOKE_SITE_TENANTS set/)
  })
})
