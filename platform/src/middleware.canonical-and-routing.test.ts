import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Characterization test written 2026-08-01 BEFORE splitting middleware.ts
 * into per-concern modules (see [[feedback_middleware_split]]) — pins
 * behavior for the concerns that had zero test coverage: brand
 * consolidation, www canonicalization (+ its exclusions), killed routes,
 * EMD microsite rewrites, and the static tenant map. Every case here passed
 * against the pre-split middleware.ts and must keep passing unchanged
 * against the split version — that's the whole point of the split being
 * behavior-preserving.
 */

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async () => null,
  getTenantByDomain: async () => null,
}))

beforeEach(() => {
  process.env.TENANT_HEADER_SIG_SECRET = 'unit-test-tenant-sig-secret'
})

const reqFor = (host: string, pathname: string) =>
  new NextRequest(`https://${host}${pathname}`, { headers: { host } })

describe('middleware — brand consolidation (fullloopcrm.com -> homeservicesbusinesscrm.com)', () => {
  it('bare apex 308s to the main marketing host, preserving path + query', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('fullloopcrm.com', '/full-loop-crm-pricing?ref=x'))
    expect(res?.status).toBe(308)
    expect(res?.headers.get('location')).toBe('https://www.homeservicesbusinesscrm.com/full-loop-crm-pricing?ref=x')
  })

  it('www.fullloopcrm.com also 308s to the main marketing host', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('www.fullloopcrm.com', '/'))
    expect(res?.status).toBe(308)
    expect(res?.headers.get('location')).toBe('https://www.homeservicesbusinesscrm.com/')
  })
})

describe('middleware — canonical www redirect (301)', () => {
  it('a bare apex custom domain 301s to its www equivalent', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('example-tenant.com', '/services'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('location')).toBe('https://www.example-tenant.com/services')
  })

  it('already-www hosts are NOT redirected', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('www.example-tenant.com', '/'))
    expect(res?.status).not.toBe(301)
  })

  it('an APEX_CANONICAL_DOMAINS entry (consortiumnyc.com) is NOT redirected to www', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('consortiumnyc.com', '/'))
    expect(res?.status).not.toBe(301)
  })

  it('API routes are never canonical-redirected, even on a bare apex', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('example-tenant.com', '/api/webhooks/stripe'))
    expect(res?.status).not.toBe(301)
  })

  it('*.fullloopcrm.com subdomains are not canonical-redirected (no www for a subdomain)', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('acme.fullloopcrm.com', '/'))
    expect(res?.status).not.toBe(301)
  })
})

describe('middleware — killed routes (410 Gone)', () => {
  it('/apply on the main host returns 410, not 404', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('www.homeservicesbusinesscrm.com', '/apply'))
    expect(res?.status).toBe(410)
  })

  it('/apply on a tenant custom domain (not the main host) is unaffected', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('www.example-tenant.com', '/apply'))
    expect(res?.status).not.toBe(410)
  })
})

describe('middleware — EMD microsite rewrites', () => {
  it('a known EMD domain root ("/") rewrites to its dedicated static page', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('miamibeachmaid.com', '/'))
    expect(res?.headers.get('x-middleware-rewrite')).toContain('/site/emd-microsites/miami-beach-maid')
  })

  it('a known EMD domain sitemap.xml rewrites to its own nested sitemap', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('miamibeachmaid.com', '/sitemap.xml'))
    expect(res?.headers.get('x-middleware-rewrite')).toContain('/site/emd-microsites/miami-beach-maid/sitemap.xml')
  })

  it('an EMD domain path OTHER than / or /sitemap.xml returns 410 Gone, never falls through to normal tenant-domain lookup', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('miamibeachmaid.com', '/some-other-path'))
    expect(res?.status).toBe(410)
    expect(res?.headers.get('x-middleware-rewrite') || '').not.toContain('/site/emd-microsites')
  })

  it('an EMD domain /robots.txt still falls through to the host-aware robots passthrough, not 410', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('miamibeachmaid.com', '/robots.txt'))
    expect(res?.status).not.toBe(410)
  })
})

describe('middleware — static tenant map fallback', () => {
  it('www.thefloridamaid.com rewrites via the static map even without a DB hit', async () => {
    // Bare apex would 301 to www first (the canonical-www redirect runs
    // before custom-domain routing) — use the www host to actually reach
    // the static-tenant-map branch.
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('www.thefloridamaid.com', '/'))
    expect(res?.headers.get('x-tenant-slug')).toBe('the-florida-maid')
  })
})
