import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * tenant-site.ts (60 call sites, 0 tests before this file) has two roles:
 *
 *  1. getTenantFromHeaders() / requireLegacySeoPages() — a SECOND tenant
 *     resolution gate (distinct from getTenantForRequest in tenant-query.ts)
 *     used by public-facing /site and /api routes. Its own comment flags the
 *     risk directly: without the signature check, "a curl-er could impersonate
 *     any tenant on any public /api route that uses this helper." This is
 *     covered here with a wrong-tenant/forged-signature probe.
 *  2. Pure helpers (toSlug/fromSlug/tenantSiteUrl) and SEO content generators
 *     consumed widely by the site template — covered for their branching logic.
 */

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; count?: number; error?: unknown }

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: () => chain,
    single: async () => resolve(table, eqs),
    maybeSingle: async () => resolve(table, eqs),
    then: (onFulfilled: (v: { data: unknown; count?: number }) => unknown) =>
      Promise.resolve(resolve(table, eqs)).then(onFulfilled),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const mockHeaderStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => mockHeaderStore.get(name) ?? null }),
}))

class NextNotFoundError extends Error {}
const notFound = vi.fn(() => {
  throw new NextNotFoundError('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
}))

const verifyTenantHeaderSig = vi.fn<(id: string, sig: string | null | undefined) => boolean>()
vi.mock('./tenant-header-sig', () => ({
  verifyTenantHeaderSig: (id: string, sig: string | null | undefined) => verifyTenantHeaderSig(id, sig),
}))

import {
  getTenantFromHeaders,
  requireLegacySeoPages,
  toSlug,
  fromSlug,
  tenantSiteUrl,
  generateContent,
  getChecklistForService,
  getTenantServiceByUrlSlug,
  getTenantServiceList,
} from './tenant-site'

beforeEach(() => {
  mockHeaderStore.clear()
  verifyTenantHeaderSig.mockReset().mockReturnValue(false)
  notFound.mockClear()
  resolve = () => ({ data: null })
})

describe('getTenantFromHeaders', () => {
  it('returns null when x-tenant-id header is absent', async () => {
    const result = await getTenantFromHeaders()
    expect(result).toBeNull()
    expect(verifyTenantHeaderSig).not.toHaveBeenCalled()
  })

  it('WRONG-TENANT PROBE: rejects an x-tenant-id header with a missing/forged signature, never queries the tenant row', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'forged-sig')
    verifyTenantHeaderSig.mockReturnValue(false)
    let queried = false
    resolve = () => {
      queried = true
      return { data: { id: 't-1' } }
    }

    const result = await getTenantFromHeaders()
    expect(result).toBeNull()
    expect(queried).toBe(false)
  })

  it('returns the tenant row when the header signature verifies', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    verifyTenantHeaderSig.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1' ? { data: { id: 't-1', slug: 'acme' } } : { data: null }

    const result = await getTenantFromHeaders()
    expect(result).toEqual({ id: 't-1', slug: 'acme' })
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error instead of silently returning null (indistinguishable from "no such tenant")', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    verifyTenantHeaderSig.mockReturnValue(true)
    resolve = () => ({ data: null, error: { message: 'connection timeout' } })

    await expect(getTenantFromHeaders()).rejects.toThrow(/TENANT_HEADER_LOOKUP_ERROR/)
  })
})

describe('requireLegacySeoPages', () => {
  it('calls notFound() when no tenant resolves', async () => {
    await expect(requireLegacySeoPages()).rejects.toBeInstanceOf(NextNotFoundError)
  })

  it('calls notFound() when the tenant resolves but enable_legacy_seo_pages is falsy', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    verifyTenantHeaderSig.mockReturnValue(true)
    resolve = () => ({ data: { id: 't-1', enable_legacy_seo_pages: false } })

    await expect(requireLegacySeoPages()).rejects.toBeInstanceOf(NextNotFoundError)
  })

  it('returns the tenant when enable_legacy_seo_pages is true', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    verifyTenantHeaderSig.mockReturnValue(true)
    resolve = () => ({ data: { id: 't-1', enable_legacy_seo_pages: true } })

    const result = await requireLegacySeoPages()
    expect(result).toMatchObject({ id: 't-1' })
    expect(notFound).not.toHaveBeenCalled()
  })
})

describe('toSlug / fromSlug', () => {
  it('slugifies mixed-case text with punctuation', () => {
    expect(toSlug('Deep Clean & Sanitize!')).toBe('deep-clean-sanitize')
  })

  it('trims leading/trailing separators', () => {
    expect(toSlug('  --Weekly Service--  ')).toBe('weekly-service')
  })

  it('round-trips a simple slug back to title case', () => {
    expect(fromSlug('move-out-cleaning')).toBe('Move Out Cleaning')
  })
})

describe('tenantSiteUrl', () => {
  it('returns empty string for a null tenant', () => {
    expect(tenantSiteUrl(null)).toBe('')
  })

  it('prefers domain over slug when both are present', () => {
    expect(tenantSiteUrl({ domain: 'https://acme.com/', slug: 'acme' })).toBe('https://acme.com')
  })

  it('falls back to the platform subdomain when domain is absent', () => {
    expect(tenantSiteUrl({ domain: null, slug: 'acme' })).toBe('https://acme.homeservicesbusinesscrm.com')
  })

  it('returns empty string when neither domain nor slug is present', () => {
    expect(tenantSiteUrl({ domain: null, slug: null })).toBe('')
  })
})

describe('generateContent', () => {
  it('generates cleaning-flavored copy for a cleaning industry', () => {
    const content = generateContent('Cleaning', 'Acme Cleaners', { area: 'Brooklyn' })
    expect(content.aboutParagraphs[0]).toContain('Acme Cleaners')
    expect(content.aboutParagraphs[0]).toContain('Brooklyn')
    expect(content.whyChoose).toHaveLength(4)
    expect(content.processSteps.length).toBeGreaterThan(0)
  })

  it('falls back to generic copy for an unrecognized industry', () => {
    const content = generateContent('Falconry', 'Acme Falconry')
    expect(content.aboutParagraphs[0]).toContain('Acme Falconry')
    expect(content.aboutParagraphs[0]).toContain('falconry')
  })
})

describe('getChecklistForService', () => {
  it('matches a known industry checklist by keyword', () => {
    const checklist = getChecklistForService('Standard Cleaning', 'Cleaning')
    expect(checklist).toContain('Vacuuming carpets, rugs, and upholstery')
  })

  it('falls back to a generated generic checklist for unknown services', () => {
    const checklist = getChecklistForService('Falcon Training', 'Falconry')
    expect(checklist.some(item => item.toLowerCase().includes('falcon training'))).toBe(true)
  })
})

describe('getTenantServiceByUrlSlug / getTenantServiceList', () => {
  it('returns null when no service matches the slug', async () => {
    resolve = () => ({ data: [] })
    const result = await getTenantServiceByUrlSlug('t-1', 'no-match')
    expect(result).toBeNull()
  })

  it('adapts a matching service row to the Service shape', async () => {
    resolve = () => ({
      data: [{ id: 's-1', name: 'Deep Clean', default_hourly_rate: 50, default_duration_hours: 2 }],
    })
    const result = await getTenantServiceByUrlSlug('t-1', 'deep-clean')
    expect(result).toMatchObject({ slug: 'deep-clean', name: 'Deep Clean', priceRange: '$100–$200' })
  })

  it('excludes the current slug from the "other services" list', async () => {
    resolve = () => ({
      data: [
        { id: 's-1', name: 'Deep Clean', default_hourly_rate: 50, default_duration_hours: 2 },
        { id: 's-2', name: 'Standard Clean', default_hourly_rate: 40, default_duration_hours: 2 },
      ],
    })
    const result = await getTenantServiceList('t-1', 'deep-clean')
    expect(result.map(s => s.slug)).toEqual(['standard-clean'])
  })
})
