import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * x-tenant-sig is a static HMAC-SHA256(secret, tenantId) — no nonce, no
 * expiry (see tenant-header-sig.ts). Every downstream consumer
 * (dashboard/layout, admin-auth, chat, yinez, pin-reset, tenant.ts, etc.)
 * trusts it as proof middleware minted it server-side ("only middleware
 * holds the secret"). If middleware echoes it back on the HTTP response,
 * any visitor to a tenant's site can harvest a permanently-valid
 * (tenantId, sig) pair and replay it directly against API routes,
 * defeating that guarantee. This locks in: the internal request headers
 * (what route handlers/server components read) still carry x-tenant-sig,
 * but the actual response sent to the client never does.
 */

const tenantRow = {
  id: 'tenant-123',
  slug: 'acme',
  name: 'Acme',
  domain: null,
  status: 'active',
}

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: vi.fn(async () => tenantRow),
  getTenantByDomain: vi.fn(async () => null),
}))

beforeEach(() => {
  vi.resetModules()
  process.env.TENANT_HEADER_SIG_SECRET = 'unit-test-tenant-sig-secret'
})

describe('middleware — x-tenant-sig response echo', () => {
  it('does NOT set x-tenant-sig on the response sent to the client', async () => {
    const { default: middleware } = await import('./middleware')
    const req = new NextRequest('https://acme.fullloopcrm.com/', {
      headers: { host: 'acme.fullloopcrm.com' },
    })

    const res = await middleware(req)

    expect(res).toBeTruthy()
    expect(res!.headers.get('x-tenant-sig')).toBeNull()
    // Non-secret routing headers are still fine to echo.
    expect(res!.headers.get('x-tenant-id')).toBe('tenant-123')
    expect(res!.headers.get('x-tenant-slug')).toBe('acme')
  })

  it('still forwards x-tenant-sig on the internal rewritten request (server-side only)', async () => {
    const { default: middleware } = await import('./middleware')
    const req = new NextRequest('https://acme.fullloopcrm.com/', {
      headers: { host: 'acme.fullloopcrm.com' },
    })

    const res = await middleware(req)

    const forwarded = res!.headers.get('x-middleware-request-x-tenant-sig')
    expect(forwarded).toBeTruthy()
    expect(forwarded).toHaveLength(64) // hex sha256
  })

  it('strips any caller-supplied x-tenant-sig before signing (no forgery via inbound header)', async () => {
    const { default: middleware } = await import('./middleware')
    const req = new NextRequest('https://acme.fullloopcrm.com/', {
      headers: { host: 'acme.fullloopcrm.com', 'x-tenant-sig': 'forged-value' },
    })

    const res = await middleware(req)

    const forwarded = res!.headers.get('x-middleware-request-x-tenant-sig')
    expect(forwarded).not.toBe('forged-value')
    expect(res!.headers.get('x-tenant-sig')).toBeNull()
  })
})
