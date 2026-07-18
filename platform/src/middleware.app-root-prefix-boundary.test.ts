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

/**
 * src/middleware.ts's own APP_ROOT_PREFIXES array carries '/api/' — the ONLY
 * entry with a trailing slash baked in; every other entry ('/portal',
 * '/team', '/dashboard', '/admin', etc.) is bare. matchesAppRootPrefix's
 * boundary check assumes a BARE prefix and appends its own '/' for the
 * sub-path branch (`pathname.startsWith(prefix + '/')`), so calling it with
 * an already-slash-terminated prefix appends a SECOND slash
 * ('/api/' + '/' === '/api//') — a literal double-slash that no real request
 * path ever has. Combined with the exact-match branch (`pathname ===
 * prefix`, which only matches the literal string '/api/' with nothing after
 * it), this means matchesAppRootPrefix('/api/' + anything, '/api/') is FALSE
 * for every real request. Concrete production impact: rewriteToSite() (see
 * `APP_ROOT_PREFIXES.some(p => matchesAppRootPrefix(pathname, p))` in
 * src/middleware.ts) runs for EVERY tenant subdomain and custom-domain
 * request — confirmed via this file's own `config.matcher`, which explicitly
 * includes `/(api|trpc)(.*)` rather than excluding it. When the '/api/'
 * entry fails to match, a real API call like '/api/client/login' (the
 * client-PIN-login-portal POST endpoint fixed for Drift AL) or
 * '/api/tenant-sitemap' falls through to the bottom of rewriteToSite() and
 * gets rewritten to `/site/<slug>/api/client/login` instead of being served
 * headers-only at its real path — a route that does not exist on disk for
 * any bespoke tenant except the-nyc-marketing-company's own
 * site/the-nyc-marketing-company/api/contact/route.ts (which would then
 * shadow the GLOBAL /api/contact route for that one tenant, on that one
 * path, instead of every other tenant's real API calls 404ing). This has
 * been the literal value of the array's '/api/' entry since APP_ROOT_PREFIXES
 * was first introduced (git history shows it unchanged across every later
 * edit that added '/fullloop' and '/reset-pin') — the only reason a
 * trailing-slash entry sibling ('/api/' vs. '/api') never showed up as a
 * robots.ts drift is that Drift AJ's own check
 * (reconcile-tenant-config.mjs) independently strips a trailing slash from
 * every APP_ROOT_PREFIXES entry before comparing
 * (`prefix.replace(/\/$/, '')`) — a defensive normalization that happens to
 * mask this exact bug from that ONE consumer, while the real production
 * router (this file) has no such normalization and is not masked at all.
 */
describe('matchesAppRootPrefix — the "/api/" entry must not carry a baked-in trailing slash', () => {
  it('does NOT match a real /api sub-path when the prefix carries a trailing slash — the bug', () => {
    // '/api/' + '/' === '/api//' (double slash) — no real request path ever
    // has this, so this branch can never match a real /api/<anything> call.
    expect(matchesAppRootPrefix('/api/contact', '/api/')).toBe(false)
    expect(matchesAppRootPrefix('/api/client/login', '/api/')).toBe(false)
    expect(matchesAppRootPrefix('/api/tenant-sitemap', '/api/')).toBe(false)
  })

  it('matches every real /api sub-path once the prefix is bare, like every other entry', () => {
    expect(matchesAppRootPrefix('/api/contact', '/api')).toBe(true)
    expect(matchesAppRootPrefix('/api/client/login', '/api')).toBe(true)
    expect(matchesAppRootPrefix('/api/tenant-sitemap', '/api')).toBe(true)
  })

  it('still matches the bare /api path itself with a bare prefix', () => {
    expect(matchesAppRootPrefix('/api', '/api')).toBe(true)
  })

  it('does not falsely match an unrelated pathname that merely shares the "/api" letters', () => {
    expect(matchesAppRootPrefix('/apiary', '/api')).toBe(false)
  })
})
