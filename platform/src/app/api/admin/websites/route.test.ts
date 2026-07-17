import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/admin/websites — regression test for a confirmed always-empty-page
 * bug (P1/W1 refill sweep). The admin page (src/app/admin/websites/page.tsx)
 * has always read `data.websites` / `data.tenants` from this endpoint, but the
 * handler only ever returned `{ domains, stats, tenantStats }` — so the page
 * rendered its "No websites found" empty state on every load, regardless of
 * how many tenant_domains rows actually existed. Both files were added in the
 * same commit (345d1c07); the contract mismatch was never caught because
 * neither side had a test. This locks the real contract in place.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
  registerCustomDomain: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  registerCustomDomain: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))
vi.mock('@/lib/vercel-domains', () => ({
  registerCustomDomain: (...a: unknown[]) => h.registerCustomDomain(...a),
}))

import { GET, POST } from './route'

const getReq = (qs = '') => new NextRequest(`http://x/api/admin/websites${qs}`)
const postReq = (body: unknown) =>
  new NextRequest('http://x/api/admin/websites', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.registerCustomDomain.mockReset()
  h.registerCustomDomain.mockImplementation(async (...args: unknown[]) => ({
    ok: true, domain: args[0] as string, status: 'created', verified: false, records: [],
  }))
  h.store = {
    tenants: [
      { id: 'tenant-A', name: 'Acme Cleaning' },
      { id: 'tenant-B', name: 'Bright Homes' },
    ],
    tenant_domains: [],
    tenant_health: [],
    website_visits: [],
  }
})

describe('GET /api/admin/websites — permission gate', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }))

    const res = await GET(getReq())

    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/websites — websites/tenants contract', () => {
  it('returns a non-empty `websites` array and a `tenants` array the admin page actually reads', async () => {
    h.store.tenant_domains.push({
      id: 'dom-1',
      tenant_id: 'tenant-A',
      domain: 'acme.com',
      created_at: '2026-07-01T00:00:00.000Z',
    })

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.websites).toHaveLength(1)
    expect(json.websites[0]).toMatchObject({
      id: 'dom-1',
      tenant_id: 'tenant-A',
      tenant_name: 'Acme Cleaning',
      domain: 'acme.com',
    })
    expect(json.tenants).toEqual([
      { id: 'tenant-A', name: 'Acme Cleaning' },
      { id: 'tenant-B', name: 'Bright Homes' },
    ])
  })

  it('lists every tenant for the filter dropdown even when a tenant has zero domains', async () => {
    const res = await GET(getReq())
    const json = await res.json()

    expect(json.tenants.map((t: { id: string }) => t.id)).toEqual(['tenant-A', 'tenant-B'])
    expect(json.websites).toEqual([])
  })

  it('maps a passing tenant_health row to status "active" and ssl_active true', async () => {
    h.store.tenant_domains.push({ id: 'dom-1', tenant_id: 'tenant-A', domain: 'acme.com', created_at: '2026-07-01T00:00:00.000Z' })
    h.store.tenant_health.push({ domain: 'acme.com', status: 'pass', checks: { reachable: true, routing: true, noLoop: true, formWired: true } })

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.websites[0].status).toBe('active')
    expect(json.websites[0].ssl_active).toBe(true)
  })

  it('maps a failing tenant_health row to status "error"', async () => {
    h.store.tenant_domains.push({ id: 'dom-1', tenant_id: 'tenant-A', domain: 'acme.com', created_at: '2026-07-01T00:00:00.000Z' })
    h.store.tenant_health.push({ domain: 'acme.com', status: 'fail', checks: { reachable: false, routing: false, noLoop: true, formWired: false } })

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.websites[0].status).toBe('error')
    expect(json.websites[0].ssl_active).toBe(false)
  })

  it('maps a domain with no tenant_health row yet to status "pending_dns" rather than fabricating a pass/fail', async () => {
    h.store.tenant_domains.push({ id: 'dom-1', tenant_id: 'tenant-A', domain: 'brand-new.com', created_at: '2026-07-01T00:00:00.000Z' })

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.websites[0].status).toBe('pending_dns')
    expect(json.websites[0].ssl_active).toBe(false)
  })

  it('filters websites by tenant_id but still returns the full tenants list for the dropdown', async () => {
    h.store.tenant_domains.push(
      { id: 'dom-1', tenant_id: 'tenant-A', domain: 'acme.com', created_at: '2026-07-01T00:00:00.000Z' },
      { id: 'dom-2', tenant_id: 'tenant-B', domain: 'bright.com', created_at: '2026-07-02T00:00:00.000Z' },
    )

    const res = await GET(getReq('?tenant_id=tenant-A'))
    const json = await res.json()

    expect(json.websites).toHaveLength(1)
    expect(json.websites[0].tenant_id).toBe('tenant-A')
    expect(json.tenants).toHaveLength(2)
  })
})

describe('POST /api/admin/websites — routing_mode/type on insert', () => {
  it('sets routing_mode "bespoke" and type "primary" for a bespoke tenant + is_primary domain', async () => {
    h.store.tenants.push({ id: 'tenant-bespoke', name: 'NYC Maid', slug: 'nycmaid' })

    const res = await POST(postReq({ tenant_id: 'tenant-bespoke', domain: 'thenycmaid.com', is_primary: true }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.domain).toMatchObject({ routing_mode: 'bespoke', type: 'primary', is_primary: true })
  })

  it('sets routing_mode "template" and type "generic" for a non-bespoke tenant + non-primary domain', async () => {
    h.store.tenants.push({ id: 'tenant-template', name: 'Bright Homes', slug: 'bright-homes' })

    const res = await POST(postReq({ tenant_id: 'tenant-template', domain: 'alias.brighthomes.com' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.domain).toMatchObject({ routing_mode: 'template', type: 'generic', is_primary: false })
  })
})

describe('POST /api/admin/websites — domain normalization', () => {
  it('lowercases a mixed-case domain before storing it', async () => {
    h.store.tenants.push({ id: 'tenant-norm1', name: 'Norm Co', slug: 'norm-co' })

    const res = await POST(postReq({ tenant_id: 'tenant-norm1', domain: 'Example.COM' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.domain.domain).toBe('example.com')
  })

  it('strips a protocol and trailing path before storing', async () => {
    h.store.tenants.push({ id: 'tenant-norm2', name: 'Norm Co 2', slug: 'norm-co-2' })

    const res = await POST(postReq({ tenant_id: 'tenant-norm2', domain: 'https://example2.com/some/path' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.domain.domain).toBe('example2.com')
  })

  it('strips a leading www. before storing, matching the resolver\'s www-stripped lookup', async () => {
    h.store.tenants.push({ id: 'tenant-norm3', name: 'Norm Co 3', slug: 'norm-co-3' })

    const res = await POST(postReq({ tenant_id: 'tenant-norm3', domain: 'www.example3.com' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.domain.domain).toBe('example3.com')
  })

  it('rejects a domain that normalizes to empty', async () => {
    h.store.tenants.push({ id: 'tenant-norm4', name: 'Norm Co 4', slug: 'norm-co-4' })

    const res = await POST(postReq({ tenant_id: 'tenant-norm4', domain: '   ' }))

    expect(res.status).toBe(400)
  })
})

describe('POST /api/admin/websites — Vercel domain registration', () => {
  it('registers the normalized domain with Vercel and returns the result', async () => {
    h.store.tenants.push({ id: 'tenant-vc1', name: 'Vercel Co', slug: 'vercel-co' })

    const res = await POST(postReq({ tenant_id: 'tenant-vc1', domain: 'https://Example-VC.com/path' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(h.registerCustomDomain).toHaveBeenCalledWith('example-vc.com')
    expect(json.vercel).toMatchObject({ status: 'created' })
  })

  it('still returns 201 with the saved row when Vercel registration errors, so the admin sees the DB row was saved but Vercel failed', async () => {
    h.store.tenants.push({ id: 'tenant-vc2', name: 'Vercel Co 2', slug: 'vercel-co-2' })
    h.registerCustomDomain.mockResolvedValueOnce({
      ok: false, domain: 'fails.com', status: 'error', verified: false, records: [], detail: '500 unknown',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-vc2', domain: 'fails.com' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.domain.domain).toBe('fails.com')
    expect(json.vercel).toMatchObject({ status: 'error', detail: '500 unknown' })
  })

  it('surfaces a "skipped" status (Vercel env not configured) instead of silently reporting success', async () => {
    h.store.tenants.push({ id: 'tenant-vc3', name: 'Vercel Co 3', slug: 'vercel-co-3' })
    h.registerCustomDomain.mockResolvedValueOnce({
      ok: false, domain: 'skip.com', status: 'skipped', verified: false, records: [], detail: 'vercel env not configured',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-vc3', domain: 'skip.com' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.vercel.status).toBe('skipped')
  })
})

describe('POST /api/admin/websites — at most one is_primary per tenant', () => {
  it('clears the existing primary when a second is_primary domain is added for the same tenant', async () => {
    h.store.tenants.push({ id: 'tenant-multi', name: 'Multi Domain Co', slug: 'multi-domain-co' })
    h.store.tenant_domains.push({
      id: 'dom-old', tenant_id: 'tenant-multi', domain: 'old-primary.com',
      is_primary: true, type: 'primary', active: true, created_at: '2026-07-01T00:00:00.000Z',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-multi', domain: 'new-primary.com', is_primary: true }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.domain).toMatchObject({ is_primary: true, domain: 'new-primary.com' })

    const oldRow = h.store.tenant_domains.find((d) => d.id === 'dom-old')
    expect(oldRow?.is_primary).toBe(false)

    const primaries = h.store.tenant_domains.filter((d) => d.tenant_id === 'tenant-multi' && d.is_primary === true)
    expect(primaries).toHaveLength(1)
  })

  it('does not touch an existing primary when the new domain is not primary', async () => {
    h.store.tenants.push({ id: 'tenant-multi2', name: 'Multi Domain Co 2', slug: 'multi-domain-co-2' })
    h.store.tenant_domains.push({
      id: 'dom-old2', tenant_id: 'tenant-multi2', domain: 'old-primary2.com',
      is_primary: true, type: 'primary', active: true, created_at: '2026-07-01T00:00:00.000Z',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-multi2', domain: 'alias2.com' }))
    expect(res.status).toBe(201)

    const oldRow = h.store.tenant_domains.find((d) => d.id === 'dom-old2')
    expect(oldRow?.is_primary).toBe(true)
  })

  it('does not clear a different tenant\'s primary', async () => {
    h.store.tenants.push({ id: 'tenant-x', name: 'Tenant X', slug: 'tenant-x' })
    h.store.tenants.push({ id: 'tenant-y', name: 'Tenant Y', slug: 'tenant-y' })
    h.store.tenant_domains.push({
      id: 'dom-x', tenant_id: 'tenant-x', domain: 'x.com',
      is_primary: true, type: 'primary', active: true, created_at: '2026-07-01T00:00:00.000Z',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-y', domain: 'y.com', is_primary: true }))
    expect(res.status).toBe(201)

    const xRow = h.store.tenant_domains.find((d) => d.id === 'dom-x')
    expect(xRow?.is_primary).toBe(true)
  })
})
