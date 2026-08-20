import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// A tenant-domain request makes middleware.ts call getTenantBySlug, a real
// Supabase lookup -- unmocked, this hangs in the sandboxed test env with no
// network access. 'acme' resolving to no tenant is exactly what this test
// needs (falls through to normal 404 routing, same as a real unknown slug).
vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: vi.fn(async () => null),
  getTenantByDomain: vi.fn(async () => null),
}))

/**
 * Regression test for the 2026-08-01 incident: e51fe908e (EMD microsites SEO
 * work) deleted the entire /location, /industry, and /crm-for- legacy-URL
 * 301-redirect block from middleware.ts as collateral damage. Nothing caught
 * it — the fleet health monitor only pings tenant homepages, not deep pages —
 * so the site's #1-ranked keyword page 404'd in production for over a day
 * before a human noticed. This file pins the redirect behavior directly so a
 * future edit to middleware.ts fails CI instead of failing prod.
 */

const reqFor = (pathname: string) =>
  new NextRequest(`https://www.homeservicecrm.ai${pathname}`, {
    headers: { host: 'www.homeservicecrm.ai' },
  })

describe('middleware — legacy marketing-slug redirects (2026-07-28 redesign)', () => {
  it('old location URL 301s to the new /locations/{state}/{city} path', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('/location/home-service-crm-in-seattle'))
    expect(res).toBeTruthy()
    expect(res!.status).toBe(301)
    expect(res!.headers.get('location')).toContain('/locations/wa/seattle')
  })

  it('old industry hub URL 301s to the new /industry/{slug} path', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('/industry/crm-for-cleaning-service-businesses'))
    expect(res).toBeTruthy()
    expect(res!.status).toBe(301)
    expect(res!.headers.get('location')).toContain('/industry/cleaning-services')
  })

  it('old flat combo URL 301s to the new /industry/{slug}/{city-state} path', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('/crm-for-cleaning-businesses-in-seattle'))
    expect(res).toBeTruthy()
    expect(res!.status).toBe(301)
    expect(res!.headers.get('location')).toContain('/industry/cleaning-services/seattle-wa')
  })

  it('an unrecognized /location/* slug is NOT redirected (falls through, doesn\'t crash)', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor('/location/home-service-crm-in-not-a-real-city'))
    // No metro match -> redirectLegacyMarketingUrl returns null -> falls
    // through to normal routing, not a 301.
    expect(res?.status).not.toBe(301)
  })

  it('legacy redirects only apply on the main marketing host, never tenant domains', async () => {
    const { default: middleware } = await import('./middleware')
    const req = new NextRequest('https://acme.fullloopcrm.com/location/home-service-crm-in-seattle', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)
    expect(res?.status).not.toBe(301)
  })
})
