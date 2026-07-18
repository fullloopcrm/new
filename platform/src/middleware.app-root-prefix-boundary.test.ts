import { describe, it, expect } from 'vitest'
import { matchesAppRootPrefix } from './middleware'

/**
 * rewriteToSite()'s APP_ROOT_PREFIXES check used to be
 * `pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)`.
 * The third disjunct is redundant with (subsumes) the first two AND
 * introduces a real boundary bug: `pathname.startsWith(p)` alone matches any
 * pathname that merely shares the same leading characters as a reserved
 * prefix, not just an exact segment. A tenant content page whose path
 * happens to start with the same letters as a reserved prefix — e.g.
 * '/teamwork' vs. the reserved '/team', or '/administration' vs. '/admin' —
 * would be silently swallowed by the app-root branch (headers-only
 * passthrough, no /site/<slug> rewrite) instead of reaching the tenant's own
 * site content, 404ing with zero drift signal from any other check. See
 * matchesAppRootPrefix's own comment in src/middleware.ts for the full
 * writeup and reconcile-tenant-config.mjs's Drift AE for the sibling
 * gate check over on-disk tenant folders that collide with these prefixes.
 */
describe('matchesAppRootPrefix — path-segment boundary, not a bare substring match', () => {
  it('matches an exact prefix', () => {
    expect(matchesAppRootPrefix('/team', '/team')).toBe(true)
  })

  it('matches a real sub-path of the prefix (prefix + "/")', () => {
    expect(matchesAppRootPrefix('/team/roster', '/team')).toBe(true)
  })

  it('does NOT match a pathname that merely shares the prefix as a substring — the bug', () => {
    // Pre-fix, `pathname.startsWith(p)` alone made this true.
    expect(matchesAppRootPrefix('/teamwork', '/team')).toBe(false)
  })

  it('does not match an unrelated pathname', () => {
    expect(matchesAppRootPrefix('/services', '/team')).toBe(false)
  })

  // Every real APP_ROOT_PREFIXES entry has at least one live "looks like a
  // prefix collision but is not" pathname somewhere in the app's real route
  // space — pin the boundary behavior against each one directly.
  it.each([
    ['/portal', '/portals-for-business'],
    ['/admin', '/administration'],
    ['/dashboard', '/dashboard-demo'],
    ['/unsubscribe', '/unsubscribed-newsletter'],
    ['/stripe-onboard', '/stripe-onboarding-help'],
    ['/fullloop', '/fullloopcrm-anything'],
    ['/reset-pin', '/reset-pins-list'],
  ])('prefix %s does not falsely match %s', (prefix, pathname) => {
    expect(matchesAppRootPrefix(pathname, prefix)).toBe(false)
  })

  it('still shadows the exact reserved pathname (intended behavior, unchanged by the fix)', () => {
    // e.g. wash-and-fold-hoboken/wash-and-fold-nyc's own site/<slug>/unsubscribe
    // pages are still shadowed by this exact-match branch — that is
    // deliberate reserved-namespace behavior, not the bug this test guards.
    expect(matchesAppRootPrefix('/unsubscribe', '/unsubscribe')).toBe(true)
  })
})
