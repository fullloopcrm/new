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

  // AUTH-BYPASS PROBE (adversarial round, 2026-07-16): the wildcard DNS that
  // lets real tenants resolve at <slug>.fullloopcrm.com means EVERY label
  // reaches this middleware, including ones with no matching tenant (typo, a
  // deleted tenant's old slug, or an attacker-chosen label). Previously an
  // unresolved subdomain fell straight to a bare NextResponse.next(), which
  // skipped the Clerk/admin-token gate the main host applies to protected
  // routes — so /dashboard, /api/bookings, etc. served with NO auth check at
  // all instead of the sign-in redirect the same path gets on the main host.
  it('an unknown subdomain hitting a protected route redirects to sign-in instead of serving it unauthenticated', async () => {
    bySlug = async () => null
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://evil.fullloopcrm.com/dashboard', { headers: { host: 'evil.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
  })

  it('an unknown subdomain hitting a protected API route redirects to sign-in, not NextResponse.next()', async () => {
    bySlug = async () => null
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://evil.fullloopcrm.com/api/bookings', { headers: { host: 'evil.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
  })

  it('a suspended tenant\'s subdomain hitting a protected route also redirects to sign-in (dark tenant, not an auth bypass)', async () => {
    bySlug = async (slug) => (slug === 'acme' ? { ...acme, status: 'suspended' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/dashboard', { headers: { host: 'acme.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
  })

  it('an unknown subdomain still serves a genuinely public route (no auth regression for legitimate traffic)', async () => {
    bySlug = async () => null
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://typo.fullloopcrm.com/privacy-policy', { headers: { host: 'typo.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(res?.status).not.toBe(307)
    expect(res?.headers.get('location')).toBeFalsy()
  })

  it('a valid admin-token cookie still bypasses the gate on an unresolved subdomain, same as the main host', async () => {
    const { createHmac } = await import('crypto')
    const SECRET = 'mw-subdomain-admin-token-secret'
    process.env.ADMIN_TOKEN_SECRET = SECRET
    bySlug = async () => null
    const { default: middleware } = await import('./middleware')

    const payload = JSON.stringify({ role: 'super_admin', exp: Date.now() + 60_000 })
    const token = Buffer.from(payload).toString('base64') + '.' + createHmac('sha256', SECRET).update(payload).digest('hex')

    const req = new NextRequest('https://evil.fullloopcrm.com/api/notifications', {
      headers: { host: 'evil.fullloopcrm.com', cookie: `admin_token=${token}` },
    })
    const res = await middleware(req)

    expect(res).toBeUndefined() // bypass = fall through, not a redirect
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

  // AUTH-BYPASS PROBE (adversarial round, 2026-07-16): same structural bug as
  // the unresolved-subdomain case above, but for a custom domain that's
  // attached in Vercel yet has no resolvable tenant_domains / tenants.domain
  // row anymore (a tenant offboarded and their domain detachment lagged, or a
  // dangling tenant_domains pointer per the WRONG-TENANT PROBE test). Falling
  // straight to NextResponse.next() served protected routes with no auth gate.
  it('a dangling custom domain hitting a protected route redirects to sign-in instead of serving it unauthenticated', async () => {
    byDomain = async () => null
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.danglingcustom.com/dashboard', { headers: { host: 'www.danglingcustom.com' } })
    const res = await middleware(req)

    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
  })

  it('a custom domain that throws TENANT_DIVERGENCE hitting a protected route redirects to sign-in, not NextResponse.next()', async () => {
    byDomain = async () => {
      throw new Error('TENANT_DIVERGENCE host=www.acmecustom.com td=t-a legacy=t-b')
    }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.acmecustom.com/api/finance', { headers: { host: 'www.acmecustom.com' } })
    const res = await middleware(req)

    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
    errSpy.mockRestore()
  })

  it('a dangling custom domain still serves a genuinely public route (no auth regression for legitimate traffic)', async () => {
    byDomain = async () => null
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.danglingcustom.com/contact', { headers: { host: 'www.danglingcustom.com' } })
    const res = await middleware(req)

    expect(res?.status).not.toBe(307)
    expect(res?.headers.get('location')).toBeFalsy()
  })

  it('falls back to the STATIC_TENANT_MAP for www.thefloridamaid.com only after getTenantByDomain finds no row', async () => {
    const domainSpy = vi.fn(async () => null)
    byDomain = domainSpy
    bySlug = async (slug) => (slug === 'the-florida-maid' ? { id: 'x', slug: 'the-florida-maid', name: 'x', domain: null, status: 'active' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('56490a6b-820c-49e6-8c14-cb4e54ffcb06')
    expect(res!.headers.get('x-tenant-slug')).toBe('the-florida-maid')
    expect(domainSpy).toHaveBeenCalledWith('www.thefloridamaid.com')
  })

  // WRONG-TENANT PROBE: the STATIC_TENANT_MAP hardcodes an id/slug for this
  // host, but that hardcode can go stale the moment the domain is legitimately
  // reassigned in the DB (detached from the-florida-maid, re-registered to a
  // different tenant via admin/websites). Before this fix, this branch never
  // called getTenantByDomain at all, so it would keep serving the OLD
  // hardcoded tenant forever regardless of what tenant_domains/tenants.domain
  // now says — the resolver's own reassignment never reaches this host.
  it('WRONG-TENANT PROBE: when the resolver says a DIFFERENT tenant now owns thefloridamaid.com, the resolver wins over the stale hardcoded map', async () => {
    byDomain = async (domain) => (domain === 'www.thefloridamaid.com' ? beta : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('tenant-beta')
    expect(res!.headers.get('x-tenant-id')).not.toBe('56490a6b-820c-49e6-8c14-cb4e54ffcb06')
  })

  it('a suspended tenant now owning thefloridamaid.com per the resolver is NOT served, even though the hardcoded map would have served it', async () => {
    byDomain = async (domain) => (domain === 'www.thefloridamaid.com' ? { ...beta, status: 'suspended' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
  })

  // The resolver's own TRANSITION divergence guard must not be silently
  // defeated by falling through to the hardcoded map on this one host — that
  // would make the guard pointless exactly where a stale second source of
  // truth exists to mask it.
  it('a TENANT_DIVERGENCE thrown by the resolver for thefloridamaid.com is NOT swallowed into serving the stale hardcoded tenant', async () => {
    byDomain = async () => {
      throw new Error('TENANT_DIVERGENCE host=www.thefloridamaid.com td=t-new legacy=t-old')
    }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
    errSpy.mockRestore()
  })

  // PERMISSION-BOUNDARY PROBE (adversarial round, 2026-07-16): the STATIC_TENANT_MAP
  // fallback (an edge-resilience shim for one hardcoded domain) used to call
  // rewriteToSite() unconditionally — unlike the DB-resolved path a few lines
  // below it, which gates on tenantServesSite(). A suspended/cancelled/deleted
  // tenant on this one domain kept serving its full site AND dashboard forever,
  // bypassing the dark-on-suspension rule every other tenant is subject to —
  // effectively "one role above what should be allowed" (an offboarded tenant
  // acting as if still active).
  it('a suspended tenant on the STATIC_TENANT_MAP is NOT served — the status gate applies there too now', async () => {
    bySlug = async (slug) => (slug === 'the-florida-maid' ? { id: 'x', slug: 'the-florida-maid', name: 'x', domain: null, status: 'suspended' } : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/dashboard', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
  })

  // PERMISSION-BOUNDARY PROBE (adversarial round, follow-up): the fix above
  // only handled "tenant found but suspended/cancelled" (t && !servesSite).
  // If the slug genuinely resolves to NO tenant at all (slug renamed away, or
  // the row was hard-deleted instead of soft-deleted via status) — as opposed
  // to the lookup itself erroring — `t` is `null`, not a thrown error, and the
  // old `t && !tenantServesSite(...)` check short-circuited on the falsy `t`
  // and fell straight through to unconditional serving, same as the resolved
  // error case. A defensively-not-found tenant is not the same as "lookup
  // unreliable" and must fail closed, not open.
  it('the STATIC_TENANT_MAP does NOT serve when the slug resolves to no tenant at all (not an error, genuinely gone)', async () => {
    bySlug = async () => null
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/dashboard', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res?.headers.get('x-tenant-id')).toBeFalsy()
    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
  })

  it('the STATIC_TENANT_MAP still serves when the status lookup itself is unreliable (fail-open, the map\'s original purpose)', async () => {
    bySlug = async () => {
      throw new Error('edge DB unreachable')
    }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.thefloridamaid.com/', { headers: { host: 'www.thefloridamaid.com' } })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('56490a6b-820c-49e6-8c14-cb4e54ffcb06')
    errSpy.mockRestore()
  })

  // Host normalization: getTenantByDomain (tenant-lookup.ts) only strips the
  // www. prefix — it does not strip a port suffix or lowercase. middleware
  // must do that normalization itself before calling it (cleanHost), or a
  // custom domain hit with a port on the Host header (local testing, some
  // proxies) or non-lowercase casing never matches a DB row and silently
  // falls through to the main site instead of the tenant's own.
  it('strips a port suffix from the Host header before calling getTenantByDomain', async () => {
    const domainSpy = vi.fn(async (domain: string) => (domain === 'www.acmecustom.com' ? acme : null))
    byDomain = domainSpy
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.acmecustom.com:8443/', { headers: { host: 'www.acmecustom.com:8443' } })
    const res = await middleware(req)

    expect(domainSpy).toHaveBeenCalledWith('www.acmecustom.com')
    expect(res!.headers.get('x-tenant-id')).toBe('tenant-acme')
  })

  it('lowercases a mixed-case Host header before calling getTenantByDomain', async () => {
    const domainSpy = vi.fn(async (domain: string) => (domain === 'www.acmecustom.com' ? acme : null))
    byDomain = domainSpy
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://WWW.ACMECUSTOM.COM/', { headers: { host: 'WWW.ACMECUSTOM.COM' } })
    const res = await middleware(req)

    expect(domainSpy).toHaveBeenCalledWith('www.acmecustom.com')
    expect(res!.headers.get('x-tenant-id')).toBe('tenant-acme')
  })
})

describe('middleware — main-host / subdomain Host-header case sensitivity', () => {
  // isMainHost() and extractSubdomain() must lowercase the Host header before
  // matching, same as canonicalHost/cleanHost do elsewhere in this file. A
  // mixed-case Host (e.g. a client or proxy sending "WWW.FULLLOOPCRM.COM")
  // previously missed the (all-lowercase) MAIN_HOSTS set, so isMainHost()
  // returned false for the actual main host. The request then fell into the
  // custom-domain routing branch, the domain lookup found nothing, and
  // middleware returned NextResponse.next() — completely skipping the
  // Clerk/admin-token auth gate in the "Main site / dashboard" block below,
  // for a protected path like /dashboard.
  it('still applies the Clerk/admin-token auth gate on the main host when Host arrives uppercase', async () => {
    const domainSpy = vi.fn(async () => null)
    byDomain = domainSpy
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://WWW.FULLLOOPCRM.COM/dashboard', {
      headers: { host: 'WWW.FULLLOOPCRM.COM' },
    })
    const res = await middleware(req)

    // Not admin-authenticated and not a public route -> must redirect to
    // sign-in, NOT fall through as an unauthenticated NextResponse.next().
    expect(domainSpy).not.toHaveBeenCalled()
    expect(res!.status).toBe(307)
    expect(res!.headers.get('location')).toContain('/sign-in')
  })

  it('resolves a tenant subdomain whose Host header arrives mixed-case', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://ACME.fullloopcrm.com/', { headers: { host: 'ACME.fullloopcrm.com' } })
    const res = await middleware(req)

    expect(res!.headers.get('x-tenant-id')).toBe('tenant-acme')
  })
})
