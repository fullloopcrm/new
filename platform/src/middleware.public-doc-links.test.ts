import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Proves the actual reason a proposal/invoice/document-sign/photo-share link
 * sent to a tenant's own domain 404s: middleware's tenant subdomain/custom-
 * domain routing rewrites EVERY path to /site/<slug>/... (or /site/template/
 * ...) except the small APP_ROOT_PREFIXES allowlist. /quote, /invoice, /sign,
 * and /photos are public, token-authed, tenant-agnostic pages that live at
 * the app root (src/app/quote/[token]/page.tsx etc.) — not under /site/<slug>
 * — so until they're in that allowlist, a link sent to a tenant's own domain
 * rewrites to a page that doesn't exist.
 */

const acme = { id: 'tenant-acme', slug: 'acme', name: 'Acme', domain: null, status: 'active' }

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

describe('public token-doc links on a tenant domain', () => {
  it('a proposal link (/quote/[token]) sent to a tenant subdomain does NOT get rewritten under /site', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/quote/tok_abc123', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)

    // The bug: today this contained '/site/template/quote/tok_abc123' or
    // '/site/acme/quote/tok_abc123' — neither of which is a real page. It
    // should pass straight through (no rewrite) so /quote/[token]/page.tsx
    // at the app root serves it — same as /api, /portal, /team.
    expect(rewriteTarget(res)).toBeNull()
    // NextResponse.next({request:{headers}}) forwards modified request headers
    // to Next's runtime encoded as x-middleware-request-* on the outer
    // response — see middleware.test.ts's comment on the same convention.
    expect(res!.headers.get('x-middleware-request-x-tenant-id')).toBe('tenant-acme')
  })

  it('an invoice link (/invoice/[token]) is not rewritten under /site on a tenant subdomain', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/invoice/tok_xyz', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res!.headers.get('x-middleware-request-x-tenant-id')).toBe('tenant-acme')
  })

  it('a document-sign link (/sign/[token]) is not rewritten under /site on a tenant custom domain', async () => {
    // www.acme.com — the canonical form; a bare apex would 301 to www first
    // (separate canonicalization concern, not what this test is checking).
    byDomain = async (domain) => (domain === 'www.acme.com' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://www.acme.com/sign/tok_sig', {
      headers: { host: 'www.acme.com' },
    })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res!.headers.get('x-middleware-request-x-tenant-id')).toBe('tenant-acme')
  })

  it('a job-photo share link (/photos/[token]) is not rewritten under /site', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/photos/tok_photos', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
    expect(res!.headers.get('x-middleware-request-x-tenant-id')).toBe('tenant-acme')
  })

  it('tenant-scoped ordinary site pages still route under /site as before (no regression)', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/services', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toContain('/site/template/services')
  })

  // Regression: APP_ROOT_PREFIXES used to match with a bare pathname.startsWith(p),
  // which matches any path sharing the prefix's characters with no separator
  // (e.g. "/quote-request".startsWith('/quote')). That silently routed tenant
  // pages like the-nyc-exterminator's real /quote-request page to the app root
  // instead of /site/<slug>/quote-request — 404 in production because no such
  // page exists at the root. Fixed to require an exact match or a '/' boundary.
  it('a tenant page whose path shares a prefix\'s characters (e.g. /quote-request vs /quote) still routes under /site, not the app root', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/quote-request', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toContain('/site/template/quote-request')
  })

  it('/api routes still pass through untouched now that the allowlist entry lost its trailing slash', async () => {
    bySlug = async (slug) => (slug === 'acme' ? acme : null)
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('https://acme.fullloopcrm.com/api/dashboard', {
      headers: { host: 'acme.fullloopcrm.com' },
    })
    const res = await middleware(req)

    expect(rewriteTarget(res)).toBeNull()
  })
})
