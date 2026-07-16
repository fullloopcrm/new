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
})) as unknown as FakeStoreHandle & {
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))

import { GET, POST } from './route'

const getReq = (qs = '') => new NextRequest(`http://x/api/admin/websites${qs}`)
const postReq = (body: unknown) =>
  new NextRequest('http://x/api/admin/websites', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
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
