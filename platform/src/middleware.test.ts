import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * x-tenant-sig response-header leak regression [fix 282bee7].
 *
 * middleware used to do `response.headers.set('x-tenant-sig', tenantSig)` — a
 * literal RESPONSE header, sent straight to the client. The sig is a static
 * HMAC(secret, tenantId) with no nonce/expiry, so capturing it once lets a
 * visitor replay x-tenant-id + x-tenant-sig on raw requests forever, forging
 * any tenant's identity. The fix removed that line; downstream still gets the
 * sig via `request: { headers }`, which Next.js relays to server components /
 * route handlers as x-middleware-request-* — those are consumed by Next's own
 * routing layer and never reach the client, unlike a literal response header.
 *
 * Trip wire: reinstating `response.headers.set('x-tenant-sig', ...)` in
 * rewriteToSite makes the first assertion in every case below fail.
 */

const h = vi.hoisted(() => ({
  tenant: { id: 'tenant-abc-123', slug: 'acme', name: 'Acme', domain: null, status: 'active' } as {
    id: string
    slug: string
    name: string
    domain: string | null
    status: string
  },
}))

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async (slug: string) => (slug === h.tenant.slug ? h.tenant : null),
  getTenantByDomain: async () => null,
}))

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = 'test-tenant-sig-secret'
})

beforeEach(() => {
  h.tenant = { id: 'tenant-abc-123', slug: 'acme', name: 'Acme', domain: null, status: 'active' }
})

const reqFor = (pathname: string) =>
  new NextRequest(`https://acme.fullloopcrm.com${pathname}`, {
    headers: { host: 'acme.fullloopcrm.com' },
  })

describe('middleware — x-tenant-sig is never echoed on the response', () => {
  it('main site rewrite ("/"): no literal x-tenant-sig response header, but downstream still receives it', async () => {
    const { default: middleware } = await import('./middleware')
    const { signTenantHeader } = await import('@/lib/tenant-header-sig')

    const res = await middleware(reqFor('/'))
    expect(res).toBeTruthy()
    if (!res) throw new Error('middleware returned no response')

    // The actual vulnerability: a literal client-visible response header.
    expect(res.headers.get('x-tenant-sig')).toBeNull()

    // Sanity: the non-secret tenant headers are still set on the response
    // (the fix removed ONLY the sig, not the whole header set).
    expect(res.headers.get('x-tenant-id')).toBe(h.tenant.id)
    expect(res.headers.get('x-tenant-slug')).toBe(h.tenant.slug)

    // Downstream (server components / route handlers) still resolve the sig —
    // via Next's request-header-override channel, which the framework strips
    // before the response reaches the client. This proves the fix didn't just
    // delete functionality; it moved the sig off the client-visible channel.
    const expectedSig = signTenantHeader(h.tenant.id)
    expect(res.headers.get('x-middleware-request-x-tenant-sig')).toBe(expectedSig)
  })

  it.each([
    ['/sitemap.xml'],
    ['/robots.txt'],
    ['/admin'],
    ['/dashboard'],
    ['/api/clients'],
  ])('%s: no literal x-tenant-sig response header', async (pathname) => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(reqFor(pathname))
    expect(res).toBeTruthy()
    if (!res) throw new Error('middleware returned no response')
    expect(res.headers.get('x-tenant-sig')).toBeNull()
  })
})
