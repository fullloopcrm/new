import { describe, it, expect } from 'vitest'
import { isMainHost, extractSubdomain } from './middleware'

/**
 * isMainHost and extractSubdomain used to compare/match against the raw Host
 * header with no case normalization, while every OTHER host comparison in
 * this same file (canonicalHost, cleanHost) explicitly lowercases first.
 * MAIN_HOSTS is an all-lowercase Set and extractSubdomain's regex is
 * lowercase-only, so a mixed-case Host header silently missed both — routing
 * a real main-host or tenant-subdomain request down the WRONG middleware
 * branch instead of erroring loudly. DNS/HTTP Host matching is
 * case-insensitive but not case-NORMALIZING: a non-browser HTTP client is
 * free to send any casing. See the comments on both functions in
 * src/middleware.ts for the full before/after writeup.
 */
describe('isMainHost — case-insensitive Host header matching', () => {
  it('matches the canonical lowercase form', () => {
    expect(isMainHost('fullloopcrm.com')).toBe(true)
  })

  it('matches an all-uppercase Host header — the bug', () => {
    expect(isMainHost('FULLLOOPCRM.COM')).toBe(true)
  })

  it('matches a mixed-case www-prefixed Host header — the bug', () => {
    expect(isMainHost('WWW.FullLoopCRM.com')).toBe(true)
  })

  it('still strips the port before comparing, case-insensitively', () => {
    expect(isMainHost('FullLoopCRM.com:3000')).toBe(true)
  })

  it('does not match an unrelated host regardless of case', () => {
    expect(isMainHost('SOMETHING-ELSE.COM')).toBe(false)
  })
})

describe('extractSubdomain — case-insensitive Host header matching', () => {
  it('extracts the slug from the canonical lowercase form', () => {
    expect(extractSubdomain('nycmaid.fullloopcrm.com')).toBe('nycmaid')
  })

  it('extracts the slug from an all-uppercase Host header — the bug', () => {
    expect(extractSubdomain('NYCMAID.FULLLOOPCRM.COM')).toBe('nycmaid')
  })

  it('extracts the slug from a mixed-case Host header — the bug', () => {
    expect(extractSubdomain('NycMaid.FullLoopCRM.com')).toBe('nycmaid')
  })

  it('still excludes "www" as a slug, case-insensitively', () => {
    expect(extractSubdomain('WWW.fullloopcrm.com')).toBeNull()
  })

  it('still returns null for a host with no matching carrying domain', () => {
    expect(extractSubdomain('SOMETHING-ELSE.COM')).toBeNull()
  })
})
