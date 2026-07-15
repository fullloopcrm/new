import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * leads/feed, leads/domains, leads/attribution, leads/override, and
 * attribution/*, only called getTenantForRequest() (base session auth) with
 * no requirePermission check — any authenticated tenant member of any role
 * could view lead-pipeline visitor analytics (names, addresses, GPS-adjacent
 * zip data) and mutate manual conversion/sale attribution flags, unlike the
 * sibling routes in the same directories (leads/block, leads/verify) already
 * gated on 'leads.view'. Per rbac.ts, 'staff' lacks leads.view — manager/
 * admin/owner keep working.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => {
    if (h.role === 'unauthenticated') {
      const { AuthError } = await import('@/lib/tenant-query')
      throw new AuthError('Unauthorized', 401)
    }
    return { tenantId: h.tenantId, tenant: { selena_config: null }, role: h.role }
  },
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    lead_clicks: [{ id: 'click-1', tenant_id: 'tenant-A', manual_conversion: false, manual_sale: false }],
    domains: [],
    website_visits: [],
    clients: [],
    bookings: [],
  }
})

describe('POST /api/leads/override — leads.view permission', () => {
  it('rejects staff (no leads.view) with 403 and does not mutate', async () => {
    const { POST } = await import('./override/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ id: 'click-1', type: 'sale' }) }))
    expect(res.status).toBe(403)
    expect(h.store.lead_clicks[0].manual_sale).toBe(false)
  })

  it('allows manager (has leads.view) to toggle', async () => {
    h.role = 'manager'
    const { POST } = await import('./override/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ id: 'click-1', type: 'sale' }) }))
    expect(res.status).toBe(200)
    expect(h.store.lead_clicks[0].manual_sale).toBe(true)
  })
})

describe('GET /api/leads/domains — leads.view permission', () => {
  it('rejects staff with 403', async () => {
    const { GET } = await import('./domains/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows admin', async () => {
    h.role = 'admin'
    const { GET } = await import('./domains/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('GET /api/leads/attribution — leads.view permission', () => {
  it('rejects staff with 403', async () => {
    const { GET } = await import('./attribution/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows owner', async () => {
    h.role = 'owner'
    const { GET } = await import('./attribution/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('GET /api/leads/feed — leads.view permission', () => {
  it('rejects staff with 403', async () => {
    const { GET } = await import('./feed/route')
    const res = await GET(new Request('http://x') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/leads/visits — leads.view permission', () => {
  it('rejects staff with 403', async () => {
    const { GET } = await import('./visits/route')
    const res = await GET(new Request('http://x') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/attribution/manual — leads.view permission', () => {
  it('rejects staff with 403', async () => {
    const { GET } = await import('../attribution/manual/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows manager', async () => {
    h.role = 'manager'
    const { GET } = await import('../attribution/manual/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/attribution/manual — leads.view permission', () => {
  it('rejects staff with 403 and does not mutate', async () => {
    h.store.bookings = [{ id: 'b-1', tenant_id: 'tenant-A', attributed_domain: null }]
    const { POST } = await import('../attribution/manual/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: 'b-1', domain: 'evil.com' }) }))
    expect(res.status).toBe(403)
    expect(h.store.bookings[0].attributed_domain).toBe(null)
  })

  it('allows manager to set attribution', async () => {
    h.role = 'manager'
    h.store.bookings = [{ id: 'b-1', tenant_id: 'tenant-A', attributed_domain: null }]
    const { POST } = await import('../attribution/manual/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: 'b-1', domain: 'good.com' }) }))
    expect(res.status).toBe(200)
    expect(h.store.bookings[0].attributed_domain).toBe('good.com')
  })
})

describe('GET/POST /api/attribution — leads.view permission', () => {
  it('GET (stats) rejects staff with 403', async () => {
    const { GET } = await import('../attribution/route')
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(403)
  })

  it('POST (run attribution) rejects staff with 403 and does not touch bookings', async () => {
    h.store.bookings = [{ id: 'b-1', tenant_id: 'tenant-A', attributed_domain: null, clients: { address: '1 Main St' } }]
    const { POST } = await import('../attribution/route')
    const res = await POST(new Request('http://x', { method: 'POST' }))
    expect(res.status).toBe(403)
    expect(h.store.bookings[0].attributed_domain).toBe(null)
  })
})
