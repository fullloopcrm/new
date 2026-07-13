import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * middleware.ts wires getTenantBySlug/getTenantByDomain (tenant-lookup.ts) into
 * actual host routing (rewriteToSite). tenant-lookup.test.ts and tenant.test.ts
 * already prove the resolvers themselves never cross tenants — this file proves
 * middleware's OWN wiring of those resolvers doesn't introduce a cross-tenant
 * leak or bypass the tenantServesSite() status gate, which had no direct test
 * coverage before this.
 */

const acme = { id: 'tenant-acme', slug: 'acme', name: 'Acme', domain: null, status: 'active' }
const beta = { id: 'tenant-beta', slug: 'beta', name: 'Beta', domain: null, status: 'active' }

let bySlug: (slug: string) => Promise<typeof acme | null>
let byDomain: (domain: string) => Promise<typeof acme | null>

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: (slug: string) => bySlug(slug),
  getTenantByDomain: (domain: string) => byDomain(domain),
}))

function rewriteTarget(res: { headers: { get(k: string): string | null } } | undefined): string | null {
  return res?.headers.get('x-middleware-rewrite') ?? null
}

beforeEach(() => {
  vi.resetModules()
  process.env.TENANT_HEADER_SIG_SECRET = 'unit-test-tenant-sig-secret'
  bySlug = async () => null
  byDomain = async () => null
})

describe('middleware — subdomain routing wiring', () => {
  it('rewrites to the resolved tenant\'s own site and stamps its own headers', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/services', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('tenant-acme')
    expect(res!.headers.get('x-tenant-slug')).toBe('acme')
    expect(rewriteTarget(res)).toContain('/site/template/services')
  })

  it('WRONG-TENANT PROBE: subdomain "acme" never resolves to "beta"\'s id/slug and vice versa', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : slug === 'beta' ? beta : null)
    const { default: middleware } = await import('./middleware')

    const reqA = new NextRequest('https://acme.fullloopcrm.com/', { headers: { host: 'acme.fullloopcrm.com' } })
    const resA = await middleware(reqA)
    expect(resA!.headers.get('x-tenant-id')).toBe('tenant-acme')
    expect(resA!.headers.get('x-tenant-id')).not.toBe('tenant-beta')

    const reqB = new NextRequest('https://beta.fullloopcrm.com/', { headers: { host: 'beta.fullloopcrm.com' } })
    const resB = await middleware(reqB)
    expect(resB!.headers.get('x-tenant-id')).toBe('tenant-beta')
    expect(resB!.headers.get('x-tenant-id')).not.toBe('tenant-acme')
  })

  it('a suspended tenant\'s subdomain is NOT rewritten to its site (tenantServesSite gate)', async () => {
    bySlug = async (slug) => (slug === 'acme' ? { ...acme, status: 'suspended' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/', { headers: { host: 'acme.fullloopcrm.com' } })
    const res = await middleware(req)

    // Falls through to NextResponse.next() — no rewrite, no tenant headers leaked.
    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
  })

  it('a cancelled tenant\'s subdomain is NOT rewritten to its site', async () => {
    bySlug = async (slug) => (slug === 'acme' ? { ...acme, status: 'cancelled' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/', { headers: { host: 'acme.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
  })

  it('a pending/setup tenant IS still served (only suspended/cancelled/deleted are dark)', async () => {
    bySlug = async (slug) => (slug === 'acme' ? { ...acme, status: 'pending' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/', { headers: { host: 'acme.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('tenant-acme')
  })

  it('an unknown subdomain (no matching tenant) falls through with no tenant headers', async () => {
    bySlug = async () => null
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://nosuch.fullloopcrm.com/', { headers: { host: 'nosuch.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
  })

  it('routes a BESPOKE_SITE_TENANTS slug to its own /site/<slug> subtree, not the shared template', async () => {
    const nycmaid = { id: 'tenant-nycmaid', slug: 'nycmaid', name: 'NYC Maid', domain: null, status: 'active' }
    bySlug = async (slug) => (slug === 'nycmaid' ? nycmaid : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://nycmaid.fullloopcrm.com/', { headers: { host: 'nycmaid.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toContain('/site/nycmaid')
    expect(rewriteTarget(res)).not.toContain('/site/template')
  })

  it('a non-bespoke tenant slug falls back to the shared /site/template', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/', { headers: { host: 'acme.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toContain('/site/template')
  })
})

describe('middleware — custom domain routing wiring', () => {
  // Bare apex hosts hit the canonical www 301 redirect before reaching the
  // custom-domain block (see middleware.ts's canonical-redirect step), so
  // these tests use the www host, matching how a real custom domain arrives
  // at the custom-domain routing block in production.
  it('rewrites to the resolved tenant\'s own site via getTenantByDomain (tenant_domains-first resolver)', async () => {
    byDomain = async (domain) => (domain === 'www.acmecustom.com' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.acmecustom.com/about', { headers: { host: 'www.acmecustom.com' } })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('tenant-acme')
    expect(rewriteTarget(res)).toContain('/site/template/about')
  })

  it('WRONG-TENANT PROBE: custom domain for tenant A never carries tenant B\'s id', async () => {
    byDomain = async (domain) => (domain === 'www.acmecustom.com' ? acme : domain === 'www.betacustom.com' ? beta : null)
    const { default: middleware } = await import('./middleware')

    const resA = await middleware(new NextRequest('https://www.acmecustom.com/', { headers: { host: 'www.acmecustom.com' } }))
    expect(resA!.headers.get('x-tenant-id')).toBe('tenant-acme')

    const resB = await middleware(new NextRequest('https://www.betacustom.com/', { headers: { host: 'www.betacustom.com' } }))
    expect(resB!.headers.get('x-tenant-id')).toBe('tenant-beta')
  })

  it('a suspended tenant\'s custom domain is NOT rewritten to its site', async () => {
    byDomain = async (domain) => (domain === 'www.acmecustom.com' ? { ...acme, status: 'suspended' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.acmecustom.com/', { headers: { host: 'www.acmecustom.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
  })

  it('falls through cleanly (no crash, no tenant headers) when getTenantByDomain throws (TRANSITION divergence refusal)', async () => {
    byDomain = async () => {
      throw new Error('TENANT_DIVERGENCE host=www.acmecustom.com td=t-a legacy=t-b')
    }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.acmecustom.com/', { headers: { host: 'www.acmecustom.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
    errSpy.mockRestore()
  })

  it('uses the STATIC_TENANT_MAP fallback for www.thefloridamaid.com without querying getTenantByDomain', async () => {
    const domainSpy = vi.fn(async () => null)
    byDomain = domainSpy
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('56490a6b-820c-49e6-8c14-cb4e54ffcb06')
    expect(res!.headers.get('x-tenant-slug')).toBe('the-florida-maid')
    expect(domainSpy).not.toHaveBeenCalled()
  })
})
